'use client';

import React from 'react';
import styles from './ModuleCard.module.scss';

interface ModuleCardProps {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

/**
 * 通用模块卡片组件
 * @param {string} title - 模块标题
 * @param {React.ReactNode} icon - 标题左侧的图标
 * @param {React.ReactNode} children - 模块内容
 * @param {string} className - 额外的样式类名
 */
export default function ModuleCard({ title, icon, children, className = '' }: ModuleCardProps) {
    return (
        <div className={`${styles.card} ${className}`}>
            <div className={styles.header}>
                {icon && (
                    <div className={styles.iconWrapper}>
                        {icon}
                    </div>
                )}
                <h2 className={styles.title}>{title}</h2>
            </div>
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}
