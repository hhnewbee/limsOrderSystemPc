// File: src/lib/dingtalk.ts
import axios from 'axios';
import type { OrderFormData } from '@/types/order';
// 🎉 三端统一 camelCase，不再需要转换器

// 钉钉配置接口 (userId removed - must be passed explicitly)
interface YidaConfig {
  appType: string;
  systemToken: string;
  formUuid: string;
}

// 钉钉宜搭配置 (不包含 userId，必须从 URL 参数获取)
const YIDA_CONFIG: YidaConfig = {
  appType: process.env.DINGTALK_APP_TYPE || 'APP_O1HLHANBEJ2G788IOXWF',
  systemToken: process.env.DINGTALK_SYSTEM_TOKEN || 'R8E66G81C7E11M0ON97O497HGBCR3VJ9ZY7JMZRZ',
  formUuid: process.env.DINGTALK_FORM_UUID || 'FORM-D184603ADC1140688858D03704BD351E10JG'
};

const DINGTALK_API_BASE = 'https://api.dingtalk.com';

interface TokenCache {
  value: string | null;
  expiresAt: number;
}

let tokenCache: TokenCache = {
  value: null,
  expiresAt: 0
};

// 调试日志函数
function debugLog(title: string, data: any): void {
  // 开发环境可以开启
  if (process.env.NODE_ENV === 'development') {
    // console.log(`[DingTalk Debug] ${title}`, data);
  }
}

// 获取钉钉访问令牌
async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // 如果缓存存在且离过期还有5分钟以上，直接使用
  if (tokenCache.value && tokenCache.expiresAt > now + 300000) {
    return tokenCache.value;
  }
  const appKey = process.env.DINGTALK_APP_KEY;
  const appSecret = process.env.DINGTALK_APP_SECRET;

  debugLog('获取AccessToken - 配置信息', {
    appKey: appKey ? `${appKey.substring(0, 8)}...` : '未配置',
    appSecret: appSecret ? '已配置(隐藏)' : '未配置'
  });

  if (!appKey || !appSecret) {
    throw new Error('钉钉应用凭证未配置');
  }

  try {
    debugLog('获取AccessToken - 发送请求', {
      url: `${DINGTALK_API_BASE}/v1.0/oauth2/accessToken`,
      appKey
    });

    const response = await axios.post(`${DINGTALK_API_BASE}/v1.0/oauth2/accessToken`, {
      appKey,
      appSecret
    });

    // 更新缓存
    tokenCache.value = response.data.accessToken;
    tokenCache.expiresAt = now + (response.data.expireIn * 1000);

    return response.data.accessToken;
  } catch (error: any) {
    debugLog('获取AccessToken - 错误', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// 根据唯一标识码查询表单数据 (使用HTTP API)
export async function searchFormData(uniqueId: string, userId?: string): Promise<any> {
  // 🟢 统一验证：必须提供 userId
  if (!userId) {
    throw new Error('DingTalk API 调用失败：缺少必要的 userId 参数 (UD)');
  }

  debugLog('searchFormData - 开始查询', { uniqueId, userId });

  try {
    const accessToken = await getAccessToken();

    const searchCondition = JSON.stringify([{
      key: 'UniqueIdentification',
      value: uniqueId,
      type: 'TEXT',
      operator: 'eq',
      componentName: 'TextField'
    }]);

    const requestBody = {
      formUuid: YIDA_CONFIG.formUuid,
      systemToken: YIDA_CONFIG.systemToken,
      userId: userId, // 🟢 必须传入 userId
      appType: YIDA_CONFIG.appType,
      searchCondition: searchCondition,
      useAlias: true
    };

    const response = await axios.post(
      `${DINGTALK_API_BASE}/v2.0/yida/forms/instances/advances/queryAll`,
      requestBody,
      {
        headers: {
          'x-acs-dingtalk-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error: any) {
    // 🟢 增强错误日志，使用 JSON.stringify 确保完整输出
    const errorDetails = {
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      message: error.message,
      uniqueId,
      userId
    };
    console.error('[DingTalk] searchFormData 调用失败:', JSON.stringify(errorDetails, null, 2));
    throw error;
  }
}

// 保存表单数据到钉钉宜搭 (通常用于新建)
export async function saveFormData(formData: Record<string, any>, operatorId?: string): Promise<any> {
  // 🟢 统一验证：必须提供 operatorId
  if (!operatorId) {
    throw new Error('DingTalk API 调用失败：缺少必要的 operatorId 参数 (UD)');
  }

  debugLog('saveFormData - 开始保存', { formData, operatorId });

  try {
    const accessToken = await getAccessToken();

    const requestBody = {
      formUuid: YIDA_CONFIG.formUuid,
      systemToken: YIDA_CONFIG.systemToken,
      userId: operatorId, // 🟢 必须传入 operatorId
      appType: YIDA_CONFIG.appType,
      formDataJson: JSON.stringify(formData)
    };

    // ... (rest of logic) ...
  } catch (err) { throw err; } // Placeholder only
}

// ... (skipping unchanged code) ...



// 更新表单数据到钉钉宜搭
export async function updateFormData(formInstanceId: string, formData: Record<string, any>, operatorId?: string): Promise<any> {
  // 🟢 统一验证：必须提供 operatorId
  if (!operatorId) {
    throw new Error('DingTalk API 调用失败：缺少必要的 operatorId 参数 (UD)');
  }

  debugLog('updateFormData - 开始更新', { formInstanceId, formData });

  try {
    const accessToken = await getAccessToken();

    const requestBody = {
      formUuid: YIDA_CONFIG.formUuid,
      systemToken: YIDA_CONFIG.systemToken,
      userId: operatorId, // 🟢 必须传入 operatorId
      appType: YIDA_CONFIG.appType,
      formInstanceId: formInstanceId,
      updateFormDataJson: JSON.stringify(formData),
      useAlias: true
    };

    const response = await axios.put(
      `${DINGTALK_API_BASE}/v2.0/yida/forms/instances`,
      requestBody,
      {
        headers: {
          'x-acs-dingtalk-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.success === false) {
      const errorMsg = response.data.message || response.data.errorMsg || '未知错误';
      throw new Error(`钉钉更新失败: ${errorMsg}`);
    }

    if (response.data && response.data.code !== undefined &&
      response.data.code !== 0 && response.data.code !== 'ok') {
      const errorMsg = response.data.message || response.data.errorMsg || `钉钉返回错误代码: ${response.data.code}`;
      throw new Error(`钉钉更新失败: ${errorMsg}`);
    }

    return response.data;
  } catch (error: any) {
    debugLog('updateFormData - 错误', {
      status: error.response?.status,
      message: error.message
    });
    throw error;
  }
}

// =================================================================
// 🎉 三端统一 camelCase，无需字段名转换
// =================================================================

/**
 * 解析钉钉宜搭返回的数据
 * 
 * 由于钉钉、数据库、代码现在都使用 camelCase，
 * 直接返回数据，只添加 formInstanceId
 */
export function parseYidaFormData(yidaData: any): (OrderFormData & { formInstanceId?: string }) | null {
  if (!yidaData || !yidaData.data || yidaData.data.length === 0) {
    return null;
  }

  const instanceData = yidaData.data[0];
  const formData = instanceData.formData;
  const formInstanceId = instanceData.formInstanceId;

  debugLog('parseYidaFormData - 解析数据', { formInstanceId });

  // 直接返回，字段名已统一
  return {
    ...formData,
    formInstanceId
  };
}

/**
 * 将本地数据格式转换为钉钉宜搭格式
 * 
 * 由于字段名已统一，直接返回
 */
export function convertToYidaFormat(localData: Partial<OrderFormData>): any {
  debugLog('convertToYidaFormat - 转换数据', localData);
  return localData;
}