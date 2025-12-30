/**
 * useOrderLogic.tsx - 订单业务逻辑 Hook (组合层)
 *
 * 职责: 组合各个专用 Hook，提供完整的订单操作功能
 * - 数据获取 (useOrderData)
 * - 表单状态 (useOrderForm)
 * - 校验逻辑 (useOrderValidation)
 * - 保存/提交操作
 * - 页面状态计算
 *
 * 原始文件: 306 行 -> 重构后: ~200 行
 */

import React, { useCallback, useState } from 'react';
import axios from 'axios';
import {
    CheckCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    SaveOutlined,
    CloudUploadOutlined
} from "@ant-design/icons";

// 类型
import type { OrderFormData } from '@/types/order';
import { ORDER_STATUS, EDITABLE_STATUSES } from '@/constants/orderStatus';

// 组合的 Hooks
import { useOrderData } from './useOrderData';
import { useOrderForm } from './useOrderForm';
import { useOrderValidation } from './useOrderValidation';

// ============================================================
// 类型定义
// ============================================================

/**
 * Hook 返回值类型
 */
interface UseOrderLogicResult {
    /** 是否正在加载 */
    loading: boolean;

    /** 是否正在保存 */
    saving: boolean;

    /** 是否正在提交 */
    submitting: boolean;

    /** 订单数据 */
    orderData: OrderFormData | null;

    /** 校验错误 */
    errors: Record<string, any>;

    /** 是否有未保存的更改 */
    hasUnsavedChanges: boolean;

    /** 是否可编辑 */
    isEditable: boolean;

    /** 页面状态 (用于显示状态标签) */
    pageStatus: {
        text: string;
        color: string;
        icon: React.ReactNode;
    } | null;

    /** 更新表单字段 */
    updateFormData: (field: keyof OrderFormData, value: any) => void;

    /** 字段失焦处理 */
    handleBlur: (field: keyof OrderFormData) => void;

    /** 保存操作 */
    handleSave: () => Promise<void>;

    /** 提交操作 */
    handleSubmit: () => Promise<void>;
}

// ============================================================
// 字段名称映射 (用于错误提示)
// ============================================================

const FIELD_NAME_MAP: Record<string, string> = {
    speciesName: '物种名称',
    speciesLatinName: '物种拉丁名',
    sampleType: '样本类型',
    sampleTypeDetail: '样本类型详述',
    remainingSampleHandling: '剩余样品处理方式',
    detectionQuantity: '检测数量',
    shippingMethod: '运送方式',
    expressCompanyWaybill: '快递公司及运单号',
    shippingTime: '送样时间',
    sampleList: '样本清单'
};

// ============================================================
// Hook 实现
// ============================================================

/**
 * 订单业务逻辑 Hook
 *
 * 组合 useOrderData、useOrderForm、useOrderValidation，
 * 并添加保存/提交等业务操作
 *
 * @param uuid - 订单 UUID
 * @param message - Ant Design message 实例
 * @param modal - Ant Design modal 实例
 * @param salesToken - 销售端 Token (可选)
 * @param dingtalkUserId - 钉钉用户ID (必需)
 * @returns 完整的订单操作接口
 *
 * @example
 * ```tsx
 * const {
 *   loading,
 *   orderData,
 *   errors,
 *   isEditable,
 *   updateFormData,
 *   handleBlur,
 *   handleSave,
 *   handleSubmit
 * } = useOrderLogic(uuid, message, modal, salesToken, dingtalkUserId);
 * ```
 */
export function useOrderLogic(
    uuid: string,
    message: any,
    modal: any,
    salesToken: string | null = null,
    dingtalkUserId?: string
): UseOrderLogicResult {
    // ========================================
    // 组合 Hooks
    // ========================================

    // 数据获取
    const {
        orderData: fetchedData,
        loading,
        setOrderData
    } = useOrderData(uuid, dingtalkUserId, salesToken);

    // 表单状态
    const {
        formData,
        hasUnsavedChanges,
        updateField,
        setFormData,
        markAsSaved,
        latestDataRef
    } = useOrderForm(fetchedData);

    // 校验
    const {
        errors,
        validateField,
        validateAll,
        clearFieldError,
        clearAllErrors,
        setErrors
    } = useOrderValidation();

    // 操作状态
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // 使用 formData 作为主要数据源，如果还没初始化就用 fetchedData
    const orderData = formData || fetchedData;

    // ========================================
    // 更新表单数据
    // ========================================
    const updateFormData = useCallback((field: keyof OrderFormData, value: any) => {
        updateField(field, value);

        // 用户修改时立即清除该字段的错误 (提升体验)
        // 但 sampleList 是复杂对象，修改某行不应清除整个列表的错误
        if (field !== 'sampleList') {
            clearFieldError(field);
        }
    }, [updateField, clearFieldError]);

    // ========================================
    // 失焦校验
    // ========================================
    const handleBlur = useCallback((field: keyof OrderFormData) => {
        // 使用 ref 获取最新数据，避免闭包问题
        validateField(field, latestDataRef.current);
    }, [validateField, latestDataRef]);

    // ========================================
    // 保存 (暂存)
    // ========================================
    const handleSave = async () => {
        if (!orderData) return;

        try {
            setSaving(true);
            await axios.post(`/api/order/${uuid}/save`, orderData);
            message.success('暂存成功');
            markAsSaved();
        } catch (error) {
            console.error('[useOrderLogic] 暂存失败:', error);
            message.error('暂存失败');
        } finally {
            setSaving(false);
        }
    };

    // ========================================
    // 提交
    // ========================================
    const handleSubmit = async () => {
        if (!orderData) return;

        // 全量校验
        const newErrors = validateAll(orderData);

        if (Object.keys(newErrors).length > 0) {
            // 生成错误提示信息
            const errorFields = Object.keys(newErrors)
                .filter(key => key !== 'sampleList')
                .map(key => FIELD_NAME_MAP[key] || key);

            if (newErrors.sampleList) {
                const errorRowCount = Object.keys(newErrors.sampleList).length;
                errorFields.push(`样本清单(${errorRowCount}行有错误)`);
            }

            const errorMessage = errorFields.length > 0
                ? `以下字段有问题：${errorFields.join('、')}`
                : '请检查表单填写是否正确';

            message.error(errorMessage);
            return;
        }

        // 确认提交
        modal.confirm({
            title: '确认提交',
            content: '提交后将无法修改，确定要提交吗？',
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
                try {
                    setSubmitting(true);

                    const response = await axios.post(`/api/order/${uuid}/submit`, {
                        ...orderData,
                        _salesToken: salesToken,
                        _dingtalkUserId: dingtalkUserId
                    });

                    message.success('提交成功');

                    // 更新状态
                    setFormData(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            status: ORDER_STATUS.SUBMITTED,
                            tableStatus: response.data.tableStatus || prev.tableStatus
                        };
                    });

                    markAsSaved();
                    clearAllErrors();

                } catch (error: any) {
                    console.error('[useOrderLogic] 提交失败:', error);
                    const errorMessage = error.response?.data?.error || error.message || '提交失败';
                    message.error(errorMessage);
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    // ========================================
    // 计算页面状态
    // ========================================
    const getPageStatus = () => {
        if (!orderData) return null;

        // 已提交状态
        if (orderData.status === ORDER_STATUS.SUBMITTED) {
            // 被驳回/需修改
            if (orderData.tableStatus === ORDER_STATUS.CUSTOMER_MODIFYING ||
                orderData.tableStatus === ORDER_STATUS.REJECTED ||
                orderData.tableStatus === ORDER_STATUS.REJECTED_AUDIT) {
                return {
                    text: '被驳回 / 需修改',
                    color: 'error',
                    icon: <ExclamationCircleOutlined />
                };
            }
            // 等待审核
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
            }
            return {
                text: '已暂存 / 草稿',
                color: 'processing',
                icon: <SaveOutlined />
            };
        }

        // 其他状态
        return {
            text: orderData.tableStatus || '查看模式',
            color: 'default',
            icon: <CloudUploadOutlined />
        };
    };

    // ========================================
    // 返回
    // ========================================
    return {
        loading,
        saving,
        submitting,
        orderData,
        errors,
        hasUnsavedChanges,
        isEditable: orderData ? EDITABLE_STATUSES.includes(orderData.tableStatus || '') : false,
        pageStatus: getPageStatus(),
        updateFormData,
        handleBlur,
        handleSave,
        handleSubmit
    };
}