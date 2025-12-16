import { NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db';

// 初始化数据库
export async function POST() {
  try {
    await initDatabase();
    return NextResponse.json({ success: true, message: '数据库初始化成功' });
  } catch (error) {
    console.error('数据库初始化失败:', error);
    return NextResponse.json({ error: '数据库初始化失败: ' + error.message }, { status: 500 });
  }
}

