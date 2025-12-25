# 销售系统集成指南

本文档说明如何生成用于销售代表访问的“安全订单链接”。

## 1. 链接格式

### 🅰️ 客户链接 (普通访问)
客户直接访问此链接，系统会要求其登录（使用手机号+密码）。登录后自动绑定订单。
```
http://<DOMAIN>/<ORDER_UUID>
例如: http://localhost:3000/12345678-1234-1234-1234-123456789012
```

### 🅱️ 销售安全链接 (免登访问)
销售代表使用带有 `s_token` 参数的链接。系统会解密 Token 识别销售身份，并允许其在不登录客户账号的情况下查看和操作订单（操作日志会记录该销售的 ID）。
```
http://<DOMAIN>/<ORDER_UUID>?s_token=<ENCRYPTED_TOKEN>
```

---

## 2. Token 生成算法

为了生成 `s_token`，你需要使用 **AES-256-CBC** 算法加密销售的钉钉 User ID。

### 加密参数
*   **算法**: `aes-256-cbc`
*   **密钥 (Key)**: 必须是 **32位字符** 的字符串。
    *   *请确保生成端和 LIMS 系统的 `.env` 中 `ENCRYPTION_KEY` 保持一致。*
*   **向量 (IV)**: 16字节随机值。
*   **输出格式**: `IV(Hex):密文(Hex)` (中间用冒号连接)

### 示例代码 (Node.js)

你可以使用以下代码片段在你的后端或脚本中生成 Token：

```javascript
const crypto = require('crypto');

// ⚠️ 必须与 LIMS 部署环境的 ENCRYPTION_KEY 一致 (32字符)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; 
const IV_LENGTH = 16;

function generateSalesToken(dingtalkUserId) {
    // 1. 生成随机 IV
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // 2. 创建加密器
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    
    // 3. 加密 User ID
    let encrypted = cipher.update(dingtalkUserId);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // 4. 拼接返回: iv_hex:encrypted_hex
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// --- 测试 ---
const salesId = "manager1234"; 
const token = generateSalesToken(salesId);

console.log(`销售 ID: ${salesId}`);
console.log(`生成的 Token: ${token}`);
console.log(`完整链接: http://localhost:3000/ORDER-UUID?s_token=${token}`);
```

## 3. 常见问题

**Q: 为什么生成的 Token 每次都不一样？**
A: 因为每次加密都使用了随机的 IV (初始化向量)。这是为了安全，防止同样的 ID 生成固定的密文。解密时会提取前缀的 IV 进行解密，所以无论 IV 怎么变，只要密钥对，都能解出原本 ID。

**Q: 如果 Key 不匹配会怎样？**
A: 后端解密会失败（乱码或报错），API 会拒绝访问。
