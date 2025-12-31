/**
 * orderSyncService.ts - 订单同步服务
 *
 * 🎉 简化版 - 使用统一的 camelCase 字段名
 * 
 * 负责从钉钉宜搭同步订单数据，以及用户自动绑定逻辑。
 * 
 * @see .agent/architecture/field-schema-design.md
 */

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchFormData, parseYidaFormData, updateFormData } from '@/lib/dingtalk';
import { processYidaData } from '@/lib/converters';
import type { OrderData, SampleItem, PairwiseItem, MultiGroupItem } from '@/types/order';
import type { AuthContext } from './authService';

// ============================================================
// 类型定义
// ============================================================

/**
 * 完整的订单数据 (包含关联表)
 */
export interface FullOrderData extends OrderData {
    sampleList: SampleItem[];
    pairwiseComparison: PairwiseItem[];
    multiGroupComparison: MultiGroupItem[];
}

/**
 * 同步结果
 */
export interface SyncResult {
    success: boolean;
    order?: FullOrderData;
    error?: string;
    statusCode?: number;
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 从数据库获取订单及其关联数据
 */
export async function fetchOrderFromDB(uuid: string): Promise<FullOrderData | null> {
    const { data: rawOrder } = await supabase
        .from('orders')
        .select(`
            *,
            sampleList:sample_list(*),
            pairwiseComparison:pairwise_comparison(*),
            multiGroupComparison:multi_group_comparison(*)
        `)
        .eq('uuid', uuid)
        .maybeSingle();

    return rawOrder as FullOrderData | null;
}

/**
 * 检查订单是否有有效数据
 */
export function hasValidOrderData(order: FullOrderData | null): boolean {
    return !!(order && order.customerName);
}

/**
 * 从钉钉宜搭同步订单数据
 */
export async function syncOrderFromDingTalk(
    uuid: string,
    dingtalkUserId: string,
    auth: AuthContext
): Promise<SyncResult> {
    console.log('[OrderSyncService] 本地无数据，尝试从钉钉获取...');

    if (!dingtalkUserId) {
        console.error('[OrderSyncService] 无法同步钉钉数据：缺少 UD 参数');
        return {
            success: false,
            error: '链接无效：缺少必要的身份标识参数 (UD)',
            statusCode: 400
        };
    }

    try {
        // 1. 调用钉钉 API 获取数据
        const yidaData = await searchFormData(uuid, dingtalkUserId);
        const parsedData = parseYidaFormData(yidaData);

        if (!parsedData) {
            return {
                success: false,
                error: '订单不存在',
                statusCode: 404
            };
        }

        // 2. 处理类型转换 (字段名已统一，无需映射)
        const orderData = processYidaData({
            ...parsedData,
            uuid: uuid,
            status: 'draft',
        }, parsedData.formInstanceId);

        // 3. 自动绑定用户
        const autoBindUserId = await resolveUserBinding(parsedData, auth);

        // 4. 使用 upsert 插入或更新数据库
        const upsertPayload = {
            ...orderData,
            userId: autoBindUserId
        };

        const { data: newOrder, error: upsertError } = await supabase
            .from('orders')
            .upsert(upsertPayload, {
                onConflict: 'uuid',
                ignoreDuplicates: false
            })
            .select()
            .single();

        if (upsertError) {
            throw new Error(`初始化/更新订单失败: ${upsertError.message}`);
        }

        // 5. 更新钉钉 TableStatus (首次加载时)
        if (parsedData.formInstanceId && parsedData.tableStatus === '客户待编辑') {
            try {
                await updateFormData(
                    parsedData.formInstanceId,
                    { tableStatus: '客户编辑中' },
                    dingtalkUserId
                );
                console.log(`[OrderSyncService] 已更新钉钉 tableStatus 为"客户编辑中"`);
                newOrder.tableStatus = '客户编辑中';
            } catch (updateError) {
                console.warn('[OrderSyncService] 更新钉钉 tableStatus 失败:', updateError);
            }
        }

        // 6. 返回完整订单结构
        const fullOrder: FullOrderData = {
            ...newOrder,
            sampleList: [],
            pairwiseComparison: [],
            multiGroupComparison: []
        };

        console.log(`[OrderSyncService] 成功从钉钉同步订单 ${uuid}`);
        return { success: true, order: fullOrder };

    } catch (error: any) {
        console.error('[OrderSyncService] 钉钉同步失败:', error);
        return {
            success: false,
            error: error.message || '钉钉数据同步失败',
            statusCode: 500
        };
    }
}

/**
 * 解析用户绑定
 */
async function resolveUserBinding(
    parsedData: { customerPhone?: string },
    auth: AuthContext
): Promise<string | null> {
    // 1. 如果当前用户已登录且是客户，绑定到当前用户
    if (auth.userId && (auth.userRole === 'customer' || !auth.userRole)) {
        console.log(`[OrderSyncService] 绑定到当前登录用户 ${auth.userId}`);
        return auth.userId;
    }

    // 2. 如果有客户手机号，尝试查找已存在的用户
    if (parsedData.customerPhone) {
        try {
            const phone = parsedData.customerPhone.trim();
            const virtualEmail = `${phone}@client.lims`;

            const { data: foundUser } = await supabaseAdmin
                .schema('auth')
                .from('users')
                .select('id')
                .eq('email', virtualEmail)
                .maybeSingle();

            if (foundUser) {
                console.log(`[OrderSyncService] 自动绑定到已有用户: ${phone} (${foundUser.id})`);
                return foundUser.id;
            }
        } catch (e) {
            console.warn('[OrderSyncService] 查找用户失败:', e);
        }
    }

    return null;
}

/**
 * 将订单绑定到用户
 */
export async function claimOrderForUser(uuid: string, userId: string): Promise<void> {
    console.log(`[OrderSyncService] 将订单 ${uuid} 绑定到用户 ${userId}`);
    await supabase.from('orders').update({ userId: userId }).eq('uuid', uuid);
}
