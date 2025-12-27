import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API to get orders belonging to the current user
 * - Customers: get orders by user_id
 * - Sales: get orders where salesman_contact matches their phone
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const role = user.user_metadata?.role;
        const userPhone = user.email?.replace('@client.lims', '');

        let query = supabase
            .from('orders')
            .select(`
                id,
                uuid,
                project_number,
                product_no,
                customer_name,
                customer_unit,
                service_type,
                status,
                table_status,
                created_at,
                updated_at
            `)
            .order('updated_at', { ascending: false })
            .limit(50);

        // Apply different filters based on role
        if (role === 'sales') {
            // Sales users: get orders where salesman_contact matches their phone
            query = query.eq('salesman_contact', userPhone);
        } else if (role === 'admin') {
            // Admin: get all orders (no filter, just limit)
        } else {
            // Customer: get orders by user_id
            query = query.eq('user_id', user.id);
        }

        const { data: orders, error } = await query;

        if (error) {
            console.error('[User Orders API] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            orders: orders || [],
            total: orders?.length || 0
        });
    } catch (error: any) {
        console.error('[User Orders API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

