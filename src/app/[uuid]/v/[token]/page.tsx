'use client';

import React, { useState, useEffect, use } from 'react';
import { Table, Card, Typography, Spin, Tag, Alert, Empty, Descriptions, Button, message, Tabs } from 'antd';
import { ExperimentOutlined, FileTextOutlined, BranchesOutlined, ClusterOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface SampleData {
    sample_name: string;
    analysis_name?: string;
    group_name?: string;
    detection_or_storage: string;
    sample_tube_count: number;
    experiment_description?: string;
}

interface OrderSamples {
    uuid: string;
    projectNumber: string;
    serviceType: string;
    status: string;
    sampleList: SampleData[];
    pairwiseComparison: any[];
    multiGroupComparison: any[];
    needBioinformaticsAnalysis: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

export default function TokenSamplesViewPage({ params }: { params: Promise<{ uuid: string; token: string }> }) {
    const { uuid, token } = use(params);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<OrderSamples | null>(null);
    const [activeTab, setActiveTab] = useState('samples');

    useEffect(() => {
        fetchSamples();
    }, [uuid, token]);

    const fetchSamples = async () => {
        try {
            const response = await fetch(`/api/order/${uuid}/view/${token}`);
            if (!response.ok) {
                const err = await response.json();
                setError(err.error || '获取数据失败');
                return;
            }
            const result = await response.json();
            setData(result);
        } catch (err: any) {
            setError('网络错误');
        } finally {
            setLoading(false);
        }
    };

    // Export to Excel using snake_case database fields
    const handleExport = async () => {
        if (!data || data.sampleList.length === 0) {
            message.warning('没有数据可导出');
            return;
        }
        setExporting(true);
        try {
            const XLSX = await import('xlsx');
            const workbook = XLSX.utils.book_new();

            // Sheet 1: 样本清单
            const sampleExportData = data.sampleList.map((item: any, index: number) => ({
                '序号': index + 1,
                '样本名称': item.sample_name || '',
                '分析名称': item.analysis_name || '',
                '分组名称': item.group_name || '',
                '检测或暂存': item.detection_or_storage || '',
                '样品管数': item.sample_tube_count || '',
                '实验设计描述及样本备注': item.experiment_description || ''
            }));
            const sampleSheet = XLSX.utils.json_to_sheet(sampleExportData);
            XLSX.utils.book_append_sheet(workbook, sampleSheet, '样本清单');

            // Sheet 2: 两两比较
            if (data.pairwiseComparison?.length > 0) {
                const pairwiseExportData = data.pairwiseComparison.map((item: any, index: number) => ({
                    '序号': index + 1,
                    '对照组 (Control)': item.control_group || '',
                    '实验组 (Case)': item.treatment_group || '',
                    '比较方案名称': item.comparison_scheme || ''
                }));
                const pairwiseSheet = XLSX.utils.json_to_sheet(pairwiseExportData);
                XLSX.utils.book_append_sheet(workbook, pairwiseSheet, '两两比较');
            }

            // Sheet 3: 多组比较
            if (data.multiGroupComparison?.length > 0) {
                const multiGroupExportData = data.multiGroupComparison.map((item: any, index: number) => ({
                    '序号': index + 1,
                    '差异分析比较组': (item.comparison_groups || []).join(', '),
                    '比较方案': (item.comparison_groups || []).join(' vs ')
                }));
                const multiGroupSheet = XLSX.utils.json_to_sheet(multiGroupExportData);
                XLSX.utils.book_append_sheet(workbook, multiGroupSheet, '多组比较');
            }

            const fileName = `样本数据_${data.projectNumber || uuid}_${new Date().toLocaleDateString()}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            message.success('导出成功');
        } catch (err) {
            console.error(err);
            message.error('导出失败');
        } finally {
            setExporting(false);
        }
    };

    const sampleColumns: ColumnsType<SampleData> = [
        {
            title: '序号',
            key: 'index',
            width: 60,
            render: (_, __, index) => index + 1
        },
        { title: '样本名称', dataIndex: 'sample_name', key: 'sampleName', width: 150 },
        ...(data?.needBioinformaticsAnalysis ? [
            { title: '分析名称', dataIndex: 'analysis_name', key: 'analysisName', width: 140 },
            { title: '分组名称', dataIndex: 'group_name', key: 'groupName', width: 140 }
        ] : []),
        {
            title: '检测/暂存',
            dataIndex: 'detection_or_storage',
            key: 'detectionOrStorage',
            width: 100,
            render: (text) => text === '检测' ? <Tag color="blue">检测</Tag> : <Tag>暂存</Tag>
        },
        { title: '样品管数', dataIndex: 'sample_tube_count', key: 'sampleCount', width: 90 },
        { title: '备注', dataIndex: 'experiment_description', key: 'remarks', ellipsis: true }
    ];

    const statusMap: Record<string, { label: string; color: string }> = {
        'draft': { label: '草稿', color: 'default' },
        'submitted': { label: '已提交', color: 'processing' },
        'approved': { label: '已审核', color: 'success' },
        'rejected': { label: '已驳回', color: 'error' }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
                <Spin size="large" />
                <Text type="secondary">加载中...</Text>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', marginTop: 50 }}>
                <Alert type="error" message="无法查看样本数据" description={error} showIcon />
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', marginTop: 50 }}>
                <Empty description="未找到订单数据" />
            </div>
        );
    }

    const status = statusMap[data.status] || { label: data.status || '未知', color: 'default' };

    // Build tab items
    const tabItems = [
        {
            key: 'samples',
            label: (
                <span>
                    <FileTextOutlined />
                    样本清单
                    <Tag style={{ marginLeft: 8 }}>{data.sampleList.length}</Tag>
                </span>
            ),
            children: data.sampleList.length > 0 ? (
                <Table
                    columns={sampleColumns}
                    dataSource={data.sampleList.map((item, idx) => ({ ...item, _key: `sample-${idx}` }))}
                    rowKey="_key"
                    pagination={false}
                    size="small"
                    scroll={{ x: 800 }}
                />
            ) : (
                <Empty description="暂无样本数据" />
            )
        },
        ...(data.needBioinformaticsAnalysis && data.pairwiseComparison?.length > 0 ? [{
            key: 'pairwise',
            label: (
                <span>
                    <BranchesOutlined />
                    两两比较
                    <Tag style={{ marginLeft: 8 }}>{data.pairwiseComparison.length}</Tag>
                </span>
            ),
            children: (
                <Table
                    columns={[
                        { title: '序号', key: 'index', width: 60, render: (_: any, __: any, index: number) => index + 1 },
                        { title: '对照组 (Control)', dataIndex: 'control_group', key: 'controlGroup', width: 200 },
                        { title: '实验组 (Case)', dataIndex: 'treatment_group', key: 'treatmentGroup', width: 200 },
                        { title: '比较方案名称 (自动生成)', dataIndex: 'comparison_scheme', key: 'comparisonScheme', ellipsis: true }
                    ]}
                    dataSource={data.pairwiseComparison.map((item, idx) => ({ ...item, _key: `pair-${idx}` }))}
                    rowKey="_key"
                    pagination={false}
                    size="small"
                />
            )
        }] : []),
        ...(data.needBioinformaticsAnalysis && data.multiGroupComparison?.length > 0 ? [{
            key: 'multigroup',
            label: (
                <span>
                    <ClusterOutlined />
                    多组比较
                    <Tag style={{ marginLeft: 8 }}>{data.multiGroupComparison.length}</Tag>
                </span>
            ),
            children: (
                <Table
                    columns={[
                        { title: '序号', key: 'index', width: 60, render: (_: any, __: any, index: number) => index + 1 },
                        {
                            title: '差异分析比较组 (多选)',
                            dataIndex: 'comparison_groups',
                            key: 'comparisonGroups',
                            width: 300,
                            render: (groups: string[]) => (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {groups?.map((g, i) => <Tag key={i}>{g}</Tag>) || '-'}
                                </div>
                            )
                        },
                        {
                            title: '比较方案 (自动生成)',
                            dataIndex: 'comparison_groups',
                            key: 'comparisonName',
                            render: (groups: string[]) => groups?.join(' vs ') || '-'
                        }
                    ]}
                    dataSource={data.multiGroupComparison.map((item, idx) => ({ ...item, _key: `multi-${idx}` }))}
                    rowKey="_key"
                    pagination={false}
                    size="small"
                />
            )
        }] : [])
    ];

    return (
        <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
            {/* Header */}
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <ExperimentOutlined style={{ fontSize: 28, color: '#1890ff' }} />
                        <Title level={3} style={{ margin: 0 }}>样本数据查看</Title>
                        <Tag color="purple">内部只读</Tag>
                    </div>
                    {data.sampleList.length > 0 && (
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={handleExport}
                            loading={exporting}
                        >
                            导出数据
                        </Button>
                    )}
                </div>

                {/* Order Info */}
                <Card style={{ marginBottom: 16 }}>
                    <Descriptions column={4} size="small">
                        <Descriptions.Item label="项目编号">
                            <Text strong>{data.projectNumber || '-'}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="服务类型">{data.serviceType || '-'}</Descriptions.Item>
                        <Descriptions.Item label="订单状态">
                            <Tag color={status.color}>{status.label}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="更新时间">
                            {data.updatedAt ? new Date(data.updatedAt).toLocaleString() : '-'}
                        </Descriptions.Item>
                    </Descriptions>
                </Card>

                {/* Tabbed Content */}
                <Card>
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        size="large"
                    />
                </Card>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 24, color: '#999' }}>
                    <Text type="secondary">此页面仅供内部人员查看样本数据</Text>
                </div>
            </div>
        </div>
    );
}

