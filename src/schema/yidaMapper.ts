/**
 * Yida Mapper - 钉钉数据处理
 * 
 * 🎉 由于三端已统一使用 camelCase，不再需要字段名转换！
 * 此文件仅保留类型转换逻辑（如布尔值、日期等）
 * 
 * @see .agent/architecture/field-schema-design.md
 */

import { ORDER_FIELDS, type OrderFieldKey } from './fields';

// ============================================
// 类型转换辅助函数
// ============================================

/**
 * 安全转换为数字
 */
function toNumber(val: string | number | undefined): number | undefined {
    if (val === undefined || val === '' || val === null) return undefined;
    const num = typeof val === 'number' ? val : parseFloat(String(val));
    return isNaN(num) ? undefined : num;
}

/**
 * 安全转换为日期字符串
 */
function toDateString(val: string | number | undefined): string | undefined {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * 转换为布尔值 (处理钉钉的 '是'/'否')
 */
function toBoolean(val: string | boolean | undefined): boolean | undefined {
    if (val === undefined) return undefined;
    if (typeof val === 'boolean') return val;
    return val === '是' || val === 'true' || val === '1';
}

// ============================================
// 主要转换函数
// ============================================

/**
 * 处理钉钉数据的类型转换
 * 
 * 由于字段名已统一，只需要处理类型转换：
 * - 数字字符串 → number
 * - 时间戳 → ISO 日期字符串
 * - '是'/'否' → boolean
 */
export function processYidaData(yidaData: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...yidaData };

    // 遍历字段定义，进行类型转换
    for (const [key, def] of Object.entries(ORDER_FIELDS)) {
        const value = yidaData[key];
        if (value === undefined) continue;

        switch (def.type) {
            case 'number':
                result[key] = toNumber(value);
                break;
            case 'boolean':
                result[key] = toBoolean(value);
                break;
            case 'date':
                result[key] = toDateString(value);
                break;
            // string 和 array 不需要转换
        }
    }

    return result;
}

/**
 * 处理应用数据准备发送到钉钉
 * 
 * 主要是布尔值转换为 '是'/'否'
 */
export function prepareForYida(appData: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...appData };

    for (const [key, def] of Object.entries(ORDER_FIELDS)) {
        const value = appData[key];
        if (value === undefined) continue;

        if (def.type === 'boolean') {
            result[key] = value ? '是' : '否';
        }
    }

    return result;
}
