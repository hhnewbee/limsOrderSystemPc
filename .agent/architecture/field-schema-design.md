# 字段架构设计文档

> 本文档定义了 LIMS 客户端项目的字段管理架构。所有涉及字段增删改的开发工作**必须**遵循此设计。

## 1. 核心原则

### ✅ 三端统一 camelCase
| 系统 | 命名风格 | 示例 |
|-----|---------|------|
| 钉钉宜搭 | camelCase | `detectionQuantity` |
| 数据库 | camelCase | `"detectionQuantity"` |
| 代码 | camelCase | `detectionQuantity` |

### ✅ 无需转换
由于三端命名一致，**无需任何字段名映射函数**。
数据可以直接在三端之间传递。

## 2. 核心文件

```
src/schema/
├── fields.ts      # 字段定义中心（唯一数据源）
├── types.ts       # TypeScript 类型
├── yidaMapper.ts  # 类型转换（数字、日期、布尔值）
└── index.ts       # 统一导出
```

## 3. 新增字段流程

### Step 1: 添加字段定义
```typescript
// src/schema/fields.ts
export const ORDER_FIELDS = {
  // ... 现有字段
  newField: { label: '新字段', type: 'string', group: 'sample' }
};
```

### Step 2: 更新数据库
```sql
ALTER TABLE orders ADD COLUMN "newField" VARCHAR(255);
```

### Step 3: 更新钉钉宜搭
在钉钉宜搭表单中添加字段，别名设为 `newField`。

### Step 4: 完成
无需修改任何转换代码，数据自动流通！

## 4. 注意事项

- ⚠️ PostgreSQL 中 camelCase 列名需要用双引号
- ⚠️ Supabase 客户端会自动处理引号
- ⚠️ 类型转换仍需要（数字、日期、布尔值）

---

**最后更新**: 2025-12-31
