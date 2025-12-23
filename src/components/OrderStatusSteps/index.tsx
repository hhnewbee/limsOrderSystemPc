import React, { useMemo } from 'react';
import { Steps, Card, ConfigProvider, Typography } from 'antd';
import {
    EditOutlined,
    AuditOutlined,
    InboxOutlined,
    ExperimentOutlined,
    BarChartOutlined,
    FileTextOutlined,
    PayCircleOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import styles from './index.module.scss';

interface OrderStatusStepsProps {
    /** 当前后端返回的状态字符串 */
    currentStatus: string;
    /** 订单完整数据，用于获取时间字段 */
    data: Record<string, any>;
}

// 定义步骤配置接口
interface StepConfigItem {
    key: string;
    future: string;   // 未到达时的文案 (e.g. 待审核)
    current: string;  // 当前状态文案 (e.g. 审核中)
    past: string;     // 通过后的文案 (e.g. 审核完成)
    icon: React.ReactNode;
    timeField?: string; // 对应 data 中的时间字段名
}

const OrderStatusSteps: React.FC<OrderStatusStepsProps> = ({ currentStatus, data }) => {

    // 1. 配置所有步骤的文案和图标
    const stepsConfig: StepConfigItem[] = [
        {
            key: 'edit',
            future: '编辑中', current: '编辑中', past: '已提交',
            icon: <EditOutlined />, timeField: 'submitTime'
        },
        {
            key: 'audit',
            future: '待审核', current: '审核中', past: '审核完成',
            icon: <AuditOutlined />, timeField: 'auditTime'
        },
        {
            key: 'receive',
            future: '待收样', current: '收样中', past: '已收样',
            icon: <InboxOutlined />, timeField: 'receiveSampleTime'
        },
        {
            key: 'test',
            future: '待检测', current: '检测中', past: '检测完成',
            icon: <ExperimentOutlined />, timeField: 'testTime'
        },
        {
            key: 'analysis',
            future: '待分析', current: '分析中', past: '分析完成',
            icon: <BarChartOutlined />, timeField: 'analysisTime'
        },
        {
            key: 'invoice',
            future: '待开票', current: '开票中', past: '已开票',
            icon: <FileTextOutlined />, timeField: 'invoiceTime'
        },
        {
            key: 'payment',
            future: '待付款', current: '确认中', past: '已付款',
            icon: <PayCircleOutlined />, timeField: 'paymentTime'
        },
        {
            key: 'delivery',
            future: '待交付', current: '交付中', past: '已交付',
            icon: <CheckCircleOutlined />, timeField: 'deliveryTime'
        },
    ];

    // 2. 计算当前步骤的索引和状态
    const { currentIndex, stepStatus } = useMemo(() => {
        // 状态映射表：后端状态 -> 步骤索引
        const statusIndexMap: Record<string, number> = {
            '编辑中': 0, '草稿': 0, '客户编辑中': 0,
            '待审核': 1, '审核中': 1, '审批中': 1,
            '待收样': 2, '已发货': 2,
            '已收样': 3, '收样完成': 3,
            '检测中': 4,
            '分析中': 5,
            '待开票': 6,
            '待付款': 7,
            '已交付': 8, '完成': 8
        };

        let index = statusIndexMap[currentStatus] ?? 0;
        let status: 'process' | 'error' | 'finish' | 'wait' = 'process';

        // 特殊逻辑：处理驳回/修改中
        if (currentStatus === '客户修改中' || currentStatus === '驳回') {
            index = 0; // 回到第一步
            status = 'error'; // 标红显示
        }
        // 如果是“已交付”，最后一步设为完成
        else if (index === stepsConfig.length - 1 && currentStatus === '已交付') {
            status = 'finish';
        }

        return { currentIndex: index, stepStatus: status };
    }, [currentStatus, stepsConfig.length]);

    // 3. 生成 Steps 数据项
    const items = stepsConfig.map((item, index) => {
        let title = item.future;
        let icon = item.icon;
        let description: React.ReactNode = null;

        // --- 文案逻辑 ---
        if (index < currentIndex) {
            // 过去状态
            title = item.past;
        } else if (index === currentIndex) {
            // 当前状态
            title = stepStatus === 'error' ? '需修改' : item.current;
            if (stepStatus === 'error') icon = <CloseCircleOutlined />;
        } else {
            // 未来状态
            title = item.future;
        }

        // --- 时间显示逻辑 ---
        if (item.timeField && data?.[item.timeField]) {
            const timeStr = dayjs(data[item.timeField]).format('MM-DD HH:mm');
            // 只有当前或过去的步骤才显示时间，或者你希望一直显示也可以
            if (index <= currentIndex) {
                description = (
                    <div className={styles.timeTag}>
                        <ClockCircleOutlined className={styles.timeIcon} /> {timeStr}
                    </div>
                );
            }
        }

        return {
            title,
            icon,
            description,
        };
    });

    return (
        <Card
            title="项目进度"
            size="small"
            className={styles.cardContainer}
            bordered={false}
        >
            <div className={styles.stepsWrapper}>
                <ConfigProvider
                    theme={{
                        components: {
                            Steps: {
                                iconSizeSM: 24, // 稍微调小图标
                                titleLineHeight: 24,
                                customIconFontSize: 14,
                                descriptionMaxWidth: 120,
                            },
                        },
                        token: {
                            // 调整连接线的颜色，使其在“未来”步骤不那么显眼
                            colorSplit: 'rgba(0, 0, 0, 0.06)',
                        }
                    }}
                >
                    <Steps
                        direction="vertical"
                        size="small"
                        current={currentIndex}
                        status={stepStatus} // 传递 error 或 process
                        items={items}
                    />
                </ConfigProvider>
            </div>
        </Card>
    );
};

export default OrderStatusSteps;