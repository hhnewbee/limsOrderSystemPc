# 提交后实时更新表单状态 - 完整实现

## 问题描述
用户提交订单后，前端表单状态没有及时更新。钉钉的表单状态从"客户编辑中"变为"客户已提交"，但页面仍显示原来的状态。

## 根本原因
提交成功后，后端只返回了 `{ success: true }`，没有返回新的 `tableStatus`。前端因此无法更新表单状态。

## 解决方案

### 1. 后端修改 (`src/app/api/order/[uuid]/submit/route.js`)

#### 步骤 1：导入必要的函数
```javascript
import { updateFormData, convertToYidaFormat, searchFormData } from '@/lib/dingtalk';
```

#### 步骤 2：提交后获取最新表单状态
在 `await connection.commit()` 之后添加：

```javascript
// 提交成功后，从钉钉获取最新的表单状态
let tableStatus = null;
if (order.form_instance_id) {
  try {
    console.log('[API] 获取最新的表单状态...');
    const yidaData = await searchFormData(uuid);
    if (yidaData && yidaData.data && yidaData.data.length > 0) {
      tableStatus = yidaData.data[0].tableStatus;
      console.log('[API] 获取到最新表单状态:', tableStatus);
      
      // 更新数据库中的 table_status
      const connection2 = await pool.getConnection();
      try {
        await connection2.execute(
          'UPDATE orders SET table_status = ? WHERE uuid = ?',
          [tableStatus, uuid]
        );
      } finally {
        connection2.release();
      }
    }
  } catch (statusError) {
    console.error('[API] 获取表单状态失败:', statusError.message);
    // 不影响提交成功的结果，只是无法更新状态
  }
}
```

#### 步骤 3：返回新的表单状态
修改返回值：

```javascript
return NextResponse.json({
  success: true,
  message: '提交成功',
  tableStatus // 返回最新的表单状态
});
```

### 2. 前端修改 (`src/app/[uuid]/page.js`)

在 `handleSubmit` 函数的提交成功处理中：

```javascript
const response = await axios.post(`/api/order/${uuid}/submit`, orderData);
message.success('提交成功');

// 更新订单状态和表单状态
setOrderData(prev => ({
  ...prev,
  status: 'submitted',
  tableStatus: response.data.tableStatus || prev.tableStatus // 更新钉钉表单状态
}));
```

## 工作流程

```
用户点击提交
    ↓
前端发送 POST /api/order/{uuid}/submit
    ↓
后端保存数据到数据库
    ↓
后端调用钉钉 updateFormData API
    ↓
钉钉返回 200，表单状态自动变为"客户已提交"
    ↓
后端调用 searchFormData 重新查询表单状态
    ↓
获取到新的 tableStatus = "客户已提交"
    ↓
后端更新数据库的 table_status
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

## 关键改进点

1. **实时同步**: 提交后立即从钉钉获取最新状态
2. **数据库更新**: 同时更新本地数据库，下次加载时数据一致
3. **容错处理**: 如果获取状态失败，不影响提交成功的结果
4. **前端自动更新**: 无需手动刷新，UI 自动反映新状态

## 测试流程

1. 填写并提交订单
2. 验证：
   - ✅ 页面显示"提交成功"
   - ✅ tableStatus 从 "客户编辑中" 变为 "客户已提交"
   - ✅ 表单所有字段自动变为禁用
   - ✅ 提交和暂存按钮自动隐藏
3. 刷新页面，验证状态持久化正确
4. 当钉钉将状态改为"客户修改中"后：
   - ✅ 下次打开页面时表单自动可编辑
   - ✅ 提交按钮重新出现

## 修改的文件
1. `src/app/api/order/[uuid]/submit/route.js` - 后端提交逻辑
2. `src/app/[uuid]/page.js` - 前端提交处理

