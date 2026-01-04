// File: src/lib/orderService.ts
/**
 * 订单数据库操作服务
 * 
 * 使用统一字段 Schema 自动生成 DB 字段名
 * 📌 新增字段只需修改 schema/fields.ts
 */
import { supabase } from '@/lib/supabase';
import type { OrderFormData } from '@/types/order';
import {
  ORDER_FIELDS,
  SAMPLE_LIST_FIELDS,
  SAMPLE_APP_TO_DB,
  convertAppToDb
} from '@/schema/fields';

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
 * 使用 schema 自动映射字段名
 */
export async function updateOrderInDb(
  uuid: string,
  data: OrderFormData,
  options: UpdateOptions = {}
): Promise<number> {
  const { isSubmit = false } = options;

  // 1. 使用 schema 自动生成更新数据
  // 只更新用户可编辑的字段
  const editableFields: Partial<OrderFormData> = {
    specialInstructions: data.specialInstructions || null,
    speciesName: data.speciesName || null,
    speciesLatinName: data.speciesLatinName || null,
    sampleType: data.sampleType || null,
    sampleTypeDetail: data.sampleTypeDetail || null,
    detectionQuantity: data.detectionQuantity || null,
    cellCount: data.cellCount || null,
    preservationMedium: data.preservationMedium || null,
    samplePreprocessing: data.samplePreprocessing || null,
    remainingSampleHandling: data.remainingSampleHandling || null,
    needBioinformaticsAnalysis: data.needBioinformaticsAnalysis ? true : false,
    shippingMethod: data.shippingMethod || null,
    expressCompanyWaybill: data.expressCompanyWaybill || null,
    shippingTime: data.shippingTime ? formatDateTimeForPostgres(data.shippingTime) : null,
  };

  // 使用 schema 自动转换为 DB 格式
  const updatePayload = convertAppToDb(editableFields);
  updatePayload.updated_at = new Date().toISOString();

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
      // 使用 schema 的 DB 字段名
      [SAMPLE_LIST_FIELDS.sampleName.db]: sample.sampleName || '',
      [SAMPLE_LIST_FIELDS.analysisName.db]: sample.analysisName || null,
      [SAMPLE_LIST_FIELDS.groupName.db]: sample.groupName || null,
      [SAMPLE_LIST_FIELDS.detectionOrStorage.db]: sample.detectionOrStorage || '检测',
      [SAMPLE_LIST_FIELDS.sampleTubeCount.db]: sample.sampleTubeCount || 1,
      [SAMPLE_LIST_FIELDS.experimentDescription.db]: sample.experimentDescription || null
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
      let groupsData: any = item.comparisonGroups;
      if (typeof groupsData === 'string') {
        groupsData = groupsData.split(',').map((g: string) => g.trim()).filter((g: string) => g);
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