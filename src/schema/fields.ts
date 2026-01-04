/**
 * Field Schema Definitions
 * 
 * 📌 统一字段定义 - 三端一致使用 camelCase
 * 📌 钉钉、数据库、代码全部使用相同字段名
 * 📌 新增字段只需在此添加定义，然后执行数据库 ALTER TABLE
 * 
 * @see .agent/architecture/field-schema-design.md
 */

// ============================================
// 类型定义
// ============================================

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array';
export type FieldGroup = 'customer' | 'sample' | 'shipping' | 'project' | 'status' | 'system';

export interface FieldDefinition {
    /** 字段中文名 */
    label: string;
    /** 字段类型 */
    type: FieldType;
    /** 分组 */
    group: FieldGroup;
    /** 是否必填 */
    required?: boolean;
}

// ============================================
// 订单主表字段
// ============================================

export const ORDER_FIELDS = {
    // --- 系统字段 ---
    id: { label: 'ID', type: 'number', group: 'system' },
    uuid: { label: 'UUID', type: 'string', group: 'system' },
    formInstanceId: { label: '表单实例ID', type: 'string', group: 'system' },

    // --- 客户信息 ---
    customerUnit: { label: '客户单位', type: 'string', group: 'customer', required: true },
    customerName: { label: '客户姓名', type: 'string', group: 'customer', required: true },
    department: { label: '部门/科室', type: 'string', group: 'customer' },
    departmentDirector: { label: '科室主任/PI', type: 'string', group: 'customer' },
    customerPhone: { label: '客户手机', type: 'string', group: 'customer', required: true },
    customerEmail: { label: '客户邮箱', type: 'string', group: 'customer' },

    // --- 样品信息 ---
    serviceType: { label: '服务种类', type: 'string', group: 'sample' },
    productLine: { label: '产品线', type: 'string', group: 'sample' },
    specialInstructions: { label: '特殊说明', type: 'string', group: 'sample' },
    speciesName: { label: '物种名称', type: 'string', group: 'sample', required: true },
    speciesLatinName: { label: '物种拉丁名', type: 'string', group: 'sample', required: true },
    sampleType: { label: '样本类型', type: 'string', group: 'sample', required: true },
    sampleTypeDetail: { label: '样本类型详述', type: 'string', group: 'sample' },
    detectionQuantity: { label: '检测数量', type: 'number', group: 'sample' },
    cellCount: { label: '细胞数', type: 'number', group: 'sample' },
    preservationMedium: { label: '保存介质', type: 'string', group: 'sample' },
    samplePreprocessing: { label: '样本前处理方式', type: 'string', group: 'sample' },
    remainingSampleHandling: { label: '剩余样品处理方式', type: 'string', group: 'sample', required: true },
    needBioinformaticsAnalysis: { label: '是否需要生信分析', type: 'boolean', group: 'sample' },

    // --- 运送信息 ---
    shippingMethod: { label: '运送方式', type: 'string', group: 'shipping', required: true },
    expressCompanyWaybill: { label: '快递公司及运单号', type: 'string', group: 'shipping' },
    shippingTime: { label: '发货时间', type: 'date', group: 'shipping' },

    // --- 项目信息 ---
    projectNumber: { label: '项目编号', type: 'string', group: 'project' },
    productNo: { label: '产品编号', type: 'string', group: 'project' },
    unitPrice: { label: '单价', type: 'number', group: 'project' },
    otherExpenses: { label: '其他费用', type: 'number', group: 'project' },
    salesmanName: { label: '业务员姓名', type: 'string', group: 'project' },
    salesmanContact: { label: '业务员联系方式', type: 'string', group: 'project' },
    technicalSupportName: { label: '技术支持人员', type: 'string', group: 'project' },
    projectType: { label: '项目类型', type: 'string', group: 'project' },

    // --- 状态 ---
    status: { label: '本地状态', type: 'string', group: 'status' },
    tableStatus: { label: '钉钉状态', type: 'string', group: 'status' },
    createdAt: { label: '创建时间', type: 'date', group: 'system' },
    updatedAt: { label: '更新时间', type: 'date', group: 'system' },
    submittedAt: { label: '提交时间', type: 'date', group: 'system' },
    userId: { label: '用户ID', type: 'string', group: 'system' },
    salesDingtalkId: { label: '销售钉钉ID', type: 'string', group: 'system' }
} as const satisfies Record<string, FieldDefinition>;

// ============================================
// 子表字段
// ============================================

export const SAMPLE_LIST_FIELDS = {
    sampleName: { label: '样本名称', type: 'string', group: 'sample' },
    analysisName: { label: '分析名称', type: 'string', group: 'sample' },
    groupName: { label: '分组名称', type: 'string', group: 'sample' },
    detectionOrStorage: { label: '检测/留存', type: 'string', group: 'sample' },
    sampleTubeCount: { label: '样本管数', type: 'number', group: 'sample' },
    experimentDescription: { label: '实验描述', type: 'string', group: 'sample' }
} as const satisfies Record<string, FieldDefinition>;

// ============================================
// 类型导出
// ============================================

export type OrderFieldKey = keyof typeof ORDER_FIELDS;
export type SampleFieldKey = keyof typeof SAMPLE_LIST_FIELDS;

/** 获取所有字段名数组 */
export const ORDER_FIELD_KEYS = Object.keys(ORDER_FIELDS) as OrderFieldKey[];

// ============================================
// SQL 查询工具函数
// ============================================

/**
 * 生成 Supabase select 语句所需的列名
 * 由于使用 camelCase，需要用双引号包裹
 * 
 * @example
 * selectColumns(['uuid', 'customerName', 'tableStatus'])
 * // => 'uuid, "customerName", "tableStatus"'
 */
export function selectColumns(fields: OrderFieldKey[]): string {
    return fields.map(field => {
        // 系统字段不需要引号 (id, uuid, status)
        const noQuoteFields = ['id', 'uuid', 'status'];
        if (noQuoteFields.includes(field)) {
            return field;
        }
        return `"${field}"`;
    }).join(', ');
}

/**
 * 常用的查询列组合
 */
export const QUERY_COLUMNS = {
    /** 订单列表基础信息 */
    ORDER_LIST: selectColumns([
        'id', 'uuid', 'projectNumber', 'productNo',
        'customerName', 'customerUnit', 'serviceType',
        'status', 'tableStatus', 'createdAt', 'updatedAt'
    ]),

    /** 客户认证检查所需字段 */
    AUTH_CHECK: selectColumns([
        'uuid', 'userId', 'customerPhone', 'customerName'
    ]),

    /** 销售认证检查所需字段 */
    AUTH_CHECK_SALES: selectColumns([
        'uuid', 'salesmanContact', 'salesmanName'
    ]),

    /** 订单提交相关字段 */
    SUBMIT: selectColumns([
        'id', 'formInstanceId', 'status', 'tableStatus'
    ])
} as const;

/**
 * 验证字段名是否有效
 * 用于运行时检查，防止拼写错误
 */
export function validateFieldName(field: string): field is OrderFieldKey {
    return field in ORDER_FIELDS;
}

/**
 * 断言字段名有效，无效时抛出错误
 */
export function assertValidField(field: string): asserts field is OrderFieldKey {
    if (!validateFieldName(field)) {
        throw new Error(`Invalid field name: "${field}". Valid fields: ${ORDER_FIELD_KEYS.join(', ')}`);
    }
}
