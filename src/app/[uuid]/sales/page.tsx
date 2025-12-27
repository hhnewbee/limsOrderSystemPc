// src/app/[uuid]/sales/page.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spin, App, Alert } from 'antd';
import styles from '../page.module.scss';

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

import { supabase } from '@/lib/supabase';
import { ProjectListProvider, useProjectList } from '@/contexts/ProjectListContext';

function SalesOrderContentInner() {
    const { message, modal } = App.useApp();
    const params = useParams();
    const router = useRouter();
    const [authChecking, setAuthChecking] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const { isOpen, toggleOpen, selectedUuid } = useProjectList();

    // Use selectedUuid from context, or fall back to URL params
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;
    const uuid = selectedUuid || urlUuid;

    // Check sales authentication
    useEffect(() => {
        checkSalesAuth();
    }, []);

    const checkSalesAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            // Not logged in - redirect to sales login
            redirectToSalesLogin();
            return;
        }

        const role = session.user.user_metadata?.role;
        if (role !== 'sales' && role !== 'admin') {
            // Not a sales user
            console.log('[SalesPage] User is not sales, redirecting...');
            redirectToSalesLogin();
            return;
        }

        // Verify this sales can access this order
        try {
            const response = await fetch(`/api/order/${urlUuid}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
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
            const response = await fetch(`/api/order/${urlUuid}/check-auth-sales`);
            if (response.ok) {
                const data = await response.json();
                const params = new URLSearchParams({
                    phone: data.phone,
                    salesmanName: data.salesmanName || '',
                    orderUuid: urlUuid!,
                    returnUrl: `/${urlUuid}/sales`,
                    noAccount: data.authType === 'no_account' ? 'true' : 'false'
                });
                router.replace(`/login-sales?${params.toString()}`);
            } else {
                router.replace('/');
            }
        } catch (error) {
            router.replace('/');
        }
    };

    // 使用 Hook
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
    } = useOrderLogic(uuid!, message, modal, null);

    // Content renderer
    const renderMainContent = () => {
        if (authChecking || loading) {
            return (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                    <Spin size="large" tip="验证权限中..."><div style={{ padding: 50 }} /></Spin>
                </div>
            );
        }

        if (!authorized || !orderData) {
            return (
                <div className="module-card">
                    <h2 style={{ textAlign: 'center', color: '#ff4d4f' }}>无法访问订单</h2>
                </div>
            );
        }

        return (
            <>
                <Alert
                    message="销售管理模式"
                    description="您正在以销售身份查看此订单，可以帮助客户编辑和提交订单。"
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
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
                                    currentStatus={
                                        (orderData.status === ORDER_STATUS.SUBMITTED &&
                                            !([ORDER_STATUS.REJECTED, ORDER_STATUS.CUSTOMER_MODIFYING, ORDER_STATUS.REJECTED_AUDIT] as string[]).includes(orderData.tableStatus))
                                            ? ORDER_STATUS.SUBMITTED
                                            : (orderData.tableStatus || orderData.status || '')
                                    }
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
            <Header status={pageStatus} onToggleProjectList={toggleOpen} />
            <div className={`${styles.pageWrapper} ${isOpen ? styles.sidebarOpen : ''}`}>
                <div className="page-container">
                    {renderMainContent()}
                </div>
                <ProjectListSidebar />
            </div>
        </>
    );
}

function SalesOrderContent() {
    const params = useParams();
    const urlUuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;

    return (
        <ProjectListProvider initialUuid={urlUuid}>
            <SalesOrderContentInner />
        </ProjectListProvider>
    );
}

export default function SalesOrderPage() {
    return (
        <Suspense fallback={<div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>}>
            <SalesOrderContent />
        </Suspense>
    );
}

