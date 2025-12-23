// File: src/lib/dingtalk.ts
import axios from 'axios';
import type { OrderFormData, YidaRawFormData } from '@/types/order';

// 钉钉配置接口
interface YidaConfig {
  appType: string;
  systemToken: string;
  formUuid: string;
  userId: string;
}

// 钉钉宜搭配置
const YIDA_CONFIG: YidaConfig = {
  appType: process.env.DINGTALK_APP_TYPE || 'APP_O1HLHANBEJ2G788IOXWF',
  systemToken: process.env.DINGTALK_SYSTEM_TOKEN || 'R8E66G81C7E11M0ON97O497HGBCR3VJ9ZY7JMZRZ',
  formUuid: process.env.DINGTALK_FORM_UUID || 'FORM-D184603ADC1140688858D03704BD351E10JG',
  userId: process.env.DINGTALK_USER_ID || '193007455224805338'
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
  // 开发环境可以开启，生产环境建议关闭或使用专门的 logger
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
    // expireIn 是秒，转为毫秒，并减去一点缓冲时间
    tokenCache.expiresAt = now + (response.data.expireIn * 1000);

    debugLog('获取AccessToken - 响应', {
      accessToken: response.data.accessToken ? `${response.data.accessToken.substring(0, 20)}...` : null,
      expireIn: response.data.expireIn
    });

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
export async function searchFormData(uniqueId: string): Promise<any> {
  debugLog('searchFormData - 开始查询', { uniqueId });

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
      userId: YIDA_CONFIG.userId,
      appType: YIDA_CONFIG.appType,
      searchCondition: searchCondition,
      useAlias: true
    };

    debugLog('searchFormData - 请求参数', requestBody);

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

    debugLog('searchFormData - 响应数据', response.data);

    return response.data;
  } catch (error: any) {
    debugLog('searchFormData - 错误', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// 保存表单数据到钉钉宜搭 (通常用于新建)
export async function saveFormData(formData: Record<string, any>): Promise<any> {
  debugLog('saveFormData - 开始保存', { formData });

  try {
    const accessToken = await getAccessToken();

    const requestBody = {
      formUuid: YIDA_CONFIG.formUuid,
      systemToken: YIDA_CONFIG.systemToken,
      userId: YIDA_CONFIG.userId,
      appType: YIDA_CONFIG.appType,
      formDataJson: JSON.stringify(formData)
    };

    debugLog('saveFormData - 请求参数', requestBody);

    const response = await axios.post(
      `${DINGTALK_API_BASE}/v1.0/yida/forms/instances`,
      requestBody,
      {
        headers: {
          'x-acs-dingtalk-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    debugLog('saveFormData - 响应数据', response.data);

    if (response.data && response.data.success === false) {
      const errorMsg = response.data.message || response.data.errorMsg || '未知错误';
      throw new Error(`钉钉保存失败: ${errorMsg}`);
    }

    if (response.data && response.data.code !== undefined &&
      response.data.code !== 0 && response.data.code !== 'ok') {
      const errorMsg = response.data.message || response.data.errorMsg || `钉钉返回错误代码: ${response.data.code}`;
      throw new Error(`钉钉保存失败: ${errorMsg}`);
    }

    return response.data;
  } catch (error: any) {
    debugLog('saveFormData - 错误', {
      status: error.response?.status,
      message: error.message
    });
    throw error;
  }
}

// 更新表单数据到钉钉宜搭
export async function updateFormData(formInstanceId: string, formData: Record<string, any>): Promise<any> {
  debugLog('updateFormData - 开始更新', { formInstanceId, formData });

  try {
    const accessToken = await getAccessToken();

    const requestBody = {
      formUuid: YIDA_CONFIG.formUuid,
      systemToken: YIDA_CONFIG.systemToken,
      userId: YIDA_CONFIG.userId,
      appType: YIDA_CONFIG.appType,
      formInstanceId: formInstanceId,
      updateFormDataJson: JSON.stringify(formData),
      useAlias: true
    };

    debugLog('updateFormData - 请求参数', requestBody);

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

    debugLog('updateFormData - 响应数据', response.data);

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

// 解析钉钉宜搭返回的数据格式 -> 转换为本地 OrderFormData
export function parseYidaFormData(yidaData: any): OrderFormData | null {
  debugLog('parseYidaFormData - 输入数据', yidaData);

  if (!yidaData || !yidaData.data || yidaData.data.length === 0) {
    debugLog('parseYidaFormData - 无数据', null);
    return null;
  }

  const instanceData = yidaData.data[0];
  const formData = instanceData.formData as YidaRawFormData;
  const formInstanceId = instanceData.formInstanceId;

  debugLog('parseYidaFormData - 表单数据', { formInstanceId, formData });

  const result: OrderFormData = {
    formInstanceId,
    // 客户信息
    customerUnit: formData.CustomerUnit || '',
    customerName: formData.CustomerName || '',
    department: formData.DepartmentsDepartmentsDepartments || '',
    departmentDirector: formData.DepartmentDirectorPI || '',
    customerPhone: formData.CustomerMobilePhone || '',
    customerEmail: formData.CustomerMailbox || '',

    // 样品信息
    serviceType: formData.ServiceTypeName || '',
    productLine: formData.ServiceTypeOther || '',
    specialInstructions: formData.SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions || '',
    speciesName: formData.SpeciesName || '',
    speciesLatinName: formData.SpeciesLatinName || '',
    sampleType: formData.SampleType || '',
    sampleTypeDetail: formData.SampleTypeDetails || '',

    // 数字类型安全转换
    detectionQuantity: formData.DetectionQuantity ? parseInt(String(formData.DetectionQuantity)) : undefined,
    cellCount: formData.CellNumber ? parseInt(String(formData.CellNumber)) : undefined,

    preservationMedium: formData.SaveMedia || '',
    samplePreprocessing: formData.SamplePreprocessingMethod || '',
    remainingSampleHandling: formData.RemainingSampleProcessingMethod || '',
    needBioinformaticsAnalysis: formData.IsBioinformaticsAnalysis === '是' || formData.IsBioinformaticsAnalysis === true,

    // 样品运送
    shippingMethod: formData.ModeOfDelivery || '',
    expressCompanyWaybill: formData.ExpressCompanyAndWaybillNumber || '',
    shippingTime: formData.SampleDeliveryTime ? String(formData.SampleDeliveryTime) : undefined,

    // 项目信息
    projectNumber: formData.UniqueIdentification || '',
    unitPrice: formData.UnitPriceOfTestingServiceFee ? parseFloat(String(formData.UnitPriceOfTestingServiceFee)) : undefined,
    otherExpenses: formData.OtherExpenses ? parseFloat(String(formData.OtherExpenses)) : undefined,
    salesmanName: formData.NameOfSalesman || '',
    salesmanContact: formData.ContactInformationOfSalesman || '',
    technicalSupportName: formData.NameOfTechnicalSupportPersonnel || '',
    projectType: formData.ProjectType,
    tableStatus: formData.TableStatus
  };

  debugLog('parseYidaFormData - 解析结果', result);
  return result;
}

// 将本地数据格式 OrderFormData -> 转换为钉钉宜搭格式
// localData 类型使用 Partial<OrderFormData>，因为不一定所有字段都有值
export function convertToYidaFormat(localData: Partial<OrderFormData>): YidaRawFormData {
  const result: YidaRawFormData = {
    SpeciesName: localData.speciesName || '',
    SampleTypeDetails: localData.sampleTypeDetail || '',
    CellNumber: localData.cellCount ? String(localData.cellCount) : '',
    SaveMedia: localData.preservationMedium || '',
    SamplePreprocessingMethod: localData.samplePreprocessing || '',
    SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions: localData.specialInstructions || '',
    ExpressCompanyAndWaybillNumber: localData.expressCompanyWaybill || '',
    Remarks: '', // OrderFormData 中暂时没有 remarks，如有需要请添加
    SampleType: localData.sampleType || '',
    RemainingSampleProcessingMethod: localData.remainingSampleHandling,
    ModeOfDelivery: localData.shippingMethod,
    SampleDeliveryTime: timeFormat(localData.shippingTime),
    IsBioinformaticsAnalysis: localData.needBioinformaticsAnalysis,
    TableStatus: "客户已提交",
  };

  debugLog('convertToYidaFormat - 转换结果', result);
  return result;
}

// 时间转换：将 ISO 字符串等转换为时间戳或钉钉需要的格式
function timeFormat(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return undefined;
  return date.getTime();
}