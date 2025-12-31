/**
 * /api/order/[uuid]/route.ts - 订单 API 路由
 *
 * 职责: 路由编排 (Orchestration)
 * - 接收请求
 * - 调用服务层进行认证、数据获取、权限校验
 * - 返回响应
 *
 * 具体业务逻辑已拆分到:
 * - @/lib/services/authService - 认证与权限
 * - @/lib/services/orderSyncService - 数据获取与同步
 */

import { NextRequest, NextResponse } from 'next/server';
// 🎉 三端统一格式，不再需要 dbToApp 转换器

// 服务层
import {
  extractAuthContext,
  validateOrderAccess,
  validateDingTalkOrderAccess,
  type AuthContext
} from '@/lib/services/authService';

import {
  fetchOrderFromDB,
  hasValidOrderData,
  syncOrderFromDingTalk,
  claimOrderForUser,
  type FullOrderData
} from '@/lib/services/orderSyncService';

// ============================================================
// 路由参数类型
// ============================================================

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

// ============================================================
// GET 处理器
// ============================================================

/**
 * GET /api/order/[uuid]
 *
 * 获取订单详情，支持以下场景:
 * 1. 数据库已有订单 -> 直接返回
 * 2. 数据库无订单 -> 从钉钉同步后返回
 *
 * 认证方式:
 * - Sales Token (s_token 参数)
 * - Bearer Token (Authorization header)
 *
 * 权限控制:
 * - Admin: 可访问所有订单
 * - Sales: 只能访问自己负责的订单
 * - Customer: 只能访问自己的订单
 * - Lab: 禁止访问 (应使用 /lab/samples)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;

  try {
    // ========================================
    // Step 1: 提取认证上下文
    // ========================================
    const auth = await extractAuthContext(request);

    // 权限门禁: 必须有某种形式的认证
    if (!auth.operatorId && !auth.userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Please login first' },
        { status: 401 }
      );
    }

    // ========================================
    // Step 2: 从数据库获取订单
    // ========================================
    let order = await fetchOrderFromDB(uuid);
    const hasValidData = hasValidOrderData(order);

    // ========================================
    // Step 3: 如果本地有有效数据，进行权限校验
    // ========================================
    if (order && hasValidData) {
      const accessResult = validateOrderAccess(order, auth);

      if (!accessResult.allowed) {
        return NextResponse.json(
          { error: accessResult.reason },
          { status: accessResult.statusCode }
        );
      }

      // 需要将订单绑定到当前用户
      if (accessResult.shouldClaimOrder && auth.userId) {
        await claimOrderForUser(uuid, auth.userId);
        order.userId = auth.userId;
      }
    }

    // ========================================
    // Step 4: 本地无数据，从钉钉同步
    // ========================================
    if (!order || !hasValidData) {
      // upsert 会自动处理更新，无需预先删除

      // 必须有 dingtalkUserId 才能从钉钉同步
      if (!auth.dingtalkUserId) {
        return NextResponse.json({
          error: '链接无效：缺少必要的身份标识参数 (UD)',
          code: 'MISSING_DINGTALK_USER_ID'
        }, { status: 400 });
      }

      // 执行同步
      const syncResult = await syncOrderFromDingTalk(uuid, auth.dingtalkUserId, auth);

      if (!syncResult.success) {
        return NextResponse.json(
          { error: syncResult.error },
          { status: syncResult.statusCode }
        );
      }

      order = syncResult.order!;
    }

    // ========================================
    // Step 5: 返回数据 (三端统一格式，无需转换)
    // ========================================
    return NextResponse.json(order);

  } catch (error: any) {
    console.error('[API] 订单获取失败:', error);
    return NextResponse.json(
      { error: error.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}