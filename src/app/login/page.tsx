'use client';

import React, { useState, Suspense } from 'react';
import { Form, Input, Button, Card, message, Typography, Spin } from 'antd';
import { MobileOutlined, LockOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

const { Title, Text } = Typography;

function LoginContent() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnUrl = searchParams.get('returnUrl') || '/';

    const onFinish = async (values: any) => {
        setLoading(true);
        try {
            // 🟢 Append suffix to create virtual email
            const email = `${values.phone}@client.lims`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: values.password,
            });

            if (error) {
                message.error('登录失败: ' + error.message);
            } else {
                message.success('登录成功');
                router.replace(returnUrl);
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
                    <Text type="secondary">请使用手机号登录</Text>
                </div>

                <Form
                    name="login"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="phone"
                        rules={[{ required: true, message: '请输入手机号!' }, { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}
                    >
                        <Input prefix={<MobileOutlined />} placeholder="手机号" maxLength={11} />
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
