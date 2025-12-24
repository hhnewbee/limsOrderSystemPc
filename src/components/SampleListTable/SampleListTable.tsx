'use client';

import { useState, useCallback, useRef, memo, useEffect, CSSProperties } from 'react';
import { Button, Input, Select, InputNumber, Upload, message, Tooltip, Spin } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons';
// 引入 VariableSizeList 支持动态高度
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import styles from './SampleListTable.module.scss';

// --- 类型定义 ---
export interface SampleItem {
    sampleName: string;
    analysisName?: string;
    groupName?: string;
    detectionOrStorage: string;
    sampleTubeCount: number;
    experimentDescription: string;
    [key: string]: any;
}

interface SampleListTableProps {
    data: SampleItem[];
    onChange: (newData: SampleItem[]) => void;
    disabled?: boolean;
    needBioinformaticsAnalysis?: boolean | string; // 兼容后端可能返回字符串
    errors?: any;
}

const DETECTION_OPTIONS = [
    { label: '检测', value: '检测' },
    { label: '暂存', value: '暂存' }
];

// 定义两种行高状态
const ROW_HEIGHT_NORMAL = 60; // 正常行高
const ROW_HEIGHT_ERROR = 90;  // 出错时的行高（给错误提示留空间）
const TABLE_HEIGHT = 500;     // 表格可视区域总高度

// 表格列配置
const getColumns = (needBioinformaticsAnalysis: boolean) => {
    const baseColumns = [
        { key: 'sequenceNo', title: '序号', width: 70, flex: false, required: false },
        { key: 'sampleName', title: '样本名称', width: 160, required: true, flex: false },
    ];

    if (needBioinformaticsAnalysis) {
        baseColumns.push(
            { key: 'analysisName', title: '分析名称', width: 160, required: true, flex: false },
            { key: 'groupName', title: '分组名称', width: 160, required: true, flex: false }
        );
    }

    baseColumns.push(
        { key: 'detectionOrStorage', title: '检测或暂存', width: 130, required: true, flex: false },
        { key: 'sampleTubeCount', title: '样品管数', width: 100, required: true, flex: false },
        { key: 'experimentDescription', title: '实验设计描述及样本备注', width: 250, flex: true, required: false },
        { key: 'actions', title: '操作', width: 100, flex: false, required: false }
    );

    return baseColumns;
};

// 带错误提示的组件
const InputWithError = ({ value, onChange, disabled, error }: any) => (
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

// 只读文本
const ReadOnlyText = ({ value }: { value: any }) => (
    <div style={{ fontSize: '15px', color: '#595959', marginTop: 4 }}>
        {value || '-'}
    </div>
);

// 行渲染组件
const TableRow = memo(function TableRow({ index, style, data: itemData }: ListChildComponentProps) {
    const { items, errors, disabled, needBioinformaticsAnalysis, onCellChange, onDeleteRow, onCopyRow } = itemData;
    const item = items[index];
    const rowErrors = errors?.[index] || {};

    return (
        <div className={styles.tableRow} style={style}>
            <div className={styles.tableCell} style={{ flex: '0 0 70px', width: 70, alignItems: 'center' }}>
                <span style={{ marginTop: 4 }}>{index + 1}</span>
            </div>
            <div className={styles.tableCell} style={{ flex: '0 0 160px', width: 160 }}>
                {disabled ? (
                    <ReadOnlyText value={item.sampleName} />
                ) : (
                    <InputWithError
                        value={item.sampleName}
                        onChange={(e: any) => onCellChange(index, 'sampleName', e.target.value)}
                        error={rowErrors.sampleName}
                    />
                )}
            </div>
            {needBioinformaticsAnalysis && (
                <>
                    <div className={styles.tableCell} style={{ flex: '0 0 160px', width: 160 }}>
                        {disabled ? (
                            <ReadOnlyText value={item.analysisName} />
                        ) : (
                            <InputWithError
                                value={item.analysisName}
                                onChange={(e: any) => onCellChange(index, 'analysisName', e.target.value)}
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
                                onChange={(e: any) => onCellChange(index, 'groupName', e.target.value)}
                                error={rowErrors.groupName}
                            />
                        )}
                    </div>
                </>
            )}
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

function SampleListTable({ data, onChange, disabled, needBioinformaticsAnalysis, errors }: SampleListTableProps) {
    const [importing, setImporting] = useState(false);
    const listRef = useRef<List>(null);
    const needBio = needBioinformaticsAnalysis === true || needBioinformaticsAnalysis === 'true';
    const columns = getColumns(needBio);

    // 核心逻辑：当 data 或 errors 发生变化时，通知列表重新计算高度
    useEffect(() => {
        if (listRef.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [data, errors]);

    // 动态计算行高函数
    const getItemSize = useCallback((index: number) => {
        const rowErrors = errors?.[index];
        // 检查该行是否有任意字段报错
        const hasError = rowErrors && Object.values(rowErrors).some(err => !!err);
        return hasError ? ROW_HEIGHT_ERROR : ROW_HEIGHT_NORMAL;
    }, [errors]);

    // 计算总高度用于设置列表高度
    const calculateTotalHeight = () => {
        return data.reduce((total, _, index) => total + getItemSize(index), 0);
    };

    const handleAddRow = useCallback(() => {
        const newRow: SampleItem = {
            sampleName: '', analysisName: '', groupName: '',
            detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
        };
        onChange([...data, newRow]);
    }, [data, onChange]);

    const handleCopyRow = useCallback((index: number) => {
        const newData = [...data];
        newData.splice(index + 1, 0, { ...data[index] });
        onChange(newData);
        message.success('行已复制');
    }, [data, onChange]);

    const handleDeleteRow = useCallback((index: number) => {
        onChange(data.filter((_, i) => i !== index));
    }, [data, onChange]);

    const handleCellChange = useCallback((index: number, field: string, value: any) => {
        const newData = [...data];
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    }, [data, onChange]);

    const handleImport = useCallback((file: File) => {
        setImporting(true); // 🟢 Start loading
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // 动态导入 xlsx，减少首屏体积
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(e.target?.result, { type: 'binary' });
                const jsonData = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]]);
                const importedData: SampleItem[] = jsonData.map(row => ({
                    sampleName: row['样本名称'] || '',
                    analysisName: row['分析名称'] || '',
                    groupName: row['分组名称'] || '',
                    detectionOrStorage: row['检测或暂存'] || '检测',
                    sampleTubeCount: parseInt(row['样品管数']) || 1,
                    experimentDescription: row['实验设计描述及样本备注'] || ''
                }));
                onChange([...data, ...importedData]);
                message.success(`成功导入 ${importedData.length} 条数据`);
            } catch (err) {
                console.error(err);
                message.error('导入失败，请检查文件格式');
            } finally {
                setImporting(false); // 🟢 End loading
            }
        };
        // 使用 setTimeout 让 React 有机会渲染 setImporting(true)
        setTimeout(() => reader.readAsBinaryString(file), 0);
        return false;
    }, [data, onChange]);

    const handleDownloadTemplate = async () => {
        // 动态导入 xlsx
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet([{ '样本名称': 'Sample1', '分析名称': 'Ana1', '分组名称': 'GroupA', '检测或暂存': '检测', '样品管数': 1 }]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
        XLSX.writeFile(workbook, '样本清单模板.xlsx');
    };

    const itemData = {
        items: data, errors, disabled, needBioinformaticsAnalysis: needBio,
        onCellChange: handleCellChange, onDeleteRow: handleDeleteRow, onCopyRow: handleCopyRow
    };

    return (
        <div className={styles.sampleTableContainer}>
            <h3>样本清单</h3>

            <div className={styles.comparisonNote}>
                <p>1. "样本名称"应与管子一致，不可包含中文字符或特殊字符，长度控制在10字符内。</p>
                <p>2. "分析名称"和"分组名称"仅限字母、数字、下划线，长度控制在8字符内，首字符需为字母。</p>
            </div>

            <div className={styles.tableToolbar}>
                <div className={styles.tableActions}>
                    {!disabled && (
                        <>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>添加样本行</Button>
                            <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleImport}>
                                <Button icon={importing ? <LoadingOutlined /> : <UploadOutlined />} disabled={importing}>
                                    {importing ? '导入中...' : '批量导入'}
                                </Button>
                            </Upload>
                        </>
                    )}
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
                </div>
                <span className={styles.dataCount}>已录入 {data.length} 条样本</span>
            </div>

            <div className={styles.virtualTableContainer}>
                <div className={styles.tableHeader}>
                    {columns.map(col => (
                        <div
                            key={col.key}
                            className={styles.tableHeaderCell}
                            style={{
                                width: col.flex ? undefined : col.width,
                                flex: col.flex ? 1 : `0 0 ${col.width}px`,
                                minWidth: col.width
                            }}
                        >
                            {col.required && <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>}
                            {col.title}
                        </div>
                    ))}
                </div>

                {data.length > 0 ? (
                    <List
                        ref={listRef}
                        height={Math.min(TABLE_HEIGHT, calculateTotalHeight() || 100)}
                        itemCount={data.length}
                        itemSize={getItemSize}
                        width="100%"
                        itemData={itemData}
                    >
                        {TableRow}
                    </List>
                ) : (
                    <div style={{ padding: '60px', textAlign: 'center', color: '#bfbfbf', fontSize: '15px' }}>
                        暂无数据，请添加或导入样本
                    </div>
                )}
            </div>
        </div>
    );
}

// 使用 memo 优化渲染性能
export default memo(SampleListTable);