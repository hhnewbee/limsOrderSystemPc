# 提交后实时更新表单状态 - 简化实现

## 问题描述
用户提交订单后，前端表单状态没有及时更新。钉钉的表单状态应该从"客户编辑中"变为"客户已提交"。

## 解决方案

### 核心思路
**提交成功后，直接将表单状态更新为"客户已提交"，不再请求钉钉接口查询状态。**

这样做的好处：
- ✅ 逻辑清晰简单
- ✅ 减少不必要的 API 调用
- ✅ 提交成功即代表状态变更

### 1. 后端实现 (`src/app/api/order/[uuid]/submit/route.js`)

#### 步骤 1：定义提交后的状态
```javascript
const tableStatus = '客户已提交'; // 提交成功后的状态
```

#### 步骤 2：提交到钉钉
```javascript
if (order.form_instance_id) {
  try {
    const yidaData = convertToYidaFormat(data);
    const yidaResponse = await updateFormData(order.form_instance_id, yidaData);
    // 成功则继续
  } catch (yidaError) {
    // 失败则回滚并返回错误
  }
}
```

#### 步骤 3：更新数据库中的表单状态
```javascript
// 更新数据库中的 table_status
await connection.execute(
  'UPDATE orders SET table_status = ? WHERE uuid = ?',
  [tableStatus, uuid]
);
```

#### 步骤 4：提交事务并返回新状态
```javascript
await connection.commit();

return NextResponse.json({
  success: true,
  message: '提交成功',
  tableStatus // 返回新的表单状态："客户已提交"
});
```

### 2. 前端处理 (`src/app/[uuid]/page.js`)

接收后端返回的新状态：

```javascript
const response = await axios.post(`/api/order/${uuid}/submit`, orderData);

// 更新订单状态和表单状态
setOrderData(prev => ({
  ...prev,
  status: 'submitted',
  tableStatus: response.data.tableStatus || prev.tableStatus // "客户已提交"
}));
```

## 工作流程

```
用户点击提交
    ↓
前端发送 POST /api/order/{uuid}/submit
    ↓
后端保存所有数据到数据库
    ↓
后端调用钉钉 updateFormData API
    ↓
钉钉返回 200（成功）
    ↓
后端直接设置 tableStatus = "客户已提交"
    ↓
后端更新数据库的 table_status 字段
    ↓
后端提交事务
    ↓
后端返回 { success: true, tableStatus: "客户已提交" }
    ↓
前端接收响应，更新 orderData.tableStatus
    ↓
前端重新计算 isEditable = false
    ↓
✅ 表单自动变为禁用状态
✅ 提交按钮自动隐藏
```

## 数据库变化

| 字段 | 提交前 | 提交后 |
|-----|-------|-------|
| `status` | 'draft' | 'submitted' |
| `table_status` | '客户编辑中' | '客户已提交' |
| `submitted_at` | NULL | 当前时间 |

## 关键优势

1. **逻辑简洁** - 提交成功 = 状态变为已提交
2. **避免竞态条件** - 无需依赖钉钉的异步状态同步
3. **性能优化** - 减少不必要的查询请求
4. **可靠性高** - 事务内完成所有操作

## 完整数据流

```
客户编辑中
    ↓
用户修改表单
    ↓
用户点击提交
    ↓
后端处理提交
    ↓
客户已提交 ← 状态直接更新
    ↓
前端自动禁用表单
    ↓
（如果钉钉改为"客户修改中"）
    ↓
用户下次打开时
    ↓
前端再次变为可编辑
```

## 修改的文件
1. `src/app/api/order/[uuid]/submit/route.js` - 后端提交逻辑
2. `src/app/[uuid]/page.js` - 前端提交处理

