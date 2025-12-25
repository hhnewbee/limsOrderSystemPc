/* src/components/SubmitArea.tsx */
'use client';

import React from 'react';
import { Button, Badge } from 'antd';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
// 引入样式模块
import styles from './SubmitArea.module.scss';

interface SubmitAreaProps {
    onSave: () => void;
    onSubmit: () => void;
    saving?: boolean;
    submitting?: boolean;
    hasUnsavedChanges?: boolean;
}

export default function SubmitArea({ onSave, onSubmit, saving, submitting, hasUnsavedChanges }: SubmitAreaProps) {
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
