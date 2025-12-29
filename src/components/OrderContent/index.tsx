// src/components/OrderContent/index.tsx
'use client';

import React from 'react';
import { Spin, App, Result } from 'antd';
import styles from '@/app/[uuid]/page.module.scss';

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
import { useProjectList } from '@/contexts/ProjectListContext';

interface OrderContentProps {
    uuid: string;
    salesToken?: string | null;
    dingtalkUserId?: string;
    /** 是否显示"链接无效"错误（当缺少 UD 时） */
    requireUD?: boolean;
    /** 额外的加载状态（如销售端认证中） */
    extraLoading?: boolean;
    /** 额外加载状态的提示文字 */
    extraLoadingTip?: string;
}

export default function OrderContent({
    uuid,
    salesToken = null,
    dingtalkUserId,
    requireUD = true,
    extraLoading = false,
    extraLoadingTip = '加载中...'
}: OrderContentProps) {
    const { message, modal } = App.useApp();
    const { isOpen, toggleOpen } = useProjectList();

    // 使用 Hook
    const {
        loading,
        saving,
        submitting,
        orderData,
        errors,
        hasUnsavedChanges,
        isEditable,
        updateFormData,
        handleBlur,
        handleSave,
        handleSubmit
    } = useOrderLogic(uuid, message, modal, salesToken, dingtalkUserId);

    // Content area - shows loading, error, or actual content
    const renderMainContent = () => {
        // 检查 UD 参数
        if (requireUD && !dingtalkUserId) {
            return (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                    <Result status="error" title="链接无效" />
                </div>
            );
        }

        if (extraLoading || loading) {
            return (
                <div style={{ textAlign: 'center', paddingTop: 100 }}>
                    <Spin size="large" tip={extraLoading ? extraLoadingTip : '加载中...'}>
                        <div style={{ padding: 50 }} />
                    </Spin>
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
                                    currentStatus={
                                        (orderData.status === 'submitted' &&
                                            !(['驳回', '客户修改中', '审批不通过'] as string[]).includes(orderData.tableStatus))
                                            ? 'submitted'
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
