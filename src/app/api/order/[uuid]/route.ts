import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';
import type { DBOrder, DBSample, DBPairwise, DBMultiGroup } from '@/types/order';
import { dbToApp, appToDb } from '@/lib/converters';
import { decrypt } from '@/lib/crypto';
import { supabaseAdmin } from '@/lib/supabase-admin';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;

  // 🟢 提取 DingTalk userId (验证由 dingtalk.ts 函数统一处理)
  const dingtalkUserId = request.headers.get('X-DingTalk-UserId') || undefined;

  // 1. Security Checks
  const salesToken = request.nextUrl.searchParams.get('s_token');
  const authHeader = request.headers.get('Authorization');
  let operatorId: string | null = null;
  let userId: string | null = null;

  // Check Sales Token
  if (salesToken) {
    try {
      const decrypted = decrypt(salesToken);
      if (decrypted) {
        operatorId = decrypted;
        console.log(`[API] Sales Access Granted via Token. Operator: ${operatorId}`);
      }
    } catch (e) {
      console.warn('[API] Invalid Sales Token');
    }
  }

  // Check User Auth
  let userRole: string | null = null;
  let userPhone: string | null = null;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user && !error) {
      userId = user.id;
      userRole = user.user_metadata?.role || 'customer';
      userPhone = user.email?.replace('@client.lims', '') || null;
      console.log(`[API] User Access. User: ${userId}, Role: ${userRole}`);
    }
  }

  // Permission Gate
  if (!operatorId && !userId) {
    return NextResponse.json({ error: 'Unauthorized: Please login first' }, { status: 401 });
  }

  try {
    // 2. Fetch from Supabase
    let { data: rawOrder } = await supabase
      .from('orders')
      .select(`
        *,
        sample_list(*),
        pairwise_comparison(*),
        multi_group_comparison(*)
      `)
      .eq('uuid', uuid)
      .maybeSingle();

    const order = rawOrder as (DBOrder & {
      sample_list: DBSample[];
      pairwise_comparison: DBPairwise[];
      multi_group_comparison: DBMultiGroup[];
    }) | null;

    // --- Order Security Check ---
    if (order) {
      if (operatorId) {
        // Sales token - allow access
      } else if (userId) {
        // Check user role for access
        const isAdmin = userRole === 'admin';
        const isSales = userRole === 'sales';
        const isLab = userRole === 'lab';
        const isCustomer = userRole === 'customer' || !userRole;

        if (isAdmin) {
          // Admin can access all orders
          console.log(`[API] Admin access granted`);
        } else if (isLab) {
          // Lab users should NOT access customer order pages
          // They should use /lab/samples instead
          console.log(`[API] Lab user ${userId} tried to access order page - denied`);
          return NextResponse.json({ error: 'Forbidden: Lab users cannot access customer orders. Please use /lab/samples' }, { status: 403 });
        } else if (isSales) {
          // Sales can access orders where salesman_contact matches their phone
          if (order.salesman_contact !== userPhone) {
            return NextResponse.json({ error: 'Forbidden: Order belongs to another salesman' }, { status: 403 });
          }
          console.log(`[API] Sales access granted for order`);
        } else if (isCustomer) {
          // Customer can only access their own orders
          if (order.user_id) {
            // Order already has an owner - check if it's this user
            if (order.user_id !== userId) {
              return NextResponse.json({ error: 'Forbidden: Order belongs to another user' }, { status: 403 });
            }
          } else {
            // Order has no owner yet - check if customer_phone matches
            const orderPhone = order.customer_phone;
            if (orderPhone && orderPhone !== userPhone) {
              // Phone doesn't match - deny access
              console.log(`[API] Phone mismatch: order=${orderPhone}, user=${userPhone}`);
              return NextResponse.json({ error: 'Forbidden: Order belongs to another customer' }, { status: 403 });
            }
            // Phone matches or no phone on order - claim it
            console.log(`[API] Claiming order ${uuid} for user ${userId}`);
            await supabase.from('orders').update({ user_id: userId }).eq('uuid', uuid);
            order.user_id = userId;
          }
        }
      }
    }

    const hasValidData = order && order.customer_name;

    // 🟢 Extract DingTalk userId from header (required for DingTalk API calls)
    const dingtalkUserId = request.headers.get('X-DingTalk-UserId') || undefined;

    // 3. Sync from DingTalk if not found
    if (!order || !hasValidData) {
      console.log('[API] 本地无数据，尝试从钉钉获取...');

      // 🟢 验证：必须提供 dingtalkUserId 才能调用钉钉接口
      if (!dingtalkUserId) {
        console.error('[API] 无法同步钉钉数据：缺少 UD 参数');
        return NextResponse.json({
          error: '链接无效：缺少必要的身份标识参数 (UD)',
          code: 'MISSING_DINGTALK_USER_ID'
        }, { status: 400 });
      }

      if (order && !hasValidData) {
        await supabase.from('orders').delete().eq('uuid', uuid);
      }

      const yidaData = await searchFormData(uuid, dingtalkUserId); // 🟢 Pass dingtalkUserId
      const parsedData = parseYidaFormData(yidaData);

      if (!parsedData) {
        return NextResponse.json({ error: '订单不存在' }, { status: 404 });
      }

      const dbBase = appToDb({
        ...parsedData,
        uuid: uuid,
        status: 'draft',
      });

      // 🟢 Auto-Bind Logic - with role-based phone validation
      let autoBindUserId: string | null = null;

      // Check access based on role
      if (userId && userRole === 'admin') {
        // Admin can access any order
        console.log(`[API] Admin accessing DingTalk order ${uuid}`);
      } else if (userId && userRole === 'sales') {
        // Sales can access if salesmanContact matches their phone
        const salesContact = parsedData.salesmanContact?.trim();
        if (salesContact && salesContact !== userPhone) {
          console.log(`[API] Sales order mismatch: salesmanContact=${salesContact}, user=${userPhone}`);
          return NextResponse.json({ error: 'Forbidden: Order belongs to another salesman' }, { status: 403 });
        }
        console.log(`[API] Sales ${userPhone} accessing DingTalk order ${uuid}`);
      } else if (userId) {
        // Customer: verify customerPhone matches before binding
        const orderPhone = parsedData.customerPhone?.trim();
        if (orderPhone && orderPhone !== userPhone) {
          console.log(`[API] DingTalk order phone mismatch: order=${orderPhone}, user=${userPhone}`);
          return NextResponse.json({ error: 'Forbidden: Order belongs to another customer' }, { status: 403 });
        }
        // Phone matches or no phone on order - bind to this user
        autoBindUserId = userId;
        console.log(`[API] Binding DingTalk order ${uuid} to logged-in user ${userId}`);
      }

      // If no logged-in user, try to find existing user by phone
      if (!autoBindUserId && parsedData.customerPhone) {
        try {
          const phone = parsedData.customerPhone.trim();
          const virtualEmail = `${phone}@client.lims`;

          const { data: foundUser } = await supabaseAdmin
            .schema('auth')
            .from('users')
            .select('id')
            .eq('email', virtualEmail)
            .maybeSingle();

          if (foundUser) {
            autoBindUserId = foundUser.id;
            console.log(`[API] Auto-bound order ${uuid} to existing user: ${phone} (${foundUser.id})`);
          }
        } catch (e) {
          console.warn('[API] Auto-bind check failed:', e);
        }
      }

      const insertPayload = {
        ...dbBase,
        user_id: autoBindUserId
      };

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        throw new Error(`初始化订单失败: ${insertError.message}`);
      }

      rawOrder = {
        ...newOrder,
        sample_list: [],
        pairwise_comparison: [],
        multi_group_comparison: []
      };
    }

    const finalOrder = rawOrder as (DBOrder & {
      sample_list: DBSample[];
      pairwise_comparison: DBPairwise[];
      multi_group_comparison: DBMultiGroup[];
    });

    const formattedData = dbToApp(finalOrder);
    return NextResponse.json(formattedData);

  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}