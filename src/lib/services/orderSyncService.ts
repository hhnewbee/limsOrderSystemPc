/**
 * Order Sync Service
 * 
 * 封装订单获取和同步逻辑，统一处理：
 * - 本地数据库查询
 * - 钉钉数据同步
 * - 用户自动绑定
 */
import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';
import { dbToApp, appToDb } from '@/lib/converters';
import type { DBOrder, DBSample, DBPairwise, DBMultiGroup, OrderFormData } from '@/types/order';

// ============================================
// 类型定义
// ============================================

export interface OrderWithRelations extends DBOrder {
    sample_list?: DBSample[];
    pairwise_comparison?: DBPairwise[];
    multi_group_comparison?: DBMultiGroup[];
}

export interface GetOrderResult {
    order: OrderFormData | null;
    source: 'db' | 'dingtalk' | null;
    error?: string;
    errorCode?: string;
}

export interface SyncOptions {
    /** 钉钉用户ID (必须提供才能调用钉钉接口) */
    dingtalkUserId?: string;
    /** 强制从钉钉同步，即使本地有数据 */
    forceSync?: boolean;
    /** 如果同步后需要绑定给某用户 */
    bindToUserId?: string;
}

// ============================================
// 核心函数
// ============================================

/**
 * 获取订单数据 (优先数据库，fallback 钉钉)
 * 
 * @param uuid 订单UUID
 * @param options 同步选项
 * @returns 订单数据和来源
 */
export async function getOrderFromDbOrDingTalk(
    uuid: string,
    options: SyncOptions = {}
): Promise<GetOrderResult> {
    const { dingtalkUserId, forceSync = false, bindToUserId } = options;

    try {
        // 1. 先查本地数据库
        if (!forceSync) {
            const dbResult = await getOrderFromDb(uuid);
            if (dbResult && hasValidData(dbResult)) {
                return {
                    order: dbToApp(dbResult),
                    source: 'db'
                };
            }
        }

        // 2. 本地没数据，从钉钉同步
        if (!dingtalkUserId) {
            return {
                order: null,
                source: null,
                error: '链接无效：缺少必要的身份标识参数 (UD)',
                errorCode: 'MISSING_DINGTALK_USER_ID'
            };
        }

        console.log('[OrderSyncService] 从钉钉获取订单:', uuid);
        const syncResult = await syncOrderFromDingTalk(uuid, dingtalkUserId, bindToUserId);

        if (!syncResult.success) {
            return {
                order: null,
                source: null,
                error: syncResult.error || '订单不存在',
                errorCode: 'NOT_FOUND'
            };
        }

        // 3. 返回同步后的数据
        const newDbResult = await getOrderFromDb(uuid);
        return {
            order: newDbResult ? dbToApp(newDbResult) : null,
            source: 'dingtalk'
        };

    } catch (error: any) {
        console.error('[OrderSyncService] 获取订单失败:', error);
        return {
            order: null,
            source: null,
            error: error.message
        };
    }
}

/**
 * 从数据库获取订单（含子表）
 */
export async function getOrderFromDb(uuid: string): Promise<OrderWithRelations | null> {
    const { data: order } = await supabase
        .from('orders')
        .select(`
            *,
            sample_list(*),
            pairwise_comparison(*),
            multi_group_comparison(*)
        `)
        .eq('uuid', uuid)
        .maybeSingle();

    return order as OrderWithRelations | null;
}

/**
 * 检查订单是否有有效数据
 */
export function hasValidData(order: OrderWithRelations | null): boolean {
    return !!(order && order.customer_name);
}

/**
 * 从钉钉同步订单到本地数据库
 * 
 * @param uuid 订单UUID
 * @param dingtalkUserId 钉钉用户ID
 * @param bindToUserId 可选，绑定给某用户
 * @returns 同步结果
 */
export async function syncOrderFromDingTalk(
    uuid: string,
    dingtalkUserId: string,
    bindToUserId?: string
): Promise<{ success: boolean; orderId?: number; error?: string }> {
    try {
        // 1. 从钉钉获取数据
        const yidaData = await searchFormData(uuid, dingtalkUserId);
        const parsedData = parseYidaFormData(yidaData);

        if (!parsedData) {
            return { success: false, error: '订单不存在' };
        }

        // 2. 删除旧的空订单（如果存在）
        await supabase.from('orders').delete().eq('uuid', uuid);

        // 3. 确定绑定用户
        let finalUserId = bindToUserId;
        if (!finalUserId && parsedData.customerPhone) {
            finalUserId = await findUserIdByPhone(parsedData.customerPhone);
        }

        // 4. 转换并插入数据库
        const dbData = appToDb({
            ...parsedData,
            uuid: uuid,
            status: 'draft',
        });

        const insertPayload = {
            ...dbData,
            user_id: finalUserId || null
        };

        const { data: newOrder, error: insertError } = await supabase
            .from('orders')
            .insert(insertPayload)
            .select('id')
            .single();

        if (insertError) {
            return { success: false, error: `初始化订单失败: ${insertError.message}` };
        }

        console.log(`[OrderSyncService] 订单同步成功: ${uuid}, orderId: ${newOrder.id}`);
        return { success: true, orderId: newOrder.id };

    } catch (error: any) {
        console.error('[OrderSyncService] 同步失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 根据手机号查找用户ID
 */
export async function findUserIdByPhone(phone: string): Promise<string | null> {
    try {
        const virtualEmail = `${phone.trim()}@client.lims`;
        const { data: user } = await supabaseAdmin
            .schema('auth')
            .from('users')
            .select('id')
            .eq('email', virtualEmail)
            .maybeSingle();

        return user?.id || null;
    } catch (error) {
        console.warn('[OrderSyncService] 查找用户失败:', error);
        return null;
    }
}

/**
 * 绑定订单到用户
 */
export async function bindOrderToUser(uuid: string, userId: string): Promise<boolean> {
    const { error } = await supabase
        .from('orders')
        .update({ user_id: userId })
        .eq('uuid', uuid);

    if (error) {
        console.error('[OrderSyncService] 绑定订单失败:', error);
        return false;
    }

    console.log(`[OrderSyncService] 订单 ${uuid} 已绑定到用户 ${userId}`);
    return true;
}
