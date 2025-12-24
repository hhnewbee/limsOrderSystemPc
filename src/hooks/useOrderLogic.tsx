// src/hooks/useOrderLogic.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
    CheckCircleOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    SaveOutlined,
    CloudUploadOutlined
} from "@ant-design/icons";
import type { OrderFormData } from '@/types/order';
import { ORDER_STATUS, EDITABLE_STATUSES } from '@/constants/orderStatus';
import { validateOrderForm, ValidationErrors } from '@/utils/validation';

interface UseOrderLogicResult {
    loading: boolean;
    saving: boolean;
    submitting: boolean;
    orderData: OrderFormData | null;
    errors: ValidationErrors;
    hasUnsavedChanges: boolean;
    isEditable: boolean;
    pageStatus: {
        text: string;
        color: string;
        icon: React.ReactNode;
    } | null;
    updateFormData: (field: keyof OrderFormData, value: any) => void;
    handleBlur: (field: keyof OrderFormData) => void; // 🟢 暴露 handleBlur
    handleSave: () => Promise<void>;
    handleSubmit: () => Promise<void>;
}

export function useOrderLogic(
    uuid: string,
    message: any,
    modal: any
): UseOrderLogicResult {

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [orderData, setOrderData] = useState<OrderFormData | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});

    const initialDataRef = useRef<string | null>(null);
    const isLoadingRef = useRef(false);

    // --- 1. 加载数据 ---
    const loadOrderData = useCallback(async () => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            setLoading(true);
            const response = await axios.get<OrderFormData>(`/api/order/${uuid}`);
            setOrderData(response.data);
            initialDataRef.current = JSON.stringify(response.data);
        } catch (error) {
            console.error('加载订单数据失败:', error);
            message.error('加载订单数据失败');
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [uuid, message]);

    useEffect(() => {
        if (uuid) {
            loadOrderData();
        }
    }, [uuid, loadOrderData]);

    // --- 2. 脏检查 ---
    // --- 2. 脏检查 (优化：增加 500ms 防抖，避免打字卡顿) ---
    useEffect(() => {
        if (orderData && initialDataRef.current) {
            const timer = setTimeout(() => {
                const currentData = JSON.stringify(orderData);
                setHasUnsavedChanges(currentData !== initialDataRef.current);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [orderData]);

    // --- 3. 页面离开拦截 ---
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges && orderData?.status !== ORDER_STATUS.SUBMITTED) {
                e.preventDefault();
                e.returnValue = '您有未保存的更改，确定要离开吗？';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges, orderData?.status]);

    // --- 4. 数据更新 (onChange) ---
    const updateFormData = useCallback((field: keyof OrderFormData, value: any) => {
        setOrderData(prev => {
            if (!prev) return null;
            return { ...prev, [field]: value };
        });

        // 🟢 优化：用户一旦开始修改，立即清除该字段的错误提示 (提升体验)
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    // --- 5. 失焦校验 (onBlur) ---
    const handleBlur = useCallback((field: keyof OrderFormData) => {
        if (!orderData) return;

        // 运行全量校验（纯函数，很快）
        const currentErrors = validateOrderForm(orderData);
        const fieldError = currentErrors[field];

        setErrors(prev => {
            // 如果该字段有错，更新进去
            if (fieldError) {
                return { ...prev, [field]: fieldError };
            }
            // 如果该字段校验通过，且之前有错，则清除它
            else if (prev[field]) {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            }
            return prev;
        });
    }, [orderData]);

    // --- 6. 保存 (暂存) ---
    const handleSave = async () => {
        if (!orderData) return;
        try {
            setSaving(true);
            await axios.post(`/api/order/${uuid}/save`, orderData);
            message.success('暂存成功');
            initialDataRef.current = JSON.stringify(orderData);
            setHasUnsavedChanges(false);
        } catch (error) {
            console.error('暂存失败:', error);
            message.error('暂存失败');
        } finally {
            setSaving(false);
        }
    };

    // --- 7. 提交 (Submit - 全量校验) ---
    const handleSubmit = async () => {
        if (!orderData) return;

        const newErrors = validateOrderForm(orderData);

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            message.error('请检查表单填写是否正确');
            return;
        }

        modal.confirm({
            title: '确认提交',
            content: '提交后将无法修改，确定要提交吗？',
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
                try {
                    setSubmitting(true);
                    const response = await axios.post(`/api/order/${uuid}/submit`, orderData);
                    message.success('提交成功');

                    setOrderData(prev => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            status: ORDER_STATUS.SUBMITTED,
                            tableStatus: response.data.tableStatus || prev.tableStatus
                        };
                    });
                    setHasUnsavedChanges(false);
                    setErrors({});
                } catch (error: any) {
                    console.error('[前端] 提交失败:', error);
                    const errorMessage = error.response?.data?.error || error.message || '提交失败';
                    message.error(errorMessage);
                } finally {
                    setSubmitting(false);
                }
            }
        });
    };

    // --- 8. 计算页面状态 UI ---
    const getPageStatus = () => {
        if (!orderData) return null;

        if (orderData.status === ORDER_STATUS.SUBMITTED) {
            if (orderData.tableStatus === ORDER_STATUS.CUSTOMER_MODIFYING ||
                orderData.tableStatus === ORDER_STATUS.REJECTED ||
                orderData.tableStatus === ORDER_STATUS.REJECTED_AUDIT) {
                return {
                    text: '被驳回 / 需修改',
                    color: 'error',
                    icon: <ExclamationCircleOutlined />
                };
            }
            return {
                text: '已提交 / 等待审核',
                color: 'success',
                icon: <CheckCircleOutlined />
            };
        }

        // 显式断言为 string[]，解决 TS 类型不匹配问题
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

        return {
            text: orderData.tableStatus || '查看模式',
            color: 'default',
            icon: <CloudUploadOutlined />
        };
    };

    return {
        loading, saving, submitting, orderData, errors, hasUnsavedChanges,
        isEditable: orderData ? EDITABLE_STATUSES.includes(orderData.tableStatus || '') : false,
        pageStatus: getPageStatus(),
        updateFormData,
        handleBlur,
        handleSave,
        handleSubmit
    };
}