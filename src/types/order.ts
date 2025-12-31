/**
 * Order Types - 统一类型定义
 * 
 * 🎉 三端统一使用 camelCase，无需区分 DB/App 类型！
 * 
 * @see .agent/architecture/field-schema-design.md
 */

// ============================================
// 订单数据类型 (统一格式)
// ============================================

export interface OrderData {
    id?: number;
    uuid?: string;
    formInstanceId?: string;

    // 客户信息
    customerUnit?: string;
    customerName?: string;
    department?: string;
    departmentDirector?: string;
    customerPhone?: string;
    customerEmail?: string;

    // 样品信息
    serviceType?: string;
    productLine?: string;
    specialInstructions?: string;
    speciesName?: string;
    speciesLatinName?: string;
    sampleType?: string;
    sampleTypeDetail?: string;
    detectionQuantity?: number;
    cellCount?: number;
    preservationMedium?: string;
    samplePreprocessing?: string;
    remainingSampleHandling?: string;
    needBioinformaticsAnalysis?: boolean;

    // 运送信息
    shippingMethod?: string;
    expressCompanyWaybill?: string;
    shippingTime?: string;

    // 项目信息
    projectNumber?: string;
    productNo?: string;
    unitPrice?: number;
    otherExpenses?: number;
    salesmanName?: string;
    salesmanContact?: string;
    technicalSupportName?: string;
    projectType?: string;

    // 状态
    status?: string;
    tableStatus?: string;
    createdAt?: string;
    updatedAt?: string;
    submittedAt?: string;
    userId?: string;
    salesDingtalkId?: string;

    // 子表数据
    sampleList?: SampleItem[];
    pairwiseComparison?: PairwiseItem[];
    multiGroupComparison?: MultiGroupItem[];
}

// ============================================
// 子表类型
// ============================================

export interface SampleItem {
    id?: number;
    orderId?: number;
    orderUuid?: string;
    sequenceNo?: number;
    sampleName?: string;
    analysisName?: string;
    groupName?: string;
    detectionOrStorage?: string;
    sampleTubeCount?: number;
    experimentDescription?: string;
}

export interface PairwiseItem {
    id?: number;
    orderId?: number;
    orderUuid?: string;
    sequenceNo?: number;
    treatmentGroup?: string;
    controlGroup?: string;
    comparisonScheme?: string;
}

export interface MultiGroupItem {
    id?: number;
    orderId?: number;
    orderUuid?: string;
    sequenceNo?: number;
    comparisonGroups?: string[];
}

// ============================================
// 完整订单 (包含关联数据)
// ============================================

export interface FullOrderData extends OrderData {
    sampleList: SampleItem[];
    pairwiseComparison: PairwiseItem[];
    multiGroupComparison: MultiGroupItem[];
}

// ============================================
// 兼容性别名 (过渡期使用，便于逐步迁移)
// ============================================

/** @deprecated 使用 OrderData */
export type OrderFormData = OrderData;

/** @deprecated 使用 OrderData */
export type DBOrder = OrderData;

/** @deprecated 使用 SampleItem */
export type DBSample = SampleItem;

/** @deprecated 使用 PairwiseItem */
export type DBPairwise = PairwiseItem;

/** @deprecated 使用 MultiGroupItem */
export type DBMultiGroup = MultiGroupItem;

// ============================================
// 钉钉宜搭原始数据类型 (现在与 OrderData 一致)
// ============================================

/** @deprecated 现在三端统一，直接使用 OrderData */
export type YidaRawFormData = Partial<OrderData>;