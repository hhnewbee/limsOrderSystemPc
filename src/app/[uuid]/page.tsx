// src/app/[uuid]/page.tsx
'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { Spin, App, Card, Result } from 'antd';
import styles from './page.module.scss';

// 引入组件
import CustomerInfoModule from '@/components/CustomerInfoModule/CustomerInfoModule';
import SampleInfoModule from '@/components/SampleInfoModule';
import ShippingModule from '@/components/ShippingModule/ShippingModule';
import ProjectInfoModule from '@/components/ProjectInfoModule/ProjectInfoModule';
import SampleAnalysisModule from '@/components/SampleAnalysisModule';
import SubmitArea from '@/components/SubmitArea/SubmitArea';
import Header from "@/components/Header";
import OrderStatusSteps from "@/components/OrderStatusSteps";
import ProjectListSidebar from '@/components/ProjectListSidebar';

// 引入 Hook
import { useOrderLogic } from '@/hooks/useOrderLogic';
import { ORDER_STATUS } from '@/constants/orderStatus';

import AuthGuard from '@/components/AuthGuard';
import { useSearchParams } from 'next/navigation';
import { ProjectListProvider, useProjectList } from '@/contexts/ProjectListContext';

function OrderContentInner() {
    const { message, modal } = App.useApp();
    const params = useParams();
    const searchParams = useSearchParams();
    const salesToken = searchParams.get('s_token');

    // 🟢 Extract DingTalk userId from UD parameter (Base64 encoded)
    const udParam = searchParams.get('UD');
    const dingtalkUserId = udParam ? atob(udParam) : undefined;

    const { isOpen, toggleOpen, selectedUuid } = useProjectList();

    // 使用 Context 中的 selectedUuid（优先），或 URL 参数
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;
    const uuid = selectedUuid || urlUuid;

    // 使用 Hook，传入 salesToken 和 dingtalkUserId
    const {
        loading,
        saving,
        submitting,
        orderData,
        errors,
        hasUnsavedChanges,
        isEditable,
        pageStatus,
        updateFormData,
        handleBlur,
        handleSave,
        handleSubmit
    } = useOrderLogic(uuid!, message, modal, salesToken, dingtalkUserId); // 🟢 Pass dingtalkUserId

    // Content area - shows loading, error, or actual content
    const renderMainContent = () => {
        // 🟢 必须携带 UD 参数才能访问订单
        if (!dingtalkUserId) {
            return (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                    <Result status="error" title="链接无效" />
                </div>
            );
        }

        if (loading) {
            return (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                    <Spin size="large" tip="加载中..."><div style={{ padding: 50 }} /></Spin>
                </div>
            );
        }

        if (!orderData) {
            return (
                <div className="module-card">
                    <h2 style={{ textAlign: 'center', color: '#ff4d4f' }}>订单不存在</h2>
                </div>
            );
        }

        return (
            <>
                <div className={styles.layoutGrid}>
                    <main className={styles.mainContent}>
                        <CustomerInfoModule data={orderData} />
                        <SampleInfoModule
                            data={orderData}
                            onChange={updateFormData}
                            onBlur={handleBlur}
                            disabled={!isEditable}
                            errors={errors}
                        />
                        <ShippingModule
                            data={orderData}
                            onChange={updateFormData}
                            onBlur={handleBlur}
                            disabled={!isEditable}
                            errors={errors}
                        />
                        <SampleAnalysisModule
                            data={orderData}
                            onChange={updateFormData}
                            onBlur={handleBlur}
                            disabled={!isEditable}
                            errors={errors}
                            message={message}
                        />
                    </main>

                    <aside className={styles.sidebar}>
                        <div className={styles.stickyWrapper}>
                            <div className={styles.orderInfoCard}>
                                <div className={styles.label}>项目编号</div>
                                <div className={styles.value}>
                                    {orderData.productNo || '系统生成中...'}
                                </div>
                            </div>
                            <ProjectInfoModule data={orderData} />
                            <div style={{ marginBottom: '16px' }}>
                                <OrderStatusSteps
                                    currentStatus={orderData.tableStatus || orderData.status || ''}
                                    data={orderData}
                                />
                            </div>
                        </div>
                    </aside>
                </div>
                {isEditable && (
                    <SubmitArea
                        onSave={handleSave}
                        onSubmit={handleSubmit}
                        saving={saving}
                        submitting={submitting}
                        hasUnsavedChanges={hasUnsavedChanges}
                    />
                )}
            </>
        );
    };

    return (
        <>
            <Header onToggleProjectList={toggleOpen} />
            <div className={`${styles.pageWrapper} ${isOpen ? styles.sidebarOpen : ''}`}>
                <div className="page-container">
                    {renderMainContent()}
                </div>
                <ProjectListSidebar />
            </div>
        </>
    );
}

function OrderContent() {
    const params = useParams();
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;

    return (
        <ProjectListProvider initialUuid={urlUuid}>
            <OrderContentInner />
        </ProjectListProvider>
    );
}

export default function OrderPage() {
    return (
        <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>}>
            <AuthGuard>
                <OrderContent />
            </AuthGuard>
        </Suspense>
    );
}
