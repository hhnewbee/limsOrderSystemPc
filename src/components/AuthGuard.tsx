'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Spin, App, Result, Button } from 'antd';
import { supabase } from '@/lib/supabase';

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        setLoading(true);

        // Get order UUID from pathname (e.g., /abc-123-def)
        const uuid = pathname.replace('/', '').split('?')[0];
        const salesToken = searchParams.get('s_token');

        // 🟢 Extract DingTalk userId from UD parameter (Base64 encoded)
        const udParam = searchParams.get('UD');
        let dingtalkUserId: string | undefined = undefined;

        if (udParam) {
            try {
                dingtalkUserId = atob(udParam);
                console.log('[AuthGuard] Decoded UD parameter:', { udParam, dingtalkUserId });
            } catch (e) {
                console.error('[AuthGuard] Failed to decode UD parameter:', udParam, e);
            }
        } else {
            console.log('[AuthGuard] No UD parameter in URL');
        }

        // 1. Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();

        // 2. Check order access (only if on an order page)
        if (uuid && uuid.length > 10 && !pathname.includes('/login') && !pathname.includes('/register')) {
            // Already logged in - verify permission for this order
            if (session) {
                // User is logged in - check if they can access this order


                try {
                    const token = session.access_token;
                    const response = await fetch(`/api/order/${uuid}?s_token=${salesToken || ''}`, {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                            'X-DingTalk-UserId': dingtalkUserId || '' // 🟢 Pass dingtalkUserId
                        }
                    });

                    if (response.ok) {
                        // User has access to this order
                        setAuthorized(true);
                        setLoading(false);
                        return;
                    } else if (response.status === 403) {
                        // Order belongs to another user - need to switch account


                        // Sign out current user
                        await supabase.auth.signOut();

                        // Fall through to check-auth flow to redirect to correct login
                    } else {
                        // Other error - still allow access and let page handle it
                        setAuthorized(true);
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.error('[AuthGuard] Error checking order access:', error);
                    // On error, allow access and let page handle it
                    setAuthorized(true);
                    setLoading(false);
                    return;
                }
            }

            // Not logged in OR just logged out because wrong account
            // Check order auth status to get the correct phone/name for login

            try {
                const apiUrl = salesToken
                    ? `/api/order/${uuid}/check-auth?s_token=${salesToken}`
                    : `/api/order/${uuid}/check-auth`;

                const response = await fetch(apiUrl, {
                    headers: {
                        'X-DingTalk-UserId': dingtalkUserId || '' // 🟢 Pass dingtalkUserId
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    // 🟢 构建包含 UD 参数的 returnUrl
                    const returnUrlWithUD = udParam ? `/${uuid}?UD=${udParam}` : `/${uuid}`;

                    // Build redirect URL
                    const baseUrl = data.authType === 'login' ? '/login' : '/register';
                    const params = new URLSearchParams({
                        phone: data.phone,
                        customerName: data.customerName || '',
                        phoneReadOnly: 'true',
                        orderUuid: uuid,
                        returnUrl: returnUrlWithUD, // 🟢 包含 UD 参数
                        ...(udParam ? { UD: udParam } : {}) // 🟢 也直接传递 UD
                    });

                    router.replace(`${baseUrl}?${params.toString()}`);
                    return;
                } else {
                    // 🟢 Parse error response to get more details
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch {
                        errorData = { error: 'Unknown error' };
                    }

                    console.error('[AuthGuard] Order auth check failed:', JSON.stringify(errorData));

                    // 🟢 Handle specific error: order not in DB and no UD param
                    if (response.status === 400 && errorData.code === 'MISSING_UD_PARAM') {
                        // Redirect to login with error message
                        const searchStr = searchParams.toString();
                        const currentPath = pathname + (searchStr ? '?' + searchStr : '');
                        router.replace(`/login?returnUrl=${encodeURIComponent(currentPath)}&error=请通过钉钉链接访问订单`);
                        return;
                    }
                }
            } catch (error) {
                console.error('[AuthGuard] Error checking order auth:', error);
            }
        } else if (session) {
            // Not an order page and user is logged in
            console.log('[AuthGuard] User logged in:', session.user.email);
            setAuthorized(true);
            setLoading(false);
            return;
        }



        // 3. No session and no valid sales token - redirect to login

        const searchStr = searchParams.toString();
        const currentPath = pathname + (searchStr ? '?' + searchStr : '');
        router.replace(`/login?returnUrl=${encodeURIComponent(currentPath)}`);

        setLoading(false);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="权限验证中...">
                    <div style={{ padding: 50 }} />
                </Spin>
            </div>
        );
    }

    if (!authorized) {
        return null; // Will redirect
    }

    return <>{children}</>;
}

