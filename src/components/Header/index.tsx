import React, { useEffect, useState } from 'react';
import { UserOutlined, BellOutlined, LogoutOutlined, DownOutlined, FolderOutlined } from '@ant-design/icons';
import { Avatar, Badge, Dropdown, MenuProps } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import styles from './Header.module.scss';

interface HeaderProps {
    onToggleProjectList?: () => void;
}

export default function Header({ onToggleProjectList }: HeaderProps) {
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

