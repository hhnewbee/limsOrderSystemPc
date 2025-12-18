// src/components/SampleListTable/TableComponents.js
import { Input } from 'antd';
import styles from './SampleListTable.module.scss';

// 带错误提示的输入框
export const InputWithError = ({ value, onChange, disabled, error }) => (
    <div style={{ width: '100%' }}>
        <Input
            value={value}
            onChange={onChange}
            disabled={disabled}
            size="middle"
            status={error ? 'error' : ''}
        />
        {error && <div className={styles.cellErrorText}>{error}</div>}
    </div>
);

// 只读文本显示
export const ReadOnlyText = ({ value }) => (
    <div style={{ fontSize: '15px', color: '#595959', marginTop: 4 }}>
        {value || '-'}
    </div>
);