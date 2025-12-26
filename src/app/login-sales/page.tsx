'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin, Alert, Result } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

function SalesLoginContent() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get params from URL
    const defaultPhone = searchParams.get('phone') || '';
    const salesmanName = searchParams.get('salesmanName') || '';
    const orderUuid = searchParams.get('orderUuid') || '';
    const returnUrl = searchParams.get('returnUrl') || '/';
    const noAccount = searchParams.get('noAccount') === 'true';

    // Display name: prefer salesman name, fallback to phone
    const displayAccount = salesmanName || defaultPhone;

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Create virtual email from phone
            const phone = values.phone || defaultPhone;
            const email = `${phone}@client.lims`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: values.password,
            });

            if (error) {
                if (error.message.includes('Invalid login')) {
                    message.error('密码错误');
                } else {
                    message.error('登录失败: ' + error.message);
                }
            } else {
                // Verify user has sales role
                const role = data.user?.user_metadata?.role;
                if (role !== 'sales' && role !== 'admin') {
                    message.error('该账号不是销售账号');
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

    // Show no account message
    if (noAccount) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                minHeight: '100vh', background: '#f0f2f5'
            }}>
                <Card style={{ width: 450, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <Result
                        status="warning"
                        title="销售账号未开通"
                        subTitle={
                            <div>
                                <p>业务员：<strong>{displayAccount}</strong></p>
                                <p>您的销售账号尚未在系统中开通，请联系管理员添加账号。</p>
                            </div>
                        }
                        extra={[
                            <Button key="back" onClick={() => window.history.back()}>
                                返回
                            </Button>
                        ]}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: '100vh', background: '#f0f2f5'
        }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3}>LIMS 销售登录</Title>
                    <Text type="secondary">请输入密码登录</Text>
                </div>

                {orderUuid && (
                    <Alert
                        message="销售订单管理"
                        description="请登录您的销售账号以查看和管理订单"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Form
                    form={form}
                    name="sales-login"
                    onFinish={onFinish}
                    size="large"
                    initialValues={{ phone: defaultPhone }}
                >
                    {/* Display salesman name as readonly */}
                    {displayAccount && (
                        <Form.Item>
                            <Input
                                prefix={<UserOutlined />}
                                value={displayAccount}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </Form.Item>
                    )}

                    {/* Phone input hidden */}
                    <Form.Item name="phone" hidden>
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: '请输入密码!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            登 录
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">销售账号由管理员创建，如有问题请联系管理员</Text>
                    </div>
                </Form>
            </Card>
        </div>
    );
}

export default function SalesLoginPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>}>
            <SalesLoginContent />
        </Suspense>
    );
}
