/**
 * Services Index
 * 
 * 统一导出所有服务模块
 */

// 订单同步服务
export {
    getOrderFromDbOrDingTalk,
    getOrderFromDb,
    syncOrderFromDingTalk,
    findUserIdByPhone,
    bindOrderToUser,
    hasValidData,
    type OrderWithRelations,
    type GetOrderResult,
    type SyncOptions
} from './orderSyncService';

// 认证服务
export {
    checkOrderAccess,
    checkDingTalkOrderAccess,
    getAuthTypeForOrder,
    findUserByPhone,
    getPhoneByUserId,
    getUserContextFromToken,
    type UserRole,
    type UserContext,
    type OrderAccessResult,
    type AuthCheckResult
} from './authService';
