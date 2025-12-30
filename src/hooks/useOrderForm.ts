/**
 * useOrderForm.ts - 订单表单状态 Hook
 *
 * 职责: 表单状态管理
 * - 字段更新
 * - 脏检查 (是否有未保存的更改)
 * - 重置更改
 *
 * 提取自 useOrderLogic.tsx，实现关注点分离。
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { OrderFormData } from '@/types/order';

// ============================================================
// 类型定义
// ============================================================

/**
 * Hook 返回值类型
 */
export interface UseOrderFormResult {
    /** 当前表单数据 */
    formData: OrderFormData | null;

    /** 是否有未保存的更改 */
    hasUnsavedChanges: boolean;

    /** 更新表单字段 */
    updateField: (field: keyof OrderFormData, value: any) => void;

    /** 批量更新表单数据 */
    setFormData: React.Dispatch<React.SetStateAction<OrderFormData | null>>;

    /** 标记当前状态为已保存 (重置脏检查) */
    markAsSaved: () => void;

    /** 获取最新数据引用 (用于异步回调中获取最新值) */
    latestDataRef: React.RefObject<OrderFormData | null>;
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 订单表单状态 Hook
 *
 * 管理表单数据和脏检查状态
 *
 * @param initialData - 初始订单数据 (通常来自 useOrderData)
 * @returns 表单状态和操作函数
 *
 * @example
 * ```tsx
 * const { orderData } = useOrderData(uuid, dingtalkUserId);
 * const { formData, updateField, hasUnsavedChanges } = useOrderForm(orderData);
 *
 * // 更新字段
 * updateField('speciesName', '小鼠');
 *
 * // 检查是否有未保存更改
 * if (hasUnsavedChanges) {
 *   // 显示保存提示
 * }
 * ```
 */
export function useOrderForm(
    initialData: OrderFormData | null
): UseOrderFormResult {
    // ========================================
    // State
    // ========================================
    const [formData, setFormData] = useState<OrderFormData | null>(null);

    // 初始数据快照 (用于脏检查)
    const initialDataRef = useRef<string | null>(null);

    // 最新数据引用 (用于异步回调)
    const latestDataRef = useRef<OrderFormData | null>(null);

    // ========================================
    // 同步初始数据
    // ========================================
    useEffect(() => {
        if (initialData && !formData) {
            setFormData(initialData);
            initialDataRef.current = JSON.stringify(initialData);
            latestDataRef.current = initialData;
        }
    }, [initialData, formData]);

    // 同步最新数据到 ref
    useEffect(() => {
        latestDataRef.current = formData;
    }, [formData]);

    // ========================================
    // 脏检查
    // ========================================
    const hasUnsavedChanges = useMemo(() => {
        if (!formData || !initialDataRef.current) return false;

        // 简单的 JSON 比较 (对于复杂对象可能需要更精细的比较)
        const currentJson = JSON.stringify(formData);
        return currentJson !== initialDataRef.current;
    }, [formData]);

    // ========================================
    // 更新字段
    // ========================================
    const updateField = useCallback((field: keyof OrderFormData, value: any) => {
        setFormData(prev => {
            if (!prev) return null;

            const newData = { ...prev, [field]: value };
            latestDataRef.current = newData;
            return newData;
        });
    }, []);

    // ========================================
    // 标记为已保存
    // ========================================
    const markAsSaved = useCallback(() => {
        if (formData) {
            initialDataRef.current = JSON.stringify(formData);
        }
    }, [formData]);

    // ========================================
    // 返回
    // ========================================
    return {
        formData,
        hasUnsavedChanges,
        updateField,
        setFormData,
        markAsSaved,
        latestDataRef
    };
}
