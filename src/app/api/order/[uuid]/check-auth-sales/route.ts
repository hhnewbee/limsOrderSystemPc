import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decrypt } from '@/lib/crypto';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';

interface RouteParams {
    params: Promise<{ uuid: string }>;
}

interface CheckAuthSalesResponse {
    authType: 'login' | 'no_account';
    phone: string;
    salesmanName: string;
    orderUuid: string;
    message?: string;
}

/**
 * Check order authentication status for sales
 * Returns whether the salesman should login or contact admin
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { uuid } = await params;

    try {
        // 1. Check if order exists in DB
        const { data: order } = await supabase
            .from('orders')
            .select('uuid, salesman_contact, salesman_name')
            .eq('uuid', uuid)
            .maybeSingle();

        let salesmanPhone: string | null = null;
        let salesmanName: string | null = null;

        if (order) {
            salesmanPhone = order.salesman_contact;
            salesmanName = order.salesman_name;
        } else {
            // 2. If order not in DB, fetch from DingTalk
            console.log('[check-auth-sales] Order not in DB, fetching from DingTalk...');
            const yidaData = await searchFormData(uuid);
            const parsedData = parseYidaFormData(yidaData);

            if (!parsedData) {
                return NextResponse.json({ error: '订单不存在' }, { status: 404 });
            }

            salesmanPhone = parsedData.salesmanContact || null;
            salesmanName = parsedData.salesmanName || null;
        }

        if (!salesmanPhone) {
            return NextResponse.json({ error: '订单中无业务员信息' }, { status: 400 });
        }

        console.log('[check-auth-sales] Checking if salesman account exists:', salesmanPhone);

        // 3. Check if salesman has an account with role 'sales'
        try {
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

            if (listError) {
                console.error('[check-auth-sales] Error listing users:', listError);
            } else {
                const virtualEmail = `${salesmanPhone.trim()}@client.lims`;
                const existingUser = usersData.users.find((u: any) =>
                    u.email === virtualEmail && u.user_metadata?.role === 'sales'
                );

                if (existingUser) {
                    // Salesman has account, show login
                    const response: CheckAuthSalesResponse = {
                        authType: 'login',
                        phone: salesmanPhone,
                        salesmanName: salesmanName || '',
                        orderUuid: uuid
                    };
                    return NextResponse.json(response);
                }
            }
        } catch (authError) {
            console.error('[check-auth-sales] Error checking user:', authError);
        }

        // 4. No sales account found - need to contact admin
        const response: CheckAuthSalesResponse = {
            authType: 'no_account',
            phone: salesmanPhone,
            salesmanName: salesmanName || '',
            orderUuid: uuid,
            message: '您的销售账号尚未开通，请联系管理员'
        };
        return NextResponse.json(response);

    } catch (error: any) {
        console.error('[check-auth-sales] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
