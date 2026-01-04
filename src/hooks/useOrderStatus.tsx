/**
 * useOrderStatus Hook
 * 
 * 负责订单页面状态的计算
 */
import React from 'react';
import {
    CheckCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    SaveOutlined,
    CloudUploadOutlined
} from "@ant-design/icons";
import type { OrderFormData } from '@/types/order';
import { ORDER_STATUS, EDITABLE_STATUSES } from '@/constants/orderStatus';

export interface PageStatus {
    text: string;
    color: string;
    icon: React.ReactNode;
}

/**
 * 计算页面状态 UI
 */
export function getPageStatus(orderData: OrderFormData | null, hasUnsavedChanges: boolean): PageStatus | null {
    if (!orderData) return null;

    // 已提交状态
    if (orderData.status === ORDER_STATUS.SUBMITTED) {
        // 被驳回
        if (orderData.tableStatus === ORDER_STATUS.CUSTOMER_MODIFYING ||
            orderData.tableStatus === ORDER_STATUS.REJECTED ||
            orderData.tableStatus === ORDER_STATUS.REJECTED_AUDIT) {
            return {
                text: '被驳回 / 需修改',
                color: 'error',
                icon: <ExclamationCircleOutlined />
            };
        }
        // 正常提交
        return {
            text: '已提交 / 等待审核',
            color: 'success',
            icon: <CheckCircleOutlined />
        };
    }

    // 可编辑状态
    const isEditableStatus = EDITABLE_STATUSES.includes(orderData.tableStatus || '');

    if (isEditableStatus) {
        if (hasUnsavedChanges) {
            return {
                text: '编辑中 (未保存)',
                color: 'warning',
                icon: <EditOutlined />
            };
        } else {
            return {
                text: '已暂存 / 草稿',
                color: 'processing',
                icon: <SaveOutlined />
            };
        }
    }

    // 其他状态 (查看模式)
    return {
        text: orderData.tableStatus || '查看模式',
        color: 'default',
        icon: <CloudUploadOutlined />
    };
}

/**
 * 检查订单是否可编辑
 */
export function isOrderEditable(orderData: OrderFormData | null): boolean {
    if (!orderData) return false;
    return EDITABLE_STATUSES.includes(orderData.tableStatus || '');
}

/**
 * useOrderStatus Hook
 */
export function useOrderStatus(orderData: OrderFormData | null, hasUnsavedChanges: boolean) {
    return {
        pageStatus: getPageStatus(orderData, hasUnsavedChanges),
        isEditable: isOrderEditable(orderData)
    };
}
