/**
 * useOrderActions Hook
 * 
 * 负责订单的保存和提交操作
 */
import { useState, useCallback } from 'react';
import type { OrderFormData } from '@/types/order';
import { ORDER_STATUS } from '@/constants/orderStatus';
import { validateOrderForm, ValidationErrors, getErrorFieldNames } from '@/utils/validation';
import { orderApi } from '@/lib/api';

export interface UseOrderActionsProps {
    uuid: string;
    orderData: OrderFormData | null;
    salesToken: string | null;
    dingtalkUserId: string | undefined;
    setOrderData: React.Dispatch<React.SetStateAction<OrderFormData | null>>;
    setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
    resetUnsavedChanges: () => void;
    message: { success: (msg: string) => void; error: (msg: string) => void };
    modal: { confirm: (config: any) => void };
}

export interface UseOrderActionsResult {
    saving: boolean;
    submitting: boolean;
    handleSave: () => Promise<void>;
    handleSubmit: () => Promise<void>;
}

export function useOrderActions({
    uuid,
    orderData,
    salesToken,
    dingtalkUserId,
    setOrderData,
    setErrors,
    resetUnsavedChanges,
    message,
    modal
}: UseOrderActionsProps): UseOrderActionsResult {
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Save draft
    const handleSave = useCallback(async () => {
        if (!orderData) return;

        try {
            setSaving(true);
            await orderApi.saveOrder(uuid, orderData);
            message.success('暂存成功');
            resetUnsavedChanges();
        } catch (error) {
            console.error('Save failed:', error);
            message.error('暂存失败');
        } finally {
            setSaving(false);
        }
    }, [uuid, orderData, message, resetUnsavedChanges]);

    // Submit order
    const handleSubmit = useCallback(async () => {
        if (!orderData) return;

        // Full validation
        const newErrors = validateOrderForm(orderData, { validateRequiredFields: true });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);

            // 使用统一的 getErrorFieldNames 获取错误字段名称
            const errorFields = getErrorFieldNames(newErrors);

            if (newErrors.sampleList) {
                const errorRowCount = Object.keys(newErrors.sampleList).length;
                errorFields.push(`样本清单(${errorRowCount}行有错误)`);
            }

            message.error(
                errorFields.length > 0
                    ? `以下字段有问题：${errorFields.join('、')}`
                    : '请检查表单填写是否正确'
            );
            return;
        }

        // Confirm and submit
        modal.confirm({
            title: '确认提交',
            content: '提交后将无法修改，确定要提交吗？',
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
                try {
                    setSubmitting(true);
                    const response = await orderApi.submitOrder(uuid, orderData, {
                        salesToken: salesToken || undefined,
                        dingtalkUserId
                    });

                    message.success('提交成功');

                    setOrderData(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            status: ORDER_STATUS.SUBMITTED,
                            tableStatus: response.tableStatus || prev.tableStatus
                        };
                    });
                    resetUnsavedChanges();
                    setErrors({});
                } catch (error: any) {
                    console.error('[Submit] Failed:', error);
                    const errorMessage = error.message || '提交失败';
                    message.error(errorMessage);
                } finally {
                    setSubmitting(false);
                }
            }
        });
    }, [uuid, orderData, salesToken, dingtalkUserId, setOrderData, setErrors, resetUnsavedChanges, message, modal]);

    return {
        saving,
        submitting,
        handleSave,
        handleSubmit
    };
}
