'use client';

import { Form, Input } from 'antd';
import {UserOutlined} from "@ant-design/icons";
import ModuleCard from "@/components/ModuleCard";

export default function CustomerInfoModule({ data }) {
  return (
    <ModuleCard
      title="客户信息"
      icon={<UserOutlined />}
    >
      <Form layout="vertical">
        <div className="form-row">
          <Form.Item label="客户单位名称" className="form-item">
            <Input 
              value={data.customerUnit} 
              disabled
              className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="客户姓名" className="form-item">
            <Input 
              value={data.customerName} 
              disabled 
              className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="部门/科室/院系" className="form-item">
            <Input
                value={data.department}
                disabled
                className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="科室主任/PI" className="form-item">
            <Input
                value={data.departmentDirector}
                disabled
                className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="客户手机" className="form-item">
            <Input
                value={data.customerPhone}
                disabled
                className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="客户邮箱" className="form-item">
            <Input
                value={data.customerEmail}
                disabled
                className="readonly-field"
            />
          </Form.Item>
        </div>
      </Form>
    </ModuleCard>
  );
}