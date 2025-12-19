/* src/components/SubmitArea.js */
'use client';

import { Button, Badge } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
// 引入样式模块
import styles from './SubmitArea.module.scss';

export default function SubmitArea({ onSave, onSubmit, saving, submitting, hasUnsavedChanges }) {
  return (
    // 使用 styles.submitArea，Next.js 会自动处理成唯一的 class 名
    <div className={styles.submitArea}>
      <Badge dot={hasUnsavedChanges} offset={[-5, 5]}>
        <Button
          type="default"
          icon={<SaveOutlined />}
          onClick={onSave}
          loading={saving}
          size="large"
          style={{ minWidth: '120px', borderRadius: '8px' }}
        >
          暂存草稿
        </Button>
      </Badge>
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={onSubmit}
        loading={submitting}
        size="large"
        style={{ minWidth: '120px', borderRadius: '8px', fontWeight: 'bold' }}
      >
        正式提交
      </Button>
    </div>
  );
}