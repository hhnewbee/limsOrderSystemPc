'use client';

import { useCallback, useState, useEffect } from 'react';
import { Button, Input, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './PairwiseComparisonTable.module.scss';

export default function PairwiseComparisonTable({ data = [], onChange, disabled, groupNames = [] }) {
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

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

    // [修改] 全局按键监听：支持 Delete 和 Backspace
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // 如果没有选中行，或者已被禁用，忽略
            if (selectedRowIndex === null || disabled) return;

            // 支持 Delete 或 Backspace
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // 关键安全检查：如果当前焦点在输入框里，Backspace 应该删文字，而不是删行
                const activeTag = document.activeElement.tagName;
                // 只有当焦点不在输入框时，才执行删除行
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                    e.preventDefault(); // 防止 Backspace 触发浏览器后退等默认行为
                    handleDeleteRow(selectedRowIndex);
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedRowIndex, handleDeleteRow, disabled]);

    // 输入框内的快捷键处理 (Alt + Delete/Backspace)
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
                currentRow.comparisonName = `${c}_vs_${e}`;
            } else {
                currentRow.comparisonName = '';
            }
        }

        newData[index] = currentRow;
        onChange(newData);
    }, [data, onChange]);

    const handleRowClick = (index) => {
        if (!disabled) {
            setSelectedRowIndex(index === selectedRowIndex ? null : index);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerTitle}>
                <h3>两两比较方案</h3>
                {!disabled && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                        添加比较组
                    </Button>
                )}
            </div>

            <div className={styles.instructionNote}>
                {/* [修改] 文案更新 */}
                <p>1. <b>快捷操作</b>：点击左侧序号选中行，按 <b>Backspace</b> 或 <b>Delete</b> 键删除。</p>
                <p>2. <b>键盘操作</b>：在输入框中按 <b>Alt + Backspace</b> 可直接删除当前行。</p>
                <p>3. <b>互斥逻辑</b>：对照组与实验组不能相同，点击 <b>x</b> 可清除重选。</p>
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