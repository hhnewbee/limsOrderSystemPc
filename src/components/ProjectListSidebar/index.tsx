'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Spin, Tag, Empty } from 'antd';
import { CloseOutlined, FolderOutlined, FileTextOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useProjectList } from '@/contexts/ProjectListContext';
import styles from './ProjectListSidebar.module.scss';

interface OrderItem {
    id: number;
    uuid: string;
    project_number: string; // UUID link code
    product_no: string; // Real project number from DingTalk
    customer_name: string;
    customer_unit: string;
    service_type: string;
    status: string;
    table_status: string;
    created_at: string;
    updated_at: string;
}

export default function ProjectListSidebar() {
    const { isOpen, close, selectedUuid, setSelectedUuid } = useProjectList();
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<OrderItem[]>([]);
    const params = useParams();

    // Use selectedUuid from context, or fall back to URL params
    const currentUuid = selectedUuid || (Array.isArray(params.uuid) ? params.uuid[0] : params.uuid);

    useEffect(() => {
        if (isOpen) {
            fetchOrders();
        }
    }, [isOpen]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/user/orders', {
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Failed to fetch orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOrder = (uuid: string) => {
        // Use Context-based switching for partial reload
        setSelectedUuid(uuid);
    };

    const getStatusTag = (status: string, tableStatus: string) => {
        const display = tableStatus || status;
        const statusMap: Record<string, { color: string; label: string }> = {
            'draft': { color: 'default', label: '草稿' },
            'submitted': { color: 'processing', label: '已提交' },
            '待审核': { color: 'processing', label: '待审核' },
            '客户已提交': { color: 'processing', label: '待审核' },
            '审核中': { color: 'processing', label: '审核中' },
            '已通过': { color: 'success', label: '已通过' },
            '审批通过': { color: 'success', label: '审批通过' },
            '驳回': { color: 'error', label: '已驳回' },
            '客户修改中': { color: 'warning', label: '待修改' },
        };
        const config = statusMap[display] || { color: 'default', label: display || '未知' };
        return <Tag color={config.color}>{config.label}</Tag>;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };

    return (
        <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
            <div className={styles.header}>
                <h3><FolderOutlined style={{ marginRight: 8 }} />我的项目</h3>
                <button className={styles.closeBtn} onClick={close}>
                    <CloseOutlined />
                </button>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <Spin />
                    </div>
                ) : orders.length === 0 ? (
                    <Empty
                        className={styles.emptyState}
                        description="暂无项目"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                ) : (
                    orders.map(order => (
                        <div
                            key={order.uuid}
                            className={`${styles.orderItem} ${order.uuid === currentUuid ? styles.active : ''}`}
                            onClick={() => handleSelectOrder(order.uuid)}
                        >
                            <div className={styles.projectNumber}>
                                <FileTextOutlined />
                                {order.product_no || order.project_number || '待生成'}
                            </div>
                            <div className={styles.customerName}>
                                {order.customer_name} · {order.service_type || '多肽测序'}
                            </div>
                            <div className={styles.meta}>
                                <span>{formatDate(order.updated_at)}</span>
                                {getStatusTag(order.status, order.table_status)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
