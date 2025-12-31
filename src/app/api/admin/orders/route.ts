import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// 🟢 Admin API: List all orders
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const search = searchParams.get('search') || '';

        // 1. Fetch Orders from DB (camelCase column names)
        let query = supabaseAdmin
            .from('orders')
            .select(`
                id, uuid, "projectNumber", "customerName", status, "tableStatus", "createdAt",
                "userId",
                "customerPhone", "customerUnit", "serviceType", "salesmanName", "unitPrice", "detectionQuantity"
            `)
            .order('createdAt', { ascending: false })
            .range((page - 1) * 10, page * 10 - 1);

        if (search) {
            query = query.or(`projectNumber.ilike.%${search}%,customerName.ilike.%${search}%,uuid.ilike.%${search}%`);
        }

        const { data: orders, error, count } = await query;

        if (error) throw error;

        // 2. Fetch User Info for each order (Manual Join because Auth is separate schema)
        const userIds = orders.map(o => o.userId).filter(Boolean);
        let userMap: Record<string, string> = {};

        if (userIds.length > 0) {
            const uniqueIds = Array.from(new Set(userIds));

            // Use Promise.all to fetch users in parallel using the official Admin API
            // This bypasses schema exposure issues with direct queries
            const userPromises = uniqueIds.map(id => supabaseAdmin.auth.admin.getUserById(id));
            const userResponses = await Promise.all(userPromises);

            userResponses.forEach(response => {
                if (response.data && response.data.user) {
                    const u = response.data.user;
                    userMap[u.id] = u.email?.replace('@client.lims', '') || u.email || 'No Email';
                }
            });
        }

        const enrichedOrders = orders.map(o => ({
            ...o,
            userPhone: o.userId ? (userMap[o.userId] || `${o.userId} (Unknown)`) : null
        }));

        return NextResponse.json({ orders: enrichedOrders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 🟢 Admin API: Bind Order
export async function POST(request: NextRequest) {
    try {
        const { uuid, phone } = await request.json();

        if (!uuid) return NextResponse.json({ error: 'Missing UUID' }, { status: 400 });

        let userId = null;

        if (phone) {
            // Find User by Phone (Virtual Email)
            const email = `${phone}@client.lims`;
            // Search user
            // admin.listUsers can filter? No.
            // Query auth.users directly.
            const { data: users } = await supabaseAdmin.schema('auth').from('users').select('id').eq('email', email).single();
            if (!users) {
                return NextResponse.json({ error: '用户未找到' }, { status: 404 });
            }
            userId = users.id;
        }

        // Update Order (camelCase)
        const { error } = await supabaseAdmin
            .from('orders')
            .update({ userId: userId })
            .eq('uuid', uuid);

        if (error) throw error;

        return NextResponse.json({ success: true, userId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 🟢 Admin API: Delete Order (Hard Delete)
export async function DELETE(request: NextRequest) {
    try {
        const { uuid } = await request.json();

        if (!uuid) {
            return NextResponse.json({ error: 'Missing UUID' }, { status: 400 });
        }

        console.log(`[Admin] 正在删除订单: ${uuid}`);

        // 1. 先删除关联表数据 (由于外键约束，需要先删除子表)
        const { error: sampleError } = await supabaseAdmin
            .from('sample_list')
            .delete()
            .eq('orderUuid', uuid);

        if (sampleError) {
            console.error('[Admin] 删除样本清单失败:', sampleError);
        }

        const { error: pairwiseError } = await supabaseAdmin
            .from('pairwise_comparison')
            .delete()
            .eq('orderUuid', uuid);

        if (pairwiseError) {
            console.error('[Admin] 删除两组比较失败:', pairwiseError);
        }

        const { error: multiGroupError } = await supabaseAdmin
            .from('multi_group_comparison')
            .delete()
            .eq('orderUuid', uuid);

        if (multiGroupError) {
            console.error('[Admin] 删除多组比较失败:', multiGroupError);
        }

        // 2. 删除订单主表
        const { error: orderError } = await supabaseAdmin
            .from('orders')
            .delete()
            .eq('uuid', uuid);

        if (orderError) {
            throw new Error(`删除订单失败: ${orderError.message}`);
        }

        console.log(`[Admin] 订单 ${uuid} 已删除`);
        return NextResponse.json({ success: true, message: '订单已删除' });

    } catch (error: any) {
        console.error('[Admin] 删除订单错误:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
