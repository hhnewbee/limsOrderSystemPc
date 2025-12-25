'use client';

import React, { useState } from 'react';
import { Layout, Menu, Button, message } from 'antd';
import {
    UserOutlined,
    OrderedListOutlined,
    LogoutOutlined,
    DashboardOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AdminGuard from '@/components/AdminGuard';

const { Header, Sider, Content } = Layout;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    // If on login page, don't show layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const menuItems = [
        {
            key: '/admin',
            icon: <DashboardOutlined />,
            label: <Link href="/admin">概览</Link>,
        },
        {
            key: '/admin/users',
            icon: <UserOutlined />,
            label: <Link href="/admin/users">客户管理</Link>,
        },
        {
            key: '/admin/orders',
            icon: <OrderedListOutlined />,
            label: <Link href="/admin/orders">订单管理</Link>,
        },
    ];

    return (
        <AdminGuard>
            <Layout style={{ minHeight: '100vh' }}>
                <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
                    <div style={{
                        height: 32,
                        margin: 16,
                        background: 'rgba(255, 255, 255, 0.2)',
                        textAlign: 'center',
                        color: 'white',
                        lineHeight: '32px',
                        fontWeight: 'bold'
                    }}>
                        {collapsed ? 'LIMS' : 'LIMS 管理后台'}
                    </div>
                    <Menu
                        theme="dark"
                        mode="inline"
                        selectedKeys={[pathname]}
                        items={menuItems}
                    />
                </Sider>
                <Layout>
                    <Header style={{ padding: '0 24px', background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
                            退出登录
                        </Button>
                    </Header>
                    <Content style={{ margin: '16px' }}>
                        <div style={{ padding: 24, minHeight: 360, background: '#fff', borderRadius: 8 }}>
                            {children}
                        </div>
                    </Content>
                </Layout>
            </Layout>
        </AdminGuard>
    );
}
