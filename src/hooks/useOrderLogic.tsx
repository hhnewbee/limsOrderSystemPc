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
import { supabase } from '@/lib/supabase';

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
    handleBlur: (field: keyof OrderFormData) => void;
    handleSave: () => Promise<void>;
    handleSubmit: () => Promise<void>;
}

export function useOrderLogic(
    uuid: string,
    message: any,
    modal: any,
    salesToken: string | null = null // 🟢 Accept Sales Token
): UseOrderLogicResult {

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [orderData, setOrderData] = useState<OrderFormData | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});

    const initialDataRef = useRef<string | null>(null);
    const isLoadingRef = useRef(false);
    const latestOrderDataRef = useRef<OrderFormData | null>(null); // 🟢 Track latest data

    // ...

    // Sync ref when orderData changes (e.g. initial load)
    useEffect(() => {
        latestOrderDataRef.current = orderData;
    }, [orderData]);

    // --- 1. 加载数据 ---
    const loadOrderData = useCallback(async () => {
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;

        try {
            setLoading(true);
            // 🟢 Get Token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // Debug log


            const response = await axios.get<OrderFormData>(`/api/order/${uuid}`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined
                },
                params: {
                    s_token: salesToken // 🟢 Also pass sales token in query for GET checks
                }
            });
            setOrderData(response.data);
            initialDataRef.current = JSON.stringify(response.data);
        } catch (error) {
            console.error('加载订单数据失败:', error);
            message.error('加载订单数据失败');
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [uuid, message, salesToken]);

    useEffect(() => {
        if (uuid) {
            loadOrderData();
        }
    }, [uuid, loadOrderData]);

    // --- 2. 脏检查 (优化：增加 500ms 防抖，避免打字卡顿) ---

    // --- 4. 数据更新 (onChange) ---
    const updateFormData = useCallback((field: keyof OrderFormData, value: any) => {
        setOrderData(prev => {
            if (!prev) return null;
            const newData = { ...prev, [field]: value };
            latestOrderDataRef.current = newData; // 🟢 Update Ref immediately
            return newData;
        });

        // 🟢 优化：用户一旦开始修改，立即清除该字段的错误提示 (提升体验)
        // 但对于 sampleList，因为是复杂对象，修改某行不应清除整个列表的错误
        if (field !== 'sampleList' && errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    }, [errors]);

    // --- 5. 失焦校验 (onBlur) ---
    const handleBlur = useCallback((field: keyof OrderFormData) => {
        // Use Ref to get the absolutely latest data, avoiding closure staleness
        const dataToValidate = latestOrderDataRef.current || orderData;
        if (!dataToValidate) return;

        // 运行校验 - 编辑时只校验格式，不校验必填
        const currentErrors = validateOrderForm(dataToValidate, { validateRequiredFields: false });
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
    }, [orderData]); // Keep orderData dep for safety, though ref handles the value

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

        // 提交时进行全量校验（包括必填项）
        const newErrors = validateOrderForm(orderData, { validateRequiredFields: true });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);

            // 字段名称映射
            const fieldNameMap: Record<string, string> = {
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

            // 获取错误字段的中文名称
            const errorFields = Object.keys(newErrors)
                .filter(key => key !== 'sampleList')
                .map(key => fieldNameMap[key] || key);

            // 如果样本清单有错误，添加提示
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

        modal.confirm({
            title: '确认提交',
            content: '提交后将无法修改，确定要提交吗？',
            okText: '确定',
            cancelText: '取消',
            onOk: async () => {
                try {
                    setSubmitting(true);
                    // 🟢 Pass salesToken to backend
                    const response = await axios.post(`/api/order/${uuid}/submit`, {
                        ...orderData,
                        _salesToken: salesToken
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