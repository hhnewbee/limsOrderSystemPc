// src/lib/converters.ts
import type {
    DBOrder, DBSample, DBPairwise, DBMultiGroup,
    OrderFormData, YidaRawFormData
} from '@/types/order';

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
    return {
        id: dbOrder.id,
        uuid: dbOrder.uuid,
        formInstanceId: dbOrder.form_instance_id,

        // 客户信息
        customerUnit: dbOrder.customer_unit,
        customerName: dbOrder.customer_name,
        department: dbOrder.department,
        departmentDirector: dbOrder.department_director,
        customerPhone: dbOrder.customer_phone,
        customerEmail: dbOrder.customer_email,

        // 样品信息
        serviceType: dbOrder.service_type,
        productLine: dbOrder.product_line,
        specialInstructions: dbOrder.special_instructions,
        speciesName: dbOrder.species_name,
        speciesLatinName: dbOrder.species_latin_name,
        sampleType: dbOrder.sample_type,
        sampleTypeDetail: dbOrder.sample_type_detail,
        detectionQuantity: dbOrder.detection_quantity,
        cellCount: dbOrder.cell_count,
        preservationMedium: dbOrder.preservation_medium,
        samplePreprocessing: dbOrder.sample_preprocessing,
        remainingSampleHandling: dbOrder.remaining_sample_handling,
        needBioinformaticsAnalysis: dbOrder.need_bioinformatics_analysis,

        // 运送信息
        shippingMethod: dbOrder.shipping_method,
        expressCompanyWaybill: dbOrder.express_company_waybill,
        shippingTime: dbOrder.shipping_time,

        // 项目信息
        projectNumber: dbOrder.project_number,
        unitPrice: dbOrder.unit_price,
        otherExpenses: dbOrder.other_expenses,
        salesmanName: dbOrder.salesman_name,
        salesmanContact: dbOrder.salesman_contact,
        technicalSupportName: dbOrder.technical_support_name,
        projectType: dbOrder.project_type,

        // 状态
        status: dbOrder.status,
        tableStatus: dbOrder.table_status,

        // 子表处理
        sampleList: (dbOrder.sample_list || [])
            .sort((a, b) => a.sequence_no - b.sequence_no)
            .map(s => ({
                sampleName: s.sample_name,
                analysisName: s.analysis_name,
                groupName: s.group_name,
                detectionOrStorage: s.detection_or_storage,
                sampleTubeCount: s.sample_tube_count,
                experimentDescription: s.experiment_description
            })),

        pairwiseComparison: (dbOrder.pairwise_comparison || [])
            .sort((a, b) => a.sequence_no - b.sequence_no)
            .map(p => ({
                treatmentGroup: p.treatment_group,
                controlGroup: p.control_group,
                comparisonScheme: p.comparison_scheme,
            })),

        multiGroupComparison: (dbOrder.multi_group_comparison || [])
            .sort((a, b) => a.sequence_no - b.sequence_no)
            .map(m => ({
                comparisonGroups: m.comparison_groups || []
            }))
    };
}

export function appToDb(formData: Partial<OrderFormData>): Partial<DBOrder> {
    const dbData: Partial<DBOrder> = {};

    // 辅助函数：仅当值不为 undefined 时才赋值
    const assign = <K extends keyof DBOrder>(key: K, value: any) => {
        if (value !== undefined) {
            dbData[key] = value as any;
        }
    };

    assign('uuid', formData.uuid);
    assign('form_instance_id', formData.formInstanceId);

    assign('customer_unit', formData.customerUnit);
    assign('customer_name', formData.customerName);
    assign('department', formData.department);
    assign('department_director', formData.departmentDirector);
    assign('customer_phone', formData.customerPhone);
    assign('customer_email', formData.customerEmail);

    assign('service_type', formData.serviceType);
    assign('product_line', formData.productLine);
    assign('special_instructions', formData.specialInstructions);
    assign('species_name', formData.speciesName);
    assign('species_latin_name', formData.speciesLatinName);
    assign('sample_type', formData.sampleType);
    assign('sample_type_detail', formData.sampleTypeDetail);
    assign('detection_quantity', formData.detectionQuantity);
    assign('cell_count', formData.cellCount);
    assign('preservation_medium', formData.preservationMedium);
    assign('sample_preprocessing', formData.samplePreprocessing);
    assign('remaining_sample_handling', formData.remainingSampleHandling);
    assign('need_bioinformatics_analysis', formData.needBioinformaticsAnalysis);

    assign('shipping_method', formData.shippingMethod);
    assign('express_company_waybill', formData.expressCompanyWaybill);

    // 时间处理：确保是 ISO 格式
    if (formData.shippingTime) {
        // 如果是数字时间戳字符串
        if (!isNaN(Number(formData.shippingTime))) {
            assign('shipping_time', new Date(Number(formData.shippingTime)).toISOString());
        } else {
            assign('shipping_time', formData.shippingTime);
        }
    }

    assign('project_number', formData.projectNumber);
    assign('unit_price', formData.unitPrice);
    assign('other_expenses', formData.otherExpenses);
    assign('salesman_name', formData.salesmanName);
    assign('salesman_contact', formData.salesmanContact);
    assign('technical_support_name', formData.technicalSupportName);
    assign('project_type', formData.projectType);

    assign('status', formData.status);
    assign('table_status', formData.tableStatus);

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

    return {
        formInstanceId, // 来自外部参数

        customerUnit: formData.CustomerUnit,
        customerName: formData.CustomerName,
        department: formData.DepartmentsDepartmentsDepartments,
        departmentDirector: formData.DepartmentDirectorPI,
        customerPhone: formData.CustomerMobilePhone,
        customerEmail: formData.CustomerMailbox,

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
        // 宜搭可能返回 '是'/'否' 或 boolean
        // 🟢 Fix: 如果字段未定义，则返回 undefined，避免覆盖原有值
        needBioinformaticsAnalysis: formData.IsBioinformaticsAnalysis === undefined
            ? undefined
            : (formData.IsBioinformaticsAnalysis === '是' || formData.IsBioinformaticsAnalysis === true),

        shippingMethod: formData.ModeOfDelivery,
        expressCompanyWaybill: formData.ExpressCompanyAndWaybillNumber,
        shippingTime: toDateString(formData.SampleDeliveryTime),

        projectNumber: formData.UniqueIdentification,
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
        IsBioinformaticsAnalysis: data.needBioinformaticsAnalysis,

        ModeOfDelivery: data.shippingMethod,
        ExpressCompanyAndWaybillNumber: data.expressCompanyWaybill,
        SampleDeliveryTime: toTimestamp(data.shippingTime),

        UniqueIdentification: data.projectNumber,
        UnitPriceOfTestingServiceFee: data.unitPrice,
        OtherExpenses: data.otherExpenses,

        NameOfSalesman: data.salesmanName,
        ContactInformationOfSalesman: data.salesmanContact,
        NameOfTechnicalSupportPersonnel: data.technicalSupportName,
        ProjectType: data.projectType,
        TableStatus: data.tableStatus
    };
}