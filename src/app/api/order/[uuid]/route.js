import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';

// 获取订单数据
export async function GET(request, { params }) {
  const { uuid } = await params;

  console.log('\n[API] ========== 开始获取订单 ==========');
  console.log('[API] UUID:', uuid);

  try {
    const connection = await pool.getConnection();
    console.log('[API] 数据库连接成功');

    try {
      // 先从数据库查询
      const [orders] = await connection.execute(
        'SELECT * FROM orders WHERE uuid = ?',
        [uuid]
      );

      console.log('[API] 数据库查询结果:', orders.length > 0 ? '找到订单' : '未找到订单');

      let orderData;

      // 检查数据库中是否有有效数据（customer_name不为空表示有效数据）
      const hasValidData = orders.length > 0 && orders[0].customer_name;
      console.log('[API] 数据库数据是否有效:', hasValidData);

      if (orders.length === 0 || !hasValidData) {
        // 数据库中没有或数据为空，从钉钉宜搭获取
        console.log('[API] 从钉钉宜搭获取数据...');
        const yidaData = await searchFormData(uuid);
        console.log('[API] 钉钉返回数据:', JSON.stringify(yidaData, null, 2));

        const parsedData = parseYidaFormData(yidaData);
        console.log('[API] 解析后数据:', JSON.stringify(parsedData, null, 2));

        if (!parsedData) {
          return NextResponse.json({ error: '订单不存在' }, { status: 404 });
        }

        // 如果数据库中已有空记录，先删除
        if (orders.length > 0 && !hasValidData) {
          console.log('[API] 删除数据库中的空记录...');
          await connection.execute('DELETE FROM orders WHERE uuid = ?', [uuid]);
        }

        // 1. 定义数据库字段名与 parsedData 键名的映射关系
        const fieldMapping = [
          { db: 'uuid', val: uuid },
          { db: 'form_instance_id', val: parsedData.formInstanceId },
          { db: 'customer_unit', val: parsedData.customerUnit },
          { db: 'customer_name', val: parsedData.customerName },
          { db: 'department', val: parsedData.department },
          { db: 'department_director', val: parsedData.departmentDirector },
          { db: 'customer_phone', val: parsedData.customerPhone },
          { db: 'customer_email', val: parsedData.customerEmail },
          { db: 'service_type', val: parsedData.serviceType },
          { db: 'product_line', val: parsedData.productLine },
          { db: 'special_instructions', val: parsedData.specialInstructions },
          { db: 'species_name', val: parsedData.speciesName },
          { db: 'species_latin_name', val: parsedData.speciesLatinName },
          { db: 'sample_type', val: parsedData.sampleType },
          { db: 'sample_type_detail', val: parsedData.sampleTypeDetail },
          { db: 'detection_quantity', val: parsedData.detectionQuantity },
          { db: 'cell_count', val: parsedData.cellCount },
          { db: 'preservation_medium', val: parsedData.preservationMedium },
          { db: 'sample_preprocessing', val: parsedData.samplePreprocessing },
          { db: 'remaining_sample_handling', val: parsedData.remainingSampleHandling },
          { db: 'need_bioinformatics_analysis', val: parsedData.needBioinformaticsAnalysis ? 1 : 0 },
          { db: 'shipping_method', val: parsedData.shippingMethod },
          { db: 'express_company_waybill', val: parsedData.expressCompanyWaybill },
          { db: 'shipping_time', val: parsedData.shippingTime },
          { db: 'project_number', val: parsedData.projectNumber },
          { db: 'unit_price', val: parsedData.unitPrice },
          { db: 'other_expenses', val: parsedData.otherExpenses },
          { db: 'salesman_name', val: parsedData.salesmanName },
          { db: 'salesman_contact', val: parsedData.salesmanContact },
          { db: 'technical_support_name', val: parsedData.technicalSupportName },
          { db: 'project_type', val: parsedData.projectType },
          { db: 'status', val: 'draft' }, // 硬编码状态
          { db: 'table_status', val: parsedData.tableStatus }
        ];

        // 2. 自动拆分为字段名数组和值数组
        const dbFields = fieldMapping.map(m => m.db);
        const dbValues = fieldMapping.map(m => (m.val === undefined ? null : m.val));

        // 3. 构建 SQL：此时 dbFields.length 必然等于 dbValues.length
        const placeholders = dbFields.map(() => '?').join(', ');
        const sql = `INSERT INTO orders (${dbFields.join(', ')}) VALUES (${placeholders})`;

        console.log(`[API] 准备插入数据: 字段数(${dbFields.length}), 参数数(${dbValues.length})`);

        let insertId;

        try {
          const [result] = await connection.execute(sql, dbValues);
          insertId = result.insertId;
          console.log('[API] 数据库插入成功，ID:', insertId);
        } catch (dbError) {
          console.error('[API] 数据库执行报错:', dbError.message);
          console.error('[API] 报错 SQL:', sql);
          throw dbError; // 抛出异常由外层 catch 统一处理
        }

        console.log('[API] 数据已保存到数据库，ID:', insertId);

        orderData = {
          id: insertId,
          uuid,
          ...parsedData,
          status: 'draft',
          sampleList: [],
          pairwiseComparison: [],
          multiGroupComparison: []
        };
      } else {
        // 从数据库获取完整数据
        const order = orders[0];

        // 获取样本清单
        const [sampleList] = await connection.execute(
          'SELECT * FROM sample_list WHERE order_id = ? ORDER BY sequence_no',
          [order.id]
        );

        // 获取两两比较
        const [pairwiseComparison] = await connection.execute(
          'SELECT * FROM pairwise_comparison WHERE order_id = ? ORDER BY sequence_no',
          [order.id]
        );

        // 获取多组比较
        const [multiGroupComparison] = await connection.execute(
          'SELECT * FROM multi_group_comparison WHERE order_id = ? ORDER BY sequence_no',
          [order.id]
        );

        orderData = {
          id: order.id,
          uuid: order.uuid,
          formInstanceId: order.form_instance_id,
          customerUnit: order.customer_unit,
          customerName: order.customer_name,
          department: order.department,
          departmentDirector: order.department_director,
          customerPhone: order.customer_phone,
          customerEmail: order.customer_email,
          serviceType: order.service_type,
          productLine: order.product_line,
          specialInstructions: order.special_instructions,
          speciesName: order.species_name,
          speciesLatinName: order.species_latin_name,
          sampleType: order.sample_type,
          sampleTypeDetail: order.sample_type_detail,
          detectionQuantity: order.detection_quantity,
          cellCount: order.cell_count,
          preservationMedium: order.preservation_medium,
          samplePreprocessing: order.sample_preprocessing,
          remainingSampleHandling: order.remaining_sample_handling,
          needBioinformaticsAnalysis: order.need_bioinformatics_analysis === 1,
          shippingMethod: order.shipping_method,
          expressCompanyWaybill: order.express_company_waybill,
          shippingTime: order.shipping_time,
          projectNumber: order.project_number,
          unitPrice: order.unit_price,
          otherExpenses: order.other_expenses,
          salesmanName: order.salesman_name,
          salesmanContact: order.salesman_contact,
          technicalSupportName: order.technical_support_name,
          projectType: order.project_type,
          status: order.status,
          tableStatus: order.table_status,
          sampleList: sampleList.map(s => ({
            id: s.id,
            sequenceNo: s.sequence_no,
            sampleName: s.sample_name,
            analysisName: s.analysis_name,
            groupName: s.group_name,
            detectionOrStorage: s.detection_or_storage,
            sampleTubeCount: s.sample_tube_count,
            experimentDescription: s.experiment_description
          })),
          pairwiseComparison: pairwiseComparison.map(p => ({
            id: p.id,
            sequenceNo: p.sequence_no,
            treatmentGroup: p.treatment_group,
            controlGroup: p.control_group,
            comparisonScheme: p.comparison_scheme
          })),
          multiGroupComparison: multiGroupComparison.map(m => {
            let comparisonGroups = [];

            if (m.comparison_groups) {
              // 转换为字符串（处理 Buffer 或其他类型）
              let str = m.comparison_groups.toString ? m.comparison_groups.toString() : String(m.comparison_groups);
              str = str.trim();

              // 首先尝试 JSON 解析
              if (str.startsWith('[') && str.endsWith(']')) {
                try {
                  const parsed = JSON.parse(str);
                  if (Array.isArray(parsed)) {
                    comparisonGroups = parsed;
                  }
                } catch (e) {
                  console.warn('[API] JSON 解析失败:', e.message, '原值:', str);
                }
              }

              // 如果 JSON 解析失败或不是 JSON 格式，尝试按逗号分割
              if (comparisonGroups.length === 0 && str.length > 0) {
                comparisonGroups = str
                  .split(',')
                  .map(g => g.trim())
                  .filter(g => g.length > 0);
              }
            }

            return {
              id: m.id,
              sequenceNo: m.sequence_no,
              comparisonGroups: Array.isArray(comparisonGroups) ? comparisonGroups : []
            };
          })
        };
      }

      console.log('[API] 返回订单数据，状态:', orderData.status);
      console.log('[API] ========== 订单获取完成 ==========\n');
      return NextResponse.json(orderData);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[API] 获取订单数据失败:', error);
    console.error('[API] 错误堆栈:', error.stack);
    return NextResponse.json({ error: '获取订单数据失败', details: error.message }, { status: 500 });
  }
}

