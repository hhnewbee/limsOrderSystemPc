// File: src/app/api/order/[uuid]/save/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updateOrderInDb } from '@/lib/orderService';
import type { OrderFormData } from '@/types/order';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;

  try {
    const data = await request.json() as OrderFormData;

    await updateOrderInDb(uuid, data, { isSubmit: false });

    return NextResponse.json({ success: true, message: '暂存成功' });
  } catch (error: any) {
    console.error('暂存订单数据失败:', error);
    return NextResponse.json({ error: '暂存失败', details: error.message }, { status: 500 });
  }
}