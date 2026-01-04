/**
 * API Client
 * 
 * 统一的 API 请求封装
 * - 自动添加认证 header
 * - 统一错误处理
 * - 类型安全
 */
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { supabase } from '@/lib/supabase';

// ============================================
// 类型定义
// ============================================

export interface ApiResponse<T = any> {
    data?: T;
    error?: string;
    errorCode?: string;
}

export interface ApiError {
    message: string;
    code?: string;
    status?: number;
}

// ============================================
// API 实例
// ============================================

const api = axios.create({
    baseURL: '',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
});

// ============================================
// 请求拦截器 - 自动添加认证
// ============================================

api.interceptors.request.use(async (config) => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            config.headers.Authorization = `Bearer ${session.access_token}`;
        }
    } catch (e) {
        console.warn('[API] Failed to get session:', e);
    }
    return config;
});

// ============================================
// 响应拦截器 - 统一错误处理
// ============================================

api.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ error?: string; message?: string }>) => {
        const apiError: ApiError = {
            message: error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                '请求失败',
            status: error.response?.status
        };
        return Promise.reject(apiError);
    }
);

// ============================================
// 便捷方法
// ============================================

/**
 * GET 请求
 */
export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
}

/**
 * POST 请求
 */
export async function post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
}

/**
 * PUT 请求
 */
export async function put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
}

/**
 * DELETE 请求
 */
export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
}

// ============================================
// 订单相关 API
// ============================================

import type { OrderFormData } from '@/types/order';

export const orderApi = {
    /**
     * 获取订单
     */
    async getOrder(uuid: string, options?: {
        salesToken?: string;
        dingtalkUserId?: string
    }): Promise<OrderFormData> {
        return get<OrderFormData>(`/api/order/${uuid}`, {
            params: { s_token: options?.salesToken },
            headers: options?.dingtalkUserId ? { 'X-DingTalk-UserId': options.dingtalkUserId } : {}
        });
    },

    /**
     * 暂存订单
     */
    async saveOrder(uuid: string, data: OrderFormData): Promise<{ success: boolean }> {
        return post(`/api/order/${uuid}/save`, data);
    },

    /**
     * 提交订单
     */
    async submitOrder(uuid: string, data: OrderFormData, options?: {
        salesToken?: string;
        dingtalkUserId?: string;
    }): Promise<{ success: boolean; tableStatus?: string }> {
        return post(`/api/order/${uuid}/submit`, {
            ...data,
            _salesToken: options?.salesToken,
            _dingtalkUserId: options?.dingtalkUserId
        });
    },

    /**
     * 检查认证
     */
    async checkAuth(uuid: string, options?: {
        salesToken?: string;
        dingtalkUserId?: string;
    }): Promise<{
        authType: 'login' | 'register';
        phone: string;
        customerName: string;
        phoneReadOnly: boolean;
        orderUuid: string;
    }> {
        const url = options?.salesToken
            ? `/api/order/${uuid}/check-auth?s_token=${options.salesToken}`
            : `/api/order/${uuid}/check-auth`;

        return get(url, {
            headers: options?.dingtalkUserId ? { 'X-DingTalk-UserId': options.dingtalkUserId } : {}
        });
    },

    /**
     * 检查销售认证
     */
    async checkAuthSales(uuid: string): Promise<{
        authType: 'login' | 'register' | 'no_account';
        phone: string;
        salesmanName: string;
    }> {
        return get(`/api/order/${uuid}/check-auth-sales`);
    }
};

// ============================================
// 用户相关 API
// ============================================

export const userApi = {
    /**
     * 获取用户订单列表
     */
    async getOrders(): Promise<OrderFormData[]> {
        return get('/api/user/orders');
    }
};

// 导出默认实例
export default api;
