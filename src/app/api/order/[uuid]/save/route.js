import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { updateOrderInDb } from '@/lib/orderService';

export async function POST(request, { params }) {
  const { uuid } = params;
  const data = await request.json();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 调用公共服务更新数据 (isSubmit: false)
    await updateOrderInDb(connection, uuid, data, { isSubmit: false });

    await connection.commit();
    return NextResponse.json({ success: true, message: '暂存成功' });
  } catch (error) {
    await connection.rollback();
    console.error('暂存订单数据失败:', error);
    // 如果是自定义错误（如订单不存在），返回对应的状态码
    if (error.message === '订单不存在') {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }
    return NextResponse.json({ error: '暂存失败' }, { status: 500 });
  } finally {
    connection.release();
  }
}