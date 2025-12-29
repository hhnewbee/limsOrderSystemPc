// src/app/[uuid]/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Spin } from 'antd';

import AuthGuard from '@/components/AuthGuard';
import OrderContent from '@/components/OrderContent';
import { ProjectListProvider } from '@/contexts/ProjectListContext';

function OrderPageInner() {
    const params = useParams();
    const searchParams = useSearchParams();

    // Extract UUID
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;

    // Extract params
    const salesToken = searchParams.get('s_token');
    const udParam = searchParams.get('UD');
    const dingtalkUserId = udParam ? atob(udParam) : undefined;

    return (
        <ProjectListProvider initialUuid={urlUuid}>
            <OrderContent
                uuid={urlUuid!}
                salesToken={salesToken}
                dingtalkUserId={dingtalkUserId}
                requireUD={true}
            />
        </ProjectListProvider>
    );
}

export default function OrderPage() {
    return (
        <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>}>
            <AuthGuard>
                <OrderPageInner />
            </AuthGuard>
        </Suspense>
    );
}
