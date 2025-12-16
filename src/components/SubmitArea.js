'use client';

import { Button, Badge } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';

export default function SubmitArea({ onSave, onSubmit, saving, submitting, hasUnsavedChanges }) {
  return (
    <div className="submit-area">
      <Badge dot={hasUnsavedChanges} offset={[-5, 5]}>
        <Button 
          type="default" 
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={saving}
          size="large"
        >
          暂存
        </Button>
      </Badge>
      <Button 
        type="primary" 
        icon={<SendOutlined />}
        onClick={onSubmit}
        loading={submitting}
        size="large"
      >
        提交
      </Button>
    </div>
  );
}

