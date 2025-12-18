'use client';

import { useCallback, useState, useEffect } from 'react';
import { Button, Input, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './PairwiseComparisonTable.module.scss';

export default function PairwiseComparisonTable({ data = [], onChange, disabled, groupNames = [] }) {
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

    // --- 自动清理无效组名 ---
    useEffect(() => {
        if (disabled) return;

        let hasChanges = false;

        const newData = data.map(item => {
            let newItem = { ...item };
            let rowChanged = false;

            // 检查对照组
            if (newItem.controlGroup && !groupNames.includes(newItem.controlGroup)) {
                newItem.controlGroup = '';
                newItem.comparisonName = '';
                rowChanged = true;
            }

            // 检查实验组
            if (newItem.experimentalGroup && !groupNames.includes(newItem.experimentalGroup)) {
                newItem.experimentalGroup = '';
                newItem.comparisonName = '';
                rowChanged = true;
            }

            if (rowChanged) hasChanges = true;
            return newItem;
        });

        if (hasChanges) {
            onChange(newData);
        }
    }, [groupNames, disabled, data, onChange]);

    const handleAddRow = useCallback(() => {
        onChange([...data, { controlGroup: '', experimentalGroup: '', comparisonName: '' }]);
        setSelectedRowIndex(null);
    }, [data, onChange]);

    const handleDeleteRow = useCallback((index) => {
        const newData = data.filter((_, i) => i !== index);
        onChange(newData);
        setSelectedRowIndex(null);
        message.success('已删除行');
    }, [data, onChange]);

    // 全局按键监听
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (selectedRowIndex === null || disabled) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeTag = document.activeElement.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                    e.preventDefault();
                    handleDeleteRow(selectedRowIndex);
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedRowIndex, handleDeleteRow, disabled]);

    const handleInputKeyDown = (e, index) => {
        if (e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            handleDeleteRow(index);
        }
    };

    const handleCellChange = useCallback((index, field, value) => {
        const newData = [...data];
        const safeValue = value || '';
        const currentRow = { ...newData[index], [field]: safeValue };

        if (field === 'controlGroup' || field === 'experimentalGroup') {
            const c = currentRow.controlGroup;
            const e = currentRow.experimentalGroup;
            if (c && e && c !== e) {
                currentRow.comparisonName = `${c} v ${e}`;
            } else {
                currentRow.comparisonName = '';
            }
        }

        newData[index] = currentRow;
        onChange(newData);
    }, [data, onChange]);

    const groupOptions = groupNames.map(name => ({ label: name, value: name }));

    const handleRowClick = (index) => {
        if (!disabled) {
            setSelectedRowIndex(index === selectedRowIndex ? null : index);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerTitle}>
                {/* 修改标题 */}
                <h3>两两比较</h3>
                {!disabled && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                        添加比较组
                    </Button>
                )}
            </div>

            {/* 修改提示文案 */}
            <div className={styles.instructionNote}>
                <p>1、按&quot;分组名称&quot;填写。</p>
                <p>2、请仔细核对处理组、对照组，切勿颠倒。</p>
            </div>

            <div className={styles.tableHeader}>
                <div className={styles.headerCell} style={{ flex: '0 0 60px' }}>序号</div>
                <div className={styles.headerCell} style={{ flex: 1 }}>对照组 (Control) <span style={{color:'#ff4d4f', marginLeft:4}}>*</span></div>
                <div className={styles.headerCell} style={{ flex: 1 }}>实验组 (Case) <span style={{color:'#ff4d4f', marginLeft:4}}>*</span></div>
                <div className={styles.headerCell} style={{ flex: 1.2 }}>比较方案名称 (自动生成)</div>
                <div className={styles.headerCell} style={{ flex: '0 0 80px' }}>操作</div>
            </div>

            {data.length > 0 ? (
                data.map((item, index) => {
                    const controlOptions = groupNames.map(name => ({
                        label: name, value: name, disabled: name === item.experimentalGroup
                    }));

                    const experimentalOptions = groupNames.map(name => ({
                        label: name, value: name, disabled: name === item.controlGroup
                    }));

                    const isSelected = selectedRowIndex === index;

                    return (
                        <div
                            key={index}
                            className={`${styles.row} ${isSelected ? styles.selected : ''}`}
                        >
                            <div
                                className={`${styles.cell} ${styles.indexCell}`}
                                style={{ flex: '0 0 60px', paddingTop: 8, justifyContent: 'center' }}
                                onClick={() => handleRowClick(index)}
                                title="点击选中，按 Backspace 删除"
                            >
                                {index + 1}
                            </div>

                            <div className={styles.cell} style={{ flex: 1 }}>
                                {groupNames.length > 0 ? (
                                    <Select
                                        placeholder="请选择对照组"
                                        value={item.controlGroup || undefined}
                                        onChange={(val) => handleCellChange(index, 'controlGroup', val)}
                                        onKeyDown={(e) => handleInputKeyDown(e, index)}
                                        options={controlOptions}
                                        disabled={disabled}
                                        style={{ width: '100%' }}
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    />
                                ) : (
                                    <Input
                                        placeholder="请输入对照组名称"
                                        value={item.controlGroup}
                                        onChange={(e) => handleCellChange(index, 'controlGroup', e.target.value)}
                                        onKeyDown={(e) => handleInputKeyDown(e, index)}
                                        disabled={disabled}
                                        allowClear
                                    />
                                )}
                            </div>

                            <div className={styles.cell} style={{ flex: 1 }}>
                                {groupNames.length > 0 ? (
                                    <Select
                                        placeholder="请选择实验组"
                                        value={item.experimentalGroup || undefined}
                                        onChange={(val) => handleCellChange(index, 'experimentalGroup', val)}
                                        onKeyDown={(e) => handleInputKeyDown(e, index)}
                                        options={experimentalOptions}
                                        disabled={disabled}
                                        style={{ width: '100%' }}
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                    />
                                ) : (
                                    <Input
                                        placeholder="请输入实验组名称"
                                        value={item.experimentalGroup}
                                        onChange={(e) => handleCellChange(index, 'experimentalGroup', e.target.value)}
                                        onKeyDown={(e) => handleInputKeyDown(e, index)}
                                        disabled={disabled}
                                        allowClear
                                    />
                                )}
                            </div>

                            <div className={styles.cell} style={{ flex: 1.2 }}>
                                <Input
                                    placeholder="自动生成"
                                    value={item.comparisonName}
                                    readOnly
                                    className={styles.readOnlyInput}
                                    disabled={disabled}
                                />
                            </div>

                            <div className={styles.cell} style={{ flex: '0 0 80px', justifyContent: 'center' }}>
                                {!disabled && (
                                    <Button
                                        type="text"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => handleDeleteRow(index)}
                                        title="删除此行"
                                    />
                                )}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className={styles.empty}>暂无数据，请点击右上角“添加比较组”</div>
            )}
        </div>
    );
}