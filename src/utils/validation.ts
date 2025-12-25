// File: src/utils/validation.ts
import type { OrderFormData } from '@/types/order';

// 定义错误对象结构
export interface ValidationErrors {
    [key: string]: string | ValidationErrors[] | undefined;
    sampleList?: ValidationErrors[];
}

/**
 * 验证订单表单数据
 * @param data OrderFormData
 * @returns ValidationErrors 如果对象为空则表示校验通过
 */
export const validateOrderForm = (data: OrderFormData): ValidationErrors => {
    const errors: ValidationErrors = {};

    // --- 必填字段校验 ---
    if (!data.speciesName) errors.speciesName = '请填写物种名称';
    if (!data.speciesLatinName) errors.speciesLatinName = '请填写物种拉丁名';
    if (!data.sampleType) errors.sampleType = '请选择样本类型';
    if (!data.sampleTypeDetail) errors.sampleTypeDetail = '请填写样本类型详述';
    if (!data.remainingSampleHandling) errors.remainingSampleHandling = '请选择剩余样品处理方式';

    // --- 数量逻辑校验 ---
    if (!data.detectionQuantity) {
        errors.detectionQuantity = '请填写检测数量';
    } else {
        // 强制转为数字进行比较
        const quantity = typeof data.detectionQuantity === 'string'
            ? parseInt(data.detectionQuantity, 10)
            : data.detectionQuantity;

        const listCount = data.sampleList ? data.sampleList.length : 0;

        if (!isNaN(quantity) && quantity !== listCount) {
            errors.detectionQuantity = `检测数量(${quantity})与实际样本清单数量(${listCount})不一致`;
        }
    }

    // --- 运送方式校验 ---
    if (!data.shippingMethod) {
        errors.shippingMethod = '请选择运送方式';
    } else if (data.shippingMethod === '快递') {
        if (!data.expressCompanyWaybill) errors.expressCompanyWaybill = '请填写快递公司及运单号';
        if (!data.shippingTime) errors.shippingTime = '请选择送样时间';
    }

    // --- 样本清单复杂校验 ---
    if (data.sampleList && data.sampleList.length > 0) {
        const sampleErrors: ValidationErrors[] = [];
        const sampleNames = new Set<string>();
        const analysisNames = new Set<string>();
        let hasError = false;

        data.sampleList.forEach((sample, index) => {
            const rowErrors: ValidationErrors = {};

            // 1. 样本名称
            if (!sample.sampleName) {
                rowErrors.sampleName = '样本名称不能为空';
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

            // 2. 生信分析相关
            // 🟢 Align with UI logic: handle string 'true' or boolean true
            const isBioEnabled = data.needBioinformaticsAnalysis === true || String(data.needBioinformaticsAnalysis) === 'true';

            if (isBioEnabled) {
                // 分析名称
                // 分析名称
                if (!sample.analysisName) {
                    rowErrors.analysisName = '分析名称不能为空';
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
                    rowErrors.groupName = '分组名称不能为空';
                } else {
                    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.groupName)) {
                        rowErrors.groupName = '格式不正确(仅限字母数字下划线)';
                    } else if (sample.groupName.length > 8) {
                        rowErrors.groupName = '长度不能超过8个字符';
                    }
                }
            }

            // 3. 其他必填
            if (!sample.detectionOrStorage) {
                rowErrors.detectionOrStorage = '请选择检测或暂存';
            }
            if (!sample.sampleTubeCount || sample.sampleTubeCount < 1) {
                rowErrors.sampleTubeCount = '样品管数必须大于0';
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