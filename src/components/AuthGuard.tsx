'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Spin, App, Result, Button } from 'antd';
import { supabase } from '@/lib/supabase';

// Crypto is server-side usually, but for parsing token we might need an API call or just send it to backend.
// Strategy: The 'Sales Token' is passed in URL. We store it in sessionStorage/cookie so API calls can use it.
// AuthGuard primarily checks if User is logged in (for customers).

interface AuthGuardProps {
    children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        setLoading(true);

        // 1. Check for Sales Token in URL (?s_token=...)
        // If present, we consider this a "Sales View". 
        // Real security happens at API level: API decodes token and grants access.
        const salesToken = searchParams.get('s_token');
        if (salesToken) {
            // Save token to be used in API headers (if we implemented an interceptor, or just rely on the fact that API 
            // will validate it if passed. Ideally we'd set a cookie or header).
            // For now, let's assume the page component will pass this token to API hook.
            console.log('[AuthGuard] Sales Token detected, allowing access.');
            setAuthorized(true);
            setLoading(false);
            return;
        }

        // 2. Check Customer Login
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            console.log('[AuthGuard] User logged in:', session.user.email);
            setAuthorized(true);
        } else {
            console.log('[AuthGuard] No session, redirecting to login');
            // Redirect to Login
            const currentUrl = window.location.href;
            router.replace(`/login?returnUrl=${encodeURIComponent(currentUrl.replace(window.location.origin, ''))}`);
        }

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
