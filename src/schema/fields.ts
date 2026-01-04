/**
 * Unified Field Schema
 * 
 * 📌 单一真相来源 - 所有字段名在此定义一次
 * 📌 包含 camelCase, snake_case, PascalCase 三种命名
 * 📌 自动生成转换函数，消除手动映射
 */

// ============================================
// 字段定义类型
// ============================================

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'array';

export interface FieldDef {
    /** 数据库列名 (snake_case) */
    db: string;
    /** 钉钉宜搭字段名 (PascalCase) */
    yida: string;
    /** 中文标签 */
    label: string;
    /** 字段类型 */
    type: FieldType;
    /** 是否必填 */
    required?: boolean;
}

// ============================================
// 订单主表字段定义
// ============================================

export const ORDER_FIELDS = {
    // --- 系统字段 ---
    id: { db: 'id', yida: '', label: 'ID', type: 'number' },
    uuid: { db: 'uuid', yida: 'UniqueIdentification', label: 'UUID', type: 'string' },
    formInstanceId: { db: 'form_instance_id', yida: '', label: '表单实例ID', type: 'string' },
    userId: { db: 'user_id', yida: '', label: '用户ID', type: 'string' },

    // --- 客户信息 ---
    customerUnit: { db: 'customer_unit', yida: 'CustomerUnit', label: '客户单位', type: 'string', required: true },
    customerName: { db: 'customer_name', yida: 'CustomerName', label: '客户姓名', type: 'string', required: true },
    department: { db: 'department', yida: 'DepartmentsDepartmentsDepartments', label: '部门/科室', type: 'string' },
    departmentDirector: { db: 'department_director', yida: 'DepartmentDirectorPI', label: '科室主任/PI', type: 'string' },
    customerPhone: { db: 'customer_phone', yida: 'CustomerMobilePhone', label: '客户手机', type: 'string', required: true },
    customerEmail: { db: 'customer_email', yida: 'CustomerMailbox', label: '客户邮箱', type: 'string' },

    // --- 样品信息 ---
    serviceType: { db: 'service_type', yida: 'ServiceTypeName', label: '服务种类', type: 'string' },
    productLine: { db: 'product_line', yida: 'ServiceTypeOther', label: '产品线', type: 'string' },
    specialInstructions: { db: 'special_instructions', yida: 'SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions', label: '特殊说明', type: 'string' },
    speciesName: { db: 'species_name', yida: 'SpeciesName', label: '物种名称', type: 'string', required: true },
    speciesLatinName: { db: 'species_latin_name', yida: 'SpeciesLatinName', label: '物种拉丁名', type: 'string', required: true },
    sampleType: { db: 'sample_type', yida: 'SampleType', label: '样本类型', type: 'string', required: true },
    sampleTypeDetail: { db: 'sample_type_detail', yida: 'SampleTypeDetails', label: '样本类型详述', type: 'string' },
    detectionQuantity: { db: 'detection_quantity', yida: 'DetectionQuantity', label: '检测数量', type: 'number' },
    cellCount: { db: 'cell_count', yida: 'CellNumber', label: '细胞数', type: 'number' },
    preservationMedium: { db: 'preservation_medium', yida: 'SaveMedia', label: '保存介质', type: 'string' },
    samplePreprocessing: { db: 'sample_preprocessing', yida: 'SamplePreprocessingMethod', label: '样本前处理方式', type: 'string' },
    remainingSampleHandling: { db: 'remaining_sample_handling', yida: 'RemainingSampleProcessingMethod', label: '剩余样品处理方式', type: 'string', required: true },
    needBioinformaticsAnalysis: { db: 'need_bioinformatics_analysis', yida: 'IsBioinformaticsAnalysis', label: '是否需要生信分析', type: 'boolean' },

    // --- 运送信息 ---
    shippingMethod: { db: 'shipping_method', yida: 'ModeOfDelivery', label: '运送方式', type: 'string', required: true },
    expressCompanyWaybill: { db: 'express_company_waybill', yida: 'ExpressCompanyAndWaybillNumber', label: '快递公司及运单号', type: 'string' },
    shippingTime: { db: 'shipping_time', yida: 'SampleDeliveryTime', label: '发货时间', type: 'date' },

    // --- 项目信息 ---
    projectNumber: { db: 'project_number', yida: 'UniqueIdentification', label: 'UUID链接码', type: 'string' },
    productNo: { db: 'product_no', yida: 'ProductNo', label: '项目编号', type: 'string' },
    unitPrice: { db: 'unit_price', yida: 'UnitPriceOfTestingServiceFee', label: '单价', type: 'number' },
    otherExpenses: { db: 'other_expenses', yida: 'OtherExpenses', label: '其他费用', type: 'number' },
    salesmanName: { db: 'salesman_name', yida: 'NameOfSalesman', label: '业务员姓名', type: 'string' },
    salesmanContact: { db: 'salesman_contact', yida: 'ContactInformationOfSalesman', label: '业务员联系方式', type: 'string' },
    technicalSupportName: { db: 'technical_support_name', yida: 'NameOfTechnicalSupportPersonnel', label: '技术支持人员', type: 'string' },
    projectType: { db: 'project_type', yida: 'ProjectType', label: '项目类型', type: 'string' },

    // --- 状态 ---
    status: { db: 'status', yida: '', label: '本地状态', type: 'string' },
    tableStatus: { db: 'table_status', yida: 'TableStatus', label: '钉钉状态', type: 'string' },
    createdAt: { db: 'created_at', yida: '', label: '创建时间', type: 'date' },
    updatedAt: { db: 'updated_at', yida: '', label: '更新时间', type: 'date' },
    submittedAt: { db: 'submitted_at', yida: '', label: '提交时间', type: 'date' },

    // --- 其他 ---
    samplesViewToken: { db: 'samples_view_token', yida: 'SamplesLink', label: '样本查看Token', type: 'string' },
    salesDingtalkId: { db: 'sales_dingtalk_id', yida: '', label: '销售钉钉ID', type: 'string' },
} as const satisfies Record<string, FieldDef>;

// ============================================
// 样本列表子表字段
// ============================================

export const SAMPLE_LIST_FIELDS = {
    sampleName: { db: 'sample_name', yida: '', label: '样本名称', type: 'string' },
    analysisName: { db: 'analysis_name', yida: '', label: '分析名称', type: 'string' },
    groupName: { db: 'group_name', yida: '', label: '分组名称', type: 'string' },
    detectionOrStorage: { db: 'detection_or_storage', yida: '', label: '检测/留存', type: 'string' },
    sampleTubeCount: { db: 'sample_tube_count', yida: '', label: '样本管数', type: 'number' },
    experimentDescription: { db: 'experiment_description', yida: '', label: '实验描述', type: 'string' },
} as const satisfies Record<string, FieldDef>;

// ============================================
// 类型导出
// ============================================

export type OrderFieldKey = keyof typeof ORDER_FIELDS;
export type SampleFieldKey = keyof typeof SAMPLE_LIST_FIELDS;

// ============================================
// 转换工具函数
// ============================================

/**
 * 创建 DB -> App 转换映射
 * @returns { db_column_name: 'appFieldName', ... }
 */
export function createDbToAppMap<T extends Record<string, FieldDef>>(fields: T): Record<string, keyof T> {
    const map: Record<string, keyof T> = {};
    for (const [appKey, def] of Object.entries(fields)) {
        map[def.db] = appKey as keyof T;
    }
    return map;
}

/**
 * 创建 App -> DB 转换映射
 * @returns { appFieldName: 'db_column_name', ... }
 */
export function createAppToDbMap<T extends Record<string, FieldDef>>(fields: T): Record<keyof T, string> {
    const map = {} as Record<keyof T, string>;
    for (const [appKey, def] of Object.entries(fields)) {
        map[appKey as keyof T] = def.db;
    }
    return map;
}

/**
 * 创建 Yida -> App 转换映射
 * @returns { YidaFieldName: 'appFieldName', ... }
 */
export function createYidaToAppMap<T extends Record<string, FieldDef>>(fields: T): Record<string, keyof T> {
    const map: Record<string, keyof T> = {};
    for (const [appKey, def] of Object.entries(fields)) {
        if (def.yida) {
            map[def.yida] = appKey as keyof T;
        }
    }
    return map;
}

/**
 * 创建 App -> Yida 转换映射
 * @returns { appFieldName: 'YidaFieldName', ... }
 */
export function createAppToYidaMap<T extends Record<string, FieldDef>>(fields: T): Record<keyof T, string> {
    const map = {} as Record<keyof T, string>;
    for (const [appKey, def] of Object.entries(fields)) {
        if (def.yida) {
            map[appKey as keyof T] = def.yida;
        }
    }
    return map;
}

// 预生成的映射 (性能优化)
export const DB_TO_APP = createDbToAppMap(ORDER_FIELDS);
export const APP_TO_DB = createAppToDbMap(ORDER_FIELDS);
export const YIDA_TO_APP = createYidaToAppMap(ORDER_FIELDS);
export const APP_TO_YIDA = createAppToYidaMap(ORDER_FIELDS);

// 样本列表映射
export const SAMPLE_DB_TO_APP = createDbToAppMap(SAMPLE_LIST_FIELDS);
export const SAMPLE_APP_TO_DB = createAppToDbMap(SAMPLE_LIST_FIELDS);

// ============================================
// 自动转换函数
// ============================================

/**
 * 将 DB 对象转换为 App 格式 (snake_case -> camelCase)
 */
export function convertDbToApp<T extends Record<string, any>>(
    dbData: T,
    map: Record<string, string> = DB_TO_APP
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [dbKey, value] of Object.entries(dbData)) {
        const appKey = map[dbKey];
        if (appKey) {
            result[appKey] = value;
        } else {
            // 保留未映射的字段 (如关联数据)
            result[dbKey] = value;
        }
    }
    return result;
}

/**
 * 将 App 对象转换为 DB 格式 (camelCase -> snake_case)
 */
export function convertAppToDb<T extends Record<string, any>>(
    appData: T,
    map: Record<string, string> = APP_TO_DB
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [appKey, value] of Object.entries(appData)) {
        const dbKey = map[appKey as keyof typeof map];
        if (dbKey && value !== undefined) {
            result[dbKey] = value;
        }
    }
    return result;
}

/**
 * 将 Yida 对象转换为 App 格式 (PascalCase -> camelCase)
 */
export function convertYidaToApp<T extends Record<string, any>>(
    yidaData: T,
    map: Record<string, string> = YIDA_TO_APP
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [yidaKey, value] of Object.entries(yidaData)) {
        const appKey = map[yidaKey];
        if (appKey) {
            result[appKey] = value;
        }
    }
    return result;
}

/**
 * 将 App 对象转换为 Yida 格式 (camelCase -> PascalCase)
 */
export function convertAppToYida<T extends Record<string, any>>(
    appData: T,
    map: Record<string, string> = APP_TO_YIDA
): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [appKey, value] of Object.entries(appData)) {
        const yidaKey = map[appKey as keyof typeof map];
        if (yidaKey && value !== undefined) {
            result[yidaKey] = value;
        }
    }
    return result;
}

// ============================================
// SQL 列名工具
// ============================================

/**
 * 获取指定字段的 DB 列名数组
 */
export function getDbColumns(fieldKeys: OrderFieldKey[]): string[] {
    return fieldKeys.map(key => ORDER_FIELDS[key].db);
}

/**
 * 生成 Supabase select 字符串
 */
export function selectColumns(fieldKeys: OrderFieldKey[]): string {
    return getDbColumns(fieldKeys).join(', ');
}

/**
 * 常用查询列组合
 */
export const QUERY_COLUMNS = {
    /** 订单列表 */
    ORDER_LIST: selectColumns([
        'id', 'uuid', 'projectNumber', 'productNo', 'customerName',
        'customerUnit', 'serviceType', 'status', 'tableStatus',
        'createdAt', 'updatedAt'
    ]),
    /** 客户认证 */
    AUTH_CHECK: selectColumns(['uuid', 'userId', 'customerPhone', 'customerName']),
    /** 销售认证 */
    AUTH_CHECK_SALES: selectColumns(['uuid', 'salesmanContact', 'salesmanName']),
    /** 提交 */
    SUBMIT: selectColumns(['id', 'formInstanceId', 'status', 'tableStatus', 'samplesViewToken']),
} as const;

// ============================================
// 验证工具 (从 schema 读取)
// ============================================

/**
 * 获取所有必填字段的 key
 */
export function getRequiredFieldKeys<T extends Record<string, FieldDef>>(fields: T): (keyof T)[] {
    return Object.entries(fields)
        .filter(([_, def]) => def.required)
        .map(([key]) => key as keyof T);
}

/**
 * 获取字段的中文标签
 */
export function getFieldLabel(fieldKey: string): string {
    const def = ORDER_FIELDS[fieldKey as OrderFieldKey];
    return def?.label || fieldKey;
}

/**
 * 获取字段标签映射
 */
export function getFieldLabelMap<T extends Record<string, FieldDef>>(fields: T): Record<keyof T, string> {
    const map = {} as Record<keyof T, string>;
    for (const [key, def] of Object.entries(fields)) {
        map[key as keyof T] = def.label;
    }
    return map;
}

// 预生成的必填字段列表
export const REQUIRED_FIELDS = getRequiredFieldKeys(ORDER_FIELDS);

// 预生成的字段标签映射
export const FIELD_LABELS = getFieldLabelMap(ORDER_FIELDS);

