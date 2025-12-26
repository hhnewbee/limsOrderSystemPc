import React, { useEffect, useState } from 'react';
import { UserOutlined, BellOutlined, LogoutOutlined, DownOutlined, FolderOutlined } from '@ant-design/icons';
import { Avatar, Badge, Tag, Dropdown, MenuProps } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './Header.module.scss';

interface PageStatus {
    text: string;
    color: string;
    icon: React.ReactNode;
}

interface HeaderProps {
    status?: PageStatus | null;
    onToggleProjectList?: () => void;
}

// 接收 status 参数
export default function Header({ status, onToggleProjectList }: HeaderProps) {
    const [userTitle, setUserTitle] = useState('当前客户');
    const router = useRouter();

    useEffect(() => {
        const getUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // Prefer name from metadata, fallback to phone
                const metadata = session.user.user_metadata;
                const name = metadata?.name;
                const phone = session.user.email?.replace('@client.lims', '');

                setUserTitle(name || phone || '当前用户');
            }
        };
        getUser();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    const items: MenuProps['items'] = [
        {
            key: 'projects',
            label: '项目列表',
            icon: <FolderOutlined />,
            onClick: () => onToggleProjectList?.()
        },
        {
            type: 'divider'
        },
        {
            key: 'logout',
            label: '退出登录',
            icon: <LogoutOutlined />,
            onClick: handleLogout,
            danger: true
        }
    ];

    return (
        <header className={styles.header}>
            {/* 左侧：Logo 和 标题 */}
            <div className={styles.leftSection}>
                <div className={styles.logoBox}>L</div>
                <h1 className={styles.systemTitle}>
                    LIMS <span>|</span> 客户端下单系统
                </h1>
            </div>

            {/* 右侧：状态 + 用户信息 */}
            <div className={styles.rightSection}>
                {/* 新增：状态显示区域 */}
                {status && (
                    <div className={styles.statusBadge}>
                        <span className={styles.statusLabel}>当前状态:</span>
                        {/* 这里直接使用 Ant Design 的 Tag 组件，或者自定义样式 */}
                        <Tag color={status.color} style={{ margin: 0, fontSize: '14px', padding: '4px 10px' }}>
                            {status.icon} {status.text}
                        </Tag>
                    </div>
                )}

                <div className={styles.divider}></div>

                <Badge count={0} size="small" offset={[-2, 2]}>
                    <BellOutlined style={{ fontSize: '18px', color: '#666', cursor: 'pointer' }} />
                </Badge>

                <Dropdown menu={{ items }} placement="bottomRight" arrow>
                    <div className={styles.userInfo} style={{ cursor: 'pointer' }}>
                        <Avatar
                            style={{ backgroundColor: '#f56a00' }}
                            size="small"
                            icon={<UserOutlined />}
                        />
                        <span className={styles.userName}>{userTitle}</span>
                        <DownOutlined style={{ fontSize: 10, marginLeft: 4, color: '#999' }} />
                    </div>
                </Dropdown>
            </div>
        </header>
    );
}

