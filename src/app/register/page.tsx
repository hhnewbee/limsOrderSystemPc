'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin, Alert, Result } from 'antd';
import { MobileOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

function RegisterContent() {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get params from URL (from order auth flow)
    const defaultPhone = searchParams.get('phone') || '';
    const customerName = searchParams.get('customerName') || '';
    const orderUuid = searchParams.get('orderUuid') || '';
    const returnUrl = searchParams.get('returnUrl') || '/';

    // Strict Access Control: Must have phone or order info
    if (!defaultPhone && !orderUuid) {
        return (
            <div style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                minHeight: '100vh', background: '#f0f2f5'
            }}>
                <Card style={{ width: 400, textAlign: 'center' }}>
                    <Result
                        status="403"
                        title="访问被拒绝"
                        subTitle="请通过订单链接访问此页面"
                    />
                </Card>
            </div>
        );
    }

    // Force read-only to prevent registration with arbitrary numbers
    const phoneReadOnly = !!defaultPhone;

    // Display name: prefer customer name, fallback to phone
    const displayAccount = customerName || defaultPhone;

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            const phone = values.phone || defaultPhone;

            // Check password match
            if (values.password !== values.confirmPassword) {
                message.error('两次密码不一致');
                setLoading(false);
                return;
            }

            // Register via API (uses admin client to bypass email validation)
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone,
                    password: values.password,
                    name: customerName || values.name || ''
                })
            });

            const result = await response.json();

            if (!response.ok) {
                if (result.error?.includes('already registered') || result.error?.includes('Phone number already')) {
                    message.error('该手机号已注册，请直接登录');
                } else {
                    message.error('注册失败: ' + result.error);
                }
            } else {
                message.success('注册成功！');

                // Auto login after registration
                const email = `${phone}@client.lims`;
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: values.password
                });

                if (loginError) {
                    message.warning('自动登录失败，请手动登录');
                    router.replace(`/login?phone=${phone}&returnUrl=${encodeURIComponent(returnUrl)}`);
                } else {
                    // Redirect to order page or return URL
                    if (orderUuid) {
                        router.replace(`/${orderUuid}`);
                    } else {
                        router.replace(returnUrl);
                    }
                }
            }
        } catch (err: any) {
            console.error('Registration error:', err);
            message.error('系统错误，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: '100vh', background: '#f0f2f5'
        }}>
            <Card style={{ width: 420, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3}>LIMS 客户注册</Title>
                    <Text type="secondary">创建您的账户以访问订单</Text>
                </div>

                {orderUuid && (
                    <Alert
                        message="首次访问订单"
                        description="请完成注册以查看和编辑您的订单信息"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Form
                    form={form}
                    name="register"
                    onFinish={onFinish}
                    size="large"
                    initialValues={{ phone: defaultPhone, name: customerName }}
                >
                    {/* Display customer name/phone as readonly */}
                    {phoneReadOnly && displayAccount && (
                        <Form.Item>
                            <Input
                                prefix={<MobileOutlined />}
                                value={displayAccount}
                                disabled
                                style={{ backgroundColor: '#f5f5f5' }}
                            />
                        </Form.Item>
                    )}

                    {/* Phone input (hidden when readonly) */}
                    <Form.Item
                        name="phone"
                        rules={!phoneReadOnly ? [
                            { required: true, message: '请输入手机号!' },
                            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }
                        ] : []}
                        hidden={phoneReadOnly}
                    >
                        <Input
                            prefix={<MobileOutlined />}
                            placeholder="手机号"
                            maxLength={11}
                        />
                    </Form.Item>

                    {/* Name input (hidden when we have customerName from order) */}
                    <Form.Item
                        name="name"
                        rules={[{ required: false }]}
                        hidden={!!customerName}
                    >
                        <Input
                            prefix={<UserOutlined />}
                            placeholder="姓名（选填）"
                        />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: '请设置密码!' },
                            { min: 6, message: '密码至少6位' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="设置密码" />
                    </Form.Item>

                    <Form.Item
                        name="confirmPassword"
                        rules={[
                            { required: true, message: '请确认密码!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) {
                                        return Promise.resolve();
                                    }
                                    return Promise.reject(new Error('两次密码不一致'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined />} placeholder="确认密码" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" block loading={loading}>
                            注 册
                        </Button>
                    </Form.Item>

                    <div style={{ textAlign: 'center' }}>
                        <Text type="secondary">已有账号？</Text>
                        <Link href={`/login?phone=${defaultPhone}&returnUrl=${encodeURIComponent(returnUrl)}`}>
                            立即登录
                        </Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>}>
            <RegisterContent />
        </Suspense>
    );
}
