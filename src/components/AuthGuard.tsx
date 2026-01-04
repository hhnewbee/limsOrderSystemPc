'use client';

import React from 'react';
import { Spin } from 'antd';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';

interface AuthGuardProps {
    children: React.ReactNode;
}

/**
 * AuthGuard 组件
 * 
 * 使用 useCustomerAuth hook 处理认证逻辑
 * 简化后只负责 UI 渲染
 */
export default function AuthGuard({ children }: AuthGuardProps) {
    const { loading, authorized } = useCustomerAuth();

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
