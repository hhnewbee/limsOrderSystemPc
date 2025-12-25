import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// 🟢 Admin API: List all orders
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const search = searchParams.get('search') || '';

        // 1. Fetch Orders from DB
        let query = supabaseAdmin
            .from('orders')
            .select(`
                id, uuid, project_number, customer_name, status, table_status, created_at,
                user_id,
                customer_phone, customer_unit, service_type, salesman_name, unit_price, detection_quantity
            `)
            .order('created_at', { ascending: false })
            .range((page - 1) * 10, page * 10 - 1);

        if (search) {
            query = query.or(`project_number.ilike.%${search}%,customer_name.ilike.%${search}%,uuid.ilike.%${search}%`);
        }

        const { data: orders, error, count } = await query;

        if (error) throw error;

        // 2. Fetch User Info for each order (Manual Join because Auth is separate schema)
        const userIds = orders.map(o => o.user_id).filter(Boolean);
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
            user_phone: o.user_id ? (userMap[o.user_id] || `${o.user_id} (Unknown)`) : null
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

        // Update Order
        const { error } = await supabaseAdmin
            .from('orders')
            .update({ user_id: userId })
            .eq('uuid', uuid);

        if (error) throw error;

        return NextResponse.json({ success: true, userId });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
