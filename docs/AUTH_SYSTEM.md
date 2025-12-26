# LIMS 客户端 - 账户与权限系统

## 概述

本系统采用 **RBAC（基于角色的访问控制）** 模式，通过 Supabase Auth 管理用户认证，支持四种角色的差异化权限控制。

---

## 角色定义

| 角色 | 标识 | 描述 | 登录方式 |
|------|------|------|----------|
| **客户** | `customer` | 查看/编辑自己的订单 | 自行注册或管理员创建 |
| **销售** | `sales` | 管理其名下客户订单 | 仅管理员创建 |
| **实验人员** | `lab` | 查看所有订单样本数据（只读） | 仅管理员创建 |
| **管理员** | `admin` | 管理所有账号和订单 | 仅管理员创建 |

---

## 用户账号结构

### 存储方式

使用 Supabase `auth.users` 表，角色信息存储在 `user_metadata` 中：

```json
{
  "role": "customer",  // customer | sales | lab | admin
  "phone": "13800138000",
  "name": "张三"
}
```

### 虚拟邮箱策略

所有用户使用手机号作为唯一标识，通过虚拟邮箱格式进行 Supabase 认证：

```
手机号 + @client.lims = 虚拟邮箱
例如: 13800138000@client.lims
```

---

## 登录流程

### 客户登录 (`/login`)

```mermaid
flowchart TD
    A[访问订单链接 /{uuid}] --> B[AuthGuard 检查]
    B --> C{已登录?}
    C -->|是| D{是否有权访问?}
    D -->|是| E[显示订单页面]
    D -->|否| F[登出, 重新认证]
    C -->|否| G[调用 check-auth API]
    G --> H{订单是否绑定用户?}
    H -->|是| I[跳转登录页, 显示绑定用户名]
    H -->|否| J{手机号已注册?}
    J -->|是| K[跳转登录页, 显示客户名称]
    J -->|否| L[跳转注册页]
```

**相关文件：**
- `/app/login/page.tsx` - 客户登录页面
- `/app/register/page.tsx` - 客户注册页面
- `/api/order/[uuid]/check-auth/route.ts` - 检查客户认证状态

### 销售登录 (`/login-sales`)

```mermaid
flowchart TD
    A[访问销售链接 /{uuid}/sales] --> B[检查登录状态]
    B --> C{已登录且是销售?}
    C -->|是| D{salesman_contact 匹配?}
    D -->|是| E[显示销售订单页面]
    D -->|否| F[无权访问]
    C -->|否| G[调用 check-auth-sales API]
    G --> H{销售账号存在?}
    H -->|是| I[跳转销售登录页]
    H -->|否| J[显示"请联系管理员"]
```

**相关文件：**
- `/app/login-sales/page.tsx` - 销售登录页面
- `/app/[uuid]/sales/page.tsx` - 销售订单页面
- `/api/order/[uuid]/check-auth-sales/route.ts` - 检查销售认证状态

---

## 权限检查

### 订单 API 权限矩阵

| 角色 | 访问条件 | 操作权限 |
|------|----------|----------|
| **客户** | `order.user_id === userId` | 读写 |
| **销售** | `order.salesman_contact === userPhone` | 读写 |
| **实验** | 任何订单 | 只读样本数据 |
| **管理员** | 任何订单 | 完全控制 |

### 核心权限检查代码

位置：`/api/order/[uuid]/route.ts`

```typescript
if (isAdmin) {
  // Admin can access all orders
} else if (isSales) {
  // Sales can access orders where salesman_contact matches their phone
  if (order.salesman_contact !== userPhone) {
    return 403; // Forbidden
  }
} else if (isCustomer) {
  // Customer can only access their own orders
  if (order.user_id !== userId) {
    return 403; // Forbidden
  }
}
```

---

## 关键组件

### AuthGuard (`/components/AuthGuard.tsx`)

客户端认证守卫，用于保护订单页面：

1. 检查用户是否已登录
2. 对于订单页面，验证用户是否有权访问该订单
3. 如果无权访问或未登录，调用 check-auth API 获取登录信息
4. 重定向到对应的登录/注册页面

### 订单绑定逻辑

位置：`/api/order/[uuid]/route.ts`

```typescript
// 首次访问订单时，自动绑定到当前登录的客户
if (!order.user_id && isCustomer) {
  await supabase.from('orders').update({ user_id: userId }).eq('uuid', uuid);
}
```

---

## 管理后台

### 用户管理 (`/admin/users`)

功能：
- 查看所有用户列表
- 创建新用户（可选择角色：客户/销售/实验/管理员）
- 重置用户密码
- 禁用/启用账号

### 创建用户 API

位置：`/api/admin/users/route.ts`

```typescript
const { data: user } = await supabaseAdmin.auth.admin.createUser({
  email: `${phone}@client.lims`,
  password: password,
  email_confirm: true,
  user_metadata: { role, phone, name }
});
```

---

## 数据库字段

### orders 表关键字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | UUID | 关联的客户用户 ID |
| `customer_phone` | VARCHAR | 客户手机号 |
| `customer_name` | VARCHAR | 客户名称 |
| `salesman_contact` | VARCHAR | 销售手机号 |
| `salesman_name` | VARCHAR | 销售名称 |

---

## 路由结构

| 路由 | 用途 | 可访问角色 |
|------|------|-----------|
| `/{uuid}` | 客户订单页面 | customer, admin |
| `/{uuid}/sales` | 销售订单页面 | sales, admin |
| `/{uuid}/v/{token}` | **样本数据查看（安全链接）** | **持有有效token的任何人** |
| `/login` | 客户登录 | 公开 |
| `/register` | 客户注册 | 公开 |
| `/login-sales` | 销售登录 | 公开 |
| `/login-lab` | 实验人员登录 | 公开 |
| `/lab/samples` | 样本数据查看 | lab, admin |
| `/admin` | 管理后台 | admin |
| `/admin/users` | 用户管理 | admin |
| `/admin/orders` | 订单管理 | admin |

### 安全样本链接

客户提交订单时，系统会自动生成一个唯一的 `samples_view_token`，并生成如下格式的链接：

```
https://domain.com/{uuid}/v/{token}
```

- **token** 是32位随机十六进制字符串
- 链接会保存到数据库 `orders.samples_view_token` 字段
- 链接会同步到钉钉宜搭的 `SamplesLink` 字段
- 只有持有正确 token 的人才能访问样本数据

---

## 安全特性

1. **虚拟邮箱隔离**：使用 `@client.lims` 后缀区分系统用户
2. **角色元数据**：角色存储在 JWT 的 `user_metadata` 中
3. **服务端验证**：所有权限检查在 API 层完成
4. **订单归属绑定**：首次访问自动绑定，防止订单被盗用
5. **销售账号限制**：销售只能由管理员创建，不能自行注册
6. **实验人员只读**：实验人员只能查看样本数据，不能编辑
