'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { message, Spin, Modal } from 'antd';
import axios from 'axios';
import CustomerInfoModule from '@/components/CustomerInfoModule';
import SampleInfoModule from '@/components/SampleInfoModule';
import ShippingModule from '@/components/ShippingModule/ShippingModule';
import ProjectInfoModule from '@/components/ProjectInfoModule';
import SampleAnalysisModule from '@/components/SampleAnalysisModule';
import SubmitArea from '@/components/SubmitArea/SubmitArea';
import Header from "@/components/Header";
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  SaveOutlined
} from "@ant-design/icons";

export default function OrderPage() {
  const params = useParams();
  const uuid = params.uuid;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [errors, setErrors] = useState({});
  
  const initialDataRef = useRef(null);
  const isLoadingRef = useRef(false);

  // 加载订单数据
  const loadOrderData = useCallback(async () => {
    // 防止重复请求（React 严格模式会调用两次）
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;

    try {
      setLoading(true);
      const response = await axios.get(`/api/order/${uuid}`);
      console.log('【调试】API 返回的订单数据:', response.data);
      console.log('【调试】多组比较数据:', response.data.multiGroupComparison);
      setOrderData(response.data);
      initialDataRef.current = JSON.stringify(response.data);
    } catch (error) {
      console.error('加载订单数据失败:', error);
      message.error('加载订单数据失败');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [uuid]);

  useEffect(() => {
    if (uuid) {
      loadOrderData();
    }
  }, [uuid, loadOrderData]);

  // 监听数据变化
  useEffect(() => {
    if (orderData && initialDataRef.current) {
      const currentData = JSON.stringify(orderData);
      setHasUnsavedChanges(currentData !== initialDataRef.current);
    }
  }, [orderData]);

  // 实时校验样本清单
  useEffect(() => {
    if (!orderData?.sampleList || orderData.sampleList.length === 0) {
      setErrors(prev => ({ ...prev, sampleList: undefined }));
      return;
    }

    const sampleErrors = [];
    const sampleNames = new Set();
    const analysisNames = new Set();

    orderData.sampleList.forEach((sample, index) => {
      const rowErrors = {};

      // 样本名称校验
      if (!sample.sampleName) {
        rowErrors.sampleName = '样本名称不能为空';
      } else {
        // 唯一性校验
        if (sampleNames.has(sample.sampleName)) {
          rowErrors.sampleName = '样本名称重复';
        }
        sampleNames.add(sample.sampleName);

        // 格式校验
        if (/[\u4e00-\u9fa5]/.test(sample.sampleName)) {
          rowErrors.sampleName = '样本名称不能包含中文字符';
        } else if (/[￥$&@%]/.test(sample.sampleName)) {
          rowErrors.sampleName = '样本名称不能包含特殊字符';
        } else if (sample.sampleName.length > 10) {
          rowErrors.sampleName = '样本名称长度不能超过10个字符';
        }
      }

      // 分析名称校验（需要生信分析时）
      if (orderData.needBioinformaticsAnalysis) {
        if (!sample.analysisName) {
          rowErrors.analysisName = '分析名称不能为空';
        } else {
          if (analysisNames.has(sample.analysisName)) {
            rowErrors.analysisName = '分析名称重复';
          }
          analysisNames.add(sample.analysisName);

          if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.analysisName)) {
            rowErrors.analysisName = '分析名称格式不正确';
          } else if (sample.analysisName.length > 8) {
            rowErrors.analysisName = '分析名称长度不能超过8个字符';
          }
        }

        // 分组名称校验
        if (!sample.groupName) {
          rowErrors.groupName = '分组名称不能为空';
        } else {
          if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.groupName)) {
            rowErrors.groupName = '分组名称格式不正确';
          } else if (sample.groupName.length > 8) {
            rowErrors.groupName = '分组名称长度不能超过8个字符';
          }
        }
      }

      if (Object.keys(rowErrors).length > 0) {
        sampleErrors[index] = rowErrors;
      }
    });

    setErrors(prev => ({
      ...prev,
      sampleList: sampleErrors.length > 0 ? sampleErrors : undefined
    }));
  }, [orderData?.sampleList, orderData?.needBioinformaticsAnalysis]);

  // 离开页面提示
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && orderData?.status !== 'submitted') {
        e.preventDefault();
        e.returnValue = '您有未保存的更改，确定要离开吗？';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, orderData?.status]);

  // 更新表单数据
  const updateFormData = useCallback((field, value) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // 暂存
  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post(`/api/order/${uuid}/save`, orderData);
      message.success('暂存成功');
      initialDataRef.current = JSON.stringify(orderData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('暂存失败:', error);
      message.error('暂存失败');
    } finally {
      setSaving(false);
    }
  };

  // 表单校验
  const validateForm = () => {
    const newErrors = {};
    
    // 样品信息校验
    if (!orderData.speciesName) {
      newErrors.speciesName = '请填写物种名称';
    }
    if (!orderData.speciesLatinName) {
      newErrors.speciesLatinName = '请填写物种拉丁名';
    }
    if (!orderData.sampleType) {
      newErrors.sampleType = '请选择样本类型';
    }
    if (!orderData.sampleTypeDetail) {
      newErrors.sampleTypeDetail = '请填写样本类型详述';
    }
    if (!orderData.detectionQuantity) {
      newErrors.detectionQuantity = '请填写检测数量';
    }
    if (!orderData.remainingSampleHandling) {
      newErrors.remainingSampleHandling = '请选择剩余样品处理方式';
    }

    // 样品运送校验
    if (!orderData.shippingMethod) {
      newErrors.shippingMethod = '请选择运送方式';
    }
    if (orderData.shippingMethod === '快递') {
      if (!orderData.expressCompanyWaybill) {
        newErrors.expressCompanyWaybill = '请填写快递公司及运单号';
      }
      if (!orderData.shippingTime) {
        newErrors.shippingTime = '请选择送样时间';
      }
    }

    // 样本清单校验
    if (orderData.sampleList && orderData.sampleList.length > 0) {
      const sampleErrors = [];
      const sampleNames = new Set();
      const analysisNames = new Set();

      orderData.sampleList.forEach((sample, index) => {
        const rowErrors = {};
        
        // 样本名称校验
        if (!sample.sampleName) {
          rowErrors.sampleName = '样本名称不能为空';
        } else {
          // 唯一性校验
          if (sampleNames.has(sample.sampleName)) {
            rowErrors.sampleName = '样本名称重复';
          }
          sampleNames.add(sample.sampleName);
          
          // 格式校验
          if (/[\u4e00-\u9fa5]/.test(sample.sampleName)) {
            rowErrors.sampleName = '样本名称不能包含中文字符';
          }
          if (/[￥$&@%]/.test(sample.sampleName)) {
            rowErrors.sampleName = '样本名称不能包含特殊字符';
          }
          if (sample.sampleName.length > 10) {
            rowErrors.sampleName = '样本名称长度不能超过10个字符';
          }
        }

        // 分析名称校验（需要生信分析时）
        if (orderData.needBioinformaticsAnalysis) {
          if (!sample.analysisName) {
            rowErrors.analysisName = '分析名称不能为空';
          } else {
            if (analysisNames.has(sample.analysisName)) {
              rowErrors.analysisName = '分析名称重复';
            }
            analysisNames.add(sample.analysisName);
            
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.analysisName)) {
              rowErrors.analysisName = '分析名称格式不正确';
            }
            if (sample.analysisName.length > 8) {
              rowErrors.analysisName = '分析名称长度不能超过8个字符';
            }
          }

          // 分组名称校验
          if (!sample.groupName) {
            rowErrors.groupName = '分组名称不能为空';
          } else {
            if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(sample.groupName)) {
              rowErrors.groupName = '分组名称格式不正确';
            }
            if (sample.groupName.length > 8) {
              rowErrors.groupName = '分组名称长度不能超过8个字符';
            }
          }
        }

        if (!sample.detectionOrStorage) {
          rowErrors.detectionOrStorage = '请选择检测或暂存';
        }
        if (!sample.sampleTubeCount || sample.sampleTubeCount < 1) {
          rowErrors.sampleTubeCount = '样品管数必须大于0';
        }

        if (Object.keys(rowErrors).length > 0) {
          sampleErrors[index] = rowErrors;
        }
      });

      if (sampleErrors.length > 0) {
        newErrors.sampleList = sampleErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交
  const handleSubmit = async () => {
    if (!validateForm()) {
      message.error('请检查表单填写是否正确');
      return;
    }

    Modal.confirm({
      title: '确认提交',
      content: '提交后将无法修改，确定要提交吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          setSubmitting(true);
          const response = await axios.post(`/api/order/${uuid}/submit`, orderData);
          console.log('[前端] 提交成功:', response.data);
          message.success('提交成功');

          // 更新订单状态和表单状态
          setOrderData(prev => ({
            ...prev,
            status: 'submitted',
            tableStatus: response.data.tableStatus || prev.tableStatus // 更新钉钉表单状态
          }));
          setHasUnsavedChanges(false);
        } catch (error) {
          console.error('[前端] 提交失败:', error);
          const errorMessage = error.response?.data?.error || error.message || '提交失败';
          const errorDetails = error.response?.data?.details;
          const fullMessage = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
          message.error(fullMessage);
          // 提交失败时，不改变订单状态
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: 'center', paddingTop: 100 }}>
        <Spin size="large" tip="加载中...">
          <div style={{ padding: 50 }} />
        </Spin>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="page-container">
        <div className="module-card">
          <h2 style={{ textAlign: 'center', color: '#ff4d4f' }}>订单不存在</h2>
        </div>
      </div>
    );
  }

  // 1. 判断是否可编辑 (由 tableStatus 决定权限)
  const editableTableStatus = ['客户编辑中', '客户修改中', '草稿']; // 确保包含所有可编辑状态
  const isEditable = orderData && editableTableStatus.includes(orderData.tableStatus);

  // 2. 计算显示给用户的状态 (Page Status)
  const getPageStatus = () => {
    if (!orderData) return null;

    // 情况 A: 已正式提交
    if (orderData.status === 'submitted') {
      // 即使已提交，如果 tableStatus 是 "客户修改中"，说明被驳回了
      if (orderData.tableStatus === '客户修改中') {
        return {
          text: '被驳回 / 需修改',
          color: 'error', // 红色
          icon: <ExclamationCircleOutlined />
        };
      }
      return {
        text: '已提交 / 等待审核',
        color: 'success', // 绿色
        icon: <CheckCircleOutlined />
      };
    }

    // 情况 B: 编辑状态 (草稿 或 被驳回)
    if (isEditable) {
      if (hasUnsavedChanges) {
        return {
          text: '编辑中 (未保存)',
          color: 'warning', // 橙色
          icon: <EditOutlined />
        };
      } else {
        return {
          text: '已暂存 / 草稿',
          color: 'processing', // 蓝色
          icon: <SaveOutlined />
        };
      }
    }

    // 情况 C: 其他只读状态 (例如: 审核通过, 实验中)
    return {
      text: orderData.tableStatus || '查看模式',
      color: 'default', // 灰色
      icon: <CloudUploadOutlined />
    };
  };

  const pageStatus = getPageStatus();

  return (
    <>
      <Header status={pageStatus}/>
      <div className="page-container">

        <CustomerInfoModule data={orderData}/>

        <SampleInfoModule
          data={orderData}
          onChange={updateFormData}
          disabled={!isEditable}
          errors={errors}
        />

        <ProjectInfoModule data={orderData}/>

        <ShippingModule
          data={orderData}
          onChange={updateFormData}
          disabled={!isEditable}
          errors={errors}
        />

        <SampleAnalysisModule
          data={orderData}
          onChange={updateFormData}
          disabled={!isEditable}
          errors={errors}
        />

        {isEditable && (
          <SubmitArea
            onSave={handleSave}
            onSubmit={handleSubmit}
            saving={saving}
            submitting={submitting}
            hasUnsavedChanges={hasUnsavedChanges}
          />
        )}
      </div>
    </>
  );
}

