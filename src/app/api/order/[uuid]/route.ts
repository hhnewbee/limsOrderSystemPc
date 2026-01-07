import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import { checkOrderAccess, checkDingTalkOrderAccess } from '@/lib/services/authService';
import {
  getOrderFromDb,
  hasValidData,
  syncOrderFromDingTalk,
  bindOrderToUser
} from '@/lib/services/orderSyncService';
import { dbToApp } from '@/lib/converters';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

/**
 * GET /api/order/[uuid]
 * 
 * 获取订单数据，使用现有服务层：
 * - withAuth 中间件处理认证
 * - orderSyncService 处理数据获取和同步
 * - authService 处理权限检查
 */
export const GET = withAuth<RouteParams>(
  async (request: NextRequest, { params }: RouteParams, auth: AuthContext) => {
    const { uuid } = await params;

    try {
      // 1. 从数据库获取订单
      let order = await getOrderFromDb(uuid);

      // 2. 如果有订单，检查访问权限
      if (order && hasValidData(order)) {
        // 如果是销售 Token 访问，直接允许
        if (!auth.operatorId && auth.userId && auth.role) {
          const accessResult = checkOrderAccess(order, {
            userId: auth.userId,
            role: auth.role as 'admin' | 'sales' | 'lab' | 'customer',
            phone: auth.userPhone || null
          });

          if (!accessResult.allowed) {
            return NextResponse.json(
              { error: accessResult.reason || 'Forbidden' },
              { status: 403 }
            );
          }

          // 如果需要绑定订单到用户
          if (accessResult.shouldBind && auth.userId) {
            await bindOrderToUser(uuid, auth.userId);
            order.user_id = auth.userId;
          }
        }

        return NextResponse.json(dbToApp(order));
      }

      // 3. 本地无数据，从钉钉同步
      if (!auth.dingtalkUserId) {
        return NextResponse.json({
          error: '链接无效：缺少必要的身份标识参数 (UD)',
          code: 'MISSING_DINGTALK_USER_ID'
        }, { status: 400 });
      }

      console.log('[API] 本地无数据，从钉钉同步:', uuid);

      // 删除可能存在的空订单
      if (order && !hasValidData(order)) {
        const { supabase } = await import('@/lib/supabase');
        await supabase.from('orders').delete().eq('uuid', uuid);
      }

      // 同步前先检查权限（如果有登录用户）
      let bindToUserId: string | undefined;
      if (auth.userId && auth.role) {
        // 无法预先检查钉钉订单权限，同步后再检查
        // 但可以确定绑定用户
        if (auth.role === 'customer') {
          bindToUserId = auth.userId;
        }
      }

      // 执行同步
      const syncResult = await syncOrderFromDingTalk(uuid, auth.dingtalkUserId, bindToUserId);

      if (!syncResult.success) {
        return NextResponse.json(
          { error: syncResult.error || '订单不存在' },
          { status: 404 }
        );
      }

      // 获取同步后的数据
      const newOrder = await getOrderFromDb(uuid);
      if (!newOrder) {
        return NextResponse.json({ error: '获取订单失败' }, { status: 500 });
      }

      // 同步后检查权限（特别是销售和管理员）
      if (auth.userId && auth.role && auth.role !== 'customer') {
        const parsedData = dbToApp(newOrder);
        const accessResult = checkDingTalkOrderAccess(
          {
            customerPhone: parsedData.customerPhone,
            salesmanContact: parsedData.salesmanContact
          },
          {
            userId: auth.userId,
            role: auth.role as 'admin' | 'sales' | 'lab' | 'customer',
            phone: auth.userPhone || null
          }
        );

        if (!accessResult.allowed) {
          return NextResponse.json(
            { error: accessResult.reason || 'Forbidden' },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(dbToApp(newOrder));

    } catch (error: any) {
      console.error('[API] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  },
  { requireAuth: true, allowSalesToken: true }
);