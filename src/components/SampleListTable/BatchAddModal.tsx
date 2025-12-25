import { Modal, Form, Input, InputNumber, Space, Typography, Checkbox, Row, Col } from 'antd';
import { useEffect, useState } from 'react';

const { Text } = Typography;

interface BatchAddModalProps {
    open: boolean;
    onCancel: () => void;
    onAdd: (newRows: any[]) => void;
    needBioinformaticsAnalysis?: boolean | string;
}

export default function BatchAddModal({ open, onCancel, onAdd, needBioinformaticsAnalysis }: BatchAddModalProps) {
    const [form] = Form.useForm();
    const [syncAnalysisName, setSyncAnalysisName] = useState(true);
    const isBio = needBioinformaticsAnalysis === true || needBioinformaticsAnalysis === 'true';

    // 每次打开弹窗重置表单
    useEffect(() => {
        if (open) {
            form.resetFields();
            setSyncAnalysisName(true);
        }
    }, [open, form]);

    const handleOk = () => {
        form.validateFields().then(values => {
            const {
                groupName,
                prefix,
                analysisPrefix,
                startNum,
                count,
                digitCount
            } = values;

            const newRows: any[] = [];

            for (let i = 0; i < count; i++) {
                const num = startNum + i;
                // 处理补零
                const numStr = digitCount > 1
                    ? String(num).padStart(digitCount, '0') // FIX: pad with '0' not '1'
                    : String(num);

                const sampleName = `${prefix}${numStr}`;

                // 分析名称逻辑：如果同步，则等于样本名；否则使用分析前缀+数字
                let finalAnalysisName = sampleName;
                if (!syncAnalysisName && analysisPrefix) {
                    finalAnalysisName = `${analysisPrefix}${numStr}`;
                }

                newRows.push({
                    sampleName: sampleName,
                    // 仅当需要生信分析时填充这些字段
                    analysisName: isBio ? finalAnalysisName : '',
                    groupName: isBio ? groupName : '',
                    detectionOrStorage: '检测',
                    sampleTubeCount: 1,
                    experimentDescription: ''
                });
            }

            onAdd(newRows);
        });
    };

    return (
        <Modal
            title={isBio ? "新增实验分组 (批量)" : "批量添加样本"}
            open={open}
            onOk={handleOk}
            onCancel={onCancel}
            width={520}
            okText="生成"
            cancelText="取消"
        >
            <Form
                form={form}
                layout="vertical"
                initialValues={{ startNum: 1, count: 3, digitCount: 1 }}
            >
                {/* 1. 分组设置 (仅生信模式显示) */}
                {isBio && (
                    <Form.Item
                        name="groupName"
                        label="分组名称 (Group Name)"
                        rules={[{ required: true, message: '请输入分组名称' }]}
                        tooltip="该组内所有样本将共享此分组名称，例如：CK_Group"
                    >
                        <Input placeholder="例如: Control_Group" />
                    </Form.Item>
                )}

                {/* 2. 样本命名规则 */}
                <div style={{ background: '#f9f9f9', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                    <Text strong style={{ display: 'block', marginBottom: '8px' }}>样本命名规则</Text>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="prefix"
                                label="样本名称前缀"
                                rules={[{ required: true, message: '请输入前缀' }]}
                            >
                                <Input placeholder="例如: CK_" />
                            </Form.Item>
                        </Col>
                        {isBio && (
                            <Col span={12}>
                                <Form.Item label="分析名称配置" style={{ marginBottom: 0 }}>
                                    <Checkbox
                                        checked={syncAnalysisName}
                                        onChange={e => setSyncAnalysisName(e.target.checked)}
                                    >
                                        与样本名称保持一致
                                    </Checkbox>
                                </Form.Item>
                                {!syncAnalysisName && (
                                    <Form.Item
                                        name="analysisPrefix"
                                        dependencies={['prefix']}
                                        rules={[{ required: true, message: '请输入分析名称前缀' }]}
                                        style={{ marginTop: 8 }}
                                    >
                                        <Input placeholder="分析名称前缀" />
                                    </Form.Item>
                                )}
                            </Col>
                        )}
                    </Row>
                </div>

                {/* 3. 数量与编号 */}
                <Space align="baseline" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Form.Item
                        name="startNum"
                        label="起始编号"
                        rules={[{ required: true }]}
                        tooltip="第一个样本的数字后缀"
                    >
                        <InputNumber min={0} style={{ width: 100 }} />
                    </Form.Item>

                    <Form.Item
                        name="count"
                        label="样本数量"
                        rules={[{ required: true }]}
                        tooltip="通常生物学重复为 3-5 个"
                    >
                        <InputNumber min={1} max={100} style={{ width: 100 }} />
                    </Form.Item>

                    <Form.Item
                        name="digitCount"
                        label="编号位数"
                        tooltip="1: 不补零 (1, 2); 2: 补零 (01, 02)"
                    >
                        <InputNumber min={1} max={5} style={{ width: 100 }} />
                    </Form.Item>
                </Space>

                <div style={{ marginTop: 0 }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                        预览：如果前缀为 &quot;CK_&quot;，起始 &quot;1&quot;，数量 &quot;3&quot; <br />
                        将生成：CK_1, CK_2, CK_3
                    </Text>
                </div>
            </Form>
        </Modal>
    );
}
