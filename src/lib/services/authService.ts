/**
 * Auth Service
 * 
 * 封装认证和权限相关逻辑：
 * - 订单访问权限检查
 * - 用户认证类型判断
 * - 用户查找
 */
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';
import type { OrderFormData } from '@/types/order';

// ============================================
// 类型定义
// ============================================

export type UserRole = 'admin' | 'sales' | 'lab' | 'customer';

export interface UserContext {
    userId: string;
    role: UserRole;
    phone: string | null;
}

export interface OrderAccessResult {
    allowed: boolean;
    reason?: string;
    shouldBind?: boolean;  // 是否应该绑定用户
}

export interface AuthCheckResult {
    authType: 'login' | 'register';
    phone: string;
    customerName: string;
    phoneReadOnly: boolean;
    orderUuid: string;
}

// ============================================
// 权限检查
// ============================================

/**
 * 检查用户是否有权访问订单
 * 
 * 权限规则：
 * - Admin: 可访问所有订单
 * - Lab: 不能访问客户订单页（应使用 /lab/samples）
 * - Sales: 只能访问自己的订单（salesmanContact 匹配）
 * - Customer: 只能访问自己的订单（userId 或 customerPhone 匹配）
 */
export function checkOrderAccess(
    order: { user_id?: string | null; customer_phone?: string | null; salesman_contact?: string | null },
    user: UserContext
): OrderAccessResult {
    const { userId, role, phone: userPhone } = user;

    // Admin - 允许一切
    if (role === 'admin') {
        return { allowed: true };
    }

    // Lab - 不能访问客户订单页
    if (role === 'lab') {
        return {
            allowed: false,
            reason: 'Lab users cannot access customer orders. Please use /lab/samples'
        };
    }

    // Sales - 检查 salesmanContact
    if (role === 'sales') {
        if (order.salesman_contact && order.salesman_contact !== userPhone) {
            return {
                allowed: false,
                reason: 'Order belongs to another salesman'
            };
        }
        return { allowed: true };
    }

    // Customer - 检查 userId 或 customerPhone
    if (order.user_id) {
        // 订单已有归属
        if (order.user_id !== userId) {
            return {
                allowed: false,
                reason: 'Order belongs to another user'
            };
        }
        return { allowed: true };
    } else {
        // 订单无归属，检查手机号
        if (order.customer_phone && order.customer_phone !== userPhone) {
            return {
                allowed: false,
                reason: 'Order belongs to another customer'
            };
        }
        // 手机号匹配，建议绑定
        return { allowed: true, shouldBind: true };
    }
}

/**
 * 检查从钉钉获取的订单数据的访问权限
 */
export function checkDingTalkOrderAccess(
    parsedData: { customerPhone?: string; salesmanContact?: string },
    user: UserContext
): OrderAccessResult {
    const { role, phone: userPhone } = user;

    if (role === 'admin') {
        return { allowed: true };
    }

    if (role === 'sales') {
        const salesContact = parsedData.salesmanContact?.trim();
        if (salesContact && salesContact !== userPhone) {
            return {
                allowed: false,
                reason: 'Order belongs to another salesman'
            };
        }
        return { allowed: true };
    }

    // Customer
    const orderPhone = parsedData.customerPhone?.trim();
    if (orderPhone && orderPhone !== userPhone) {
        return {
            allowed: false,
            reason: 'Order belongs to another customer'
        };
    }
    return { allowed: true, shouldBind: true };
}

// ============================================
// 认证类型判断
// ============================================

/**
 * 获取订单的认证类型（用于 check-auth API）
 * 
 * 返回用户应该 login 还是 register
 */
export async function getAuthTypeForOrder(
    uuid: string,
    dingtalkUserId?: string
): Promise<AuthCheckResult | { error: string; status: number }> {
    try {
        // 1. 先查本地数据库
        const { data: order } = await supabase
            .from('orders')
            .select('uuid, user_id, customer_phone, customer_name')
            .eq('uuid', uuid)
            .maybeSingle();

        let customerPhone: string | null = null;
        let customerName: string | null = null;
        let boundUserId: string | null = null;

        if (order) {
            boundUserId = order.user_id;
            customerPhone = order.customer_phone;
            customerName = order.customer_name;
        } else if (dingtalkUserId) {
            // 2. 从钉钉获取
            console.log('[AuthService] Order not in DB, fetching from DingTalk...');
            const yidaData = await searchFormData(uuid, dingtalkUserId);
            const parsedData = parseYidaFormData(yidaData);

            if (!parsedData) {
                return { error: '订单不存在', status: 404 };
            }

            customerPhone = parsedData.customerPhone || null;
            customerName = parsedData.customerName || null;
        } else {
            return { error: '订单未找到，请通过钉钉链接访问', status: 400 };
        }

        if (!customerPhone) {
            return { error: '订单中无客户手机信息', status: 400 };
        }

        // 3. 检查订单是否已绑定用户
        if (boundUserId) {
            const phone = await getPhoneByUserId(boundUserId);
            if (phone) {
                return {
                    authType: 'login',
                    phone,
                    customerName: customerName || '',
                    phoneReadOnly: true,
                    orderUuid: uuid
                };
            }
        }

        // 4. 检查手机号是否已有账号
        const existingUser = await findUserByPhone(customerPhone);
        if (existingUser) {
            return {
                authType: 'login',
                phone: customerPhone,
                customerName: customerName || '',
                phoneReadOnly: true,
                orderUuid: uuid
            };
        }

        // 5. 需要注册
        return {
            authType: 'register',
            phone: customerPhone,
            customerName: customerName || '',
            phoneReadOnly: true,
            orderUuid: uuid
        };

    } catch (error: any) {
        console.error('[AuthService] getAuthTypeForOrder error:', error);
        return { error: error.message, status: 500 };
    }
}

// ============================================
// 用户查找
// ============================================

/**
 * 根据手机号查找用户
 */
export async function findUserByPhone(phone: string): Promise<{ id: string; email: string } | null> {
    try {
        const virtualEmail = `${phone.trim()}@client.lims`;
        const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error || !usersData?.users) {
            return null;
        }

        const user = usersData.users.find((u: any) => u.email === virtualEmail);
        return user ? { id: user.id, email: user.email! } : null;
    } catch (error) {
        console.error('[AuthService] findUserByPhone error:', error);
        return null;
    }
}

/**
 * 根据用户ID获取手机号
 */
export async function getPhoneByUserId(userId: string): Promise<string | null> {
    try {
        const { data: user } = await supabaseAdmin
            .schema('auth')
            .from('users')
            .select('email')
            .eq('id', userId)
            .maybeSingle();

        if (user?.email) {
            return user.email.replace('@client.lims', '');
        }
        return null;
    } catch (error) {
        console.error('[AuthService] getPhoneByUserId error:', error);
        return null;
    }
}

/**
 * 从请求头获取用户上下文
 */
export async function getUserContextFromToken(token: string): Promise<UserContext | null> {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
        return null;
    }

    return {
        userId: user.id,
        role: (user.user_metadata?.role as UserRole) || 'customer',
        phone: user.email?.replace('@client.lims', '') || null
    };
}
