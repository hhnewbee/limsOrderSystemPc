/**
 * API Auth Middleware
 * 
 * 可复用的 API 路由认证中间件
 * 封装常见的认证和权限检查逻辑
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { decrypt } from '@/lib/crypto';

// ============================================
// 类型定义
// ============================================

export type UserRole = 'admin' | 'sales' | 'lab' | 'customer';

export interface AuthContext {
    /** 是否已认证 */
    authenticated: boolean;
    /** 用户ID (如果已登录) */
    userId?: string;
    /** 用户角色 */
    role?: UserRole;
    /** 用户手机号 */
    userPhone?: string;
    /** 销售 Token 解密后的操作员ID */
    operatorId?: string;
    /** 钉钉用户ID (从 header 获取) */
    dingtalkUserId?: string;
    /** Supabase access token */
    accessToken?: string;
}

export interface AuthOptions {
    /** 是否要求登录 (默认 false) */
    requireAuth?: boolean;
    /** 允许的角色 (不指定则允许所有角色) */
    allowedRoles?: UserRole[];
    /** 是否允许销售 Token 访问 (默认 true) */
    allowSalesToken?: boolean;
}

// ============================================
// 核心中间件
// ============================================

/**
 * 从请求中提取认证上下文
 */
export async function getAuthContext(request: NextRequest): Promise<AuthContext> {
    const context: AuthContext = { authenticated: false };

    // 1. 提取钉钉用户ID
    const dingtalkUserId = request.headers.get('X-DingTalk-UserId');
    if (dingtalkUserId && dingtalkUserId.trim()) {
        context.dingtalkUserId = dingtalkUserId;
    }

    // 2. 检查销售 Token
    const salesToken = request.nextUrl.searchParams.get('s_token');
    if (salesToken) {
        try {
            const decrypted = decrypt(salesToken);
            if (decrypted) {
                context.operatorId = decrypted;
                context.authenticated = true;
            }
        } catch (e) {
            console.warn('[AuthMiddleware] Invalid sales token');
        }
    }

    // 3. 检查用户登录状态
    const authHeader = request.headers.get('Authorization');
    if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (user && !error) {
            context.authenticated = true;
            context.userId = user.id;
            context.role = (user.user_metadata?.role as UserRole) || 'customer';
            context.userPhone = user.email?.replace('@client.lims', '') || undefined;
            context.accessToken = token;
        }
    }

    return context;
}

/**
 * 认证检查 - 返回错误响应或 null (通过)
 */
export function checkAuth(
    context: AuthContext,
    options: AuthOptions = {}
): NextResponse | null {
    const { requireAuth = false, allowedRoles, allowSalesToken = true } = options;

    // 检查是否需要认证
    if (requireAuth) {
        // 销售 Token 优先
        if (allowSalesToken && context.operatorId) {
            return null; // 通过
        }

        // 用户登录检查
        if (!context.userId) {
            return NextResponse.json(
                { error: 'Unauthorized: Please login first' },
                { status: 401 }
            );
        }
    }

    // 角色检查
    if (allowedRoles && context.role) {
        if (!allowedRoles.includes(context.role)) {
            return NextResponse.json(
                { error: `Forbidden: ${context.role} role not allowed` },
                { status: 403 }
            );
        }
    }

    return null; // 通过
}

/**
 * 创建带认证的 API Handler
 * 
 * @example
 * export const GET = withAuth(
 *   async (request, context, authContext) => {
 *     // authContext 包含用户信息
 *     return NextResponse.json({ userId: authContext.userId });
 *   },
 *   { requireAuth: true }
 * );
 */
export function withAuth<T extends { params: Promise<any> }>(
    handler: (
        request: NextRequest,
        context: T,
        auth: AuthContext
    ) => Promise<NextResponse>,
    options: AuthOptions = {}
) {
    return async (request: NextRequest, context: T): Promise<NextResponse> => {
        try {
            // 获取认证上下文
            const authContext = await getAuthContext(request);

            // 检查认证
            const authError = checkAuth(authContext, options);
            if (authError) {
                return authError;
            }

            // 调用实际处理器
            return await handler(request, context, authContext);
        } catch (error: any) {
            console.error('[withAuth] Error:', error);
            return NextResponse.json(
                { error: 'Internal Server Error', details: error.message },
                { status: 500 }
            );
        }
    };
}

// ============================================
// 便捷函数
// ============================================

/**
 * 要求登录的中间件
 */
export function requireLogin<T extends { params: Promise<any> }>(
    handler: (request: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse>
) {
    return withAuth(handler, { requireAuth: true });
}

/**
 * 要求管理员的中间件
 */
export function requireAdmin<T extends { params: Promise<any> }>(
    handler: (request: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse>
) {
    return withAuth(handler, { requireAuth: true, allowedRoles: ['admin'] });
}

/**
 * 要求销售或管理员的中间件
 */
export function requireSalesOrAdmin<T extends { params: Promise<any> }>(
    handler: (request: NextRequest, context: T, auth: AuthContext) => Promise<NextResponse>
) {
    return withAuth(handler, { requireAuth: true, allowedRoles: ['admin', 'sales'] });
}
