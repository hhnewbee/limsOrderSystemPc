'use client';

import { Form, Input, Select, InputNumber, Radio } from 'antd';
import { EditableInput, EditableSelect, EditableTextArea, ReadOnlyText } from './ReadOnlyField';

const { TextArea } = Input;

const SAMPLE_TYPES = [
  '植物组织', '动物组织', '细胞', '血液类', '外泌体细胞', '上清环境样品',
  '粪便', '肠道内容物', '尿液灌洗液', '瘤胃液拭子', '发酵物', '细菌真菌',
  'DNA', 'total RNAPCR产物', '石蜡包埋样本', '其他类型'
];

const PRESERVATION_MEDIUMS = [
  '无', '乙醇', 'Trizol', 'RNA Later', 'TE Buffer', 
  'Nuclease-Free水', 'AB裂解液', '其他保存介'
];

const REMAINING_SAMPLE_HANDLING = [
  '返样（收取干冰及快递费用：省内180元/批；省外300元/批',
  '销毁（项目交付后1个月进行销毁）',
  '保存样品： 0-3个月 500元/月',
  '保存样品： 3-6个月 1000元/月'
];

export default function SampleInfoModule({ data, onChange, disabled, errors }) {
  return (
    <div className="module-card">
      <h2 className="module-title">样品信息</h2>
      <Form layout="vertical">
        <div className="form-row">
          <Form.Item
            label="服务种类"
            className="form-item"
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.serviceType} />
            ) : (
              <Input
                value={data.serviceType}
                disabled
              />
            )}
          </Form.Item>
          <Form.Item
            label="产品线"
            className="form-item"
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.productLine} />
            ) : (
              <Input
                value={data.productLine}
                disabled
              />
            )}
          </Form.Item>
        </div>

        <Form.Item
          label="特殊说明（如果您的样品有特殊要求，请备注说明）"
          className="form-item-full"
        >
          {disabled ? (
            <ReadOnlyText value={data.specialInstructions} style={{ whiteSpace: 'pre-wrap' }} />
          ) : (
            <TextArea
              value={data.specialInstructions}
              onChange={(e) => onChange('specialInstructions', e.target.value)}
              disabled={disabled}
              rows={3}
              placeholder="请输入特殊说明"
            />
          )}
        </Form.Item>

        <div className="form-row">
          <Form.Item
            label="物种名称"
            className="form-item"
            required
            validateStatus={errors?.speciesName ? 'error' : ''}
            help={errors?.speciesName}
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.speciesName} />
            ) : (
              <Input
                value={data.speciesName}
                onChange={(e) => onChange('speciesName', e.target.value)}
                disabled={disabled}
                placeholder="请输入物种名称"
              />
            )}
          </Form.Item>
          <Form.Item
            label="物种拉丁名"
            className="form-item"
            required
            validateStatus={errors?.speciesLatinName ? 'error' : ''}
            help={errors?.speciesLatinName}
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.speciesLatinName} />
            ) : (
              <Input
                value={data.speciesLatinName}
                onChange={(e) => onChange('speciesLatinName', e.target.value)}
                disabled={disabled}
                placeholder="请输入物种拉丁名"
              />
            )}
          </Form.Item>
        </div>

        <div className="form-row">
          <Form.Item
            label="样本类型"
            className="form-item"
            required
            validateStatus={errors?.sampleType ? 'error' : ''}
            help={errors?.sampleType}
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.sampleType} />
            ) : (
              <Select
                value={data.sampleType}
                onChange={(value) => onChange('sampleType', value)}
                disabled={disabled}
                placeholder="请选择样本类型"
                options={SAMPLE_TYPES.map(type => ({ label: type, value: type }))}
              />
            )}
          </Form.Item>
          <Form.Item
            label="样本类型详述"
            className="form-item"
            required
            validateStatus={errors?.sampleTypeDetail ? 'error' : ''}
            help={errors?.sampleTypeDetail}
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.sampleTypeDetail} />
            ) : (
              <Input
                value={data.sampleTypeDetail}
                onChange={(e) => onChange('sampleTypeDetail', e.target.value)}
                disabled={disabled}
                placeholder="请输入样本类型详述"
              />
            )}
          </Form.Item>
        </div>

        <div className="form-row">
          <Form.Item
            label="检测数量"
            className="form-item"
            required
            validateStatus={errors?.detectionQuantity ? 'error' : ''}
            help={errors?.detectionQuantity}
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.detectionQuantity} />
            ) : (
              <InputNumber
                value={data.detectionQuantity}
                onChange={(value) => onChange('detectionQuantity', value)}
                disabled={disabled}
                min={1}
                style={{ width: '100%' }}
                placeholder="请输入检测数量"
              />
            )}
          </Form.Item>
          <Form.Item
            label="细胞数"
            className="form-item"
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.cellCount} />
            ) : (
              <InputNumber
                value={data.cellCount}
                onChange={(value) => onChange('cellCount', value)}
                disabled={disabled}
                min={0}
                style={{ width: '100%' }}
                placeholder="请输入细胞数"
              />
            )}
          </Form.Item>
        </div>

        <div className="form-row">
          <Form.Item
            label="保存介质"
            className="form-item"
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.preservationMedium} />
            ) : (
              <Select
                value={data.preservationMedium}
                onChange={(value) => onChange('preservationMedium', value)}
                disabled={disabled}
                placeholder="请选择保存介质"
                options={PRESERVATION_MEDIUMS.map(medium => ({ label: medium, value: medium }))}
                allowClear
              />
            )}
          </Form.Item>
          <Form.Item
            label="样本前处理方式"
            className="form-item"
            style={{ flex: '1 1 calc(33.333% - 9px)', minWidth: 0 }}
          >
            {disabled ? (
              <ReadOnlyText value={data.samplePreprocessing} />
            ) : (
              <Input
                value={data.samplePreprocessing}
                onChange={(e) => onChange('samplePreprocessing', e.target.value)}
                disabled={disabled}
                placeholder="请输入样本前处理方式"
              />
            )}
          </Form.Item>
        </div>

        <Form.Item
          label="剩余样品处理方式"
          className="form-item-full"
          required
          validateStatus={errors?.remainingSampleHandling ? 'error' : ''}
          help={errors?.remainingSampleHandling}
        >
          {disabled ? (
            <ReadOnlyText value={data.remainingSampleHandling} />
          ) : (
            <Select
              value={data.remainingSampleHandling}
              onChange={(value) => onChange('remainingSampleHandling', value)}
              disabled={disabled}
              placeholder="请选择剩余样品处理方式"
              options={REMAINING_SAMPLE_HANDLING.map(option => ({ label: option, value: option }))}
            />
          )}
        </Form.Item>

        <Form.Item label="是否需要生信分析" className="form-item-full">
          {disabled ? (
            <ReadOnlyText value={data.needBioinformaticsAnalysis ? '需要' : '不需要'} />
          ) : (
            <Radio.Group
              value={data.needBioinformaticsAnalysis}
              onChange={(e) => onChange('needBioinformaticsAnalysis', e.target.value)}
              disabled={disabled}
            >
              <Radio value={true}>需要</Radio>
              <Radio value={false}>不需要</Radio>
            </Radio.Group>
          )}
        </Form.Item>
      </Form>
    </div>
  );
}

