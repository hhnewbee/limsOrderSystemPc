// File: src/app/api/order/[uuid]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateFormData, convertToYidaFormat } from '@/lib/dingtalk';
import { updateOrderInDb } from '@/lib/orderService';
import { decrypt } from '@/lib/crypto'; // 🟢
import type { OrderFormData } from '@/types/order';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

// Generate a random token for samples view link
function generateSamplesToken(): string {
  return randomBytes(16).toString('hex'); // 32 character hex string
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;

  try {
    const json = await request.json();
    const data = json as OrderFormData;

    // 🟢 Extract Sales Token
    const salesToken = (json as any)._salesToken as string | undefined;
    let operatorId: string | undefined;

    if (salesToken) {
      try {
        operatorId = decrypt(salesToken);
        console.log(`[Submit] Sales Operator ID: ${operatorId}`);
      } catch (e) {
        console.warn('[Submit] Invalid Sales Token');
      }
    }

    // 1. 预检订单状态
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, form_instance_id, status, table_status, samples_view_token')
      .eq('uuid', uuid)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 允许重新提交的条件：虽然 status='submitted'，但 table_status 是驳回态
    const isRejected = ['驳回', '客户修改中', '审批不通过'].includes(order.table_status || '');

    if (order.status === 'submitted' && !isRejected) {
      return NextResponse.json({ error: '订单已提交，不能重复提交' }, { status: 400 });
    }

    // 2. Generate samples view token if not exists
    let samplesViewToken = order.samples_view_token;
    if (!samplesViewToken) {
      samplesViewToken = generateSamplesToken();
      console.log(`[Submit] Generated samples_view_token: ${samplesViewToken}`);
    }

    // Build samples link URL (using /v/ prefix to avoid route conflicts)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const samplesLink = `${baseUrl}/${uuid}/v/${samplesViewToken}`;

    // 3. 更新数据库 (设置 status='submitted' 和 samples_view_token)
    await updateOrderInDb(uuid, data, { isSubmit: true });

    // Update samples_view_token separately if newly generated
    if (!order.samples_view_token) {
      await supabase
        .from('orders')
        .update({ samples_view_token: samplesViewToken })
        .eq('uuid', uuid);
    }

    // 4. 提交到钉钉宜搭
    const tableStatus = '客户已提交';
    if (order.form_instance_id) {
      try {
        // 需要确保你的 convertToYidaFormat 也支持 TS 类型的入参，或转为 any
        // 🟢 Include tableStatus in data so DingTalk gets updated status
        const yidaData = convertToYidaFormat({
          ...data,
          tableStatus: tableStatus
        });

        // Add SamplesLink to yidaData
        yidaData.SamplesLink = samplesLink;

        console.log('[API] 准备提交到钉钉:', { formInstanceId: order.form_instance_id, samplesLink, tableStatus });

        // 🟢 Pass the Sales Operator ID (if any)
        await updateFormData(order.form_instance_id, yidaData, operatorId);

      } catch (yidaError: any) {
        console.error('[API] 钉钉同步警告:', yidaError.message);
        return NextResponse.json({
          error: '数据已保存，但钉钉同步失败',
          details: yidaError.message
        }, { status: 500 });
      }
    }

    // 5. 更新 table_status
    await supabase
      .from('orders')
      .update({ table_status: tableStatus })
      .eq('uuid', uuid);

    return NextResponse.json({
      success: true,
      message: '提交成功',
      tableStatus,
      samplesLink
    });

  } catch (error: any) {
    console.error('提交订单失败:', error);
    return NextResponse.json({ error: '提交失败', details: error.message }, { status: 500 });
  }
}
