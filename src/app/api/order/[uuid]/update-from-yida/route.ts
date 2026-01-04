// src/app/api/order/[uuid]/update-from-yida/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// 🟢 引入转换器和类型
import { appToDb, yidaToApp } from '@/lib/converters';
import { YidaRawFormData, OrderFormData } from '@/types/order';

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
    console.log('[API-YidaSync] 接收到的数据:', JSON.stringify(body, null, 2));
  } catch (e) {
    return NextResponse.json({ error: '无效的 JSON 数据' }, { status: 400 });
  }

  if (!body || Object.keys(body).length === 0) {
    return NextResponse.json({ message: '未接收到有效数据' });
  }

  try {
    let appData: Partial<OrderFormData> = {};

    // 🟢 智能判断数据源格式
    // 检查是否包含典型的宜搭字段 (PascalCase)
    const isYidaFormat = 'customerUnit' in body || 'uniqueIdentification' in body || 'tableStatus' in body;

    if (isYidaFormat) {
      console.log('[API-YidaSync] 识别为宜搭原始格式 (PascalCase)，正在转换...');
      // 转换为 App 格式 (CamelCase)
      appData = yidaToApp(body as YidaRawFormData);
    } else {
      console.log('[API-YidaSync] 识别为应用内部格式 (CamelCase)');
      // 已经是 App 格式，直接使用（过滤掉不相关字段的任务交给 appToDb）
      appData = body as Partial<OrderFormData>;
    }

    // 🟢 转换为数据库格式 (SnakeCase)
    // appToDb 会自动过滤掉不存在于 DBOrder 接口中的字段，防止 SQL 注入或报错
    const updatePayload = appToDb(appData);

    // 移除不允许更新的主键或核心字段 (如果 appToDb 包含了它们)
    delete updatePayload.id;
    delete updatePayload.uuid;
    // form_instance_id 通常允许更新(如果原来为空)，视业务而定

    if (Object.keys(updatePayload).length === 0) {
      console.log('[API-YidaSync] 没有有效的数据库字段需要更新');
      return NextResponse.json({ message: '无有效更新字段' });
    }

    console.log('[API-YidaSync] 执行 Supabase 更新:', updatePayload);

    const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('uuid', uuid)
        .select('id');

    if (error) throw error;

    if (!data || data.length === 0) {
      console.warn('[API-YidaSync] 未找到对应 UUID 的订单');
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '数据更新成功',
      updatedFields: Object.keys(updatePayload)
    });

  } catch (error: any) {
    console.error('[API-YidaSync] 更新失败:', error);
    return NextResponse.json({ error: '数据库更新失败', details: error.message }, { status: 500 });
  }
}