// src/components/SampleListTable/TableRow.js
import { memo } from 'react';
import { Button, Input, Select, InputNumber } from 'antd';
import { DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { InputWithError, ReadOnlyText } from './TableComponents';
import { DETECTION_OPTIONS } from './constants';
import styles from './SampleListTable.module.scss';

const TableRow = memo(function TableRow({ index, style, data: itemData }) {
    const { items, errors, disabled, needBioinformaticsAnalysis, onCellChange, onDeleteRow, onCopyRow } = itemData;
    const item = items[index];
    const rowErrors = errors?.[index] || {};

    return (
        <div className={styles.tableRow} style={style}>
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
                        error={rowErrors.sampleName}
                    />
                )}
            </div>

            {/* 生信分析相关字段 */}
            {needBioinformaticsAnalysis && (
                <>
                    <div className={styles.tableCell} style={{ flex: '0 0 160px', width: 160 }}>
                        {disabled ? (
                            <ReadOnlyText value={item.analysisName} />
                        ) : (
                            <InputWithError
                                value={item.analysisName}
                                onChange={(e) => onCellChange(index, 'analysisName', e.target.value)}
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
                    <Input
                        value={item.experimentDescription}
                        onChange={(e) => onCellChange(index, 'experimentDescription', e.target.value)}
                        size="middle"
                        placeholder="请输入备注"
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
});

export default TableRow;