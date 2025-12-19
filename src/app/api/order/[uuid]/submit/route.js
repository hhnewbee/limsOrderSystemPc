import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { updateFormData, convertToYidaFormat } from '@/lib/dingtalk';
import { updateOrderInDb } from '@/lib/orderService';

export async function POST(request, { params }) {
  const { uuid } = params;
  const data = await request.json();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 预先检查订单状态
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

    // 2. 调用公共服务更新数据并修改状态 (isSubmit: true)
    // 注意：这里复用了数据保存逻辑，且会自动将 status 设置为 submitted
    await updateOrderInDb(connection, uuid, data, { isSubmit: true });

    // 3. 提交到钉钉宜搭
    const tableStatus = '客户已提交';
    if (order.form_instance_id) {
      try {
        const yidaData = convertToYidaFormat(data);
        console.log('[API] 准备提交到钉钉:', { formInstanceId: order.form_instance_id });

        await updateFormData(order.form_instance_id, yidaData);
        console.log('[API] 钉钉同步成功');
      } catch (yidaError) {
        await connection.rollback();
        console.error('[API] 提交到钉钉宜搭失败:', yidaError.message);
        return NextResponse.json({
          error: '钉钉提交失败，请重试',
          details: yidaError.message || '未知错误'
        }, { status: 500 });
      }
    }

    // 4. 更新本地 table_status
    await connection.execute(
      'UPDATE orders SET table_status = ? WHERE uuid = ?',
      [tableStatus, uuid]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: '提交成功',
      tableStatus
    });
  } catch (error) {
    await connection.rollback();
    console.error('提交订单失败:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  } finally {
    connection.release();
  }
}