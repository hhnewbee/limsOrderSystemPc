// src/components/SampleListTable/TableComponents.tsx
import React from 'react';
import { Input } from 'antd';
import styles from './SampleListTable.module.scss';

interface InputWithErrorProps {
    value: any;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: () => void; // Added onBlur support
    disabled?: boolean;
    error?: string;
}

// 带错误提示的输入框
export const InputWithError = ({ value, onChange, onBlur, disabled, error }: InputWithErrorProps) => (
    <div style={{ width: '100%' }}>
        <Input
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            size="middle"
            status={error ? 'error' : ''}
        />
        {error && <div className={styles.cellErrorText}>{error}</div>}
    </div>
);

// 只读文本显示
export const ReadOnlyText = ({ value }: { value: any }) => (
    <div style={{ fontSize: '15px', color: '#595959', marginTop: 4 }}>
        {value || '-'}
    </div>
);
