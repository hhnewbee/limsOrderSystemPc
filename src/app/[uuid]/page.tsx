// src/app/[uuid]/page.tsx
'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Spin, App } from 'antd';
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

// 引入 Hook
import { useOrderLogic } from '@/hooks/useOrderLogic';

export default function OrderPage() {
    const { message, modal } = App.useApp();
    const params = useParams();

    // 兼容处理：确保 uuid 是 string 类型
    const uuid = Array.isArray(params.uuid) ? params.uuid[0] : params.uuid;

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
        handleBlur, // 🟢 获取 handleBlur
        handleSave,
        handleSubmit
    } = useOrderLogic(uuid!, message, modal);

    if (loading) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}>
                <Spin size="large" tip="加载中..."><div style={{ padding: 50 }} /></Spin>
            </div>
        );
    }

    if (!orderData) {
        return (
            <div className="page-container">
                <div className="module-card">
                    <h2 style={{ textAlign: 'center', color: '#ff4d4f' }}>订单不存在</h2>
                </div>
            </div>
        );
    }

    return (
        <>
            <Header status={pageStatus} />
            <div className="page-container">
                <div className={styles.layoutGrid}>

                    <main className={styles.mainContent}>
                        <CustomerInfoModule data={orderData} />

                        <SampleInfoModule
                            data={orderData}
                            onChange={updateFormData}
                            onBlur={handleBlur} // 🟢 传递 onBlur
                            disabled={!isEditable}
                            errors={errors}
                        />

                        <ShippingModule
                            data={orderData}
                            onChange={updateFormData}
                            onBlur={handleBlur} // 🟢 传递 onBlur
                            disabled={!isEditable}
                            errors={errors}
                        />

                        <SampleAnalysisModule
                            data={orderData}
                            onChange={updateFormData}
                            onBlur={handleBlur} // 🟢 传递 onBlur
                            disabled={!isEditable}
                            errors={errors}
                        />
                    </main>

                    <aside className={styles.sidebar}>
                        <div className={styles.stickyWrapper}>
                            <div className={styles.orderInfoCard}>
                                <div className={styles.label}>项目编号</div>
                                <div className={styles.value}>
                                    {orderData.projectNumber || '系统生成中...'}
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
            </div>
        </>
    );
}