/**
 * orderSyncService.ts - 订单同步服务
 *
 * 负责从钉钉宜搭同步订单数据，以及用户自动绑定逻辑。
 * 提取自 /api/order/[uuid]/route.ts，实现关注点分离。
 */

import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchFormData, parseYidaFormData, updateFormData } from '@/lib/dingtalk';
import { appToDb } from '@/lib/converters';
import type { DBOrder, DBSample, DBPairwise, DBMultiGroup, OrderFormData } from '@/types/order';
import type { AuthContext } from './authService';

// ============================================================
// 类型定义
// ============================================================

/**
 * 完整的订单数据 (包含关联表)
 */
export interface FullDBOrder extends DBOrder {
    sample_list: DBSample[];
    pairwise_comparison: DBPairwise[];
    multi_group_comparison: DBMultiGroup[];
}

/**
 * 同步结果
 */
export interface SyncResult {
    /** 是否成功 */
    success: boolean;

    /** 同步后的订单数据 */
    order?: FullDBOrder;

    /** 错误信息 */
    error?: string;

    /** HTTP 状态码 */
    statusCode?: number;
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 从数据库获取订单及其关联数据
 *
 * 一次性查询订单及其关联的:
 * - sample_list (样本清单)
 * - pairwise_comparison (两组比较)
 * - multi_group_comparison (多组比较)
 *
 * @param uuid - 订单 UUID
 * @returns 完整的订单数据，如果不存在返回 null
 *
 * @example
 * ```ts
 * const order = await fetchOrderFromDB(uuid);
 * if (!order) {
 *   // 本地无数据，需要从钉钉同步
 * }
 * ```
 */
export async function fetchOrderFromDB(uuid: string): Promise<FullDBOrder | null> {
    const { data: rawOrder } = await supabase
        .from('orders')
        .select(`
            *,
            sample_list(*),
            pairwise_comparison(*),
            multi_group_comparison(*)
        `)
        .eq('uuid', uuid)
        .maybeSingle();

    return rawOrder as FullDBOrder | null;
}

/**
 * 检查订单是否有有效数据
 *
 * 简单判断: 必须有 customer_name 才算有效
 *
 * @param order - 订单数据
 * @returns 是否有效
 */
export function hasValidOrderData(order: FullDBOrder | null): boolean {
    return !!(order && order.customer_name);
}

/**
 * 从钉钉宜搭同步订单数据
 *
 * 流程:
 * 1. 调用钉钉 API 获取宜搭表单数据
 * 2. 解析宜搭数据为应用格式
 * 3. 转换为数据库格式
 * 4. 尝试自动绑定用户
 * 5. 插入数据库
 *
 * @param uuid - 订单 UUID
 * @param dingtalkUserId - 钉钉用户ID (必需，用于调用钉钉API)
 * @param auth - 认证上下文 (用于自动绑定)
 * @returns 同步结果
 *
 * @example
 * ```ts
 * const result = await syncOrderFromDingTalk(uuid, dingtalkUserId, auth);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: result.statusCode });
 * }
 * ```
 */
export async function syncOrderFromDingTalk(
    uuid: string,
    dingtalkUserId: string,
    auth: AuthContext
): Promise<SyncResult> {
    console.log('[OrderSyncService] 本地无数据，尝试从钉钉获取...');

    // 1. 验证: 必须有 dingtalkUserId
    if (!dingtalkUserId) {
        console.error('[OrderSyncService] 无法同步钉钉数据：缺少 UD 参数');
        return {
            success: false,
            error: '链接无效：缺少必要的身份标识参数 (UD)',
            statusCode: 400
        };
    }

    try {
        // 2. 调用钉钉 API 获取数据
        debugger
        const yidaData = await searchFormData(uuid, dingtalkUserId);
        const parsedData = parseYidaFormData(yidaData);

        if (!parsedData) {
            return {
                success: false,
                error: '订单不存在',
                statusCode: 404
            };
        }

        // 3. 转换数据格式
        const dbBase = appToDb({
            ...parsedData,
            uuid: uuid,
            status: 'draft',
        } as OrderFormData);

        // 4. 自动绑定用户
        const autoBindUserId = await resolveUserBinding(parsedData, auth);

        // 5. 使用 upsert 插入或更新数据库 (避免硬删除风险)
        const upsertPayload = {
            ...dbBase,
            user_id: autoBindUserId
        };

        const { data: newOrder, error: upsertError } = await supabase
            .from('orders')
            .upsert(upsertPayload, {
                onConflict: 'uuid',  // 基于 uuid 冲突时更新
                ignoreDuplicates: false  // 冲突时执行更新而非忽略
            })
            .select()
            .single();

        if (upsertError) {
            throw new Error(`初始化/更新订单失败: ${upsertError.message}`);
        }

        // 6. 更新钉钉 TableStatus 为"客户编辑中" (首次加载时)
        // 钉钉默认值是 "客户待编辑"，客户首次访问后应更新为 "客户编辑中"
        if (parsedData.formInstanceId && parsedData.tableStatus === '客户待编辑') {
            try {
                await updateFormData(
                    parsedData.formInstanceId,
                    { TableStatus: '客户编辑中' },
                    dingtalkUserId
                );
                console.log(`[OrderSyncService] 已更新钉钉 TableStatus 为"客户编辑中"`);

                // 同步更新本地数据
                newOrder.table_status = '客户编辑中';
            } catch (updateError) {
                // 更新失败不影响主流程，仅记录日志
                console.warn('[OrderSyncService] 更新钉钉 TableStatus 失败:', updateError);
            }
        }

        // 7. 返回完整订单结构
        const fullOrder: FullDBOrder = {
            ...newOrder,
            sample_list: [],
            pairwise_comparison: [],
            multi_group_comparison: []
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
 *
 * 根据认证上下文和订单手机号，确定应该绑定到哪个用户
 *
 * @param parsedData - 解析后的订单数据
 * @param auth - 认证上下文
 * @returns 应绑定的用户ID，如果无法确定返回 null
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
 *
 * @param uuid - 订单 UUID
 * @param userId - 用户 ID
 */
export async function claimOrderForUser(uuid: string, userId: string): Promise<void> {
    console.log(`[OrderSyncService] 将订单 ${uuid} 绑定到用户 ${userId}`);
    await supabase.from('orders').update({ user_id: userId }).eq('uuid', uuid);
}

