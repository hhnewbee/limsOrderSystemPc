/**
 * useOrderData.ts - 订单数据获取 Hook
 *
 * 职责: 纯数据获取，不涉及表单状态或校验
 * - 从 API 获取订单数据
 * - 处理加载状态
 * - 处理错误状态
 *
 * 提取自 useOrderLogic.tsx，实现关注点分离。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import type { OrderFormData } from '@/types/order';

// ============================================================
// 类型定义
// ============================================================

/**
 * Hook 返回值类型
 */
export interface UseOrderDataResult {
    /** 订单数据 */
    orderData: OrderFormData | null;

    /** 是否正在加载 */
    loading: boolean;

    /** 错误信息 */
    error: string | null;

    /** 重新加载数据 */
    refetch: () => Promise<void>;

    /** 更新订单数据 (用于本地修改后同步状态) */
    setOrderData: React.Dispatch<React.SetStateAction<OrderFormData | null>>;
}

// ============================================================
// Hook 实现
// ============================================================

/**
 * 订单数据获取 Hook
 *
 * 自动从 API 获取订单数据，处理认证 token 传递
 *
 * @param uuid - 订单 UUID
 * @param dingtalkUserId - 钉钉用户ID (必需)
 * @param salesToken - 销售端 Token (可选)
 * @returns 订单数据和加载状态
 *
 * @example
 * ```tsx
 * const { orderData, loading, error, refetch } = useOrderData(
 *   uuid,
 *   dingtalkUserId,
 *   salesToken
 * );
 *
 * if (loading) return <Spin />;
 * if (error) return <Alert message={error} type="error" />;
 * ```
 */
export function useOrderData(
    uuid: string,
    dingtalkUserId?: string,
    salesToken?: string | null
): UseOrderDataResult {
    // ========================================
    // State
    // ========================================
    const [orderData, setOrderData] = useState<OrderFormData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 防止重复请求
    const isLoadingRef = useRef(false);

    // ========================================
    // 数据加载函数
    // ========================================
    const loadOrderData = useCallback(async () => {
        // 防止重复请求
        if (isLoadingRef.current) return;

        // 必须有 dingtalkUserId 才能发起请求
        if (!dingtalkUserId) {
            console.warn('[useOrderData] 缺少 dingtalkUserId，跳过数据加载');
            setLoading(false);
            return;
        }

        isLoadingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            // 获取用户认证 token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // 发起 API 请求
            const response = await axios.get<OrderFormData>(`/api/order/${uuid}`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : undefined,
                    'X-DingTalk-UserId': dingtalkUserId
                },
                params: {
                    s_token: salesToken
                }
            });

            setOrderData(response.data);
            console.log('[useOrderData] 订单数据加载成功');

        } catch (err: any) {
            console.error('[useOrderData] 加载订单数据失败:', err);
            const errorMessage = err.response?.data?.error || err.message || '加载订单数据失败';
            setError(errorMessage);
        } finally {
            setLoading(false);
            isLoadingRef.current = false;
        }
    }, [uuid, dingtalkUserId, salesToken]);

    // ========================================
    // 自动加载
    // ========================================
    useEffect(() => {
        if (uuid && dingtalkUserId) {
            loadOrderData();
        }
    }, [uuid, dingtalkUserId, loadOrderData]);

    // ========================================
    // 返回
    // ========================================
    return {
        orderData,
        loading,
        error,
        refetch: loadOrderData,
        setOrderData
    };
}
