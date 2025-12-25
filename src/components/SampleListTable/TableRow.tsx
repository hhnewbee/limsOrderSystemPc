// src/components/SampleListTable/TableRow.tsx
import React, { memo } from 'react';
import { Button, Input, Select, InputNumber, Checkbox } from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { InputWithError, ReadOnlyText } from './TableComponents';
import { DETECTION_OPTIONS } from './constants';
import styles from './SampleListTable.module.scss';
import { ListChildComponentProps } from 'react-window';

interface ItemData {
    items: any[];
    errors: any;
    disabled: boolean;
    needBioinformaticsAnalysis: boolean | string;
    selectedRows: Set<number>;
    onCellChange: (index: number, field: string, value: any) => void;
    onDeleteRow: (index: number) => void;
    onCopyRow: (index: number) => void;
    onToggleRow: (index: number) => void;
    handleBlur: (field: string) => void; // Added handleBlur
}

const TableRow = memo(function TableRow({ index, style, data: itemData }: ListChildComponentProps<ItemData>) {
    const {
        items, errors, disabled, needBioinformaticsAnalysis,
        onCellChange, onDeleteRow, onCopyRow,
        selectedRows, onToggleRow, handleBlur
    } = itemData;

    const item = items[index];
    const rowErrors = errors?.[index] || {};
    const isSelected = selectedRows.has(index);
    const isBio = needBioinformaticsAnalysis === true || needBioinformaticsAnalysis === 'true';

    return (
        <div
            className={styles.tableRow}
            style={{
                ...style,
                backgroundColor: isSelected ? '#e6f7ff' : style.backgroundColor
            }}
        >
            {/* 复选框列 */}
            <div className={styles.tableCell} style={{ flex: '0 0 50px', width: 50, justifyContent: 'center' }}>
                {!disabled && (
                    <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleRow(index)}
                    />
                )}
            </div>

            {/* 序号 */}
            <div className={styles.tableCell} style={{ flex: '0 0 70px', width: 70, alignItems: 'center' }}>
                <span style={{ marginTop: 4 }}>{index + 1}</span>
            </div>

            {/* 样本名称 */}
            <div className={styles.tableCell} style={{ flex: '0 0 160px', width: 160 }}>
                {disabled ? (
                    <ReadOnlyText value={item.sampleName} />
                ) : (
                    <InputWithError
                        value={item.sampleName}
                        onChange={(e) => onCellChange(index, 'sampleName', e.target.value)}
                        onBlur={() => handleBlur('sampleName')} // 🟢 Added onBlur
                        error={rowErrors.sampleName}
                    />
                )}
            </div>

            {/* 生信分析相关字段 */}
            {isBio && (
                <>
                    <div className={styles.tableCell} style={{ flex: '0 0 160px', width: 160 }}>
                        {disabled ? (
                            <ReadOnlyText value={item.analysisName} />
                        ) : (
                            <InputWithError
                                value={item.analysisName}
                                onChange={(e) => onCellChange(index, 'analysisName', e.target.value)}
                                onBlur={() => handleBlur('analysisName')} // 🟢 Added onBlur
                                error={rowErrors.analysisName}
                            />
                        )}
                    </div>
                    <div className={styles.tableCell} style={{ flex: '0 0 160px', width: 160 }}>
                        {disabled ? (
                            <ReadOnlyText value={item.groupName} />
                        ) : (
                            <InputWithError
                                value={item.groupName}
                                onChange={(e) => onCellChange(index, 'groupName', e.target.value)}
                                onBlur={() => handleBlur('groupName')} // 🟢 Added onBlur
                                error={rowErrors.groupName}
                            />
                        )}
                    </div>
                </>
            )}

            {/* 检测或暂存 */}
            <div className={styles.tableCell} style={{ flex: '0 0 130px', width: 130 }}>
                {disabled ? (
                    <ReadOnlyText value={item.detectionOrStorage} />
                ) : (
                    <Select
                        value={item.detectionOrStorage}
                        onChange={(value) => onCellChange(index, 'detectionOrStorage', value)}
                        onBlur={() => handleBlur('detectionOrStorage')} // 🟢 Added onBlur
                        size="middle"
                        options={DETECTION_OPTIONS}
                        style={{ width: '100%' }}
                    />
                )}
            </div>

            {/* 样品管数 */}
            <div className={styles.tableCell} style={{ flex: '0 0 100px', width: 100 }}>
                {disabled ? (
                    <ReadOnlyText value={item.sampleTubeCount} />
                ) : (
                    <InputNumber
                        value={item.sampleTubeCount}
                        onChange={(value) => onCellChange(index, 'sampleTubeCount', value)}
                        onBlur={() => handleBlur('sampleTubeCount')} // 🟢 Added onBlur
                        size="middle"
                        min={1}
                        style={{ width: '100%' }}
                    />
                )}
            </div>

            {/* 备注 */}
            <div className={styles.tableCell} style={{ flex: 1, minWidth: 250 }}>
                {disabled ? (
                    <ReadOnlyText value={item.experimentDescription} />
                ) : (
                    <InputWithError
                        value={item.experimentDescription}
                        onChange={(e) => onCellChange(index, 'experimentDescription', e.target.value)}
                        onBlur={() => handleBlur('experimentDescription')}
                        disabled={disabled}
                    />
                )}
            </div>

            {/* 操作按钮 */}
            <div className={styles.tableCell} style={{ flex: '0 0 100px', width: 100, flexDirection: 'row', gap: 8 }}>
                {!disabled && (
                    <>
                        <Button
                            type="text"
                            icon={<CopyOutlined />}
                            onClick={() => onCopyRow(index)}
                            title="复制行"
                            style={{ marginTop: 2 }}
                        />
                        <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onDeleteRow(index)}
                            title="删除行"
                            style={{ marginTop: 2 }}
                        />
                    </>
                )}
            </div>
        </div>
    );
}, areEqual);

function areEqual(prevProps: ListChildComponentProps<ItemData>, nextProps: ListChildComponentProps<ItemData>) {
    const { index, data: prevData } = prevProps;
    const { data: nextData } = nextProps;

    // 1. Static props check
    if (prevProps.index !== nextProps.index) return false;
    if (prevProps.style !== nextProps.style) return false;

    // 2. Data Item Check (Reference equality)
    if (prevData.items[index] !== nextData.items[index]) return false;

    // 3. Error Check
    if (prevData.errors?.[index] !== nextData.errors?.[index]) return false;

    // 4. Selection Check
    const prevSelected = prevData.selectedRows.has(index);
    const nextSelected = nextData.selectedRows.has(index);
    if (prevSelected !== nextSelected) return false;

    // 5. Global flags
    if (prevData.disabled !== nextData.disabled) return false;
    if (prevData.needBioinformaticsAnalysis !== nextData.needBioinformaticsAnalysis) return false;

    // 6. Callback Stability (Ideally these don't change, but if they do, we should re-render or trust them)
    // Since we stabilized them in parent with Refs, we can ignore them or check equality
    // if (prevData.onCellChange !== nextData.onCellChange) return false; 

    return true;
}

export default TableRow;
