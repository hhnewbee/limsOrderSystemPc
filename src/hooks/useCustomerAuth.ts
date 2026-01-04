/**
 * useCustomerAuth Hook
 * 
 * 负责客户页面的认证逻辑
 * 从 AuthGuard 中提取
 */
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export interface UseCustomerAuthResult {
    loading: boolean;
    authorized: boolean;
}

export function useCustomerAuth(): UseCustomerAuthResult {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();

    const checkAuth = useCallback(async () => {
        setLoading(true);

        // Get order UUID from pathname (e.g., /abc-123-def)
        const uuid = pathname.replace('/', '').split('?')[0];
        const salesToken = searchParams.get('s_token');
        const udParam = searchParams.get('UD');
        const dingtalkUserId = udParam ? atob(udParam) : undefined;

        // 1. Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();

        // 2. Check order access (only if on an order page)
        const isOrderPage = uuid && uuid.length > 10 && !pathname.includes('/login') && !pathname.includes('/register');

        if (isOrderPage) {
            if (session) {
                // User is logged in - verify permission
                try {
                    const response = await fetch(`/api/order/${uuid}?s_token=${salesToken || ''}`, {
                        headers: {
                            Authorization: `Bearer ${session.access_token}`,
                            'X-DingTalk-UserId': dingtalkUserId || ''
                        }
                    });

                    if (response.ok) {
                        setAuthorized(true);
                        setLoading(false);
                        return;
                    } else if (response.status === 403) {
                        // Order belongs to another user - sign out and redirect
                        await supabase.auth.signOut();
                        // Fall through to check-auth flow
                    } else {
                        // Other error - allow access and let page handle it
                        setAuthorized(true);
                        setLoading(false);
                        return;
                    }
                } catch (error) {
                    console.error('[useCustomerAuth] Error checking order access:', error);
                    setAuthorized(true);
                    setLoading(false);
                    return;
                }
            }

            // Not logged in OR just logged out - redirect to login
            try {
                const apiUrl = salesToken
                    ? `/api/order/${uuid}/check-auth?s_token=${salesToken}`
                    : `/api/order/${uuid}/check-auth`;

                const response = await fetch(apiUrl, {
                    headers: {
                        'X-DingTalk-UserId': dingtalkUserId || ''
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    const returnUrlWithUD = udParam ? `/${uuid}?UD=${udParam}` : `/${uuid}`;
                    const baseUrl = data.authType === 'login' ? '/login' : '/register';

                    const params = new URLSearchParams({
                        phone: data.phone,
                        customerName: data.customerName || '',
                        phoneReadOnly: 'true',
                        orderUuid: uuid,
                        returnUrl: returnUrlWithUD,
                        ...(udParam ? { UD: udParam } : {})
                    });

                    router.replace(`${baseUrl}?${params.toString()}`);
                    return;
                } else {
                    console.error('[useCustomerAuth] Order auth check failed');
                }
            } catch (error) {
                console.error('[useCustomerAuth] Error checking order auth:', error);
            }
        } else if (session) {
            // Not an order page and user is logged in
            setAuthorized(true);
            setLoading(false);
            return;
        }

        // No session - redirect to login
        const searchStr = searchParams.toString();
        const currentPath = pathname + (searchStr ? '?' + searchStr : '');
        router.replace(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
        setLoading(false);
    }, [pathname, searchParams, router]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    return { loading, authorized };
}
