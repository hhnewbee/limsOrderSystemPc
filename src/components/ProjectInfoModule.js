'use client';

import { Form, Input } from 'antd';
import ModuleCard from "@/components/ModuleCard";
import {ProjectOutlined} from "@ant-design/icons";

export default function ProjectInfoModule({ data }) {
  return (
    <ModuleCard title="项目信息" icon={<ProjectOutlined/>}>
      <Form layout="vertical">
        <div className="form-row">
          <Form.Item label="项目编号" className="form-item">
            <Input 
              value={data.projectNumber} 
              disabled 
              className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="检测服务费单价（元/样本）" className="form-item">
            <Input 
              value={data.unitPrice} 
              disabled 
              className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="其它费用" className="form-item">
            <Input
                value={data.otherExpenses}
                disabled
                className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="业务员姓名" className="form-item">
            <Input
                value={data.salesmanName}
                disabled
                className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="业务员联系方式" className="form-item">
            <Input
                value={data.salesmanContact}
                disabled
                className="readonly-field"
            />
          </Form.Item>
          <Form.Item label="技术支持姓名" className="form-item">
            <Input
                value={data.technicalSupportName}
                disabled
                className="readonly-field"
            />
          </Form.Item>
        </div>
      </Form>
    </ModuleCard>
  );
}

