# LIMS 系统前端组件开发规范

本指南旨在规范 `limsordersystempc` 项目中的组件开发，确保代码的可维护性、类型安全性和样式隔离。

---

## 1. 目录结构规范

每个组件必须拥有独立的文件夹，文件夹名称采用 **大驼峰命名法 (PascalCase)**。

### 标准结构
```text
src/components/ComponentName/
├── index.tsx          # 组件逻辑 (必须使用 TypeScript)
├── index.scss         # 组件样式 (使用 SCSS)
└── types.ts           # (可选) 复杂的类型定义
```

- **禁止**：在 `components` 根目录下直接创建孤立的 `.js` 或 `.tsx` 文件。
- **强制**：所有新功能开发必须使用 `.tsx` 后缀并编写类型声明。

---

## 2. TypeScript 规范

### 2.1 接口定义 (Interfaces)
所有组件的 Props 必须定义接口。接口命名统一为 `I{ComponentName}Props` 或 `{ComponentName}Props`。

```typescript
// 示例：src/components/OrderStatusSteps/index.tsx
interface OrderStatusStepsProps {
  /** 当前订单状态字符串 */
  currentStatus: string;
  /** 完整的订单数据对象 */
  data: Record<string, any>;
  /** 可选的回调函数 */
  onStatusChange?: (newStatus: string) => void;
}
```

### 2.2 函数式组件声明
推荐使用 `React.FC` (Function Component) 来声明组件类型。

```typescript
const OrderStatusSteps: React.FC<OrderStatusStepsProps> = ({ currentStatus, data }) => {
  // ...逻辑
  return (
    <div className="status-container">
      {/* ...视图 */}
    </div>
  );
};
```

---

## 3. 样式规范 (SCSS)

### 3.1 模块化隔离
为了防止样式污染，建议在 `index.tsx` 中引入样式。如果项目配置了 CSS Modules，请使用 `index.module.scss`；若使用全局前缀，请确保类名唯一。

### 3.2 变量使用
优先使用项目中定义的全局变量（如颜色、间距），保持 UI 一致性。

```scss
// index.scss
.status-container {
  padding: 16px;
  background-color: #fff;
  border-radius: 8px;

  .step-time {
    font-size: 12px;
    color: rgba(0, 0, 0, 0.45); // 使用标准的 antd 次级文本色
  }
}
```

---

## 4. 最佳实践示例

以下是一个符合规范的组件完整示例：

**src/components/StatusLabel/index.tsx**
```typescript
import React from 'react';
import './index.scss';

interface StatusLabelProps {
  label: string;
  value: string | number;
  type?: 'primary' | 'success' | 'warning';
}

const StatusLabel: React.FC<StatusLabelProps> = ({ label, value, type = 'primary' }) => {
  return (
    <div className={`status-label-item ${type}`}>
      <span className="label">{label}:</span>
      <span className="value">{value}</span>
    </div>
  );
};

export default StatusLabel;
```

---

## 5. 提交流程检查清单

在提交组件代码前，请检查以下各项：

- [ ] **文件名**：文件夹是否是大驼峰？入口是否是 `index.tsx`？
- [ ] **TS 类型**：Props 是否定义了类型？是否有遗留的 `any`（尽量避免）？
- [ ] **注释**：复杂的业务逻辑或 Props 属性是否添加了简要注释？
- [ ] **响应式**：在不同宽度下（尤其是侧边栏组件）显示是否正常？
- [ ] **默认值**：对于可选的 Props，是否设置了默认值？