'use client';

import React, { useCallback, useState, useEffect } from 'react';
import { Button, Input, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './MultiGroupComparisonTable.module.scss';

interface MultiGroupComparisonItem {
    comparisonName?: string;
    comparisonGroups?: string[];
    [key: string]: any;
}

interface MultiGroupComparisonTableProps {
    data?: MultiGroupComparisonItem[];
    onChange: (newData: MultiGroupComparisonItem[]) => void;
    disabled?: boolean;
    groupNames?: string[];
}

export default function MultiGroupComparisonTable({ data = [], onChange, disabled, groupNames = [] }: MultiGroupComparisonTableProps) {
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

    // --- 自动清理无效组名 & 重新生成比较方案 ---
    useEffect(() => {
        let hasChanges = false;

        const newData = data.map(item => {
            const groups = item.comparisonGroups || [];
            // 1. 过滤无效组名
            const validGroups = groups.filter((g: string) => groupNames.includes(g));
            // 2. 生成正确的比较方案名称
            const expectedName = validGroups.length > 0 ? validGroups.join(' vs ') : '';

            // 3. 检查是否需要更新（组名变化或名称不匹配）
            if (validGroups.length !== groups.length || item.comparisonName !== expectedName) {
                hasChanges = true;
                return { ...item, comparisonGroups: validGroups, comparisonName: expectedName };
            }
            return item;
        });

        if (hasChanges) {
            onChange(newData);
        }
    }, [groupNames, data, onChange]);

    const handleAddRow = useCallback(() => {
        onChange([...data, { comparisonName: '', comparisonGroups: [] }]);
        setSelectedRowIndex(null);
    }, [data, onChange]);

    const handleDeleteRow = useCallback((index: number) => {
        onChange(data.filter((_, i) => i !== index));
        setSelectedRowIndex(null);
        message.success('已删除行');
    }, [data, onChange]);

    // 全局按键监听 (Delete / Backspace)
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (selectedRowIndex === null || disabled) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const activeTag = (document.activeElement as HTMLElement).tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
                    e.preventDefault();
                    handleDeleteRow(selectedRowIndex);
                }
            }
        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [selectedRowIndex, handleDeleteRow, disabled]);

    const handleInputKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.altKey && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            handleDeleteRow(index);
        }
    };

    const handleCellChange = useCallback((index: number, field: string, value: any) => {
        const newData = [...data];
        let currentRow = { ...newData[index], [field]: value };

        // 如果修改的是“组别选择”，自动生成“比较方案名称”
        if (field === 'comparisonGroups') {
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

    const handleRowClick = (index: number) => {
        if (!disabled) {
            setSelectedRowIndex(index === selectedRowIndex ? null : index);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.headerTitle}>
                {/* 修改标题 */}
                <h3>多组比较</h3>
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

            {/* 修改提示文案 */}
            <div className={styles.instructionNote}>
                <p>1. 按&quot;分组名称&quot;填写。</p>
                <p>2. 多组比较的顺序建议按时间或疾病等级依次排序。</p>
            </div>

            <div className={styles.tableHeader}>
                <div className={styles.headerCell} style={{ flex: '0 0 60px' }}>序号</div>
                <div className={styles.headerCell} style={{ flex: 2 }}>差异分析比较组 (多选) <span style={{ color: '#ff4d4f', marginLeft: 4 }}>*</span></div>
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
                                    value={item.comparisonGroups}
                                    onChange={(val) => handleCellChange(index, 'comparisonGroups', val)}
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
                <div className={styles.empty}>暂无数据，请点击右上角“添加多组方案”</div>
            )}
        </div>
    );
}
