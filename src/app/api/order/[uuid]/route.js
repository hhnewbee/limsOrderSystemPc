import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';

// 获取订单数据
export async function GET(request, { params }) {
  const { uuid } = params;

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

        // 保存到数据库
        const [result] = await connection.execute(
          `INSERT INTO orders (
            uuid, form_instance_id, customer_unit, customer_name, department,
            department_director, customer_phone, customer_email, service_type,
            product_line, special_instructions, species_name, species_latin_name,
            sample_type, sample_type_detail, detection_quantity, cell_count,
            preservation_medium, sample_preprocessing, remaining_sample_handling,
            need_bioinformatics_analysis, shipping_method, express_company_waybill,
            shipping_time, project_number, unit_price, other_expenses, salesman_name,
            salesman_contact, technical_support_name, project_type, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
          [
            uuid, parsedData.formInstanceId, parsedData.customerUnit, parsedData.customerName,
            parsedData.department, parsedData.departmentDirector, parsedData.customerPhone,
            parsedData.customerEmail, parsedData.serviceType, parsedData.productLine,
            parsedData.specialInstructions, parsedData.speciesName, parsedData.speciesLatinName,
            parsedData.sampleType, parsedData.sampleTypeDetail, parsedData.detectionQuantity,
            parsedData.cellCount, parsedData.preservationMedium, parsedData.samplePreprocessing,
            parsedData.remainingSampleHandling, parsedData.needBioinformaticsAnalysis ? 1 : 0,
            parsedData.shippingMethod, parsedData.expressCompanyWaybill, parsedData.shippingTime,
            parsedData.projectNumber, parsedData.unitPrice, parsedData.otherExpenses,
            parsedData.salesmanName, parsedData.salesmanContact, parsedData.technicalSupportName,
            parsedData.projectType
          ]
        );

        console.log('[API] 数据已保存到数据库，ID:', result.insertId);

        orderData = {
          id: result.insertId,
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
          multiGroupComparison: multiGroupComparison.map(m => ({
            id: m.id,
            sequenceNo: m.sequence_no,
            comparisonGroups: JSON.parse(m.comparison_groups)
          }))
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

