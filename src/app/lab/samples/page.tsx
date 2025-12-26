'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { Table, Input, Card, Typography, Spin, Tag, Button, message, Space } from 'antd';
import { SearchOutlined, ReloadOutlined, LogoutOutlined, ExperimentOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Sample {
    id: string;
    orderUuid: string;
    projectNumber: string;
    customerName: string;
    salesmanName: string;
    serviceType: string;
    orderStatus: string;
    sampleName: string;
    analysisName: string;
    groupName: string;
    detectionOrStorage: string;
    sampleCount: number;
    remarks: string;
    orderCreatedAt: string;
    orderUpdatedAt: string;
}

function LabSamplesContent() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [samples, setSamples] = useState<Sample[]>([]);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });
    const [userName, setUserName] = useState('');

    // Check auth and role
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.replace('/login-lab');
            return;
        }

        const role = session.user.user_metadata?.role;
        if (role !== 'lab' && role !== 'admin') {
            message.error('无权访问此页面');
            await supabase.auth.signOut();
            router.replace('/login-lab');
            return;
        }

        setUserName(session.user.user_metadata?.name || session.user.email?.replace('@client.lims', '') || '');
        fetchSamples(1);
    };

    const fetchSamples = useCallback(async (page: number, searchTerm?: string) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const params = new URLSearchParams({
                page: page.toString(),
                pageSize: pagination.pageSize.toString()
            });
            if (searchTerm) params.set('search', searchTerm);

            const response = await fetch(`/api/lab/samples?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setSamples(data.samples);
                setPagination(prev => ({
                    ...prev,
                    current: data.pagination.page,
                    total: data.pagination.total
                }));
            } else {
                const err = await response.json();
                message.error(err.error || '获取数据失败');
            }
        } catch (error) {
            message.error('网络错误');
        } finally {
            setLoading(false);
        }
    }, [pagination.pageSize]);

    const handleSearch = () => {
        fetchSamples(1, search);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login-lab');
    };

    const columns: ColumnsType<Sample> = [
        {
            title: '项目编号',
            dataIndex: 'projectNumber',
            key: 'projectNumber',
            width: 180,
            fixed: 'left',
            render: (text, record) => (
                <a onClick={() => window.open(`/${record.orderUuid}`, '_blank')}>{text || '-'}</a>
            )
        },
        { title: '客户', dataIndex: 'customerName', key: 'customerName', width: 120 },
        { title: '销售', dataIndex: 'salesmanName', key: 'salesmanName', width: 100 },
        { title: '样本名称', dataIndex: 'sampleName', key: 'sampleName', width: 140 },
        { title: '分析名称', dataIndex: 'analysisName', key: 'analysisName', width: 120 },
        { title: '分组名称', dataIndex: 'groupName', key: 'groupName', width: 120 },
        {
            title: '检测/暂存',
            dataIndex: 'detectionOrStorage',
            key: 'detectionOrStorage',
            width: 100,
            render: (text) => text === '检测' ? <Tag color="blue">检测</Tag> : <Tag>暂存</Tag>
        },
        { title: '样品管数', dataIndex: 'sampleCount', key: 'sampleCount', width: 90 },
        { title: '备注', dataIndex: 'remarks', key: 'remarks', width: 150, ellipsis: true },
        {
            title: '订单状态',
            dataIndex: 'orderStatus',
            key: 'orderStatus',
            width: 100,
            render: (status) => {
                const statusMap: Record<string, { label: string; color: string }> = {
                    'draft': { label: '草稿', color: 'default' },
                    'submitted': { label: '已提交', color: 'processing' },
                    'approved': { label: '已审核', color: 'success' },
                    'rejected': { label: '已驳回', color: 'error' }
                };
                const s = statusMap[status] || { label: status || '未知', color: 'default' };
                return <Tag color={s.color}>{s.label}</Tag>;
            }
        },
        {
            title: '更新时间',
            dataIndex: 'orderUpdatedAt',
            key: 'orderUpdatedAt',
            width: 160,
            render: (d) => d ? new Date(d).toLocaleString() : '-'
        }
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ExperimentOutlined style={{ fontSize: 28, color: '#764ba2' }} />
                    <Title level={3} style={{ margin: 0 }}>LIMS 样本数据查看</Title>
                </div>
                <Space>
                    <Text>欢迎，{userName}</Text>
                    <Button icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
                </Space>
            </div>

            {/* Main Content */}
            <Card>
                {/* Toolbar */}
                <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                    <Input.Search
                        placeholder="搜索项目编号或客户名称"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onSearch={handleSearch}
                        style={{ width: 300 }}
                        enterButton={<SearchOutlined />}
                    />
                    <Button icon={<ReloadOutlined />} onClick={() => fetchSamples(pagination.current, search)}>
                        刷新
                    </Button>
                    <Text type="secondary" style={{ lineHeight: '32px' }}>
                        共 {pagination.total} 条样本记录
                    </Text>
                </div>

                {/* Table */}
                <Table
                    columns={columns}
                    dataSource={samples}
                    rowKey="id"
                    loading={loading}
                    scroll={{ x: 1400 }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        total: pagination.total,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 条`,
                        onChange: (page, size) => {
                            setPagination(prev => ({ ...prev, current: page, pageSize: size }));
                            fetchSamples(page, search);
                        }
                    }}
                />
            </Card>
        </div>
    );
}

export default function LabSamplesPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>}>
            <LabSamplesContent />
        </Suspense>
    );
}
