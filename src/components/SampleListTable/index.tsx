'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Button, Upload, Modal, App, Alert } from 'antd';
import {
    PlusOutlined, UploadOutlined, DownloadOutlined,
    FileExcelOutlined, AppstoreAddOutlined, DeleteOutlined, LoadingOutlined,
    WarningOutlined, UpOutlined, DownOutlined, CopyOutlined
} from '@ant-design/icons';
import { AgGridReact } from 'ag-grid-react';
import {
    ColDef,
    ModuleRegistry,
    ClientSideRowModelModule,
    ICellEditorParams,
    ValueFormatterParams,
    GridReadyEvent,
    CellValueChangedEvent,
    ValidationModule,
    RowSelectionModule,
    TextEditorModule,
    CellStyleModule,
    TooltipModule,
    CustomEditorModule,
    RowApiModule,
    ScrollApiModule,
    RenderApiModule,
    HighlightChangesModule
} from 'ag-grid-community';

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import BatchAddModal from './BatchAddModal';
import { AgAntdSelectEditor, AgAntdNumberEditor } from './AgCellEditors';
import styles from './SampleListTable.module.scss';
import { DETECTION_OPTIONS } from './constants';

// Register AG Grid Modules
ModuleRegistry.registerModules([
    ClientSideRowModelModule,
    ValidationModule,
    RowSelectionModule,
    TextEditorModule,
    CellStyleModule,
    TooltipModule,
    CustomEditorModule,
    RowApiModule,
    ScrollApiModule,
    RenderApiModule,
    HighlightChangesModule
]);

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
    message?: any;
}

const AgSampleListTable = ({ data, onChange, onBlur, disabled, needBioinformaticsAnalysis, errors, message: parentMessage }: SampleListTableProps) => {
    const { message: appMessage } = App.useApp();
    const message = parentMessage || appMessage;

    // Grid Ref
    const gridRef = useRef<AgGridReact>(null);
    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
    const [importing, setImporting] = useState(false);

    // --- Error Navigation Logic ---
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

    const [currentErrorPointer, setCurrentErrorPointer] = useState(0);

    const jumpToError = (direction: 'next' | 'prev') => {
        if (errorIndices.length === 0) return;
        let nextPointer = direction === 'next' ? currentErrorPointer + 1 : currentErrorPointer - 1;
        if (nextPointer >= errorIndices.length) nextPointer = 0;
        if (nextPointer < 0) nextPointer = errorIndices.length - 1;
        setCurrentErrorPointer(nextPointer);

        const rowIndex = errorIndices[nextPointer];
        gridRef.current?.api.ensureIndexVisible(rowIndex, 'middle');
        const rowNode = gridRef.current?.api.getDisplayedRowAtIndex(rowIndex);
        if (rowNode) {
            gridRef.current?.api.flashCells({ rowNodes: [rowNode] }); // Flash the error row
        }
    };

    // --- Validation Styles ---
    // Re-draw rows if errors change to update styles
    useEffect(() => {
        if (gridRef.current?.api) {
            gridRef.current.api.redrawRows();
        }
    }, [errors]);

    const getCellClass = (params: any) => {
        const rowIndex = params.node.rowIndex;
        const colId = params.colDef.field;
        // Check exact field error
        const hasError = errors?.[rowIndex]?.[colId];
        return hasError ? styles.cellError : undefined;
    };

    // Restoring Row Actions
    const handleCopyRow = useCallback((rowIndex: number) => {
        const rowToCopy = data[rowIndex];
        if (!rowToCopy) return;
        const newRow = { ...rowToCopy, sampleName: `${rowToCopy.sampleName}_copy` };
        const newData = [...data];
        newData.splice(rowIndex + 1, 0, newRow);
        onChange(newData);
        message.success('复制成功');
    }, [data, onChange]);

    const handleDeleteRow = useCallback((rowIndex: number) => {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除此行数据吗？',
            onOk: () => {
                const newData = data.filter((_, idx) => idx !== rowIndex);
                onChange(newData);
                message.success('删除成功');
            }
        });
    }, [data, onChange]);

    const ActionCellRenderer = (params: any) => {
        const rowIndex = params.node.rowIndex;
        return (
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <Button
                    type="text"
                    icon={<CopyOutlined />}
                    size="small"
                    onClick={() => handleCopyRow(rowIndex)}
                    title="复制行"
                />
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    size="small"
                    onClick={() => handleDeleteRow(rowIndex)}
                    title="删除行"
                />
            </div>
        );
    };

    // --- Column Definitions ---
    const columnDefs = useMemo<ColDef[]>(() => {
        const isBio = needBioinformaticsAnalysis === true || needBioinformaticsAnalysis === 'true';

        const getErrorMessage = (params: any) => {
            const rowIndex = params.node?.rowIndex;
            if (rowIndex === undefined || rowIndex === null) return undefined;
            const colId = params.colDef?.field;
            return errors?.[rowIndex]?.[colId];
        };

        const commonColProps: Partial<ColDef> = {
            editable: !disabled,
            cellClass: getCellClass,
            tooltipValueGetter: getErrorMessage
        };

        const cols: ColDef[] = [
            {
                headerCheckboxSelection: !disabled,
                checkboxSelection: !disabled,
                width: 50,
                pinned: 'left',
                lockPosition: true,
                suppressMovable: true,
                resizable: false
            },
            {
                headerName: '序号',
                valueGetter: "node.rowIndex + 1",
                width: 70,
                pinned: 'left',
                resizable: false
            },
            {
                field: 'sampleName',
                headerName: '样本名称',
                width: 160,
                ...commonColProps
            }
        ];

        if (isBio) {
            cols.push(
                {
                    field: 'analysisName',
                    headerName: '分析名称',
                    width: 160,
                    ...commonColProps
                },
                {
                    field: 'groupName',
                    headerName: '分组名称',
                    width: 160,
                    ...commonColProps
                }
            );
        }

        cols.push(
            {
                field: 'detectionOrStorage',
                headerName: '检测或暂存',
                width: 130,
                cellEditor: AgAntdSelectEditor,
                cellEditorParams: {
                    options: DETECTION_OPTIONS
                },
                ...commonColProps
            },
            {
                field: 'sampleTubeCount',
                headerName: '样品管数',
                width: 100,
                cellEditor: AgAntdNumberEditor,
                ...commonColProps
            },
            {
                field: 'experimentDescription',
                headerName: '备注',
                flex: 1,
                minWidth: 200,
                ...commonColProps
            }
        );

        // Action Column
        if (!disabled) {
            cols.push({
                headerName: '操作',
                width: 100,
                pinned: 'right',
                cellRenderer: ActionCellRenderer,
                sortable: false,
                filter: false,
                resizable: false
            });
        }

        return cols;
    }, [disabled, needBioinformaticsAnalysis, errors, handleCopyRow, handleDeleteRow]);
    // Dependencies: errors included to rebuild colDefs? 
    // Actually cellClass function is stable if defined outside, but inside relies on 'errors' closure?
    // 'getCellClass' relies on 'errors'. So if 'errors' update, we need new getCellClass or use ref.
    // 'errors' is in scope. If passed to cellClass, AG Grid calls it.
    // Grid Api redrawRows handles re-calling it.

    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: false,
        filter: false,
        resizable: true,
    }), []);

    // --- Data Handling ---
    const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
        // AG Grid updates 'data' object in place (mutable).
        // But React needs immutable update to trigger effects?
        // Actually, if we pass deep copy to grid, grid mutates IT.
        // We should gather all rows data from Grid and call onChange?
        // OR: Update 'data' prop (which is our state) by modifying the changed row index.

        const rowIndex = event.node.rowIndex;
        if (rowIndex === null || rowIndex === undefined) return;

        const updatedRow = event.data;
        const newData = [...data]; // Shallow copy array
        newData[rowIndex] = { ...updatedRow }; // Copy object to ensure ref change for row
        onChange(newData);

        // Trigger validation ?
        // onBlur can be mapped differently. Maybe debounce auto-save?
        // "Local State" logic: Grid is now local state. 
        // We commit to Global State on Change.
    }, [data, onChange]);

    // Add Row
    const handleAddRow = () => {
        const newRow: SampleItem = {
            sampleName: '', analysisName: '', groupName: '',
            detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
        };
        onChange([...data, newRow]);
    };

    // Selection & Delete
    const handleDeleteSelected = () => {
        const selectedNodes = gridRef.current?.api.getSelectedNodes();
        if (!selectedNodes || selectedNodes.length === 0) return;

        const selectedIndices = new Set(selectedNodes.map(n => n.rowIndex));
        Modal.confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedIndices.size} 条数据吗？`,
            onOk: () => {
                const newData = data.filter((_, index) => !selectedIndices.has(index));
                onChange(newData);
                message.success('删除成功');
            }
        });
    };

    // Import/Export logic (simplified reuse)
    // ... [Reuse import logic from previous impl] ... 
    // Copied for simplicity:
    const handleImport = async (file: File) => {
        if (file.size / 1024 / 1024 > 5) {
            message.error('文件过大');
            return false;
        }
        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
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
                setTimeout(() => { if (onBlur) onBlur('sampleList'); }, 0);
            } catch (err) {
                console.error(err);
                message.error('导入失败');
            } finally {
                setImporting(false);
            }
        };
        reader.readAsBinaryString(file);
        return false;
    };

    // Batch Add Callback
    const handleBatchAdd = (newRows: SampleItem[]) => {
        onChange([...data, ...newRows]);
        message.success(`已批量添加 ${newRows.length} 条数据`);
        setIsBatchAddOpen(false);
        setTimeout(() => { if (onBlur) onBlur('sampleList'); }, 0);
    };

    // Validation Trigger
    const onGridBlur = (event: any) => {
        // Trigger validation when focus leaves grid?
        // AG Grid doesn't have a simple 'onBlur' for whole grid.
        // We can use onCellEditingStopped -> trigger validation for that field?
    };

    const onCellEditingStopped = useCallback((event: any) => {
        // Optionally validate single field or whole list
        // if (onBlur) onBlur('sampleList'); 
        // But this might be too frequent. Let user click Save or manual check?
        // User requested "Immediate Validation".
        if (onBlur) onBlur('sampleList');
    }, [onBlur]);

    return (
        <div className={styles.sampleTableContainer}>
            <h3>样本清单</h3>
            <div className={styles.comparisonNote}>
                <p>1. "样本名称"应与管子一致，不可包含中文字符或特殊字符，长度控制在10字符内。</p>
                <p>2. "分析名称"和"分组名称"仅限字母、数字、下划线，长度控制在8字符内，首字符需为字母。</p>
            </div>

            {/* Error Banner */}
            {errorIndices.length > 0 && (
                <Alert
                    message={
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>
                                <WarningOutlined style={{ marginRight: 8 }} />
                                发现 <strong>{errorIndices.length}</strong> 行数据存在错误。
                            </span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button size="small" icon={<UpOutlined />} onClick={() => jumpToError('prev')}>上一处</Button>
                                <Button size="small" icon={<DownOutlined />} onClick={() => jumpToError('next')}>下一处 ({currentErrorPointer + 1}/{errorIndices.length})</Button>
                            </div>
                        </div>
                    }
                    type="error"
                    style={{ marginBottom: 12 }}
                />
            )}

            <div className={styles.tableToolbar}>
                <div className={styles.tableActions}>
                    {!disabled && (
                        <>
                            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddRow}>添加样本行</Button>
                            <Button icon={<AppstoreAddOutlined />} onClick={() => setIsBatchAddOpen(true)}>
                                {needBioinformaticsAnalysis ? '新增分组' : '批量新增'}
                            </Button>
                            <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={handleImport}>
                                <Button loading={importing} icon={importing ? <LoadingOutlined /> : <UploadOutlined />}>批量导入</Button>
                            </Upload>
                            <Button danger icon={<DeleteOutlined />} onClick={handleDeleteSelected}>
                                删除选中
                            </Button>
                        </>
                    )}
                </div>
                <span className={styles.dataCount}>已录入 {data.length} 条样本</span>
            </div>

            <div className="ag-theme-quartz" style={{ height: 500, width: '100%' }}>
                <AgGridReact
                    theme="legacy"
                    ref={gridRef}
                    tooltipShowDelay={0}
                    rowData={data}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowSelection="multiple"
                    suppressRowClickSelection={true}
                    onCellValueChanged={onCellValueChanged}
                    onCellEditingStopped={onCellEditingStopped}
                    stopEditingWhenCellsLoseFocus={true} // Excel like behavior
                    enterNavigatesVerticallyAfterEdit={true}
                    enterNavigatesVertically={true}
                />
            </div>

            <BatchAddModal
                open={isBatchAddOpen}
                onCancel={() => setIsBatchAddOpen(false)}
                onAdd={handleBatchAdd}
                needBioinformaticsAnalysis={needBioinformaticsAnalysis}
            />
        </div>
    );
};

export default AgSampleListTable;
