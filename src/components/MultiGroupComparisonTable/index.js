'use client';

import { useCallback, useState, useEffect } from 'react';
import { Button, Input, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './MultiGroupComparisonTable.module.scss';

export default function MultiGroupComparisonTable({ data = [], onChange, disabled, groupNames = [] }) {
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

    // --- 自动清理无效组名 & 重新生成比较方案 ---
    useEffect(() => {
        if (disabled) return;

        let hasChanges = false;

        const newData = data.map(item => {
            // 1. 过滤无效组名
            const validGroups = item.groups.filter(g => groupNames.includes(g));

            // 2. 检查组名是否有变化
            if (validGroups.length !== item.groups.length) {
                hasChanges = true;
                // 3. 如果有变化，重新生成 comparisonName (例如: A vs B)
                const newName = validGroups.length > 0 ? validGroups.join(' vs ') : '';
                return { ...item, groups: validGroups, comparisonName: newName };
            }
            return item;
        });

        if (hasChanges) {
            onChange(newData);
        }
    }, [groupNames, disabled, data, onChange]);

    const handleAddRow = useCallback(() => {
        onChange([...data, { comparisonName: '', groups: [] }]);
        setSelectedRowIndex(null);
    }, [data, onChange]);

    const handleDeleteRow = useCallback((index) => {
        onChange(data.filter((_, i) => i !== index));
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

    // --- 核心修改：数据变更处理 ---
    const handleCellChange = useCallback((index, field, value) => {
        const newData = [...data];
        let currentRow = { ...newData[index], [field]: value };

        // 如果修改的是“组别选择”，自动生成“比较方案名称”
        if (field === 'groups') {
            // value 是一个数组，例如 ['C', 'A', 'B']
            // 自动拼接为 "C vs A vs B"
            if (value && value.length > 0) {
                currentRow.comparisonName = value.join(' vs ');
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
                <h3>多组比较 / 韦恩图分析</h3>
                {!disabled && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddRow}
                        style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
                    >
                        添加多组方案
                    </Button>
                )}
            </div>

            <div className={styles.instructionNote}>
                <p>1. <b>操作说明</b>：在“差异分析比较组”中选择多个组，系统将自动生成比较方案（如 A vs B vs C）。</p>
                <p>2. <b>快捷删除</b>：点击左侧序号选中行，按 <b>Backspace</b> 或 <b>Delete</b> 键删除。</p>
            </div>

            <div className={styles.tableHeader}>
                <div className={styles.headerCell} style={{ flex: '0 0 60px' }}>序号</div>
                {/* 交换位置：先选组 */}
                <div className={styles.headerCell} style={{ flex: 2 }}>差异分析比较组 (多选) <span style={{color:'#ff4d4f', marginLeft:4}}>*</span></div>
                {/* 后生成名称 */}
                <div className={styles.headerCell} style={{ flex: 1 }}>比较方案 (自动生成)</div>
                <div className={styles.headerCell} style={{ flex: '0 0 80px' }}>操作</div>
            </div>

            {data.length > 0 ? (
                data.map((item, index) => {
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

                            {/* 第一列：选择组别 */}
                            <div className={styles.cell} style={{ flex: 2 }}>
                                <Select
                                    mode="multiple"
                                    placeholder="请选择至少两个组别"
                                    value={item.groups}
                                    onChange={(val) => handleCellChange(index, 'groups', val)}
                                    onKeyDown={(e) => handleInputKeyDown(e, index)}
                                    options={groupOptions}
                                    disabled={disabled}
                                    style={{ width: '100%' }}
                                    maxTagCount="responsive"
                                    allowClear
                                />
                            </div>

                            {/* 第二列：自动生成的名称 (只读) */}
                            <div className={styles.cell} style={{ flex: 1 }}>
                                <Input
                                    placeholder="自动生成"
                                    value={item.comparisonName}
                                    // 只读属性
                                    readOnly
                                    // 应用只读样式
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
                <div className={styles.empty}>暂无数据，请点击右上角“添加多组方案”</div>
            )}
        </div>
    );
}