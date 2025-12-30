/**
 * useOrderValidation.ts - 订单校验 Hook
 *
 * 职责: 表单校验逻辑
 * - 字段级校验 (onBlur 触发)
 * - 全量校验 (提交时触发)
 * - 错误状态管理
 *
 * 提取自 useOrderLogic.tsx，实现关注点分离。
 */

import { useState, useCallback } from 'react';
import type { OrderFormData } from '@/types/order';
import { validateOrderForm, ValidationErrors } from '@/utils/validation';

// ============================================================
// 类型定义
// ============================================================

/**
 * Hook 返回值类型
 */
export interface UseOrderValidationResult {
    /** 当前错误状态 */
    errors: ValidationErrors;

    /** 校验单个字段 (用于 onBlur) */
    validateField: (field: keyof OrderFormData, data: OrderFormData | null) => void;

    /** 校验所有字段 (用于提交前) */
    validateAll: (data: OrderFormData) => ValidationErrors;

    /** 清除指定字段的错误 */
    clearFieldError: (field: keyof OrderFormData) => void;

    /** 清除所有错误 */
    clearAllErrors: () => void;

    /** 设置错误状态 */
    setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 订单校验 Hook
 *
 * 提供字段级和全量校验功能
 *
 * @returns 校验相关状态和函数
 *
 * @example
 * ```tsx
 * const { errors, validateField, validateAll, clearFieldError } = useOrderValidation();
 *
 * // 字段失焦时校验
 * const handleBlur = (field: keyof OrderFormData) => {
 *   validateField(field, formData);
 * };
 *
 * // 提交前全量校验
 * const handleSubmit = () => {
 *   const newErrors = validateAll(formData);
 *   if (Object.keys(newErrors).length > 0) {
 *     // 显示错误
 *     return;
 *   }
 *   // 继续提交
 * };
 * ```
 */
export function useOrderValidation(): UseOrderValidationResult {
    // ========================================
    // State
    // ========================================
    const [errors, setErrors] = useState<ValidationErrors>({});

    // ========================================
    // 校验单个字段
    // ========================================
    /**
     * 校验单个字段
     *
     * 通常在 onBlur 时调用，只校验格式，不校验必填
     *
     * @param field - 字段名
     * @param data - 当前表单数据
     */
    const validateField = useCallback((
        field: keyof OrderFormData,
        data: OrderFormData | null
    ) => {
        if (!data) return;

        // 运行校验 - 编辑时只校验格式，不校验必填
        const currentErrors = validateOrderForm(data, { validateRequiredFields: false });
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
    }, []);

    // ========================================
    // 全量校验
    // ========================================
    /**
     * 校验所有字段
     *
     * 通常在提交前调用，包括必填校验
     *
     * @param data - 当前表单数据
     * @returns 错误对象
     */
    const validateAll = useCallback((data: OrderFormData): ValidationErrors => {
        const newErrors = validateOrderForm(data, { validateRequiredFields: true });
        setErrors(newErrors);
        return newErrors;
    }, []);

    // ========================================
    // 清除错误
    // ========================================
    /**
     * 清除指定字段的错误
     *
     * 通常在用户开始编辑该字段时调用
     *
     * @param field - 字段名
     */
    const clearFieldError = useCallback((field: keyof OrderFormData) => {
        setErrors(prev => {
            if (prev[field]) {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            }
            return prev;
        });
    }, []);

    /**
     * 清除所有错误
     *
     * 通常在提交成功后调用
     */
    const clearAllErrors = useCallback(() => {
        setErrors({});
    }, []);

    // ========================================
    // 返回
    // ========================================
    return {
        errors,
        validateField,
        validateAll,
        clearFieldError,
        clearAllErrors,
        setErrors
    };
}
