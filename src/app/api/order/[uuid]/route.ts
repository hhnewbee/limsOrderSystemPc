// File: src/app/api/order/[uuid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';
import type { DBOrder, DBSample, DBPairwise, DBMultiGroup, OrderFormData } from '@/types/order';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;
  console.log(`[API] 获取订单: ${uuid}`);

  try {
    // 1. 从 Supabase 获取数据
    let { data: rawOrder, error } = await supabase
      .from('orders')
      .select(`
        *,
        sample_list(*),
        pairwise_comparison(*),
        multi_group_comparison(*)
      `)
      .eq('uuid', uuid)
      .maybeSingle();

    // 类型断言，确保 TS 知道关联表的结构
    const order = rawOrder as (DBOrder & {
      sample_list: DBSample[];
      pairwise_comparison: DBPairwise[];
      multi_group_comparison: DBMultiGroup[];
    }) | null;

    // 2. 检查有效性
    const hasValidData = order && order.customer_name;

    if (!order || !hasValidData) {
      console.log('[API] 本地无数据，尝试从钉钉获取...');

      if (order && !hasValidData) {
        // 清理脏数据
        await supabase.from('orders').delete().eq('uuid', uuid);
      }

      // 钉钉回退逻辑
      const yidaData = await searchFormData(uuid);
      const parsedData = parseYidaFormData(yidaData);

      if (!parsedData) {
        return NextResponse.json({ error: '订单不存在' }, { status: 404 });
      }

      // 插入初始化数据
      const insertPayload: Partial<DBOrder> = {
        uuid: uuid,
        form_instance_id: parsedData.formInstanceId,
        customer_unit: parsedData.customerUnit,
        customer_name: parsedData.customerName,
        department: parsedData.department,
        department_director: parsedData.departmentDirector,
        customer_phone: parsedData.customerPhone,
        customer_email: parsedData.customerEmail,
        service_type: parsedData.serviceType,
        product_line: parsedData.productLine,
        special_instructions: parsedData.specialInstructions,
        species_name: parsedData.speciesName,
        species_latin_name: parsedData.speciesLatinName,
        sample_type: parsedData.sampleType,
        sample_type_detail: parsedData.sampleTypeDetail,
        detection_quantity: parsedData.detectionQuantity,
        cell_count: parsedData.cellCount,
        preservation_medium: parsedData.preservationMedium,
        sample_preprocessing: parsedData.samplePreprocessing,
        remaining_sample_handling: parsedData.remainingSampleHandling,
        need_bioinformatics_analysis: !!parsedData.needBioinformaticsAnalysis,
        shipping_method: parsedData.shippingMethod,
        express_company_waybill: parsedData.expressCompanyWaybill,
        shipping_time: parsedData.shippingTime
            ? new Date(Number(parsedData.shippingTime)).toISOString()
            : undefined,        project_number: parsedData.projectNumber,
        unit_price: parsedData.unitPrice,
        other_expenses: parsedData.otherExpenses,
        salesman_name: parsedData.salesmanName,
        salesman_contact: parsedData.salesmanContact,
        technical_support_name: parsedData.technicalSupportName,
        project_type: parsedData.projectType,
        status: 'draft',
        table_status: parsedData.tableStatus
      };

      const { data: newOrder, error: insertError } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        throw new Error(`初始化订单失败: ${insertError.message}`);
      }

      // 构建一个包含空子表的临时对象，方便后续统一处理
      rawOrder = {
        ...newOrder,
        sample_list: [],
        pairwise_comparison: [],
        multi_group_comparison: []
      };
    }

    // 再次断言（因为 rawOrder 重新赋值了）
    const finalOrder = rawOrder as (DBOrder & {
      sample_list: DBSample[];
      pairwise_comparison: DBPairwise[];
      multi_group_comparison: DBMultiGroup[];
    });

    // 3. 格式化数据返回前端 (Snake Case -> Camel Case)
    const formattedData: OrderFormData = {
      id: finalOrder.id,
      uuid: finalOrder.uuid,
      formInstanceId: finalOrder.form_instance_id,
      customerUnit: finalOrder.customer_unit,
      customerName: finalOrder.customer_name,
      department: finalOrder.department,
      departmentDirector: finalOrder.department_director,
      customerPhone: finalOrder.customer_phone,
      customerEmail: finalOrder.customer_email,
      serviceType: finalOrder.service_type,
      productLine: finalOrder.product_line,
      specialInstructions: finalOrder.special_instructions,
      speciesName: finalOrder.species_name,
      speciesLatinName: finalOrder.species_latin_name,
      sampleType: finalOrder.sample_type,
      sampleTypeDetail: finalOrder.sample_type_detail,
      detectionQuantity: finalOrder.detection_quantity,
      cellCount: finalOrder.cell_count,
      preservationMedium: finalOrder.preservation_medium,
      samplePreprocessing: finalOrder.sample_preprocessing,
      remainingSampleHandling: finalOrder.remaining_sample_handling,
      needBioinformaticsAnalysis: finalOrder.need_bioinformatics_analysis,
      shippingMethod: finalOrder.shipping_method,
      expressCompanyWaybill: finalOrder.express_company_waybill,
      shippingTime: finalOrder.shipping_time,
      projectNumber: finalOrder.project_number,
      unitPrice: finalOrder.unit_price,
      otherExpenses: finalOrder.other_expenses,
      salesmanName: finalOrder.salesman_name,
      salesmanContact: finalOrder.salesman_contact,
      technicalSupportName: finalOrder.technical_support_name,
      projectType: finalOrder.project_type,
      status: finalOrder.status,
      tableStatus: finalOrder.table_status,

      sampleList: (finalOrder.sample_list || [])
        .sort((a, b) => a.sequence_no - b.sequence_no)
        .map(s => ({
          sampleName: s.sample_name,
          analysisName: s.analysis_name,
          groupName: s.group_name,
          detectionOrStorage: s.detection_or_storage,
          sampleTubeCount: s.sample_tube_count,
          experimentDescription: s.experiment_description
        })),

      pairwiseComparison: (finalOrder.pairwise_comparison || [])
        .sort((a, b) => a.sequence_no - b.sequence_no)
        .map(p => ({
          treatmentGroup: p.treatment_group,
          controlGroup: p.control_group
        })),

      multiGroupComparison: (finalOrder.multi_group_comparison || [])
        .sort((a, b) => a.sequence_no - b.sequence_no)
        .map(m => ({
          comparisonGroups: m.comparison_groups || []
        }))
    };

    return NextResponse.json(formattedData);

  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}