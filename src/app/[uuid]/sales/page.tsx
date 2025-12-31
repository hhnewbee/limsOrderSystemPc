// src/app/[uuid]/sales/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Spin, App } from 'antd';

import OrderContent from '@/components/OrderContent';
import { ProjectListProvider } from '@/contexts/ProjectListContext';
import { supabase } from '@/lib/supabase';

function SalesOrderPageInner() {
    const { message } = App.useApp();
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [authChecking, setAuthChecking] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    // Extract UUID and params
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;
    const udParam = searchParams.get('UD');
    const dingtalkUserId = udParam ? atob(udParam) : undefined;

    // Check sales authentication
    useEffect(() => {
        checkSalesAuth();
    }, []);

    const checkSalesAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            redirectToSalesLogin();
            return;
        }

        const role = session.user.user_metadata?.role;
        if (role !== 'sales' && role !== 'admin') {
            console.log('[SalesPage] User is not sales, redirecting...');
            redirectToSalesLogin();
            return;
        }

        // Verify this sales can access this order
        try {
            const response = await fetch(`/api/order/${urlUuid}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-DingTalk-UserId': dingtalkUserId || ''
                }
            });

            if (response.ok) {
                const orderData = await response.json();
                const userPhone = session.user.email?.replace('@client.lims', '');

                // Check if salesman_contact matches user phone
                if (role === 'admin' || orderData.salesmanContact === userPhone) {
                    setAuthorized(true);
                } else {
                    message.error('您无权访问此订单');
                    router.replace('/');
                }
            } else {
                message.error('订单加载失败');
                router.replace('/');
            }
        } catch (error) {
            console.error('[SalesPage] Error checking order access:', error);
            message.error('验证失败');
        } finally {
            setAuthChecking(false);
        }
    };

    const redirectToSalesLogin = async () => {
        try {
            // 🟢 传递 UD 参数给 check-auth-sales API
            const checkAuthUrl = udParam
                ? `/api/order/${urlUuid}/check-auth-sales?UD=${udParam}`
                : `/api/order/${urlUuid}/check-auth-sales`;
            const response = await fetch(checkAuthUrl);
            if (response.ok) {
                const data = await response.json();
                const returnUrlWithUD = udParam ? `/${urlUuid}/sales?UD=${udParam}` : `/${urlUuid}/sales`;
                const params = new URLSearchParams({
                    phone: data.phone,
                    salesmanName: data.salesmanName || '',
                    orderUuid: urlUuid!,
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
    };

    // Show loading while checking auth
    if (authChecking) {
        return (
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
                <Spin size="large" tip="验证权限中..."><div style={{ padding: 50 }} /></Spin>
            </div>
        );
    }

    // Not authorized (already redirecting)
    if (!authorized) {
        return null;
    }

    return (
        <ProjectListProvider initialUuid={urlUuid}>
            <OrderContent
                uuid={urlUuid!}
                salesToken={null}
                dingtalkUserId={dingtalkUserId}
                requireUD={true}
            />
        </ProjectListProvider>
    );
}

export default function SalesOrderPage() {
    return (
        <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>}>
            <App>
                <SalesOrderPageInner />
            </App>
        </Suspense>
    );
}
