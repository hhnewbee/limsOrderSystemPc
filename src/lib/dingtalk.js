'use strict';

import axios from 'axios';

// 钉钉宜搭配置
const YIDA_CONFIG = {
  appType: process.env.DINGTALK_APP_TYPE || 'APP_O1HLHANBEJ2G788IOXWF',
  systemToken: process.env.DINGTALK_SYSTEM_TOKEN || 'R8E66G81C7E11M0ON97O497HGBCR3VJ9ZY7JMZRZ',
  formUuid: process.env.DINGTALK_FORM_UUID || 'FORM-D184603ADC1140688858D03704BD351E10JG',
  userId: process.env.DINGTALK_USER_ID || '193007455224805338'
};

const DINGTALK_API_BASE = 'https://api.dingtalk.com';
let tokenCache = {
  value: null,
  expiresAt: 0
};

// 调试日志函数
function debugLog(title, data) {
  return
  console.log('\n========================================');
  console.log(`[钉钉API调试] ${title}`);
  console.log('----------------------------------------');
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
  console.log('========================================\n');
}

// 获取钉钉访问令牌
async function getAccessToken() {
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
  } catch (error) {
    debugLog('获取AccessToken - 错误', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// 根据唯一标识码查询表单数据 (使用HTTP API)
export async function searchFormData(uniqueId) {
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
  } catch (error) {
    debugLog('searchFormData - 错误', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// 保存表单数据到钉钉宜搭
export async function saveFormData(formData) {
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

    // 检查是否有明确的错误标志
    if (response.data && response.data.success === false) {
      const errorMsg = response.data.message || response.data.errorMsg || '未知错误';
      throw new Error(`钉钉保存失败: ${errorMsg}`);
    }

    // 如果响应中有 code 字段且不为 0 或 'ok'，也表示失败
    if (response.data && response.data.code !== undefined &&
        response.data.code !== 0 && response.data.code !== 'ok') {
      const errorMsg = response.data.message || response.data.errorMsg || `钉钉返回错误代码: ${response.data.code}`;
      throw new Error(`钉钉保存失败: ${errorMsg}`);
    }

    return response.data;
  } catch (error) {
    debugLog('saveFormData - 错误', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// 更新表单数据到钉钉宜搭
export async function updateFormData(formInstanceId, formData) {
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

    // 钉钉宜搭更新成功时，HTTP 状态码为 200 就表示成功
    // 响应体可能为 {} 或包含其他字段，只要没有异常就认为成功
    // 检查是否有明确的错误标志
    if (response.data && response.data.success === false) {
      const errorMsg = response.data.message || response.data.errorMsg || '未知错误';
      throw new Error(`钉钉更新失败: ${errorMsg}`);
    }

    // 如果响应中有 code 字段且不为 0 或 'ok'，也表示失败
    if (response.data && response.data.code !== undefined &&
        response.data.code !== 0 && response.data.code !== 'ok') {
      const errorMsg = response.data.message || response.data.errorMsg || `钉钉返回错误代码: ${response.data.code}`;
      throw new Error(`钉钉更新失败: ${errorMsg}`);
    }

    return response.data;
  } catch (error) {
    debugLog('updateFormData - 错误', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}

// 解析钉钉宜搭返回的数据格式
export function parseYidaFormData(yidaData) {
  debugLog('parseYidaFormData - 输入数据', yidaData);

  if (!yidaData || !yidaData.data || yidaData.data.length === 0) {
    debugLog('parseYidaFormData - 无数据', null);
    return null;
  }

  const formData = yidaData.data[0].formData;
  const formInstanceId = yidaData.data[0].formInstanceId;

  debugLog('parseYidaFormData - 表单数据', { formInstanceId, formData });

  const result = {
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
    detectionQuantity: formData.DetectionQuantity ? parseInt(formData.DetectionQuantity) : null,
    cellCount: formData.CellNumber ? parseInt(formData.CellNumber) : null,
    preservationMedium: formData.SaveMedia || '',
    samplePreprocessing: formData.SamplePreprocessingMethod || '',
    remainingSampleHandling: formData.RemainingSampleProcessingMethod || '',
    needBioinformaticsAnalysis: formData.IsBioinformaticsAnalysis === '是' || formData.IsBioinformaticsAnalysis === true,

    // 样品运送
    shippingMethod: formData.ModeOfDelivery || '',
    expressCompanyWaybill: formData.ExpressCompanyAndWaybillNumber || '',
    shippingTime: formData.SampleDeliveryTime || null,

    // 项目信息
    projectNumber: formData.UniqueIdentification || '',
    unitPrice: formData.UnitPriceOfTestingServiceFee ? parseFloat(formData.UnitPriceOfTestingServiceFee) : null,
    otherExpenses: formData.OtherExpenses ? parseFloat(formData.OtherExpenses) : null,
    salesmanName: formData.NameOfSalesman || '',
    salesmanContact: formData.ContactInformationOfSalesman || '',
    technicalSupportName: formData.NameOfTechnicalSupportPersonnel || '',
    projectType: formData.ProjectType,
    tableStatus: formData.TableStatus
  };

  debugLog('parseYidaFormData - 解析结果', result);
  return result;
}

// 将本地数据格式转换为钉钉宜搭格式
export function convertToYidaFormat(localData) {
  const result = {
    SpeciesName: localData.speciesName || '',
    SampleTypeDetails: localData.sampleTypeDetail || '',
    CellNumber: localData.cellCount ? String(localData.cellCount) : '',
    SaveMedia: localData.preservationMedium || '',
    SamplePreprocessingMethod: localData.samplePreprocessing || '',
    SpecialInstructionsifYourSampleHasSpecialRequirementsPleaseNoteTheInstructions: localData.specialInstructions || '',
    ExpressCompanyAndWaybillNumber: localData.expressCompanyWaybill || '',
    Remarks: localData.remarks || '',
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

function timeFormat(dateStr) {
  const date = new Date(dateStr);
// 自动根据你电脑的时区转换
  return date.getTime()
}
