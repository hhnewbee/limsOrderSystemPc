# 钉钉表单状态处理 - 完整实现

## 需求
当钉钉表单状态是"客户修改中"时，表单应该重新变回可修改状态

## 实现方案

### 1. 数据库修改 (`src/lib/db.js`)
添加新字段 `table_status` 用来存储钉钉表单状态：

```sql
ALTER TABLE orders ADD COLUMN table_status VARCHAR(100) COMMENT '钉钉表单状态';
```

### 2. 钉钉数据解析 (`src/lib/dingtalk.js`)

#### parseYidaFormData 函数
从钉钉返回的数据中提取 `TableStatus` 字段：

```javascript
const tableStatus = yidaData.data[0].tableStatus; // 获取钉钉表单状态
const result = {
  formInstanceId,
  tableStatus, // 添加到结果中
  // ... 其他字段
};
```

### 3. 后端 API 修改 (`src/app/api/order/[uuid]/route.js`)

#### 创建订单时
保存 `table_status` 到数据库：

```javascript
INSERT INTO orders (..., table_status) VALUES (..., ?, ?)
// 参数：...., parsedData.tableStatus
```

#### 返回订单数据时
包含 `tableStatus` 字段：

```javascript
orderData = {
  ...
  tableStatus: order.table_status,
  ...
}
```

### 4. 前端逻辑修改 (`src/app/[uuid]/page.js`)

#### 判断表单是否可编辑
根据 `tableStatus` 判断：

```javascript
// 可编辑状态：客户编辑中、客户修改中
const editableTableStatus = ['客户编辑中', '客户修改中'];
const isEditable = editableTableStatus.includes(orderData.tableStatus);

// 显示"已下单"标记的条件：非可编辑状态且已提交
const isSubmitted = !isEditable && orderData.status === 'submitted';
```

#### 更新模块的 disabled 属性
从 `disabled={isSubmitted}` 改为 `disabled={!isEditable}`

```javascript
<SampleInfoModule 
  disabled={!isEditable}  // 根据钉钉状态判断
  ...
/>
```

#### 条件显示提交按钮
只有在可编辑状态时才显示提交按钮：

```javascript
{isEditable && (
  <SubmitArea 
    onSave={handleSave}
    onSubmit={handleSubmit}
    ...
  />
)}
```

## 钉钉表单状态对应关系

| 钉钉状态 | tableStatus 值 | 前端表现 | 可编辑 |
|---------|--------|---------|-------|
| 客户编辑中 | 客户编辑中 | 表单可编辑，显示提交按钮 | ✅ 是 |
| 客户已提交 | 客户已提交 | 表单不可编辑，不显示提交按钮 | ❌ 否 |
| 客户修改中 | **客户修改中** | **表单可编辑，显示提交按钮** | **✅ 是** |
| 业务员审核完成 | 业务员审核完成 | 表单不可编辑 | ❌ 否 |
| 技术支持审核完成 | 技术支持审核完成 | 表单不可编辑 | ❌ 否 |
| 项目管理审核完成 | 项目管理审核完成 | 表单不可编辑 | ❌ 否 |

## 工作流程

```
用户打开订单
    ↓
从钉钉获取 tableStatus
    ↓
根据 tableStatus 判断 isEditable
    ↓
isEditable = true (如 "客户修改中")
    ↓
✅ 表单可编辑
✅ 显示提交按钮
    ↓
用户可以编辑并重新提交
```

## 修改的文件列表
1. `src/lib/db.js` - 添加 `table_status` 字段
2. `src/lib/dingtalk.js` - 解析 `tableStatus` 字段
3. `src/app/api/order/[uuid]/route.js` - 保存和返回 `tableStatus`
4. `src/app/[uuid]/page.js` - 根据 `tableStatus` 控制表单可编辑性

## 测试建议
1. 创建订单并保存到"客户编辑中"状态
2. 验证表单字段可编辑，提交按钮显示
3. 提交后，将钉钉状态改为"客户修改中"
4. 重新打开订单，验证表单字段变为可编辑
5. 验证其他不可编辑状态下表单仍然禁用

