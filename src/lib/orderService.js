import { NextResponse } from 'next/server';

// 工具：转换时间格式
export function formatDateTimeForMySQL(dateString) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return null;
  }
}

/**
 * 核心数据库更新函数
 * @param {Object} connection - 数据库连接对象
 * @param {String} uuid - 订单UUID
 * @param {Object} data - 前端提交的表单数据
 * @param {Object} options - { isSubmit: boolean } 是否为提交操作
 * @returns {Promise<Number>} orderId - 返回订单ID
 */
export async function updateOrderInDb(connection, uuid, data, { isSubmit = false } = {}) {
  // 1. 构建主表更新 SQL
  // 如果是提交操作(isSubmit=true)，额外更新 status 和 submitted_at
  const statusUpdateSql = isSubmit ? ", status = 'submitted', submitted_at = NOW()" : "";

  await connection.execute(
    `UPDATE orders SET
      special_instructions = ?,
      species_name = ?,
      species_latin_name = ?,
      sample_type = ?,
      sample_type_detail = ?,
      detection_quantity = ?,
      cell_count = ?,
      preservation_medium = ?,
      sample_preprocessing = ?,
      remaining_sample_handling = ?,
      need_bioinformatics_analysis = ?,
      shipping_method = ?,
      express_company_waybill = ?,
      shipping_time = ?
      ${statusUpdateSql}
    WHERE uuid = ?`,
    [
      data.specialInstructions || null,
      data.speciesName || null,
      data.speciesLatinName || null,
      data.sampleType || null,
      data.sampleTypeDetail || null,
      data.detectionQuantity || null,
      data.cellCount || null,
      data.preservationMedium || null,
      data.samplePreprocessing || null,
      data.remainingSampleHandling || null,
      data.needBioinformaticsAnalysis ? 1 : 0,
      data.shippingMethod || null,
      data.expressCompanyWaybill || null,
      formatDateTimeForMySQL(data.shippingTime),
      uuid
    ]
  );

  // 2. 获取 Order ID
  const [orders] = await connection.execute('SELECT id FROM orders WHERE uuid = ?', [uuid]);
  if (orders.length === 0) {
    throw new Error('订单不存在');
  }
  const orderId = orders[0].id;

  // 3. 更新样本清单 (使用批量插入优化，支持上千条数据)
  // 删除旧数据
  await connection.execute('DELETE FROM sample_list WHERE order_id = ?', [orderId]);

  if (data.sampleList && Array.isArray(data.sampleList) && data.sampleList.length > 0) {
    const BATCH_SIZE = 500; // 每批次 500 条
    const samples = data.sampleList;

    for (let i = 0; i < samples.length; i += BATCH_SIZE) {
      const batch = samples.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');

      batch.forEach((sample, index) => {
        const globalIndex = i + index;
        values.push(
          orderId,
          globalIndex + 1, // sequence_no
          sample.sampleName || '',
          sample.analysisName || null,
          sample.groupName || null,
          sample.detectionOrStorage || '检测',
          sample.sampleTubeCount || 1,
          sample.experimentDescription || null
        );
      });

      await connection.execute(
        `INSERT INTO sample_list (
          order_id, sequence_no, sample_name, analysis_name, group_name,
          detection_or_storage, sample_tube_count, experiment_description
        ) VALUES ${placeholders}`,
        values
      );
    }
  }

  // 4. 更新两两比较 (数据量通常较小，保持循环插入即可，也可根据需要改为批量)
  await connection.execute('DELETE FROM pairwise_comparison WHERE order_id = ?', [orderId]);
  if (data.pairwiseComparison && Array.isArray(data.pairwiseComparison)) {
    for (let i = 0; i < data.pairwiseComparison.length; i++) {
      const comparison = data.pairwiseComparison[i];
      await connection.execute(
        `INSERT INTO pairwise_comparison (
          order_id, sequence_no, treatment_group, control_group, comparison_scheme
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          orderId,
          i + 1,
          comparison.treatmentGroup || '',
          comparison.controlGroup || '',
          `${comparison.treatmentGroup} vs ${comparison.controlGroup}`
        ]
      );
    }
  }

  // 5. 更新多组比较
  await connection.execute('DELETE FROM multi_group_comparison WHERE order_id = ?', [orderId]);
  if (data.multiGroupComparison && Array.isArray(data.multiGroupComparison)) {
    for (let i = 0; i < data.multiGroupComparison.length; i++) {
      const comparison = data.multiGroupComparison[i];
      let groupsData = comparison.comparisonGroups;
      if (typeof groupsData === 'string') {
        groupsData = groupsData.split(',').map(g => g.trim()).filter(g => g);
      }
      if (!Array.isArray(groupsData)) groupsData = [];

      await connection.execute(
        `INSERT INTO multi_group_comparison (
          order_id, sequence_no, comparison_groups
        ) VALUES (?, ?, ?)`,
        [
          orderId,
          i + 1,
          JSON.stringify(groupsData)
        ]
      );
    }
  }

  return orderId;
}