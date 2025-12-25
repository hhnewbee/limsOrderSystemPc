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
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (user && !error) {
      userId = user.id;
      console.log(`[API] Customer Access. User: ${userId}`);
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
        // Sales allow
      } else if (userId) {
        if (order.user_id) {
          if (order.user_id !== userId) {
            return NextResponse.json({ error: 'Forbidden: Order belongs to another user' }, { status: 403 });
          }
        } else {
          // Claim
          console.log(`[API] Claiming order ${uuid} for user ${userId}`);
          await supabase.from('orders').update({ user_id: userId }).eq('uuid', uuid);
          order.user_id = userId;
        }
      }
    }

    const hasValidData = order && order.customer_name;

    // 3. Sync from DingTalk if not found
    if (!order || !hasValidData) {
      console.log('[API] 本地无数据，尝试从钉钉获取...');

      if (order && !hasValidData) {
        await supabase.from('orders').delete().eq('uuid', uuid);
      }

      const yidaData = await searchFormData(uuid);
      const parsedData = parseYidaFormData(yidaData);

      if (!parsedData) {
        return NextResponse.json({ error: '订单不存在' }, { status: 404 });
      }

      const dbBase = appToDb({
        ...parsedData,
        uuid: uuid,
        status: 'draft',
      });

      // 🟢 Auto-Bind Logic
      let autoBindUserId = userId || null;

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