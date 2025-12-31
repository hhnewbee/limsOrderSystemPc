/**
 * Data Converters - 简化版
 * 
 * 🎉 由于三端统一使用 camelCase，大部分转换已不再需要！
 * 
 * 保留功能：
 * - 类型转换（数字、日期、布尔值）
 * - 子表数据处理
 * 
 * @see .agent/architecture/field-schema-design.md
 */

import type { OrderData, SampleItem, PairwiseItem, MultiGroupItem, FullOrderData } from '@/types/order';

// ============================================
// 类型转换辅助函数
// ============================================

function toNumber(val: string | number | undefined): number | undefined {
    if (val === undefined || val === '' || val === null) return undefined;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
}

function toDateString(val: string | number | undefined): string | undefined {
    if (!val) return undefined;
    // 如果已经是 ISO 字符串，直接返回
    if (typeof val === 'string' && val.includes('T')) return val;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toBoolean(val: string | boolean | undefined): boolean | undefined {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    return val === '是' || val === 'true' || val === '1' || val === '需要';
}

// ============================================
// 钉钉数据处理
// ============================================

/**
 * 处理钉钉返回的数据（类型转换）
 * 
 * 由于字段名已统一，只做类型转换：
 * - 字符串数字 → number
 * - 时间戳 → ISO 日期
 * - '是'/'否' → boolean
 */
export function processYidaData(yidaData: Record<string, any>, formInstanceId?: string): Partial<OrderData> {
    return {
        ...yidaData,
        formInstanceId,

        // 数字转换
        detectionQuantity: toNumber(yidaData.detectionQuantity),
        cellCount: toNumber(yidaData.cellCount),
        unitPrice: toNumber(yidaData.unitPrice),
        otherExpenses: toNumber(yidaData.otherExpenses),

        // 日期转换
        shippingTime: toDateString(yidaData.shippingTime),

        // 布尔值转换
        needBioinformaticsAnalysis: toBoolean(yidaData.needBioinformaticsAnalysis),
    };
}

/**
 * 准备提交到钉钉的数据
 */
export function prepareForYida(appData: Partial<OrderData>): Record<string, any> {
    const result: Record<string, any> = { ...appData };

    // 布尔值转换回 '是'/'否'
    if (appData.needBioinformaticsAnalysis !== undefined) {
        result.needBioinformaticsAnalysis = appData.needBioinformaticsAnalysis ? '是' : '否';
    }

    // 日期转时间戳
    if (appData.shippingTime) {
        const ts = new Date(appData.shippingTime).getTime();
        result.shippingTime = isNaN(ts) ? undefined : ts;
    }

    return result;
}

// ============================================
// 数据库数据处理
// ============================================

/**
 * 处理从数据库获取的完整订单数据
 * 
 * 主要处理子表的排序和格式化
 */
export function processDBOrder(dbOrder: any): FullOrderData {
    return {
        ...dbOrder,

        // 子表排序
        sampleList: (dbOrder.sampleList || [])
            .sort((a: SampleItem, b: SampleItem) => (a.sequenceNo || 0) - (b.sequenceNo || 0)),

        pairwiseComparison: (dbOrder.pairwiseComparison || [])
            .sort((a: PairwiseItem, b: PairwiseItem) => (a.sequenceNo || 0) - (b.sequenceNo || 0)),

        multiGroupComparison: (dbOrder.multiGroupComparison || [])
            .sort((a: MultiGroupItem, b: MultiGroupItem) => (a.sequenceNo || 0) - (b.sequenceNo || 0)),
    };
}

// ============================================
// 兼容性别名 (逐步迁移用)
// ============================================

/** @deprecated 使用 processYidaData */
export const yidaToApp = processYidaData;

/** @deprecated 使用 prepareForYida */
export const appToYida = prepareForYida;

/** @deprecated 不再需要，三端统一 */
export const dbToApp = (data: any) => data;

/** @deprecated 不再需要，三端统一 */
export const appToDb = (data: any) => data;