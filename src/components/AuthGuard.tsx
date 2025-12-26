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

        // 1. Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();

        // For order pages, we need to verify the user has access to this specific order
        if (uuid && uuid.length > 10) {
            console.log('[AuthGuard] Order page detected:', uuid);

            if (session) {
                // User is logged in - check if they can access this order
                console.log('[AuthGuard] User logged in:', session.user.email);

                try {
                    const token = session.access_token;
                    const response = await fetch(`/api/order/${uuid}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        // User has access to this order
                        setAuthorized(true);
                        setLoading(false);
                        return;
                    } else if (response.status === 403) {
                        // Order belongs to another user - need to switch account
                        console.log('[AuthGuard] Order belongs to another user, need to switch account');

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
            console.log('[AuthGuard] Checking order auth status...');
            try {
                const apiUrl = salesToken
                    ? `/api/order/${uuid}/check-auth?s_token=${salesToken}`
                    : `/api/order/${uuid}/check-auth`;

                const response = await fetch(apiUrl);

                if (response.ok) {
                    const data = await response.json();
                    console.log('[AuthGuard] Order auth check result:', data);

                    // Build redirect URL
                    const baseUrl = data.authType === 'login' ? '/login' : '/register';
                    const params = new URLSearchParams({
                        phone: data.phone,
                        customerName: data.customerName || '',
                        phoneReadOnly: 'true',
                        orderUuid: uuid,
                        returnUrl: `/${uuid}`
                    });

                    router.replace(`${baseUrl}?${params.toString()}`);
                    return;
                } else {
                    console.error('[AuthGuard] Order auth check failed:', await response.text());
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
        console.log('[AuthGuard] No session, redirecting to login');
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

