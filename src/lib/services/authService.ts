/**
 * authService.ts - 认证与授权服务
 *
 * 负责从请求中提取认证信息，并进行订单访问权限校验。
 * 提取自 /api/order/[uuid]/route.ts，实现关注点分离。
 */

import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';
import type { DBOrder } from '@/types/order';

// ============================================================
// 类型定义
// ============================================================

/**
 * 认证上下文 - 包含从请求中提取的所有认证相关信息
 */
export interface AuthContext {
    /** 销售端操作员ID (从加密的 s_token 解密得到) */
    operatorId: string | null;

    /** 用户ID (从 Supabase session 获取) */
    userId: string | null;

    /** 用户角色: 'admin' | 'sales' | 'lab' | 'customer' */
    userRole: 'admin' | 'sales' | 'lab' | 'customer' | null;

    /** 用户手机号 (从 email 提取，格式: phone@client.lims) */
    userPhone: string | null;

    /** 钉钉用户ID (从 X-DingTalk-UserId header 获取) */
    dingtalkUserId: string | undefined;
}

/**
 * 权限校验结果
 */
export interface AccessCheckResult {
    /** 是否允许访问 */
    allowed: boolean;

    /** 拒绝原因 (allowed=false 时有值) */
    reason?: string;

    /** HTTP 状态码 */
    statusCode?: number;

    /** 是否需要将订单绑定到当前用户 */
    shouldClaimOrder?: boolean;
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 从请求中提取认证上下文
 *
 * 处理两种认证方式:
 * 1. Sales Token (s_token 查询参数) - 销售端访问
 * 2. Bearer Token (Authorization header) - 用户登录访问
 *
 * @param request - Next.js 请求对象
 * @returns 认证上下文对象
 *
 * @example
 * ```ts
 * const auth = await extractAuthContext(request);
 * if (!auth.operatorId && !auth.userId) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 * ```
 */
export async function extractAuthContext(request: NextRequest): Promise<AuthContext> {
    const context: AuthContext = {
        operatorId: null,
        userId: null,
        userRole: null,
        userPhone: null,
        dingtalkUserId: undefined
    };

    // 1. 提取钉钉用户ID
    context.dingtalkUserId = request.headers.get('X-DingTalk-UserId') || undefined;

    // 2. 尝试解密销售端 Token
    const salesToken = request.nextUrl.searchParams.get('s_token');
    if (salesToken) {
        try {
            const decrypted = decrypt(salesToken);
            if (decrypted) {
                context.operatorId = decrypted;
                console.log(`[AuthService] 销售端访问，操作员: ${context.operatorId}`);
            }
        } catch (e) {
            console.warn('[AuthService] 无效的销售端 Token');
        }
    }

    // 3. 尝试从 Bearer Token 获取用户信息
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (user && !error) {
            context.userId = user.id;
            context.userRole = (user.user_metadata?.role || 'customer') as AuthContext['userRole'];
            context.userPhone = user.email?.replace('@client.lims', '') || null;
            console.log(`[AuthService] 用户访问，ID: ${context.userId}, 角色: ${context.userRole}`);
        }
    }

    return context;
}

/**
 * 校验用户对订单的访问权限
 *
 * 基于用户角色进行分层权限检查:
 * - Admin: 可访问所有订单
 * - Lab: 禁止访问客户订单页面 (应使用 /lab/samples)
 * - Sales: 只能访问自己负责的订单 (salesman_contact 匹配)
 * - Customer: 只能访问自己的订单 (user_id 或 customer_phone 匹配)
 *
 * @param order - 数据库订单对象
 * @param auth - 认证上下文
 * @returns 权限校验结果
 *
 * @example
 * ```ts
 * const accessResult = validateOrderAccess(order, auth);
 * if (!accessResult.allowed) {
 *   return NextResponse.json({ error: accessResult.reason }, { status: accessResult.statusCode });
 * }
 * ```
 */
export function validateOrderAccess(order: DBOrder, auth: AuthContext): AccessCheckResult {
    // 销售端 Token 访问 - 直接允许
    if (auth.operatorId) {
        return { allowed: true };
    }

    // 未登录 - 拒绝访问
    if (!auth.userId) {
        return {
            allowed: false,
            reason: 'Unauthorized: Please login first',
            statusCode: 401
        };
    }

    // 根据角色进行权限检查
    switch (auth.userRole) {
        case 'admin':
            // 管理员可访问所有订单
            console.log(`[AuthService] 管理员访问订单`);
            return { allowed: true };

        case 'lab':
            // 实验室人员禁止访问客户订单页面
            console.log(`[AuthService] 实验室用户 ${auth.userId} 尝试访问订单页面 - 拒绝`);
            return {
                allowed: false,
                reason: 'Forbidden: Lab users cannot access customer orders. Please use /lab/samples',
                statusCode: 403
            };

        case 'sales':
            // 销售只能访问自己负责的订单
            if (order.salesman_contact !== auth.userPhone) {
                return {
                    allowed: false,
                    reason: 'Forbidden: Order belongs to another salesman',
                    statusCode: 403
                };
            }
            console.log(`[AuthService] 销售访问自己的订单`);
            return { allowed: true };

        case 'customer':
        default:
            // 客户权限检查
            return validateCustomerAccess(order, auth);
    }
}

/**
 * 校验客户对订单的访问权限
 *
 * 逻辑:
 * 1. 订单已有 user_id -> 必须与当前用户匹配
 * 2. 订单无 user_id 但有 customer_phone -> 手机号必须匹配，匹配后自动绑定
 * 3. 订单无任何标识 -> 允许访问并绑定
 *
 * @param order - 数据库订单对象
 * @param auth - 认证上下文
 * @returns 权限校验结果
 */
function validateCustomerAccess(order: DBOrder, auth: AuthContext): AccessCheckResult {
    // 订单已有所有者
    if (order.user_id) {
        if (order.user_id !== auth.userId) {
            return {
                allowed: false,
                reason: 'Forbidden: Order belongs to another user',
                statusCode: 403
            };
        }
        return { allowed: true };
    }

    // 订单无所有者，检查手机号是否匹配
    const orderPhone = order.customer_phone;
    if (orderPhone && orderPhone !== auth.userPhone) {
        console.log(`[AuthService] 手机号不匹配: 订单=${orderPhone}, 用户=${auth.userPhone}`);
        return {
            allowed: false,
            reason: 'Forbidden: Order belongs to another customer',
            statusCode: 403
        };
    }

    // 手机号匹配或无手机号 -> 允许访问并标记需要绑定
    console.log(`[AuthService] 需要将订单绑定到用户 ${auth.userId}`);
    return {
        allowed: true,
        shouldClaimOrder: true
    };
}

/**
 * 校验从钉钉同步的订单数据的访问权限
 *
 * 与 validateOrderAccess 类似，但针对从钉钉解析的数据格式
 *
 * @param parsedData - 从钉钉解析的订单数据
 * @param auth - 认证上下文
 * @returns 权限校验结果
 */
export function validateDingTalkOrderAccess(
    parsedData: { customerPhone?: string; salesmanContact?: string },
    auth: AuthContext
): AccessCheckResult {
    // 管理员可访问所有订单
    if (auth.userRole === 'admin') {
        console.log(`[AuthService] 管理员访问钉钉订单`);
        return { allowed: true };
    }

    // 销售端检查
    if (auth.userRole === 'sales') {
        const salesContact = parsedData.salesmanContact?.trim();
        if (salesContact && salesContact !== auth.userPhone) {
            console.log(`[AuthService] 销售订单不匹配: salesmanContact=${salesContact}, user=${auth.userPhone}`);
            return {
                allowed: false,
                reason: 'Forbidden: Order belongs to another salesman',
                statusCode: 403
            };
        }
        console.log(`[AuthService] 销售 ${auth.userPhone} 访问钉钉订单`);
        return { allowed: true };
    }

    // 客户端检查
    if (auth.userId) {
        const orderPhone = parsedData.customerPhone?.trim();
        if (orderPhone && orderPhone !== auth.userPhone) {
            console.log(`[AuthService] 钉钉订单手机号不匹配: order=${orderPhone}, user=${auth.userPhone}`);
            return {
                allowed: false,
                reason: 'Forbidden: Order belongs to another customer',
                statusCode: 403
            };
        }
        return { allowed: true, shouldClaimOrder: true };
    }

    return { allowed: true };
}
