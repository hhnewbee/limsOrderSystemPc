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

// 带错误提示的输入框 (Buffered for Performance)
export const InputWithError = ({ value, onChange, onBlur, disabled, error }: InputWithErrorProps) => {
    const [localValue, setLocalValue] = React.useState(value);

    // Sync from props when external value changes
    React.useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        // Commit change if different
        if (localValue !== value) {
            // Mock event for compatibility
            const syntheticEvent = {
                target: { value: localValue }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(syntheticEvent);
        }
        // Then trigger original onBlur (validation)
        if (onBlur) onBlur();
    };

    return (
        <div style={{ width: '100%' }}>
            <Input
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={disabled}
                size="middle"
                status={error ? 'error' : ''}
            />
            {error && <div className={styles.cellErrorText}>{error}</div>}
        </div>
    );
};

// 只读文本显示
export const ReadOnlyText = ({ value }: { value: any }) => (
    <div style={{ fontSize: '15px', color: '#595959', marginTop: 4 }}>
        {value || '-'}
    </div>
);
