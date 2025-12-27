'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin, Alert } from 'antd';
import { MobileOutlined, LockOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const { Title, Text } = Typography;

const { Result } = require('antd'); // Add Result to imports or assume it's imported

// ... import Result at the top if not present, checking imports

function LoginContent() {
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

    // Force read-only if we have a phone number (prevent manual edits)
    const phoneReadOnly = !!defaultPhone;

    // Display name: prefer customer name, fallback to phone
    const displayAccount = customerName || defaultPhone;


    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // Create virtual email from phone (always use phone for auth)
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
                message.success('登录成功');
                // Redirect to order page or return URL
                if (orderUuid) {
                    router.replace(`/${orderUuid}`);
                } else {
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
            minHeight: '100vh', background: '#f0f2f5'
        }}>
            <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Title level={3}>LIMS 客户登录</Title>
                    <Text type="secondary">请输入密码登录</Text>
                </div>

                {orderUuid && (
                    <Alert
                        message="请登录以查看订单"
                        description="您的账户已关联此订单，请登录后继续"
                        type="info"
                        showIcon
                        style={{ marginBottom: 16 }}
                    />
                )}

                <Form
                    form={form}
                    name="login"
                    onFinish={onFinish}
                    size="large"
                    initialValues={{ phone: defaultPhone }}
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

                    {/* Phone input (hidden when readonly, visible for manual login) */}
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
                        <Text type="secondary">还没有账号？</Text>
                        <Link href={`/register?phone=${defaultPhone}&returnUrl=${encodeURIComponent(returnUrl)}`}>
                            立即注册
                        </Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div style={{ textAlign: 'center', marginTop: 100 }}><Spin size="large" /></div>}>
            <LoginContent />
        </Suspense>
    );
}

