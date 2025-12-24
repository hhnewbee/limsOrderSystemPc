/**
 * 订单状态常量定义
 * 用于统一管理前端所有的状态字符串，避免 Magic Strings
 */

export const ORDER_STATUS = {
    // --- 编辑阶段 ---
    DRAFT: '草稿',
    EDITING: '编辑中',
    CUSTOMER_EDITING: '客户编辑中',

    // --- 异常/修改阶段 ---
    CUSTOMER_MODIFYING: '客户修改中', // 通常指被驳回后的状态
    REJECTED: '驳回',

    // --- 提交/审核阶段 ---
    SUBMITTED: 'submitted',     // 前端提交时写入的英文标识
    SUBMITTED_CN: '已提交',      // 可能存在的中文标识
    AUDIT_PENDING: '待审核',
    AUDITING: '审核中',
    APPROVING: '审批中',

    // --- 收样/发货阶段 ---
    WAIT_SAMPLE: '待收样',
    SHIPPED: '已发货',
    RECEIVED_SAMPLE: '已收样',
    SAMPLE_COMPLETED: '收样完成',

    // --- 实验阶段 ---
    TESTING: '检测中',
    ANALYSIS: '分析中',

    // --- 结算/交付阶段 ---
    INVOICE_PENDING: '待开票',
    PAYMENT_PENDING: '待付款',
    DELIVERED: '已交付',
    COMPLETED: '完成'
} as const;

// 定义可编辑的状态集合 (用于权限判断)
export const EDITABLE_STATUSES : string[] = [
    ORDER_STATUS.CUSTOMER_EDITING,
    ORDER_STATUS.CUSTOMER_MODIFYING,
    ORDER_STATUS.DRAFT,
    ORDER_STATUS.EDITING
];