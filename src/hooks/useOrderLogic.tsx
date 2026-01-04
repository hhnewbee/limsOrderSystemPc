/**
 * useOrderLogic Hook (Facade)
 * 
 * 组合多个子 Hook，提供统一的订单逻辑接口
 * 保持向后兼容，现有代码无需修改
 */
import React from 'react';
import type { OrderFormData } from '@/types/order';
import { ValidationErrors } from '@/utils/validation';
import { useOrderData } from './useOrderData';
import { useOrderActions } from './useOrderActions';
import { useOrderStatus, PageStatus } from './useOrderStatus';

export interface UseOrderLogicResult {
    loading: boolean;
    saving: boolean;
    submitting: boolean;
    orderData: OrderFormData | null;
    errors: ValidationErrors;
    hasUnsavedChanges: boolean;
    isEditable: boolean;
    pageStatus: PageStatus | null;
    updateFormData: (field: keyof OrderFormData, value: any) => void;
    handleBlur: (field: keyof OrderFormData) => void;
    handleSave: () => Promise<void>;
    handleSubmit: () => Promise<void>;
}

export function useOrderLogic(
    uuid: string,
    message: any,
    modal: any,
    salesToken: string | null = null,
    dingtalkUserId?: string
): UseOrderLogicResult {
    // 1. 数据层
    const {
        loading,
        orderData,
        errors,
        hasUnsavedChanges,
        setOrderData,
        setErrors,
        updateFormData,
        handleBlur,
        resetUnsavedChanges
    } = useOrderData(uuid, salesToken, dingtalkUserId, message.error);

    // 2. 操作层
    const { saving, submitting, handleSave, handleSubmit } = useOrderActions({
        uuid,
        orderData,
        salesToken,
        dingtalkUserId,
        setOrderData,
        setErrors,
        resetUnsavedChanges,
        message,
        modal
    });

    // 3. 状态层
    const { pageStatus, isEditable } = useOrderStatus(orderData, hasUnsavedChanges);

    return {
        loading,
        saving,
        submitting,
        orderData,
        errors,
        hasUnsavedChanges,
        isEditable,
        pageStatus,
        updateFormData,
        handleBlur,
        handleSave,
        handleSubmit
    };
}