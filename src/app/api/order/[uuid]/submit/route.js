import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { updateFormData, convertToYidaFormat } from '@/lib/dingtalk';

// 将 ISO 时间字符串转换为 MySQL DATETIME 格式
function formatDateTimeForMySQL(dateString) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    // 获取本地时间，而不是 UTC
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

// 提交订单
export async function POST(request, { params }) {
  const { uuid } = params;
  const data = await request.json();

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 获取订单信息
    const [orders] = await connection.execute(
      'SELECT id, form_instance_id, status FROM orders WHERE uuid = ?',
      [uuid]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    const order = orders[0];

    if (order.status === 'submitted') {
      await connection.rollback();
      return NextResponse.json({ error: '订单已提交，不能重复提交' }, { status: 400 });
    }

    const orderId = order.id;

    // 更新订单主表
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
        shipping_time = ?,
        status = 'submitted',
        submitted_at = NOW()
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

    // 更新样本清单
    if (data.sampleList && Array.isArray(data.sampleList)) {
      await connection.execute(
        'DELETE FROM sample_list WHERE order_id = ?',
        [orderId]
      );

      for (let i = 0; i < data.sampleList.length; i++) {
        const sample = data.sampleList[i];
        await connection.execute(
          `INSERT INTO sample_list (
            order_id, sequence_no, sample_name, analysis_name, group_name,
            detection_or_storage, sample_tube_count, experiment_description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            i + 1,
            sample.sampleName || '',
            sample.analysisName || null,
            sample.groupName || null,
            sample.detectionOrStorage || '检测',
            sample.sampleTubeCount || 1,
            sample.experimentDescription || null
          ]
        );
      }
    }

    // 更新两两比较
    if (data.pairwiseComparison && Array.isArray(data.pairwiseComparison)) {
      await connection.execute(
        'DELETE FROM pairwise_comparison WHERE order_id = ?',
        [orderId]
      );

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

    // 更新多组比较
    if (data.multiGroupComparison && Array.isArray(data.multiGroupComparison)) {
      await connection.execute(
        'DELETE FROM multi_group_comparison WHERE order_id = ?',
        [orderId]
      );

      for (let i = 0; i < data.multiGroupComparison.length; i++) {
        const comparison = data.multiGroupComparison[i];
        await connection.execute(
          `INSERT INTO multi_group_comparison (
            order_id, sequence_no, comparison_groups
          ) VALUES (?, ?, ?)`,
          [
            orderId,
            i + 1,
            JSON.stringify(comparison.comparisonGroups || [])
          ]
        );
      }
    }

    // 提交到钉钉宜搭（不包含样品分析模块数据）
    if (order.form_instance_id) {
      try {
        const yidaData = convertToYidaFormat(data);
        await updateFormData(order.form_instance_id, yidaData);
      } catch (yidaError) {
        console.error('提交到钉钉宜搭失败:', yidaError);
        // 钉钉提交失败不影响本地提交
      }
    }

    await connection.commit();

    return NextResponse.json({ success: true, message: '提交成功' });
  } catch (error) {
    await connection.rollback();
    console.error('提交订单失败:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  } finally {
    connection.release();
  }
}

