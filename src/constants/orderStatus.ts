/**
 * 订单状态常量定义
 * 用于统一管理前端所有的状态字符串，避免 Magic Strings
 */

export const ORDER_STATUS = {
    // --- 编辑阶段 ---
    DRAFT: '草稿',
    EDITING: '编辑中',
    CUSTOMER_EDITING: '客户编辑中',
    CUSTOMER_WAITING_EDIT: '客户待编辑', // 🟡 New status

    // --- 异常/修改阶段 ---
    CUSTOMER_MODIFYING: '客户修改中', // 通常指被驳回后的状态
    REJECTED: '驳回',

    // --- 提交/审核阶段 ---
    SUBMITTED: 'submitted',     // 前端提交时写入的英文标识
    SUBMITTED_CN: '已提交',      // 可能存在的中文标识
    AUDIT_PENDING: '待审核',
    AUDITING: '审核中',
    AUDIT_COMPLETED: '审核完成',
    APPROVING: '审批中',

    // --- 收样/发货阶段 ---
    WAIT_SAMPLE: '待收样',
    SHIPPED: '已发货',
    RECEIVED_SAMPLE: '已收样',
    SAMPLE_COMPLETED: '收样完成',

    // --- 实验阶段 ---
    TESTING_PENDING: '待检测',
    START_TESTING: '开始检测',
    TESTING: '检测中',
    TESTING_COMPLETED: '检测完成',

    // --- 生信分析阶段 --- (Separate from lab testing if needed)
    ANALYSIS_PENDING: '待分析',
    START_ANALYSIS: '开始分析',
    ANALYSIS: '分析中',
    ANALYSIS_COMPLETED: '分析完成',

    // --- 结算/交付阶段 ---
    INVOICE_PENDING: '待开票',
    INVOICE_COMPLETED: '开票完成',
    PAYMENT_PENDING: '待付款',
    PAYMENT_COMPLETED: '付款完成',
    DELIVERED_PENDING: '待交付',
    DELIVERED: '交付完成', // 对应用户说的“交付完成”
    COMPLETED: '完成',

    // --- 售后/异常 ---
    AFTER_SALES: '进入售后阶段',
    REJECTED_AUDIT: '审批不通过' // 对应用户说的“审批不通过”
} as const;

// 定义可编辑的状态集合 (用于权限判断)
export const EDITABLE_STATUSES: string[] = [
    ORDER_STATUS.CUSTOMER_EDITING,
    ORDER_STATUS.CUSTOMER_WAITING_EDIT, // 🟡 Added here
    ORDER_STATUS.CUSTOMER_MODIFYING,
    ORDER_STATUS.DRAFT,
    ORDER_STATUS.EDITING,
    ORDER_STATUS.REJECTED_AUDIT
];