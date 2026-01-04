---
description: 如何添加或修改订单字段（防止硬编码）
---

# 字段命名规范

本项目采用**三端统一 camelCase** 命名规范：
- 钉钉宜搭表单字段
- PostgreSQL 数据库列名  
- TypeScript/JavaScript 代码

## 添加新字段的步骤

### 1. 在 Schema 中定义字段

编辑 `src/schema/fields.ts`，在 `ORDER_FIELDS` 中添加：

```typescript
// 新增字段示例
newFieldName: { label: '字段中文名', type: 'string', group: 'customer' },
```

### 2. 更新 TypeScript 类型

编辑 `src/types/order.ts`，添加相应的类型定义：

```typescript
newFieldName?: string;
```

### 3. 更新数据库

执行 ALTER TABLE 添加列（使用双引号保留大小写）：

```sql
ALTER TABLE orders ADD COLUMN "newFieldName" VARCHAR(255);
```

### 4. 更新钉钉宜搭表单

在钉钉宜搭中添加对应字段，字段别名使用 camelCase。

## 使用 Schema 工具函数

### 查询数据库

❌ **禁止硬编码**：
```typescript
// 错误示例
.select('uuid, customer_name, table_status')
```

✅ **使用 Schema 工具**：
```typescript
import { selectColumns, QUERY_COLUMNS } from '@/schema/fields';

// 方式1: 使用预定义常量
.select(QUERY_COLUMNS.ORDER_LIST)

// 方式2: 动态生成
.select(selectColumns(['uuid', 'customerName', 'tableStatus']))
```

### 预定义查询列

| 常量 | 用途 | 包含字段 |
|------|------|----------|
| `QUERY_COLUMNS.ORDER_LIST` | 订单列表 | id, uuid, projectNumber, customerName 等 |
| `QUERY_COLUMNS.AUTH_CHECK` | 客户认证 | uuid, userId, customerPhone, customerName |
| `QUERY_COLUMNS.AUTH_CHECK_SALES` | 销售认证 | uuid, salesmanContact, salesmanName |
| `QUERY_COLUMNS.SUBMIT` | 订单提交 | id, formInstanceId, status, tableStatus |

### 验证字段名

```typescript
import { validateFieldName, assertValidField } from '@/schema/fields';

// 运行时检查
if (validateFieldName(fieldName)) {
  // 字段名有效
}

// 断言（无效时抛出错误）
assertValidField(fieldName);
```

## 钉钉字段名映射

钉钉宜搭使用 PascalCase 作为字段别名，需要特殊处理：

```typescript
// dingtalk.ts 中的搜索条件
const searchCondition = JSON.stringify([{
  key: 'UniqueIdentification',  // 钉钉用 PascalCase
  value: uniqueId,
  type: 'TEXT',
  operator: 'eq',
  componentName: 'TextField'
}]);
```

## 常见错误

1. **snake_case vs camelCase**
   - 数据库和代码统一用 `customerName`
   - 不要用 `customer_name`

2. **查询结果类型**
   - Supabase 返回动态类型，使用 `(order as any).fieldName` 或定义接口

3. **钉钉字段别名**
   - 确保钉钉宜搭表单字段别名与代码一致
