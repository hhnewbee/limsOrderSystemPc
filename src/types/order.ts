// File: src/types/order.ts

// 对应数据库表结构的类型 (Supabase Raw Data)
export interface DBOrder {
    id: number;
    uuid: string;
    form_instance_id?: string;
    customer_unit?: string;
    customer_name?: string;
    department?: string;
    department_director?: string;
    customer_phone?: string;
    customer_email?: string;
    service_type?: string;
    product_line?: string;
    special_instructions?: string;
    species_name?: string;
    species_latin_name?: string;
    sample_type?: string;
    sample_type_detail?: string;
    detection_quantity?: number;
    cell_count?: number;
    preservation_medium?: string;
    sample_preprocessing?: string;
    remaining_sample_handling?: string;
    need_bioinformatics_analysis?: boolean;
    shipping_method?: string;
    express_company_waybill?: string;
    shipping_time?: string; // ISO String
    project_number?: string;
    unit_price?: number;
    other_expenses?: number;
    salesman_name?: string;
    salesman_contact?: string;
    technical_support_name?: string;
    project_type?: string;
    status?: string;
    table_status?: string;
    created_at?: string;
    updated_at?: string;
    submitted_at?: string;
    user_id?: string; // 🟢 Auth User ID
    sales_dingtalk_id?: string; // 🟢 Sales Dingtalk ID
}

export interface DBSample {
    id?: number;
    order_id?: number;
    sequence_no: number;
    sample_name: string;
    analysis_name?: string;
    group_name?: string;
    detection_or_storage: string;
    sample_tube_count: number;
    experiment_description?: string;
}

export interface DBPairwise {
    id?: number;
    order_id?: number;
    sequence_no: number;
    treatment_group: string;
    control_group: string;
    comparison_scheme?: string;
}

export interface DBMultiGroup {
    id?: number;
    order_id?: number;
    sequence_no: number;
    comparison_groups: string[]; // JSONB 自动转数组
}

// 前端表单使用的类型 (CamelCase)
export interface OrderFormData {
    id?: number;
    uuid?: string;
    formInstanceId?: string;
    customerUnit?: string;
    customerName?: string;
    department?: string;
    departmentDirector?: string;
    customerPhone?: string;
    customerEmail?: string;
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
    shippingMethod?: string;
    expressCompanyWaybill?: string;
    shippingTime?: string;
    projectNumber?: string;
    unitPrice?: number;
    otherExpenses?: number;
    salesmanName?: string;
    salesmanContact?: string;
    technicalSupportName?: string;
    projectType?: string;
    status?: string;
    tableStatus?: string;

    // 子表数据
    sampleList?: Array<{
        sampleName?: string;
        analysisName?: string;
        groupName?: string;
        detectionOrStorage?: string;
        sampleTubeCount?: number;
        experimentDescription?: string;
    }>;
    pairwiseComparison?: Array<{
        treatmentGroup?: string;
        controlGroup?: string;
        comparisonScheme?: string; // Auto-generated
    }>;
    multiGroupComparison?: Array<{
        comparisonGroups?: string[];
        comparisonName?: string; // Auto-generated
    }>;
}

// 1. 定义钉钉宜搭原始表单数据的接口 (根据 dingtalk.js 中的解析逻辑推断)
export interface YidaRawFormData {
    UniqueIdentification?: string;
    CustomerUnit?: string;
    CustomerName?: string;
    DepartmentsDepartmentsDepartments?: string;
    DepartmentDirectorPI?: string;
    CustomerMobilePhone?: string;
    CustomerMailbox?: string;
    ServiceTypeName?: string;
    ServiceTypeOther?: string;
    SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions?: string;
    SpeciesName?: string;
    SpeciesLatinName?: string;
    SampleType?: string;
    SampleTypeDetails?: string;
    DetectionQuantity?: string | number;
    CellNumber?: string | number;
    SaveMedia?: string;
    SamplePreprocessingMethod?: string;
    RemainingSampleProcessingMethod?: string;
    IsBioinformaticsAnalysis?: string | boolean;
    ModeOfDelivery?: string;
    ExpressCompanyAndWaybillNumber?: string;
    SampleDeliveryTime?: string | number; // 可能是时间戳或字符串
    UnitPriceOfTestingServiceFee?: string | number;
    OtherExpenses?: string | number;
    NameOfSalesman?: string;
    ContactInformationOfSalesman?: string;
    NameOfTechnicalSupportPersonnel?: string;
    ProjectType?: string;
    TableStatus?: string;
    Remarks?: string;
    SamplesLink?: string; // 样本数据查看链接
}