// File: src/lib/orderService.ts
// 🎉 统一使用 camelCase 字段名
import { supabase } from '@/lib/supabase';
import type { OrderData } from '@/types/order';

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
 * 核心数据库更新函数 (camelCase 字段名)
 */
export async function updateOrderInDb(
  uuid: string,
  data: OrderData,
  options: UpdateOptions = {}
): Promise<number> {
  const { isSubmit = false } = options;

  // 1. 准备主表更新数据 (camelCase)
  const updatePayload: Record<string, any> = {
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
    shippingTime: formatDateTimeForPostgres(data.shippingTime),
    updatedAt: new Date().toISOString()
  };

  if (isSubmit) {
    updatePayload.status = 'submitted';
    updatePayload.submittedAt = new Date().toISOString();
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
  await supabase.from('sample_list').delete().eq('orderId', orderId);

  if (data.sampleList && data.sampleList.length > 0) {
    const sampleRows = data.sampleList.map((sample, index) => ({
      orderId: orderId,
      orderUuid: uuid,
      sequenceNo: index + 1,
      sampleName: sample.sampleName || '',
      analysisName: sample.analysisName || null,
      groupName: sample.groupName || null,
      detectionOrStorage: sample.detectionOrStorage || '检测',
      sampleTubeCount: sample.sampleTubeCount || 1,
      experimentDescription: sample.experimentDescription || null
    }));

    const { error: sampleError } = await supabase.from('sample_list').insert(sampleRows);
    if (sampleError) throw new Error(`样本清单保存失败: ${sampleError.message}`);
  }

  // 4. 更新两两比较
  await supabase.from('pairwise_comparison').delete().eq('orderId', orderId);

  if (data.pairwiseComparison && data.pairwiseComparison.length > 0) {
    const pairwiseRows = data.pairwiseComparison.map((item, index) => ({
      orderId: orderId,
      orderUuid: uuid,
      sequenceNo: index + 1,
      treatmentGroup: item.treatmentGroup || '',
      controlGroup: item.controlGroup || '',
      comparisonScheme: `${item.treatmentGroup} vs ${item.controlGroup}`
    }));

    const { error: pairError } = await supabase.from('pairwise_comparison').insert(pairwiseRows);
    if (pairError) throw new Error(`两两比较保存失败: ${pairError.message}`);
  }

  // 5. 更新多组比较
  await supabase.from('multi_group_comparison').delete().eq('orderId', orderId);

  if (data.multiGroupComparison && data.multiGroupComparison.length > 0) {
    const multiRows = data.multiGroupComparison.map((item, index) => {
      let groupsData: any = item.comparisonGroups;
      if (typeof groupsData === 'string') {
        groupsData = groupsData.split(',').map((g: string) => g.trim()).filter((g: string) => g);
      }
      return {
        orderId: orderId,
        orderUuid: uuid,
        sequenceNo: index + 1,
        comparisonGroups: Array.isArray(groupsData) ? groupsData : []
      };
    });

    const { error: multiError } = await supabase.from('multi_group_comparison').insert(multiRows);
    if (multiError) throw new Error(`多组比较保存失败: ${multiError.message}`);
  }

  return orderId;
}