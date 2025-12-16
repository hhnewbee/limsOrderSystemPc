'use client';

import { Form, Radio, Input, DatePicker } from 'antd';
import dayjs from 'dayjs';

export default function ShippingModule({ data, onChange, disabled, errors }) {
  return (
    <div className="module-card">
      <h2 className="module-title">样品运送</h2>
      <Form layout="vertical">
        <Form.Item 
          label="运送方式" 
          required
          validateStatus={errors?.shippingMethod ? 'error' : ''}
          help={errors?.shippingMethod}
        >
          <Radio.Group
            value={data.shippingMethod}
            onChange={(e) => onChange('shippingMethod', e.target.value)}
            disabled={disabled}
          >
            <Radio value="自提">自提</Radio>
            <Radio value="快递">快递</Radio>
          </Radio.Group>
        </Form.Item>

        {data.shippingMethod === '快递' && (
          <>
            <div className="form-row">
              <Form.Item 
                label="快递公司及运单号" 
                className="form-item"
                required
                validateStatus={errors?.expressCompanyWaybill ? 'error' : ''}
                help={errors?.expressCompanyWaybill}
              >
                <Input 
                  value={data.expressCompanyWaybill}
                  onChange={(e) => onChange('expressCompanyWaybill', e.target.value)}
                  disabled={disabled}
                  placeholder="请输入快递公司及运单号"
                />
              </Form.Item>
              <Form.Item 
                label="送样时间" 
                className="form-item"
                required
                validateStatus={errors?.shippingTime ? 'error' : ''}
                help={errors?.shippingTime}
              >
                <DatePicker 
                  value={data.shippingTime ? dayjs(data.shippingTime) : null}
                  onChange={(date) => onChange('shippingTime', date ? date.toISOString() : null)}
                  disabled={disabled}
                  style={{ width: '100%' }}
                  placeholder="请选择送样时间"
                  showTime
                />
              </Form.Item>
            </div>

            <div className="shipping-info">
              <p><strong>寄样说明：</strong></p>
              <p>如需干冰寄样则省内寄送时保证有10kg干冰，省外寄送时保证有15kg干冰，（5kg/天）偏远地区请联系销售</p>
              <p style={{ marginTop: 12 }}><strong>邮寄信息：</strong></p>
              <p>广东省深圳市龙华区民治街道民康路北114号深圳市计量质量检测研究院2号楼2楼，收件人及联系电话请联系销售</p>
            </div>
          </>
        )}
      </Form>
    </div>
  );
}

