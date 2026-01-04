/**
 * useSalesAuth Hook
 * 
 * 负责销售页面的认证逻辑
 * 复用 authService 中的权限检查
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export interface UseSalesAuthResult {
    loading: boolean;
    authorized: boolean;
}

export interface UseSalesAuthOptions {
    uuid: string;
    udParam: string | null;
    dingtalkUserId: string | undefined;
    onError: (msg: string) => void;
}

export function useSalesAuth({
    uuid,
    udParam,
    dingtalkUserId,
    onError
}: UseSalesAuthOptions): UseSalesAuthResult {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    const redirectToSalesLogin = useCallback(async () => {
        try {
            const response = await fetch(`/api/order/${uuid}/check-auth-sales`);
            if (response.ok) {
                const data = await response.json();
                const returnUrlWithUD = udParam ? `/${uuid}/sales?UD=${udParam}` : `/${uuid}/sales`;
                const params = new URLSearchParams({
                    phone: data.phone,
                    salesmanName: data.salesmanName || '',
                    orderUuid: uuid,
                    returnUrl: returnUrlWithUD,
                    noAccount: data.authType === 'no_account' ? 'true' : 'false',
                    ...(udParam ? { UD: udParam } : {})
                });
                router.replace(`/login-sales?${params.toString()}`);
            } else {
                router.replace('/');
            }
        } catch (error) {
            router.replace('/');
        }
    }, [uuid, udParam, router]);

    const checkSalesAuth = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            redirectToSalesLogin();
            return;
        }

        const role = session.user.user_metadata?.role;
        if (role !== 'sales' && role !== 'admin') {
            console.log('[useSalesAuth] User is not sales, redirecting...');
            redirectToSalesLogin();
            return;
        }

        // Verify this sales can access this order
        try {
            const response = await fetch(`/api/order/${uuid}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-DingTalk-UserId': dingtalkUserId || ''
                }
            });

            if (response.ok) {
                const orderData = await response.json();
                const userPhone = session.user.email?.replace('@client.lims', '');

                // Check if salesman_contact matches user phone (or admin)
                if (role === 'admin' || orderData.salesmanContact === userPhone) {
                    setAuthorized(true);
                } else {
                    onError('您无权访问此订单');
                    router.replace('/');
                }
            } else {
                onError('订单加载失败');
                router.replace('/');
            }
        } catch (error) {
            console.error('[useSalesAuth] Error checking order access:', error);
            onError('验证失败');
        } finally {
            setLoading(false);
        }
    }, [uuid, dingtalkUserId, router, onError, redirectToSalesLogin]);

    useEffect(() => {
        checkSalesAuth();
    }, [checkSalesAuth]);

    return { loading, authorized };
}
