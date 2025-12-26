import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * API to get orders belonging to the current user
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
        // Get orders belonging to this user
        const { data: orders, error } = await supabase
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
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(50);

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
