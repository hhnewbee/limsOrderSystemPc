'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button, Upload, Checkbox, Modal, App, Alert, Tooltip } from 'antd';
import {
    PlusOutlined, UploadOutlined, DownloadOutlined,
    FileExcelOutlined, AppstoreAddOutlined, DeleteOutlined, LoadingOutlined,
    UpOutlined, DownOutlined, WarningOutlined
} from '@ant-design/icons';
import { VariableSizeList as List } from 'react-window';
import type { UploadFile } from 'antd/es/upload/interface';

import TableRow from './TableRow';
import BatchAddModal from './BatchAddModal';
import { getColumns, ROW_HEIGHT_NORMAL, ROW_HEIGHT_ERROR, TABLE_HEIGHT } from './constants';
import styles from './SampleListTable.module.scss';


export interface SampleItem {
    sampleName?: string;
    analysisName?: string;
    groupName?: string;
    detectionOrStorage?: string;
    sampleTubeCount?: number;
    experimentDescription?: string;
    [key: string]: any;
}

interface SampleListTableProps {
    data: SampleItem[];
    onChange: (newData: SampleItem[]) => void;
    onBlur?: (field: string) => void;
    disabled?: boolean;
    needBioinformaticsAnalysis?: boolean | string;
    errors?: any;
    message?: any; // Accepting drilled message instance
}

export default function SampleListTable({ data, onChange, onBlur, disabled, needBioinformaticsAnalysis, errors, message: parentMessage }: SampleListTableProps) {
    // 优先使用传入的 message
    const { message: appMessage } = App.useApp();
    const message = parentMessage || appMessage;

    const listRef = useRef<List>(null);
    const columns = getColumns(needBioinformaticsAnalysis);

    // [Performance] Cache data to stabilize callbacks
    const dataRef = useRef(data);
    dataRef.current = data;

    // [新增] 状态管理
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set()); // 存储选中行的索引
    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false); // 控制弹窗
    const [importing, setImporting] = useState(false); // [新增] 导入加载状态
    const [currentErrorPointer, setCurrentErrorPointer] = useState(0); // [新增] 当前定位的错误索引指针

    // 监听数据或错误变化，重置列表高度计算
    useEffect(() => {
        if (listRef.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [data, errors]);

    // --- 选中逻辑 ---

    // 切换单行选中
    const handleToggleRow = useCallback((index: number) => {
        setSelectedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) newSet.delete(index);
            else newSet.add(index);
            return newSet;
        });
    }, []);

    // 切换全选
    const handleToggleAll = useCallback((e: any) => {
        if (e.target.checked) {
            const newSet = new Set<number>();
            data.forEach((_, i) => newSet.add(i));
            setSelectedRows(newSet);
        } else {
            setSelectedRows(new Set());
        }
    }, [data]);

    // 计算全选框的状态
    const isAllSelected = data.length > 0 && selectedRows.size === data.length;
    const isIndeterminate = selectedRows.size > 0 && selectedRows.size < data.length;

    // --- 错误导航逻辑 ---
    const errorIndices = useMemo(() => {
        if (!errors) return [];
        return Object.keys(errors)
            .map(key => parseInt(key))
            .filter(index => {
                const rowErrs = errors[index];
                return rowErrs && Object.values(rowErrs).some(e => !!e);
            })
            .sort((a, b) => a - b);
    }, [errors]);

    // 重置指针当错误列表变化时 (可选，或者保留以尝试维持上下文)
    useEffect(() => {
        setCurrentErrorPointer(0);
    }, [errorIndices.length]);

    const jumpToError = (direction: 'next' | 'prev') => {
        if (errorIndices.length === 0) return;

        let nextPointer = direction === 'next' ? currentErrorPointer + 1 : currentErrorPointer - 1;

        // 循环
        if (nextPointer >= errorIndices.length) nextPointer = 0;
        if (nextPointer < 0) nextPointer = errorIndices.length - 1;

        setCurrentErrorPointer(nextPointer);
        const rowIndex = errorIndices[nextPointer];

        // 滚动到该行 (居中显示)
        listRef.current?.scrollToItem(rowIndex, 'center');
        // 也可以高亮一下? (暂不处理复杂高亮)
    };

    // --- 批量操作逻辑 ---

    // 批量添加回调
    const handleBatchAdd = (newRows: SampleItem[]) => {
        onChange([...data, ...newRows]);
        message.success(`已批量添加 ${newRows.length} 条数据`);
        setIsBatchAddOpen(false);
        // [新增] 立即触发校验
        setTimeout(() => {
            if (onBlur) onBlur('sampleList');
        }, 0);
    };

    // 批量删除
    const handleBatchDelete = () => {
        if (selectedRows.size === 0) return;
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedRows.size} 条数据吗？`,
            onOk: () => {
                const newData = data.filter((_, index) => !selectedRows.has(index));
                onChange(newData);
                setSelectedRows(new Set()); // 清空选中
                message.success('删除成功');
            }
        });
    };

    // --- 原有逻辑 ---

    const getItemSize = useCallback((index: number) => {
        const rowErrors = errors?.[index];
        const hasError = rowErrors && Object.values(rowErrors).some(err => !!err);
        return hasError ? ROW_HEIGHT_ERROR : ROW_HEIGHT_NORMAL;
    }, [errors]);

    const calculateTotalHeight = () => {
        return data.reduce((total, _, index) => total + getItemSize(index), 0);
    };

    const handleAddRow = useCallback(() => {
        const currentData = dataRef.current;
        const newRow: SampleItem = {
            sampleName: '', analysisName: '', groupName: '',
            detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
        };
        onChange([...currentData, newRow]);
    }, [onChange]);

    const handleCopyRow = useCallback((index: number) => {
        const currentData = dataRef.current;
        const newData = [...currentData];
        newData.splice(index + 1, 0, { ...currentData[index] });
        onChange(newData);
        message.success('行已复制');
    }, [onChange, message]);

    const handleDeleteRow = useCallback((index: number) => {
        const currentData = dataRef.current;
        const newData = currentData.filter((_, i) => i !== index);
        onChange(newData);
        // 如果删除了行，为防止索引错位，建议清空选中
        if (selectedRows.size > 0) setSelectedRows(new Set());
    }, [onChange, selectedRows]); // removed data dependency

    const handleCellChange = useCallback((index: number, field: string, value: any) => {
        const currentData = dataRef.current;
        const newData = [...currentData];
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    }, [onChange]); // removed data dependency

    // 🟢 handleBlur wrapper
    const handleBlur = useCallback((field: string) => {
        if (onBlur) {
            onBlur('sampleList'); // Trigger validation for whole list
        }
    }, [onBlur]);


    const handleImport = useCallback((file: File) => {
        // 1. 简单的文件大小校验 (可选，比如限制 5MB)
        if (file.size / 1024 / 1024 > 5) {
            message.error('文件过大，请上传 5MB 以内的 Excel 文件');
            return false;
        }
        setImporting(true); // 开启 Loading

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Dynamic import
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
                // [新增] 立即触发校验
                setTimeout(() => {
                    if (onBlur) onBlur('sampleList');
                }, 0);
            } catch (err) {
                console.error(err);
                message.error('导入失败，请检查文件格式是否正确');
            } finally {
                setImporting(false); // 关闭 Loading
            }
        };
        // Ensure UI updates before heavy work
        setTimeout(() => reader.readAsBinaryString(file), 0);
        return false;
    }, [data, onChange, message]);

    const handleExportData = useCallback(async () => {
        if (data.length === 0) {
            message.warning('没有数据可导出');
            return;
        }
        // Dynamic import
        const XLSX = await import('xlsx');

        const exportData = data.map((item, index) => {
            const row: any = {
                '序号': index + 1,
                '样本名称': item.sampleName || '',
            };
            if (needBioinformaticsAnalysis) {
                row['分析名称'] = item.analysisName || '';
                row['分组名称'] = item.groupName || '';
            }
            row['检测或暂存'] = item.detectionOrStorage || '';
            row['样品管数'] = item.sampleTubeCount || 1;
            row['实验设计描述及样本备注'] = item.experimentDescription || '';
            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        // ... 设置列宽代码 (略) ...
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '样本清单');
        XLSX.writeFile(workbook, `样本清单_${new Date().toISOString().slice(0, 10)}.xlsx`);
        message.success('导出成功');
    }, [data, needBioinformaticsAnalysis, message]);

    const handleDownloadTemplate = async () => {
        const XLSX = await import('xlsx');
        const worksheet = XLSX.utils.json_to_sheet([{ '样本名称': 'Sample1', '分析名称': 'Ana1', '分组名称': 'GroupA', '检测或暂存': '检测', '样品管数': 1 }]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
        XLSX.writeFile(workbook, '样本清单模板.xlsx');
    };

    // 使用 useMemo 封装 itemData，并传入选中状态
    const itemData = useMemo(() => ({
        items: data,
        errors,
        disabled,
        needBioinformaticsAnalysis,
        selectedRows, // [新增]
        onCellChange: handleCellChange,
        onDeleteRow: handleDeleteRow,
        onCopyRow: handleCopyRow,
        onToggleRow: handleToggleRow, // [新增]
        handleBlur // 🟢 Passed onBlur handler
    }), [data, errors, disabled, needBioinformaticsAnalysis, selectedRows, handleCellChange, handleDeleteRow, handleCopyRow, handleToggleRow, handleBlur]);

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
                            {/* [新增] 批量添加按钮 */}
                            <Button icon={<AppstoreAddOutlined />} onClick={() => setIsBatchAddOpen(true)}>
                                {needBioinformaticsAnalysis ? '新增分组' : '批量新增'}
                            </Button>

                            <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleImport}>
                                <Button loading={importing} icon={importing ? <LoadingOutlined /> : <UploadOutlined />}>{importing ? '处理中...' : '批量导入'}</Button>
                            </Upload>
                        </>
                    )}
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
                    <Button icon={<FileExcelOutlined />} onClick={handleExportData}>导出所有数据</Button>
                    {/* [新增] 批量删除按钮，仅当有选中项时显示 */}
                    {selectedRows.size > 0 && (
                        <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete}>
                            删除选中 ({selectedRows.size})
                        </Button>
                    )}
                </div>
                <span className={styles.dataCount}>已录入 {data.length} 条样本</span>
            </div>

            {/* [新增] 错误导航条 */}
            {errorIndices.length > 0 && (
                <Alert
                    message={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                                <WarningOutlined style={{ marginRight: 8 }} />
                                发现 <strong>{errorIndices.length}</strong> 行数据存在错误，建议修正后再提交。
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="small" icon={<UpOutlined />} onClick={() => jumpToError('prev')}>
                                    上一处
                                </Button>
                                <Button size="small" icon={<DownOutlined />} onClick={() => jumpToError('next')}>
                                    下一处 ({currentErrorPointer + 1}/{errorIndices.length})
                                </Button>
                            </div>
                        </div>
                    }
                    type="error"
                    style={{ marginBottom: 12 }}
                />
            )}

            <div className={styles.virtualTableContainer}>
                <div className={styles.tableHeader}>
                    {columns.map(col => {
                        // [新增] 特殊处理第一列（选择列）的表头，渲染全选框
                        if (col.key === 'selection') {
                            return (
                                <div
                                    key={col.key}
                                    className={styles.tableHeaderCell}
                                    style={{
                                        width: col.width,
                                        flex: `0 0 ${col.width}px`,
                                        justifyContent: 'center',
                                        minWidth: col.width
                                    }}
                                >
                                    {!disabled && (
                                        <Checkbox
                                            checked={isAllSelected}
                                            indeterminate={isIndeterminate}
                                            onChange={handleToggleAll}
                                        />
                                    )}
                                </div>
                            );
                        }
                        return (
                            <div
                                key={col.key}
                                className={styles.tableHeaderCell}
                                style={{
                                    width: col.flex ? undefined : (typeof col.width === 'number' ? `${col.width}px` : col.width),
                                    flex: col.flex ? 1 : `0 0 ${col.width}px`,
                                    minWidth: col.width
                                }}
                            >
                                {col.required && <span style={{ color: '#ff4d4f', marginRight: 4 }}>*</span>}
                                {col.title}
                            </div>
                        );
                    })}
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

            {/* [新增] 批量添加弹窗 */}
            <BatchAddModal
                open={isBatchAddOpen}
                onCancel={() => setIsBatchAddOpen(false)}
                onAdd={handleBatchAdd}
                needBioinformaticsAnalysis={needBioinformaticsAnalysis}
            />
        </div>
    );
}
