// File: src/lib/orderService.ts
import { supabase } from '@/lib/supabase';
import type { OrderFormData } from '@/types/order';

export function formatDateTimeForPostgres(dateString?: string | null): string | null {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

interface UpdateOptions {
  isSubmit?: boolean;
}

/**
 * 核心数据库更新函数
 */
export async function updateOrderInDb(
    uuid: string,
    data: OrderFormData,
    options: UpdateOptions = {}
): Promise<number> {
  const { isSubmit = false } = options;

  // 1. 准备主表更新数据
  // 使用 Record<string, any> 是为了适配 Supabase 的 update 方法类型
  const updatePayload: Record<string, any> = {
    special_instructions: data.specialInstructions || null,
    species_name: data.speciesName || null,
    species_latin_name: data.speciesLatinName || null,
    sample_type: data.sampleType || null,
    sample_type_detail: data.sampleTypeDetail || null,
    detection_quantity: data.detectionQuantity || null,
    cell_count: data.cellCount || null,
    preservation_medium: data.preservationMedium || null,
    sample_preprocessing: data.samplePreprocessing || null,
    remaining_sample_handling: data.remainingSampleHandling || null,
    need_bioinformatics_analysis: data.needBioinformaticsAnalysis ? true : false,
    shipping_method: data.shippingMethod || null,
    express_company_waybill: data.expressCompanyWaybill || null,
    shipping_time: formatDateTimeForPostgres(data.shippingTime),
    updated_at: new Date().toISOString()
  };

  if (isSubmit) {
    updatePayload.status = 'submitted';
    updatePayload.submitted_at = new Date().toISOString();
  }

  // 2. 更新 orders 主表
  const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('uuid', uuid)
      .select('id')
      .single();

  if (orderError || !orderData) {
    console.error('更新订单主表失败:', orderError);
    throw new Error(orderError?.message || '订单更新失败');
  }

  const orderId = orderData.id;

  // 3. 更新样本清单 (删除旧数据 -> 插入新数据)
  await supabase.from('sample_list').delete().eq('order_id', orderId);

  if (data.sampleList && data.sampleList.length > 0) {
    const sampleRows = data.sampleList.map((sample, index) => ({
      order_id: orderId,
      sequence_no: index + 1,
      sample_name: sample.sampleName || '',
      analysis_name: sample.analysisName || null,
      group_name: sample.groupName || null,
      detection_or_storage: sample.detectionOrStorage || '检测',
      sample_tube_count: sample.sampleTubeCount || 1,
      experiment_description: sample.experimentDescription || null
    }));

    const { error: sampleError } = await supabase.from('sample_list').insert(sampleRows);
    if (sampleError) throw new Error(`样本清单保存失败: ${sampleError.message}`);
  }

  // 4. 更新两两比较
  await supabase.from('pairwise_comparison').delete().eq('order_id', orderId);

  if (data.pairwiseComparison && data.pairwiseComparison.length > 0) {
    const pairwiseRows = data.pairwiseComparison.map((item, index) => ({
      order_id: orderId,
      sequence_no: index + 1,
      treatment_group: item.treatmentGroup || '',
      control_group: item.controlGroup || '',
      comparison_scheme: `${item.treatmentGroup} vs ${item.controlGroup}`
    }));

    const { error: pairError } = await supabase.from('pairwise_comparison').insert(pairwiseRows);
    if (pairError) throw new Error(`两两比较保存失败: ${pairError.message}`);
  }

  // 5. 更新多组比较
  await supabase.from('multi_group_comparison').delete().eq('order_id', orderId);

  if (data.multiGroupComparison && data.multiGroupComparison.length > 0) {
    const multiRows = data.multiGroupComparison.map((item, index) => {
      let groupsData = item.comparisonGroups;
      if (typeof groupsData === 'string') {
        groupsData = groupsData.split(',').map(g => g.trim()).filter(g => g);
      }
      return {
        order_id: orderId,
        sequence_no: index + 1,
        comparison_groups: Array.isArray(groupsData) ? groupsData : []
      };
    });

    const { error: multiError } = await supabase.from('multi_group_comparison').insert(multiRows);
    if (multiError) throw new Error(`多组比较保存失败: ${multiError.message}`);
  }

  return orderId;
}