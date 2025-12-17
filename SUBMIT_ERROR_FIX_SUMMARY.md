# 订单提交失败处理改进总结

## 问题描述
当钉钉宜搭 API 提交失败（返回 500 错误）时，页面仍然显示"提交成功"，导致订单状态被错误地设置为"已提交"。

## 修复内容

### 1. 后端修改 (`src/app/api/order/[uuid]/submit/route.js`)

#### 改进 #1: 钉钉提交失败时回滚事务
- **原因**: 当钉钉提交失败时，原代码只是 catch 异常但继续提交，导致本地数据被提交到数据库
- **修复**: 当钉钉提交失败时，立即调用 `connection.rollback()` 回滚所有更改
- **位置**: 第 169-188 行

```javascript
// 提交失败时立即回滚
catch (yidaError) {
  await connection.rollback();
  return NextResponse.json({
    error: '钉钉提交失败，请重试',
    details: yidaError.message
  }, { status: 500 });
}
```

#### 改进 #2: 添加详细日志
- 在提交前后添加日志，便于调试
- 记录钉钉返回的响应

### 2. 前端修改 (`src/app/[uuid]/page.js`)

#### 改进 #1: 修复提交失败处理
- **原因**: 提交失败时，代码没有检查返回状态就直接更新订单状态
- **修复**: 只有当 API 返回成功响应（不抛出异常）时，才更新订单状态为 "submitted"

```javascript
// 提交成功才更新状态
if (response.ok) {
  setOrderData(prev => ({ ...prev, status: 'submitted' }));
}
// 提交失败不更新状态
```

#### 改进 #2: 显示详细的错误信息
- 显示 `error` 和 `details` 字段
- 帮助用户了解具体是什么原因导致提交失败

```javascript
const errorMessage = error.response?.data?.error || error.message || '提交失败';
const errorDetails = error.response?.data?.details;
const fullMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
message.error(fullMessage);
```

### 3. 钉钉模块改进 (`src/lib/dingtalk.js`)

#### 改进: 增强错误检查
- **位置**: `updateFormData` 函数，第 195-199 行
- **改进**: 检查钉钉返回的 `success` 和 `code` 字段，提前发现错误

```javascript
if (response.data && (response.data.success === false || response.data.code !== 0)) {
  const errorMsg = response.data.message || response.data.errorMsg || '未知错误';
  throw new Error(`钉钉更新失败: ${errorMsg}`);
}
```

## 修复效果

### 修复前流程
1. 用户点击提交
2. 后端保存本地数据到数据库
3. 钉钉提交失败（返回 500）
4. 后端只记录错误但继续提交
5. **页面显示"提交成功"**（错误！）
6. 订单状态被错误地设置为"已提交"（错误！）

### 修复后流程
1. 用户点击提交
2. 后端开始事务
3. 保存本地数据到数据库
4. 提交钉钉
5. 钉钉提交失败（返回 500）
6. **立即回滚**所有数据库更改
7. 返回 500 错误给前端
8. **页面显示"钉钉提交失败，请重试: [错误详情]"**（正确！）
9. **订单状态保持 "draft"**（正确！）

## 测试建议

1. **模拟钉钉服务不可用**
   - 测试网络错误情况
   - 验证错误消息是否正确显示

2. **验证数据库状态**
   - 提交失败后检查 orders 表，status 应该仍是 'draft'
   - 检查关联的样本清单、比较数据是否已回滚

3. **验证前端交互**
   - 提交失败后，页面所有字段应该仍可编辑
   - 可以再次尝试提交

## 相关文件变更
- `src/app/api/order/[uuid]/submit/route.js` - 后端提交逻辑
- `src/app/[uuid]/page.js` - 前端提交处理
- `src/lib/dingtalk.js` - 钉钉 API 调用

