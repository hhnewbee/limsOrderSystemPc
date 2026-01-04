// src/app/[uuid]/sales/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Spin, App } from 'antd';

import OrderContent from '@/components/OrderContent';
import { ProjectListProvider } from '@/contexts/ProjectListContext';
import { useSalesAuth } from '@/hooks/useSalesAuth';

function SalesOrderPageInner() {
    const { message } = App.useApp();
    const params = useParams();
    const searchParams = useSearchParams();

    // Extract UUID and params
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;
    const udParam = searchParams.get('UD');
    const dingtalkUserId = udParam ? atob(udParam) : undefined;

    // Use extracted auth hook
    const { loading, authorized } = useSalesAuth({
        uuid: urlUuid!,
        udParam,
        dingtalkUserId,
        onError: message.error
    });

    // Show loading while checking auth
    if (loading) {
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
