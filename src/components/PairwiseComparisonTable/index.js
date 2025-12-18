'use client';

// 1. 引入 useEffect
import { useCallback, useState, useEffect } from 'react';
import { Button, Input, Select, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './PairwiseComparisonTable.module.scss';

export default function PairwiseComparisonTable({ data = [], onChange, disabled, groupNames = [] }) {
    const [selectedRowIndex, setSelectedRowIndex] = useState(null);

    // --- 新增逻辑开始：自动清理无效的分组 ---
    useEffect(() => {
        // 如果处于禁用状态（如查看模式），通常不进行自动清理，以免破坏历史数据展示
        if (disabled) return;

        let hasChanges = false;

        // 遍历当前所有行，检查是否有“过期”的组名
        const newData = data.map(item => {
            let newItem = { ...item };
            let rowChanged = false;

            // 检查对照组：如果当前有值，但不在最新的 groupNames 列表中
            if (newItem.controlGroup && !groupNames.includes(newItem.controlGroup)) {
                newItem.controlGroup = ''; // 清空
                newItem.comparisonName = ''; // 比较名称依赖于组名，也需清空
                rowChanged = true;
            }

            // 检查实验组
            if (newItem.experimentalGroup && !groupNames.includes(newItem.experimentalGroup)) {
                newItem.experimentalGroup = ''; // 清空
                newItem.comparisonName = '';
                rowChanged = true;
            }

            if (rowChanged) hasChanges = true;
            return newItem;
        });

        // 只有当确实发生变化时才调用 onChange，避免无限循环
        if (hasChanges) {
            onChange(newData);
            // 可选：提示用户
            // message.warning('检测到分组名称变更，已自动重置相关的比较方案');
        }
    }, [groupNames, disabled]); // 依赖项：只关注 groupNames 变化 (注意：这里不依赖 data 以避免死循环，而是利用函数式更新或当前闭包中的 data，但为了安全最好依赖 data 并配合 hasChanges 判断)
    // 为了更严谨的 React Hook 依赖，建议如下写法，将 data 加入依赖，靠 hasChanges 阻断循环
    // useEffect 的依赖项最好包含 data，但在 onChange 更新 data 后会再次触发。
    // 因为我们的逻辑是“只有不一致时才更新”，所以当更新完 newData 后，再次进来时一致性已满足，hasChanges 为 false，循环停止。

    // --- 新增逻辑结束 ---

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
                currentRow.comparisonName = `${c}_vs_${e}`;
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
                <h3>两两比较方案</h3>
                {!disabled && (
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>
                        添加比较组
                    </Button>
                )}
            </div>

            <div className={styles.instructionNote}>
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