'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Space, Popconfirm, Radio } from 'antd';
import { UserAddOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function UserManagementPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Modal States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isResetOpen, setIsResetOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [form] = Form.useForm();
    const [resetForm] = Form.useForm();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/users');
            setUsers(res.data.users);
        } catch (error) {
            message.error('加载用户列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (values: any) => {
        try {
            await axios.post('/api/admin/users', values);
            message.success('创建成功');
            setIsCreateOpen(false);
            form.resetFields();
            fetchUsers();
        } catch (error: any) {
            message.error('创建失败: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleReset = async (values: any) => {
        try {
            await axios.put('/api/admin/users', {
                id: selectedUser.id,
                password: values.password
            });
            message.success('重置成功');
            setIsResetOpen(false);
            resetForm.resetFields();
        } catch (error: any) {
            message.error('重置失败: ' + (error.response?.data?.error || error.message));
        }
    };

    const toggleBan = async (user: any) => {
        try {
            await axios.put('/api/admin/users', {
                id: user.id,
                ban: !user.is_banned
            });
            message.success(user.is_banned ? '已启用账号' : '已禁用账号');
            fetchUsers();
        } catch (error: any) {
            message.error('操作失败');
        }
    };

    const columns = [
        { title: '手机号', dataIndex: 'phone', key: 'phone' },
        {
            title: '角色',
            dataIndex: 'role',
            key: 'role',
            render: (role: string) => role === 'admin' ? <Tag color="gold">管理员</Tag> : <Tag>客户</Tag>
        },
        { title: 'Email (ID)', dataIndex: 'email', key: 'email', render: (text: string) => <span style={{ color: '#999', fontSize: 12 }}>{text}</span> },
        { title: '注册时间', dataIndex: 'created_at', key: 'created_at', render: (d: string) => new Date(d).toLocaleString() },
        {
            title: '状态',
            dataIndex: 'is_banned',
            key: 'status',
            render: (banned: boolean) => banned ? <Tag color="red">已禁用</Tag> : <Tag color="green">正常</Tag>
        },
        {
            title: '操作',
            key: 'action',
            render: (_: any, record: any) => (
                <Space>
                    <Button size="small" onClick={() => { setSelectedUser(record); setIsResetOpen(true); }}>重置密码</Button>
                    <Popconfirm title={record.is_banned ? "启用账号?" : "禁用账号?"} onConfirm={() => toggleBan(record)}>
                        <Button size="small" danger={!record.is_banned}>{record.is_banned ? '启用' : '禁用'}</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                <h2>客户管理</h2>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchUsers}>刷新</Button>
                    <Button type="primary" icon={<UserAddOutlined />} onClick={() => setIsCreateOpen(true)}>新建账号</Button>
                </Space>
            </div>

            <Table
                dataSource={users}
                columns={columns}
                rowKey="id"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            {/* Create User Modal */}
            <Modal title="新建账号" open={isCreateOpen} onCancel={() => setIsCreateOpen(false)} onOk={() => form.submit()}>
                <Form form={form} onFinish={handleCreate} layout="vertical" initialValues={{ role: 'customer' }}>
                    <Form.Item name="phone" label="手机号" rules={[{ required: true }, { pattern: /^1\d{10}$/, message: '请输入11位手机号' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="初始密码" rules={[{ required: true, min: 6 }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="role" label="账号类型" rules={[{ required: true }]}>
                        <Radio.Group>
                            <Radio value="customer">普通客户</Radio>
                            <Radio value="admin">管理员</Radio>
                        </Radio.Group>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Reset Password Modal */}
            <Modal title={`重置密码: ${selectedUser?.phone}`} open={isResetOpen} onCancel={() => setIsResetOpen(false)} onOk={() => resetForm.submit()}>
                <Form form={resetForm} onFinish={handleReset} layout="vertical">
                    <Form.Item name="password" label="新密码" rules={[{ required: true, min: 6 }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
