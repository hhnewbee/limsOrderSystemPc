/* src/components/ProjectInfoModule.tsx */
import React from 'react';
import styles from './ProjectInfoModule.module.scss';
import { OrderFormData } from '@/types/order';

interface ProjectInfoModuleProps {
    data?: OrderFormData;
}

export default function ProjectInfoModule({ data }: ProjectInfoModuleProps) {
    // 如果没有数据，不渲染任何内容
    if (!data) return null;

    // 辅助渲染函数
    const renderRow = (label: string, value: React.ReactNode) => (
        <div className={styles.row}>
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>
                {value || <span className={styles.empty}>-</span>}
            </span>
        </div>
    );

    return (
        <div className={styles.infoBlock}>
            <div className={styles.header}>项目信息</div>
            <div className={styles.content}>
                {renderRow("业务员姓名", data.salesmanName)}
                {renderRow("业务员联系方式", data.salesmanContact)}
                {renderRow("检测服务费单价（元/样本）", data.unitPrice)}
                {renderRow("其他费用", data.otherExpenses)}
            </div>
        </div>
    );
}
