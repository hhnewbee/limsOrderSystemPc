'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin } from 'antd';
import { ExperimentOutlined, LockOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

function LabLoginContent() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const router = useRouter();
    const searchParams = useSearchParams();

    const returnUrl = searchParams.get('returnUrl') || '/lab/samples';

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Create virtual email from phone
            const email = `${values.phone}@client.lims`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: values.password,
            });

            if (error) {
                if (error.message.includes('Invalid login')) {
                    message.error('手机号或密码错误');
                } else {
                    message.error('登录失败: ' + error.message);
                }
            } else {
                // Verify user has lab or admin role
                const role = data.user?.user_metadata?.role;
                if (role !== 'lab' && role !== 'admin') {
                    message.error('该账号不是实验人员账号');
                    await supabase.auth.signOut();
                } else {
                    message.success('登录成功');
                    router.replace(returnUrl);
                }
            }
        } catch (err: any) {
            message.error('系统错误');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <Card style={{ width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <ExperimentOutlined style={{ fontSize: 48, color: '#764ba2', marginBottom: 16 }} />
                    <Title level={3} style={{ marginBottom: 4 }}>LIMS 实验人员登录</Title>
                    <Text type="secondary">查看订单样本数据</Text>
                </div>

                <Form
                    form={form}
                    name="lab-login"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="phone"
                        rules={[
                            { required: true, message: '请输入手机号!' },
                            { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
                        ]}
                    >
                        <Input prefix={<ExperimentOutlined />} placeholder="手机号" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}
                            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}>
                            登 录
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">实验人员账号由管理员创建</Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
}

export default function LabLoginPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>}>
            <LabLoginContent />
        </Suspense>
    );
}
