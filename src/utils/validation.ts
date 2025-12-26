// File: src/utils/validation.ts
import type { OrderFormData } from '@/types/order';

// 定义错误对象结构
export interface ValidationErrors {
    [key: string]: string | ValidationErrors[] | undefined;
    sampleList?: ValidationErrors[];
}

// Validation options
export interface ValidationOptions {
    validateRequiredFields?: boolean; // Default true - set to false during editing to only validate format
}

/**
 * 验证订单表单数据
 * @param data OrderFormData
 * @param options ValidationOptions
 * @returns ValidationErrors 如果对象为空则表示校验通过
 */
export const validateOrderForm = (data: OrderFormData, options: ValidationOptions = {}): ValidationErrors => {
    const { validateRequiredFields = true } = options;
    const errors: ValidationErrors = {};

    // --- 必填字段校验 (only on submit) ---
    if (validateRequiredFields) {
        if (!data.speciesName) errors.speciesName = '请填写物种名称';
        if (!data.speciesLatinName) errors.speciesLatinName = '请填写物种拉丁名';
        if (!data.sampleType) errors.sampleType = '请选择样本类型';
        if (!data.sampleTypeDetail) errors.sampleTypeDetail = '请填写样本类型详述';
        if (!data.remainingSampleHandling) errors.remainingSampleHandling = '请选择剩余样品处理方式';
    }

    // --- 数量逻辑校验 (only on submit) ---
    if (validateRequiredFields) {
        if (!data.detectionQuantity) {
            errors.detectionQuantity = '请填写检测数量';
        } else {
            // 强制转为数字进行比较
            const quantity = typeof data.detectionQuantity === 'string'
                ? parseInt(data.detectionQuantity, 10)
                : data.detectionQuantity;

            // Filter out empty rows before counting
            const nonEmptyRows = data.sampleList?.filter(s => s.sampleName?.trim()) || [];
            const listCount = nonEmptyRows.length;

            if (!isNaN(quantity) && quantity !== listCount) {
                errors.detectionQuantity = `检测数量(${quantity})与实际样本清单数量(${listCount})不一致`;
            }
        }
    }

    // --- 运送方式校验 (only on submit) ---
    if (validateRequiredFields) {
        if (!data.shippingMethod) {
            errors.shippingMethod = '请选择运送方式';
        } else if (data.shippingMethod === '快递') {
            if (!data.expressCompanyWaybill) errors.expressCompanyWaybill = '请填写快递公司及运单号';
            if (!data.shippingTime) errors.shippingTime = '请选择送样时间';
        }
    }

    // --- 样本清单复杂校验 ---
    if (data.sampleList && data.sampleList.length > 0) {
        const sampleErrors: ValidationErrors[] = [];
        const sampleNames = new Set<string>();
        const analysisNames = new Set<string>();
        let hasError = false;

        data.sampleList.forEach((sample, index) => {
            const rowErrors: ValidationErrors = {};

            // Skip completely empty rows - they will be filtered out during submit
            const isEmptyRow = !sample.sampleName && !sample.analysisName && !sample.groupName && !sample.experimentDescription;
            if (isEmptyRow) {
                sampleErrors.push(rowErrors); // Push empty error object
                return; // Skip validation for empty rows
            }

            // 1. 样本名称 - format validation always, required only on submit
            if (!sample.sampleName) {
                if (validateRequiredFields) {
                    rowErrors.sampleName = '样本名称不能为空';
                }
            } else {
                // Format validations - always check
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

            // 2. 生信分析相关
            const isBioEnabled = data.needBioinformaticsAnalysis === true || String(data.needBioinformaticsAnalysis) === 'true';

            if (isBioEnabled) {
                // 分析名称 - format validation always, required only on submit
                if (!sample.analysisName) {
                    if (validateRequiredFields) {
                        rowErrors.analysisName = '分析名称不能为空';
                    }
                } else {
                    // Format validations - always check
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

                // 分组名称 - format validation always, required only on submit
                if (!sample.groupName) {
                    if (validateRequiredFields) {
                        rowErrors.groupName = '分组名称不能为空';
                    }
                } else {
                    // Format validations - always check
                    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.groupName)) {
                        rowErrors.groupName = '格式不正确(仅限字母数字下划线)';
                    } else if (sample.groupName.length > 8) {
                        rowErrors.groupName = '长度不能超过8个字符';
                    }
                }
            }

            // 3. 其他必填 (only on submit)
            if (validateRequiredFields) {
                if (!sample.detectionOrStorage) {
                    rowErrors.detectionOrStorage = '请选择检测或暂存';
                }
                if (!sample.sampleTubeCount || sample.sampleTubeCount < 1) {
                    rowErrors.sampleTubeCount = '样品管数必须大于0';
                }
            }

            // 记录该行错误
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
