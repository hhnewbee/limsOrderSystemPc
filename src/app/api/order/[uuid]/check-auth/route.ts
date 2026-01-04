import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { decrypt } from '@/lib/crypto';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';

interface RouteParams {
    params: Promise<{ uuid: string }>;
}

interface CheckAuthResponse {
    authType: 'login' | 'register';
    phone: string;
    customerName: string;
    phoneReadOnly: boolean;
    orderUuid: string;
}

/**
 * Check order authentication status
 * Returns whether the customer should login or register, and the phone number to use
 * Note: s_token is optional - if not provided, still try to get order info for phone lookup
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const { uuid } = await params;

    // 🟢 提取 DingTalk userId (用于从钉钉获取订单数据)
    const rawDingtalkHeader = request.headers.get('X-DingTalk-UserId');
    const dingtalkUserId = rawDingtalkHeader && rawDingtalkHeader.trim() !== '' ? rawDingtalkHeader : undefined;

    // 🔍 Debug logging
    console.log('[check-auth] Request received:', {
        uuid,
        rawDingtalkHeader,
        dingtalkUserId,
        url: request.url
    });

    // 1. Validate Sales Token (optional)
    const salesToken = request.nextUrl.searchParams.get('s_token');
    let operatorId: string | null = null;

    if (salesToken) {
        try {
            const decrypted = decrypt(salesToken);
            if (decrypted) {
                operatorId = decrypted;
            }
        } catch (e) {
            console.warn('[check-auth] Invalid sales token, continuing without it');
        }
    }

    try {
        // 2. Check if order exists in DB (camelCase columns)
        const { data: order } = await supabase
            .from('orders')
            .select('uuid, "userId", "customerPhone", "customerName"')
            .eq('uuid', uuid)
            .maybeSingle();

        let customerPhone: string | null = null;
        let customerName: string | null = null;
        let boundUserId: string | null = null;

        if (order) {
            boundUserId = order.userId;
            customerPhone = order.customerPhone;
            customerName = order.customerName;
        } else {
            // 3. If order not in DB, fetch from DingTalk to get customer phone
            console.log('[check-auth] Order not in DB, fetching from DingTalk...');

            // 🟢 Check if we have dingtalkUserId before calling DingTalk API
            if (!dingtalkUserId) {
                console.warn('[check-auth] Order not in DB and no UD parameter provided');
                return NextResponse.json({
                    error: '订单未找到，请通过钉钉链接访问订单',
                    code: 'MISSING_UD_PARAM'
                }, { status: 400 });
            }

            const yidaData = await searchFormData(uuid, dingtalkUserId);
            const parsedData = parseYidaFormData(yidaData);

            if (!parsedData) {
                return NextResponse.json({ error: '订单不存在' }, { status: 404 });
            }

            customerPhone = parsedData.customerPhone || null;
            customerName = parsedData.customerName || null;
        }

        if (!customerPhone) {
            return NextResponse.json({ error: '订单中无客户手机信息' }, { status: 400 });
        }

        // 4. Check if order is bound to a user
        if (boundUserId) {
            // Get the bound user's phone (email prefix)
            const { data: boundUser } = await supabaseAdmin
                .schema('auth')
                .from('users')
                .select('email')
                .eq('id', boundUserId)
                .maybeSingle();

            if (boundUser && boundUser.email) {
                // Extract phone from virtual email (e.g., "13800138000@client.lims" -> "13800138000")
                const phone = boundUser.email.replace('@client.lims', '');
                const response: CheckAuthResponse = {
                    authType: 'login',
                    phone: phone,
                    customerName: customerName || '',
                    phoneReadOnly: true,
                    orderUuid: uuid
                };
                return NextResponse.json(response);
            }
        }

        // 5. Check if customer phone already has an account
        const virtualEmail = `${customerPhone.trim()}@client.lims`;
        console.log('[check-auth] Checking if user exists with email:', virtualEmail);

        try {
            // Use Admin API to list users by email
            const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

            if (listError) {
                console.error('[check-auth] Error listing users:', listError);
            } else {
                const existingUser = usersData.users.find((u: any) => u.email === virtualEmail);
                console.log('[check-auth] User search result:', existingUser ? 'Found' : 'Not found');

                if (existingUser) {
                    // Phone has account, show login
                    const response: CheckAuthResponse = {
                        authType: 'login',
                        phone: customerPhone,
                        customerName: customerName || '',
                        phoneReadOnly: true,
                        orderUuid: uuid
                    };
                    return NextResponse.json(response);
                }
            }
        } catch (authError) {
            console.error('[check-auth] Error checking user:', authError);
        }

        // 6. No account, show register
        const response: CheckAuthResponse = {
            authType: 'register',
            phone: customerPhone,
            customerName: customerName || '',
            phoneReadOnly: true,
            orderUuid: uuid
        };
        return NextResponse.json(response);

    } catch (error: any) {
        console.error('[check-auth] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
