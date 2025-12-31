'use client';

import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Tag, Space, Input as AntInput } from 'antd';
import { SearchOutlined, LinkOutlined, DisconnectOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';

export default function OrderManagementPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [isBindOpen, setIsBindOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/admin/orders');
            setOrders(res.data.orders);
        } catch (error) {
            message.error('加载订单列表失败');
        } finally {
            setLoading(false);
        }
    };

    const handleBind = async (values: any) => {
        try {
            await axios.post('/api/admin/orders', {
                uuid: selectedOrder.uuid,
                phone: values.phone
            });
            message.success('绑定成功');
            setIsBindOpen(false);
            form.resetFields();
            fetchOrders();
        } catch (error: any) {
            message.error('绑定失败: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleUnbind = async (order: any) => {
        try {
            await axios.post('/api/admin/orders', {
                uuid: order.uuid,
                phone: null // Unbind
            });
            message.success('已解绑');
            fetchOrders();
        } catch (error: any) {
            message.error('解绑失败');
        }
    };

    // 🟢 删除订单
    const handleDelete = async (order: any) => {
        Modal.confirm({
            title: '确认删除',
            content: (
                <div>
                    <p>确定要删除订单 <b>{order.project_number}</b> 吗？</p>
                    <p style={{ color: '#ff4d4f' }}>此操作将删除订单及其所有关联数据（样本清单、比较方案等），且不可恢复！</p>
                </div>
            ),
            okText: '确认删除',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                try {
                    await axios.delete('/api/admin/orders', {
                        data: { uuid: order.uuid }
                    });
                    message.success('订单已删除');
                    fetchOrders();
                } catch (error: any) {
                    message.error('删除失败: ' + (error.response?.data?.error || error.message));
                }
            }
        });
    };

    const columns = [
        { title: '项目编号', dataIndex: 'project_number', key: 'project_number', width: 120 },
        { title: '客户名', dataIndex: 'customer_name', key: 'customer_name', width: 100 },
        { title: '客户电话', dataIndex: 'customer_phone', key: 'customer_phone', width: 120 },
        { title: '客户单位', dataIndex: 'customer_unit', key: 'customer_unit', width: 150, ellipsis: true },
        { title: '服务种类', dataIndex: 'service_type', key: 'service_type', width: 120 },
        { title: '检测数量', dataIndex: 'detection_quantity', key: 'detection_quantity', width: 90 },
        { title: '单价', dataIndex: 'unit_price', key: 'unit_price', width: 90, render: (p: number) => p ? `¥${p}` : '-' },
        { title: '业务员', dataIndex: 'salesman_name', key: 'salesman_name', width: 100 },
        {
            title: '归属用户',
            dataIndex: 'user_phone',
            key: 'user',
            width: 140,
            render: (phone: string) => phone ? <Tag color="blue">{phone}</Tag> : <Tag>未绑定</Tag>
        },
        { title: '状态', dataIndex: 'status', key: 'status', width: 100 },
        {
            title: '操作',
            key: 'action',
            width: 200,
            render: (_: any, record: any) => (
                <Space>
                    <Button size="small" icon={<LinkOutlined />} onClick={() => { setSelectedOrder(record); setIsBindOpen(true); }}>绑定</Button>
                    {record.user_id && (
                        <Button size="small" danger icon={<DisconnectOutlined />} onClick={() => handleUnbind(record)}>解绑</Button>
                    )}
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)}>删除</Button>
                </Space>
            )
        }
    ];

    return (
        <div>
            <div style={{ marginBottom: 16 }}>
                <h2>订单管理</h2>
            </div>

            <Table
                dataSource={orders}
                columns={columns}
                rowKey="uuid"
                loading={loading}
                pagination={{ pageSize: 10 }}
            />

            <Modal title="绑定订单给客户" open={isBindOpen} onCancel={() => setIsBindOpen(false)} onOk={() => form.submit()}>
                <Form form={form} onFinish={handleBind} layout="vertical">
                    <p>将订单 <b>{selectedOrder?.project_number}</b> 绑定给：</p>
                    <Form.Item name="phone" label="客户手机号" rules={[{ required: true }, { pattern: /^1\d{10}$/, message: '请输入11位手机号' }]}>
                        <Input placeholder="输入客户注册手机号" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
