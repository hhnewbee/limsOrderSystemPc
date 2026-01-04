// File: src/utils/validation.ts
/**
 * 订单表单验证
 * 
 * 📌 必填字段从 schema 读取，无需硬编码
 */
import type { OrderFormData } from '@/types/order';
import { ORDER_FIELDS, FIELD_LABELS, getFieldLabel } from '@/schema/fields';

// ============================================
// 类型定义
// ============================================

export interface ValidationErrors {
    [key: string]: string | ValidationErrors[] | undefined;
    sampleList?: ValidationErrors[];
}

export interface ValidationOptions {
    /** 是否验证必填字段 (默认 true) */
    validateRequiredFields?: boolean;
}

// ============================================
// 特殊验证规则
// ============================================

/** 需要额外逻辑验证的字段 (非简单必填) */
const SPECIAL_REQUIRED_RULES: Record<string, (data: OrderFormData) => string | null> = {
    // 检测数量需要和样本清单数量一致
    detectionQuantity: (data) => {
        if (!data.detectionQuantity) {
            return '请填写检测数量';
        }
        const quantity = typeof data.detectionQuantity === 'string'
            ? parseInt(data.detectionQuantity, 10)
            : data.detectionQuantity;
        const nonEmptyRows = data.sampleList?.filter(s => s.sampleName?.trim()) || [];
        const listCount = nonEmptyRows.length;

        if (!isNaN(quantity) && quantity !== listCount) {
            return `检测数量(${quantity})与实际样本清单数量(${listCount})不一致`;
        }
        return null;
    },

    // 快递时需要额外字段
    shippingMethod: (data) => {
        if (!data.shippingMethod) {
            return '请选择运送方式';
        }
        return null;
    },

    // 快递方式的条件必填
    expressCompanyWaybill: (data) => {
        if (data.shippingMethod === '快递' && !data.expressCompanyWaybill) {
            return '请填写快递公司及运单号';
        }
        return null;
    },
    shippingTime: (data) => {
        if (data.shippingMethod === '快递' && !data.shippingTime) {
            return '请选择送样时间';
        }
        return null;
    }
};

// ============================================
// 主验证函数
// ============================================

/**
 * 验证订单表单数据
 * 
 * @param data OrderFormData
 * @param options ValidationOptions
 * @returns ValidationErrors 如果对象为空则表示校验通过
 */
export const validateOrderForm = (data: OrderFormData, options: ValidationOptions = {}): ValidationErrors => {
    const { validateRequiredFields = true } = options;
    const errors: ValidationErrors = {};

    // --- 1. 基于 schema 的必填字段校验 (only on submit) ---
    if (validateRequiredFields) {
        for (const [fieldKey, fieldDef] of Object.entries(ORDER_FIELDS)) {
            const def = fieldDef as { required?: boolean; label: string };
            if (!def.required) continue;

            // 跳过有特殊规则的字段
            if (SPECIAL_REQUIRED_RULES[fieldKey]) continue;

            const value = data[fieldKey as keyof OrderFormData];
            if (value === undefined || value === null || value === '') {
                errors[fieldKey] = `请填写${def.label}`;
            }
        }


        // 特殊规则验证
        for (const [field, validator] of Object.entries(SPECIAL_REQUIRED_RULES)) {
            const error = validator(data);
            if (error) {
                errors[field] = error;
            }
        }
    }

    // --- 2. 样本清单复杂校验 ---
    if (data.sampleList && data.sampleList.length > 0) {
        const sampleErrors: ValidationErrors[] = [];
        const sampleNames = new Set<string>();
        const analysisNames = new Set<string>();
        let hasError = false;

        data.sampleList.forEach((sample, index) => {
            const rowErrors: ValidationErrors = {};

            // Skip completely empty rows
            const isEmptyRow = !sample.sampleName && !sample.analysisName && !sample.groupName && !sample.experimentDescription;
            if (isEmptyRow) {
                sampleErrors.push(rowErrors);
                return;
            }

            // 样本名称验证
            if (!sample.sampleName) {
                if (validateRequiredFields) {
                    rowErrors.sampleName = '样本名称不能为空';
                }
            } else {
                if (sampleNames.has(sample.sampleName)) {
                    rowErrors.sampleName = '样本名称重复';
                }
                sampleNames.add(sample.sampleName);

                if (/[\u4e00-\u9fa5]/.test(sample.sampleName)) {
                    rowErrors.sampleName = '不能包含中文字符';
                } else if (/[￥$&@%]/.test(sample.sampleName)) {
                    rowErrors.sampleName = '不能包含特殊字符';
                } else if (sample.sampleName.length > 10) {
                    rowErrors.sampleName = '长度不能超过10个字符';
                }
            }

            // 生信分析相关
            const isBioEnabled = data.needBioinformaticsAnalysis === true || String(data.needBioinformaticsAnalysis) === 'true';

            if (isBioEnabled) {
                // 分析名称
                if (!sample.analysisName) {
                    if (validateRequiredFields) {
                        rowErrors.analysisName = '分析名称不能为空';
                    }
                } else {
                    if (analysisNames.has(sample.analysisName)) {
                        rowErrors.analysisName = '分析名称重复';
                    }
                    analysisNames.add(sample.analysisName);

                    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.analysisName)) {
                        rowErrors.analysisName = '格式不正确(仅限字母数字下划线)';
                    } else if (sample.analysisName.length > 8) {
                        rowErrors.analysisName = '长度不能超过8个字符';
                    }
                }

                // 分组名称
                if (!sample.groupName) {
                    if (validateRequiredFields) {
                        rowErrors.groupName = '分组名称不能为空';
                    }
                } else {
                    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.groupName)) {
                        rowErrors.groupName = '格式不正确(仅限字母数字下划线)';
                    } else if (sample.groupName.length > 8) {
                        rowErrors.groupName = '长度不能超过8个字符';
                    }
                }
            }

            // 其他必填 (only on submit)
            if (validateRequiredFields) {
                if (!sample.detectionOrStorage) {
                    rowErrors.detectionOrStorage = '请选择检测或暂存';
                }
                if (!sample.sampleTubeCount || sample.sampleTubeCount < 1) {
                    rowErrors.sampleTubeCount = '样品管数必须大于0';
                }
            }

            if (Object.keys(rowErrors).length > 0) {
                sampleErrors[index] = rowErrors;
                hasError = true;
            }
        });

        if (hasError) {
            errors.sampleList = sampleErrors;
        }
    }

    return errors;
};

/**
 * 获取错误字段的中文名称列表
 */
export function getErrorFieldNames(errors: ValidationErrors): string[] {
    return Object.keys(errors)
        .filter(key => key !== 'sampleList')
        .map(key => getFieldLabel(key));
}
