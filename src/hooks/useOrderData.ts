/**
 * useOrderData Hook
 * 
 * 负责订单数据的获取和更新
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import type { OrderFormData } from '@/types/order';
import { validateOrderForm, ValidationErrors } from '@/utils/validation';
import { orderApi } from '@/lib/api';

export interface UseOrderDataResult {
    loading: boolean;
    orderData: OrderFormData | null;
    errors: ValidationErrors;
    hasUnsavedChanges: boolean;
    setOrderData: React.Dispatch<React.SetStateAction<OrderFormData | null>>;
    setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
    setHasUnsavedChanges: React.Dispatch<React.SetStateAction<boolean>>;
    updateFormData: (field: keyof OrderFormData, value: any) => void;
    handleBlur: (field: keyof OrderFormData) => void;
    resetUnsavedChanges: () => void;
    initialDataRef: React.MutableRefObject<string | null>;
}

export function useOrderData(
    uuid: string,
    salesToken: string | null,
    dingtalkUserId: string | undefined,
    onError: (msg: string) => void
): UseOrderDataResult {
    const [loading, setLoading] = useState(true);
    const [orderData, setOrderData] = useState<OrderFormData | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});

    const initialDataRef = useRef<string | null>(null);
    const isLoadingRef = useRef(false);
    const latestOrderDataRef = useRef<OrderFormData | null>(null);

    // Sync ref when orderData changes
    useEffect(() => {
        latestOrderDataRef.current = orderData;
    }, [orderData]);

    // Load order data from API
    const loadOrderData = useCallback(async () => {
        if (isLoadingRef.current) return;

        if (!dingtalkUserId) {
            console.warn('[useOrderData] Missing dingtalkUserId, skipping load');
            setLoading(false);
            return;
        }

        isLoadingRef.current = true;

        try {
            setLoading(true);
            // 使用统一的 API 客户端
            const data = await orderApi.getOrder(uuid, {
                salesToken: salesToken || undefined,
                dingtalkUserId
            });
            setOrderData(data);
            initialDataRef.current = JSON.stringify(data);
        } catch (error) {
            console.error('Failed to load order:', error);
            onError('加载订单数据失败');
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [uuid, salesToken, dingtalkUserId, onError]);

    // Initial load
    useEffect(() => {
        if (uuid && dingtalkUserId) {
            loadOrderData();
        }
    }, [uuid, dingtalkUserId, loadOrderData]);

    // Update form field
    const updateFormData = useCallback((field: keyof OrderFormData, value: any) => {
        setOrderData(prev => {
            if (!prev) return null;
            const newData = { ...prev, [field]: value };
            latestOrderDataRef.current = newData;
            return newData;
        });

        // Clear field error on change (except for complex fields)
        if (field !== 'sampleList' && errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }

        setHasUnsavedChanges(true);
    }, [errors]);

    // Blur validation
    const handleBlur = useCallback((field: keyof OrderFormData) => {
        const dataToValidate = latestOrderDataRef.current || orderData;
        if (!dataToValidate) return;

        const currentErrors = validateOrderForm(dataToValidate, { validateRequiredFields: false });
        const fieldError = currentErrors[field];

        setErrors(prev => {
            if (fieldError) {
                return { ...prev, [field]: fieldError };
            } else if (prev[field]) {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            }
            return prev;
        });
    }, [orderData]);

    // Reset unsaved changes flag
    const resetUnsavedChanges = useCallback(() => {
        setHasUnsavedChanges(false);
        if (orderData) {
            initialDataRef.current = JSON.stringify(orderData);
        }
    }, [orderData]);

    return {
        loading,
        orderData,
        errors,
        hasUnsavedChanges,
        setOrderData,
        setErrors,
        setHasUnsavedChanges,
        updateFormData,
        handleBlur,
        resetUnsavedChanges,
        initialDataRef
    };
}
