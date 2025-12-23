import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { formatDateTimeForPostgres } from '@/lib/orderService';

// 1. 定义字段映射关系 (JSON key -> DB column)
// 只有在这个列表里的字段才允许被更新，防止恶意注入或错误字段
const DB_FIELD_MAPPING: Record<string, string> = {
  // 核心标识
  formInstanceId: 'form_instance_id',

  // 状态字段 (最常用的)
  tableStatus: 'table_status', // 钉钉流程状态，如"审核通过"
  status: 'status',            // 本地系统状态，如"submitted"

  // 客户信息
  customerUnit: 'customer_unit',
  customerName: 'customer_name',
  customerPhone: 'customer_phone',
  department: 'department',

  // 项目信息
  projectNumber: 'project_number',
  projectType: 'project_type',
  salesmanName: 'salesman_name',

  // 费用信息
  unitPrice: 'unit_price',
  otherExpenses: 'other_expenses',

  // 样品/运送相关
  shippingMethod: 'shipping_method',
  expressCompanyWaybill: 'express_company_waybill',
  shippingTime: 'shipping_time',
  needBioinformaticsAnalysis: 'need_bioinformatics_analysis'
};

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;

  console.log(`\n[API-YidaSync] ========== 收到宜搭数据更新请求 ==========`);
  console.log(`[API-YidaSync] UUID: ${uuid}`);

  let body: Record<string, any>;
  try {
    body = await request.json();
    console.log('[API-YidaSync] 接收到的部分数据:', JSON.stringify(body, null, 2));
  } catch (e) {
    return NextResponse.json({ error: '无效的 JSON 数据' }, { status: 400 });
  }

  // 如果没有数据，直接返回
  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ message: '未接收到有效数据，无需更新' });
  }

  try {
    // 2. 动态构建 Supabase Update Object
    const updatePayload: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      // 检查字段是否在允许的映射表中
      const dbColumn = DB_FIELD_MAPPING[key];

      if (dbColumn) {
        let finalValue = value;

        // 特殊处理布尔值 (Postgres 使用 boolean 类型，区别于 MySQL 的 tinyint)
        if (key === 'needBioinformaticsAnalysis') {
          finalValue = !!value;
        }

        // 特殊处理时间字段 (确保为 ISO String)
        if (key === 'shippingTime') {
          finalValue = formatDateTimeForPostgres(value as string);
        }

        updatePayload[dbColumn] = finalValue;
      }
    }

    if (Object.keys(updatePayload).length === 0) {
      console.log('[API-YidaSync] 没有匹配到可更新的数据库字段，跳过');
      return NextResponse.json({ message: '没有匹配的字段需要更新' });
    }

    console.log('[API-YidaSync] 执行 Supabase 更新:', updatePayload);

    // 3. 执行更新
    const { data, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('uuid', uuid)
      .select('id'); // 必须 select 才能确认是否匹配到了行

    if (error) {
      throw error;
    }

    // 检查是否实际匹配到了订单
    if (!data || data.length === 0) {
      console.warn('[API-YidaSync] 未找到对应 UUID 的订单，更新失败');
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    console.log(`[API-YidaSync] 更新成功`);
    return NextResponse.json({
      success: true,
      message: '数据更新成功',
      updatedFields: Object.keys(body).filter(k => DB_FIELD_MAPPING[k])
    });

  } catch (error: any) {
    console.error('[API-YidaSync] 更新失败:', error);
    return NextResponse.json({ error: '数据库更新失败', details: error.message }, { status: 500 });
  }
}