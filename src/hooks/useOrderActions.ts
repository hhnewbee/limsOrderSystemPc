/**
 * useOrderActions Hook
 * 
 * 负责订单的保存和提交操作
 */
import { useState, useCallback } from 'react';
import axios from 'axios';
import type { OrderFormData } from '@/types/order';
import { ORDER_STATUS } from '@/constants/orderStatus';
import { validateOrderForm, ValidationErrors } from '@/utils/validation';

// 字段名称映射 (用于错误提示)
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
            await axios.post(`/api/order/${uuid}/save`, orderData);
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

            // Build error message
            const errorFields = Object.keys(newErrors)
                .filter(key => key !== 'sampleList')
                .map(key => FIELD_NAME_MAP[key] || key);

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
                    const response = await axios.post(`/api/order/${uuid}/submit`, {
                        ...orderData,
                        _salesToken: salesToken,
                        _dingtalkUserId: dingtalkUserId
                    });

                    message.success('提交成功');

                    setOrderData(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            status: ORDER_STATUS.SUBMITTED,
                            tableStatus: response.data.tableStatus || prev.tableStatus
                        };
                    });
                    resetUnsavedChanges();
                    setErrors({});
                } catch (error: any) {
                    console.error('[Submit] Failed:', error);
                    const errorMessage = error.response?.data?.error || error.message || '提交失败';
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
