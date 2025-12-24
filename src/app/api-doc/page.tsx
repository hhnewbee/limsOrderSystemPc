'use client';

import React, { useState } from 'react';
import { Card, Table, Typography, Input, Button, Select, Space, Row, Col, Alert, message, Tag, Divider } from 'antd';
import { SendOutlined, ThunderboltOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

// --- 1. 状态映射配置 ---
const STATUS_MAPPING = [
    { key: '1', yida: '待审核 / 已提交', frontend: '待审核', step: '步骤 2', effect: '提交 / 排队中' },
    { key: '2', yida: '审核中', frontend: '审核中', step: '步骤 2', effect: '管理员开始审核' },
    { key: '3', yida: '审核完成', frontend: '待收样 (步骤3)', step: '步骤 2 -> 3', effect: '审核通过，自动跳转至收样阶段' },
    { key: '4', yida: '待收样', frontend: '待收样', step: '步骤 3', effect: '等待样本送达' },
    { key: '5', yida: '收样中 / 已收样', frontend: '收样中 / 已收样', step: '步骤 3', effect: '正在收样 / 已入库' },
    { key: '6', yida: '收样完成', frontend: '待检测 (步骤4 Past)', step: '步骤 3 -> 4', effect: '收样完成，自动跳转至检测阶段' },
    { key: '7', yida: '待检测', frontend: '待检测', step: '步骤 4', effect: '准备实验' },
    { key: '8', yida: '开始检测 / 检测中', frontend: '开始检测 / 检测中', step: '步骤 4', effect: '正在进行实验' },
    { key: '9', yida: '检测完成', frontend: '待分析 (步骤5 Past)', step: '步骤 4 -> 5', effect: '实验完成，自动跳转至分析阶段' },
    { key: '10', yida: '开始分析 / 分析中', frontend: '开始分析 / 分析中', step: '步骤 5', effect: '正在已进行生信分析' },
    { key: '11', yida: '分析完成', frontend: '待开票 (步骤6 Past)', step: '步骤 5 -> 6', effect: '分析完成，自动跳转至开票阶段' },
    { key: '12', yida: '开票完成', frontend: '待付款 (步骤7 Past)', step: '步骤 6 -> 7', effect: '开票完成，自动跳转至付款阶段' },
    { key: '13', yida: '付款完成', frontend: '待交付 (步骤8 Past)', step: '步骤 7 -> 8', effect: '付款完成，自动跳转至交付阶段' },
    { key: '14', yida: '交付完成', frontend: '交付完成', step: '步骤 8 (Finish)', effect: '项目全部完成' },
    { key: '15', yida: '进入售后阶段', frontend: '交付完成 (售后)', step: '步骤 8', effect: '项目结束，进入售后' },
    { key: '16', yida: '审批不通过', frontend: '不通过 / 需修改', step: 'Steps 变红', effect: '流程终止或驳回' },
];

const TABLE_COLUMNS = [
    { title: '宜搭状态 (TableStatus)', dataIndex: 'yida', key: 'yida', render: (text: string) => <Tag color="blue">{text}</Tag> },
    { title: '前端显示状态', dataIndex: 'frontend', key: 'frontend', render: (text: string) => <Text strong>{text}</Text> },
    { title: '对应步骤条', dataIndex: 'step', key: 'step' },
    { title: '业务含义', dataIndex: 'effect', key: 'effect' },
];

// --- 2. 预设场景 ---
const PRESETS = [
    {
        label: '场景 1: 审核通过 (跳转待收样)',
        value: '审核完成',
        body: { TableStatus: '审核完成', AuditTime: Date.now() }
    },
    {
        label: '场景 2: 开始收样 (收样中)',
        value: '收样中',
        body: { TableStatus: '收样中' }
    },
    {
        label: '场景 3: 收样完成 (跳转待检测)',
        value: '收样完成',
        body: { TableStatus: '收样完成', ReceiveSampleTime: Date.now(), Remark: '样本入库完毕' }
    },
    {
        label: '场景 4: 开始检测 (检测中)',
        value: '开始检测',
        body: { TableStatus: '开始检测', TestTime: Date.now() }
    },
    {
        label: '场景 5: 检测完成 (跳转待分析)',
        value: '检测完成',
        body: { TableStatus: '检测完成' }
    },
    {
        label: '场景 6: 分析完成 (跳转待开票)',
        value: '分析完成',
        body: { TableStatus: '分析完成', AnalysisTime: Date.now() }
    },
    {
        label: '场景 7: 全部交付完成',
        value: '交付完成',
        body: { TableStatus: '交付完成', DeliveryTime: Date.now() }
    },
    {
        label: '场景 8: 审批不通过 (红框)',
        value: '审批不通过',
        body: {
            TableStatus: '审批不通过',
            Reason: '您的样本信息填写有误，请核对后重新提交'
        }
    }
];

export default function ApiDocPage() {
    const [uuid, setUuid] = useState('');
    const [jsonBody, setJsonBody] = useState('{\n  "TableStatus": "待审核"\n}');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState<any>(null);

    // 选择预设场景
    const handlePresetSelect = (value: string) => {
        const preset = PRESETS.find(p => p.value === value);
        if (preset) {
            setJsonBody(JSON.stringify(preset.body, null, 2));
            message.info(`已加载配置: ${preset.label}`);
        }
    };

    // 发送请求
    const handleSend = async () => {
        if (!uuid.trim()) {
            message.error('请输入订单 UUID');
            return;
        }

        try {
            // 校验 JSON 格式
            JSON.parse(jsonBody);
        } catch (e) {
            message.error('JSON 格式错误，请检查');
            return;
        }

        setLoading(true);
        setResponse(null);

        try {
            const res = await fetch(`/api/order/${uuid}/update-from-yida`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonBody
            });

            const data = await res.json();
            setResponse({
                status: res.status,
                statusText: res.statusText,
                data: data
            });

            if (res.ok) {
                message.success('请求成功！');
            } else {
                message.error(`请求失败: ${res.status}`);
            }
        } catch (err: any) {
            setResponse({ error: err.message });
            message.error('网络请求出错');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', background: '#f0f2f5', minHeight: '100vh' }}>

            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <Title level={2} style={{ color: '#1890ff' }}>
                    <ThunderboltOutlined /> LIMS 接口调试台
                </Title>
                <Paragraph type="secondary">
                    集成了接口文档说明与在线调试工具，用于测试 <code>update-from-yida</code> 回调接口。
                </Paragraph>
            </div>

            <Row gutter={24}>
                {/* 左侧：文档部分 */}
                <Col span={24} lg={10}>
                    <Card
                        title={<><BookOutlined /> 状态映射对照表 (API Specs)</>}
                        style={{ marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                    >
                        <Alert
                            message="说明"
                            description="钉钉(宜搭)侧只需要更新 TableStatus 字段，后端会自动映射到下表的进度状态。"
                            type="info"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                        <Table
                            dataSource={STATUS_MAPPING}
                            columns={TABLE_COLUMNS}
                            pagination={false}
                            size="small"
                            bordered
                        />
                    </Card>
                </Col>

                {/* 右侧：调试工具 */}
                <Col span={24} lg={14}>
                    <Card
                        title={<><ThunderboltOutlined /> 在线模拟发送 (Live Tester)</>}
                        extra={<Tag color="green">POST /api/order/[uuid]/update-from-yida</Tag>}
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    >
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>

                            {/* 1. 目标订单 */}
                            <div>
                                <Text strong>1. 目标订单 UUID</Text>
                                <Input
                                    placeholder="粘贴订单 UUID (例如: 123e4567-e89b...)"
                                    value={uuid}
                                    onChange={e => setUuid(e.target.value)}
                                    style={{ marginTop: 8 }}
                                    allowClear
                                />
                            </div>

                            {/* 2. 场景选择 */}
                            <div>
                                <Text strong>2. 快速选择场景 (Preset Scenarios)</Text>
                                <Select
                                    style={{ width: '100%', marginTop: 8 }}
                                    placeholder="选择一个场景，自动填充 JSON"
                                    onChange={handlePresetSelect}
                                    options={PRESETS}
                                />
                            </div>

                            {/* 3. JSON 编辑 */}
                            <div>
                                <Text strong>3. 请求体 (Request Body)</Text>
                                <TextArea
                                    value={jsonBody}
                                    onChange={e => setJsonBody(e.target.value)}
                                    rows={8}
                                    style={{ marginTop: 8, fontFamily: 'monospace', color: '#1677ff', background: '#f9f9f9' }}
                                />
                            </div>

                            {/* 4. 执行 */}
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={handleSend}
                                loading={loading}
                                block
                                size="large"
                            >
                                发送请求 (Send Request)
                            </Button>

                            {/* 5. 结果展示 */}
                            {response && (
                                <div style={{ marginTop: 16 }}>
                                    <Divider orientation="left">响应结果</Divider>
                                    <div style={{
                                        background: '#1f1f1f',
                                        color: '#a6e22e',
                                        padding: 16,
                                        borderRadius: 8,
                                        maxHeight: 300,
                                        overflow: 'auto',
                                        fontFamily: 'monospace'
                                    }}>
                                        <pre style={{ margin: 0 }}>{JSON.stringify(response, null, 2)}</pre>
                                    </div>
                                </div>
                            )}

                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
}
