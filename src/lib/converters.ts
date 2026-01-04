// src/lib/converters.ts
/**
 * 数据格式转换器
 * 
 * 使用统一字段 Schema 自动生成转换逻辑
 * 📌 新增字段只需修改 schema/fields.ts，无需修改此文件
 */
import type {
    DBOrder, DBSample, DBPairwise, DBMultiGroup,
    OrderFormData, YidaRawFormData
} from '@/types/order';
import {
    ORDER_FIELDS,
    SAMPLE_LIST_FIELDS,
    DB_TO_APP,
    APP_TO_DB,
    SAMPLE_DB_TO_APP,
    SAMPLE_APP_TO_DB,
    convertDbToApp,
    convertAppToDb
} from '@/schema/fields';

// ==========================================
// 1. DB (SnakeCase) <-> App (CamelCase)
// ==========================================

export function dbToApp(
    dbOrder: DBOrder & {
        sample_list?: DBSample[],
        pairwise_comparison?: DBPairwise[],
        multi_group_comparison?: DBMultiGroup[]
    }
): OrderFormData {
    // 使用 schema 自动转换主表字段
    const converted = convertDbToApp(dbOrder, DB_TO_APP) as OrderFormData;

    // 手动处理子表 (因为有嵌套结构)
    converted.sampleList = (dbOrder.sample_list || [])
        .sort((a, b) => a.sequence_no - b.sequence_no)
        .map(s => convertDbToApp(s, SAMPLE_DB_TO_APP) as OrderFormData['sampleList'][0]);

    converted.pairwiseComparison = (dbOrder.pairwise_comparison || [])
        .sort((a, b) => a.sequence_no - b.sequence_no)
        .map(p => ({
            treatmentGroup: p.treatment_group,
            controlGroup: p.control_group,
            comparisonScheme: p.comparison_scheme,
        }));

    converted.multiGroupComparison = (dbOrder.multi_group_comparison || [])
        .sort((a, b) => a.sequence_no - b.sequence_no)
        .map(m => ({
            comparisonGroups: m.comparison_groups || []
        }));

    return converted;
}

export function appToDb(formData: Partial<OrderFormData>): Partial<DBOrder> {
    // 使用 schema 自动转换，只转换非 undefined 的字段
    const dbData = convertAppToDb(formData, APP_TO_DB) as Partial<DBOrder>;

    // 特殊处理：时间字段格式化
    if (formData.shippingTime) {
        if (!isNaN(Number(formData.shippingTime))) {
            dbData.shipping_time = new Date(Number(formData.shippingTime)).toISOString();
        } else {
            dbData.shipping_time = formData.shippingTime;
        }
    }

    return dbData;
}

// ==========================================
// 2. Yida (PascalCase) <-> App (CamelCase)
// ==========================================

export function yidaToApp(
    formData: YidaRawFormData,
    formInstanceId?: string
): OrderFormData {
    // 安全转换数字
    const toNumber = (val: string | number | undefined) => {
        if (val === undefined || val === '') return undefined;
        return typeof val === 'number' ? val : parseFloat(val);
    };

    // 安全转换日期
    const toDateString = (val: string | number | undefined) => {
        if (!val) return undefined;
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date.toISOString();
    };

    // 基于 schema 的字段映射
    return {
        formInstanceId,

        // 客户信息
        customerUnit: formData.CustomerUnit,
        customerName: formData.CustomerName,
        department: formData.DepartmentsDepartmentsDepartments,
        departmentDirector: formData.DepartmentDirectorPI,
        customerPhone: formData.CustomerMobilePhone,
        customerEmail: formData.CustomerMailbox,

        // 样品信息
        serviceType: formData.ServiceTypeName,
        productLine: formData.ServiceTypeOther,
        specialInstructions: formData.SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions,
        speciesName: formData.SpeciesName,
        speciesLatinName: formData.SpeciesLatinName,
        sampleType: formData.SampleType,
        sampleTypeDetail: formData.SampleTypeDetails,
        detectionQuantity: toNumber(formData.DetectionQuantity),
        cellCount: toNumber(formData.CellNumber),
        preservationMedium: formData.SaveMedia,
        samplePreprocessing: formData.SamplePreprocessingMethod,
        remainingSampleHandling: formData.RemainingSampleProcessingMethod,
        needBioinformaticsAnalysis: formData.IsBioinformaticsAnalysis === undefined
            ? undefined
            : (formData.IsBioinformaticsAnalysis === '是' || formData.IsBioinformaticsAnalysis === true),

        // 运送信息
        shippingMethod: formData.ModeOfDelivery,
        expressCompanyWaybill: formData.ExpressCompanyAndWaybillNumber,
        shippingTime: toDateString(formData.SampleDeliveryTime),

        // 项目信息
        projectNumber: formData.UniqueIdentification,
        productNo: formData.ProductNo,
        unitPrice: toNumber(formData.UnitPriceOfTestingServiceFee),
        otherExpenses: toNumber(formData.OtherExpenses),
        salesmanName: formData.NameOfSalesman,
        salesmanContact: formData.ContactInformationOfSalesman,
        technicalSupportName: formData.NameOfTechnicalSupportPersonnel,
        projectType: formData.ProjectType,
        tableStatus: formData.TableStatus,
    };
}

export function appToYida(data: Partial<OrderFormData>): YidaRawFormData {
    // 时间转换：App (ISO String) -> Yida (Timestamp number)
    const toTimestamp = (dateStr?: string) => {
        if (!dateStr) return undefined;
        const t = new Date(dateStr).getTime();
        return isNaN(t) ? undefined : t;
    };

    return {
        CustomerUnit: data.customerUnit,
        CustomerName: data.customerName,
        DepartmentsDepartmentsDepartments: data.department,
        DepartmentDirectorPI: data.departmentDirector,
        CustomerMobilePhone: data.customerPhone,
        CustomerMailbox: data.customerEmail,

        ServiceTypeName: data.serviceType,
        ServiceTypeOther: data.productLine,
        SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions: data.specialInstructions,
        SpeciesName: data.speciesName,
        SpeciesLatinName: data.speciesLatinName,
        SampleType: data.sampleType,
        SampleTypeDetails: data.sampleTypeDetail,

        DetectionQuantity: data.detectionQuantity,
        CellNumber: data.cellCount,

        SaveMedia: data.preservationMedium,
        SamplePreprocessingMethod: data.samplePreprocessing,
        RemainingSampleProcessingMethod: data.remainingSampleHandling,
        IsBioinformaticsAnalysis: data.needBioinformaticsAnalysis ? '是' : '否',

        ModeOfDelivery: data.shippingMethod,
        ExpressCompanyAndWaybillNumber: data.expressCompanyWaybill,
        SampleDeliveryTime: toTimestamp(data.shippingTime),

        UniqueIdentification: data.projectNumber,
        ProductNo: data.productNo,
        UnitPriceOfTestingServiceFee: data.unitPrice,
        OtherExpenses: data.otherExpenses,

        NameOfSalesman: data.salesmanName,
        ContactInformationOfSalesman: data.salesmanContact,
        NameOfTechnicalSupportPersonnel: data.technicalSupportName,
        ProjectType: data.projectType,
        TableStatus: data.tableStatus
    };
}