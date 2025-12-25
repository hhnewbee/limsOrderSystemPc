'use client';

import React from 'react';
import { Typography, Row, Col, Card, Statistic } from 'antd';
import { UserOutlined, ShoppingCartOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function AdminDashboard() {
    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>仪表盘</Title>

            <Row gutter={16}>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="总客户数"
                            value={0}
                            prefix={<UserOutlined />}
                            suffix="位"
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="总订单量"
                            value={0}
                            prefix={<ShoppingCartOutlined />}
                            suffix="个"
                        />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card>
                        <Statistic
                            title="已完成订单"
                            value={0}
                            valueStyle={{ color: '#3f8600' }}
                            prefix={<CheckCircleOutlined />}
                        />
                    </Card>
                </Col>
            </Row>

            <div style={{ marginTop: 24 }}>
                <Card title="快捷操作">
                    <p>正在开发中...</p>
                </Card>
            </div>
        </div>
    );
}
