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
    HighlightChangesModule,
    SelectEditorModule,
    NumberEditorModule
} from 'ag-grid-community';

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import BatchAddModal from './BatchAddModal';
import styles from './SampleListTable.module.scss';
import { SampleItem, SampleListTableProps } from './types';
import { exportToExcel, importFromExcel } from './utils';

// Re-export types for external use
export type { SampleItem } from './types';

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
    HighlightChangesModule,
    SelectEditorModule,
    NumberEditorModule
]);

const AgSampleListTable = ({ data, onChange, onBlur, disabled, needBioinformaticsAnalysis, errors, message: parentMessage, pairwiseComparison, multiGroupComparison }: SampleListTableProps) => {
    const { message: appMessage, modal } = App.useApp();
    // Use parentMessage if it has success/error methods, otherwise fall back to appMessage
    const message = (parentMessage?.success && parentMessage?.error) ? parentMessage : appMessage;

    // Grid Ref
    const gridRef = useRef<AgGridReact>(null);
    const [isBatchAddOpen, setIsBatchAddOpen] = useState(false);
    const [importing, setImporting] = useState(false);

    // Track if we've already initialized rows to prevent repeated initialization
    const initializedRef = useRef(false);

    // Auto-initialize with 10 empty rows when data is empty and not disabled
    useEffect(() => {
        if (!disabled && data.length === 0 && !initializedRef.current) {
            initializedRef.current = true;
            const emptyRows = Array.from({ length: 10 }, () => ({
                sampleName: '', analysisName: '', groupName: '',
                detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
            }));
            onChange(emptyRows);
        }
    }, [data.length, disabled, onChange]);

    // --- Error Navigation Logic ---
    const errorIndices = useMemo(() => {
        if (!errors) return [];
        return Object.keys(errors)
            .map(key => parseInt(key))
            .filter(index => {
                // Only include indices that exist in current data
                if (index >= data.length) return false;
                const rowErrs = errors[index];
                return rowErrs && Object.values(rowErrs).some(e => !!e);
            })
            .sort((a, b) => a - b);
    }, [errors, data.length]);

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
    // Refresh cell styles when errors change, but not if currently editing
    const errorsRef = useRef(errors);
    errorsRef.current = errors;

    useEffect(() => {
        const api = gridRef.current?.api;
        if (!api) return;

        // Use setTimeout to avoid flushSync warning - push out of React render cycle
        const timeoutId = setTimeout(() => {
            // Don't refresh if a cell is being edited - this would steal focus
            const editingCells = api.getEditingCells();
            if (editingCells.length > 0) return;

            api.refreshCells({ force: true });
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [errors]);

    const getCellClass = useCallback((params: any) => {
        const rowIndex = params.node.rowIndex;
        const colId = params.colDef.field;
        const hasError = errorsRef.current?.[rowIndex]?.[colId];
        return hasError ? styles.cellError : undefined;
    }, []);

    // Row Actions
    const handleCopyRow = useCallback((rowIndex: number) => {
        const rowToCopy = data[rowIndex];
        if (!rowToCopy) return;
        const newRow = { ...rowToCopy, sampleName: `${rowToCopy.sampleName}_copy` };
        const newData = [...data];
        newData.splice(rowIndex + 1, 0, newRow);
        onChange(newData);
        message.success('复制成功');

        // Scroll to and focus the new copied row
        setTimeout(() => {
            const api = gridRef.current?.api;
            if (!api) return;
            const newRowIndex = rowIndex + 1;
            api.ensureIndexVisible(newRowIndex, 'middle');
            api.setFocusedCell(newRowIndex, 'sampleName');
            api.startEditingCell({ rowIndex: newRowIndex, colKey: 'sampleName' });
        }, 100);
    }, [data, onChange, message]);

    const handleDeleteRow = useCallback((rowIndex: number) => {
        modal.confirm({
            title: '确认删除',
            content: '确定要删除此行数据吗？',
            onOk: () => {
                const newData = data.filter((_, idx) => idx !== rowIndex);
                onChange(newData);
                message.success('删除成功');
            }
        });
    }, [data, onChange, modal, message]);

    // Action Cell Renderer - memoized to prevent re-creation
    const ActionCellRenderer = useMemo(() => {
        return (params: any) => {
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
    }, [handleCopyRow, handleDeleteRow]);

    // --- Column Definitions ---
    const columnDefs = useMemo<ColDef[]>(() => {
        const isBio = needBioinformaticsAnalysis === true || needBioinformaticsAnalysis === 'true';

        const getErrorMessage = (params: any) => {
            const rowIndex = params.node?.rowIndex;
            if (rowIndex === undefined || rowIndex === null) return undefined;
            const colId = params.colDef?.field;
            return errors?.[rowIndex]?.[colId];
        };

        // Custom cell renderer to show error message below value
        const CellWithError = (params: any) => {
            const rowIndex = params.node.rowIndex;
            const colId = params.colDef.field;
            const errorMsg = errorsRef.current?.[rowIndex]?.[colId];
            const value = params.value;

            if (errorMsg) {
                return (
                    <div className={styles.cellWithError}>
                        <span className={styles.cellValue}>{value ?? ''}</span>
                        <span className={styles.cellErrorText}>{errorMsg}</span>
                    </div>
                );
            }
            return value ?? '';
        };

        const commonColProps: Partial<ColDef> = {
            editable: !disabled,
            cellClass: getCellClass,
            cellRenderer: CellWithError
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
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: ['检测', '暂存']
                },
                ...commonColProps
            },
            {
                field: 'sampleTubeCount',
                headerName: '样品管数',
                width: 100,
                cellEditor: 'agNumberCellEditor',
                cellEditorParams: {
                    min: 1
                },
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
    }, [disabled, needBioinformaticsAnalysis, getCellClass, handleCopyRow, handleDeleteRow]);

    const defaultColDef = useMemo<ColDef>(() => ({
        sortable: false,
        filter: false,
        resizable: true,
        cellEditorParams: {
            selectAll: false  // Don't select all text when entering edit mode
        }
    }), []);

    // --- Data Handling ---
    const onCellValueChanged = useCallback((event: CellValueChangedEvent) => {
        const rowIndex = event.node.rowIndex;
        if (rowIndex === null || rowIndex === undefined) return;

        const updatedRow = event.data;
        const newData = [...data];
        newData[rowIndex] = { ...updatedRow };
        onChange(newData);
    }, [data, onChange]);

    // Add Row - adds 10 empty rows at a time
    const createEmptyRow = (): SampleItem => ({
        sampleName: '', analysisName: '', groupName: '',
        detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
    });

    const handleAddRow = useCallback(() => {
        // Add 10 empty rows
        const newRows = Array.from({ length: 10 }, () => createEmptyRow());
        const newData = [...data, ...newRows];
        onChange(newData);

        // After data updates, scroll to the first new row and start editing
        setTimeout(() => {
            const api = gridRef.current?.api;
            if (!api) return;

            const firstNewRowIndex = data.length; // Index of first new row
            api.ensureIndexVisible(firstNewRowIndex, 'middle');
            api.setFocusedCell(firstNewRowIndex, 'sampleName');
            api.startEditingCell({
                rowIndex: firstNewRowIndex,
                colKey: 'sampleName'
            });
        }, 100);
    }, [data, onChange]);

    // Selection & Delete
    const handleDeleteSelected = () => {
        const selectedNodes = gridRef.current?.api.getSelectedNodes();
        if (!selectedNodes || selectedNodes.length === 0) return;

        const selectedIndices = new Set(selectedNodes.map(n => n.rowIndex));
        modal.confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedIndices.size} 条数据吗？`,
            onOk: () => {
                const newData = data.filter((_, index) => !selectedIndices.has(index));
                onChange(newData);
                message.success('删除成功');
            }
        });
    };

    // Import handler - using utility function
    const handleImport = async (file: File) => {
        if (file.size / 1024 / 1024 > 5) {
            message.error('文件过大');
            return false;
        }
        setImporting(true);
        try {
            const importedData = await importFromExcel(file);
            onChange([...data, ...importedData]);
            message.success(`成功导入 ${importedData.length} 条数据`);
            setTimeout(() => { if (onBlur) onBlur('sampleList'); }, 0);
        } catch (err) {
            console.error(err);
            message.error('导入失败');
        } finally {
            setImporting(false);
        }
        return false;
    };

    // Export handler - using utility function
    const handleExport = async () => {
        if (data.length === 0) {
            message.warning('没有数据可导出');
            return;
        }
        try {
            await exportToExcel(data, pairwiseComparison, multiGroupComparison);
            message.success('导出成功');
        } catch (err) {
            console.error(err);
            message.error('导出失败');
        }
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

    // Move cursor to end when editing starts (prevent auto-select all)
    const onCellEditingStarted = useCallback((event: any) => {
        setTimeout(() => {
            const input = document.querySelector('.ag-cell-edit-wrapper input') as HTMLInputElement;
            if (input) {
                const len = input.value.length;
                input.setSelectionRange(len, len);
            }
        }, 10);
    }, []);

    const onCellEditingStopped = useCallback((event: any) => {
        // Optionally validate single field or whole list
        // if (onBlur) onBlur('sampleList'); 
        // But this might be too frequent. Let user click Save or manual check?
        // User requested "Immediate Validation".
        if (onBlur) onBlur('sampleList');
    }, [onBlur]);

    // Handle Enter key: smart navigation
    // 1. First check if current row has empty editable cells after current column
    // 2. If yes, jump to next empty cell in same row
    // 3. If no, jump to first editable cell in next row
    // Columns to skip during Enter navigation (typically unused columns like remarks)
    const skipColumns = useMemo(() => ['experimentDescription'], []);

    // Track error cell state: first Enter shows error, second Enter enters edit mode
    const errorCellRef = useRef<{ row: number; col: string } | null>(null);

    const onCellKeyDown = useCallback((event: any) => {
        const keyboardEvent = event.event as KeyboardEvent;
        const key = keyboardEvent.key;

        if (key === 'Enter' && !keyboardEvent.shiftKey) {
            const api = gridRef.current?.api;
            if (!api) return;

            const currentCell = api.getFocusedCell();
            if (!currentCell) return;

            const currentRowIndex = currentCell.rowIndex;
            const currentColumnId = currentCell.column.getColId();

            // Get current row data (with the latest value from editing)
            const rowNode = api.getDisplayedRowAtIndex(currentRowIndex);
            const rowData = rowNode?.data;
            const currentValue = rowData?.[currentColumnId] || '';

            // Inline validation for current cell - check for format errors
            let hasFormatError = false;

            if (currentColumnId === 'sampleName' && currentValue) {
                // Check for Chinese characters or special characters
                if (/[\u4e00-\u9fa5]/.test(currentValue)) {
                    hasFormatError = true;
                } else if (/[￥$&@%]/.test(currentValue)) {
                    hasFormatError = true;
                } else if (currentValue.length > 10) {
                    hasFormatError = true;
                }
            }

            if ((currentColumnId === 'analysisName' || currentColumnId === 'groupName') && currentValue) {
                // Check format: must start with letter, only alphanumeric and underscore
                if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(currentValue)) {
                    hasFormatError = true;
                } else if (currentValue.length > 8) {
                    hasFormatError = true;
                }
            }

            // Only use inline validation - stored errors may be stale
            if (hasFormatError) {
                keyboardEvent.preventDefault();

                // Check if this is the same error cell as before
                const isSameErrorCell = errorCellRef.current?.row === currentRowIndex &&
                    errorCellRef.current?.col === currentColumnId;

                if (isSameErrorCell) {
                    // Second Enter - enter edit mode
                    errorCellRef.current = null; // Reset
                    setTimeout(() => {
                        api.setFocusedCell(currentRowIndex, currentColumnId);
                        api.startEditingCell({
                            rowIndex: currentRowIndex,
                            colKey: currentColumnId
                        });
                    }, 150);
                } else {
                    // First Enter - just focus, don't edit (shows error)
                    errorCellRef.current = { row: currentRowIndex, col: currentColumnId };
                    api.stopEditing();
                    setTimeout(() => {
                        api.setFocusedCell(currentRowIndex, currentColumnId);
                    }, 50);
                }
                return;
            }

            // No error - reset error cell tracking
            errorCellRef.current = null;

            // Get editable columns, excluding skip columns (like remarks)
            const editableColumnFields = columnDefs
                .filter((col: any) => col.editable !== false && col.field && !skipColumns.includes(col.field))
                .map((col: any) => col.field as string);

            // Find current column index
            const currentColIndex = editableColumnFields.indexOf(currentColumnId);

            if (rowData && currentColIndex >= 0) {
                // Check for empty cells OR error cells after current column in current row
                for (let i = currentColIndex + 1; i < editableColumnFields.length; i++) {
                    const field = editableColumnFields[i];
                    const value = rowData[field];
                    const hasError = errorsRef.current?.[currentRowIndex]?.[field];

                    // Jump to cell if it's empty or has error
                    if (value === undefined || value === null || value === '' || hasError) {
                        keyboardEvent.preventDefault();
                        setTimeout(() => {
                            api.setFocusedCell(currentRowIndex, field);
                            api.startEditingCell({
                                rowIndex: currentRowIndex,
                                colKey: field
                            });
                        }, 150);
                        return;
                    }
                }
            }

            // All cells in current row are filled, move to next row
            const nextRowIndex = currentRowIndex + 1;

            // If we're at the last row and it's completed, auto-add 10 more rows
            if (nextRowIndex >= data.length) {
                keyboardEvent.preventDefault();
                // Add 10 new empty rows
                const newRows = Array.from({ length: 10 }, () => ({
                    sampleName: '', analysisName: '', groupName: '',
                    detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
                }));
                onChange([...data, ...newRows]);

                // Focus the first cell of the new row after data updates
                setTimeout(() => {
                    api.ensureIndexVisible(nextRowIndex, 'middle');
                    api.setFocusedCell(nextRowIndex, editableColumnFields[0] || 'sampleName');
                    api.startEditingCell({
                        rowIndex: nextRowIndex,
                        colKey: editableColumnFields[0] || 'sampleName'
                    });
                }, 150);
                return;
            }

            // Jump to first editable column of next row
            const firstField = editableColumnFields[0];
            if (!firstField) return;

            keyboardEvent.preventDefault();
            setTimeout(() => {
                api.setFocusedCell(nextRowIndex, firstField);
                api.startEditingCell({
                    rowIndex: nextRowIndex,
                    colKey: firstField
                });
            }, 150);
        }
    }, [data, columnDefs, onChange, skipColumns]);

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
                    {/* Export button - always visible */}
                    {data.length > 0 && (
                        <Button icon={<DownloadOutlined />} onClick={handleExport}>
                            导出数据
                        </Button>
                    )}
                </div>
                <span className={styles.dataCount}>已录入 {data.length} 条样本</span>
            </div>

            <div className="ag-theme-quartz" style={{ height: 500, width: '100%' }}>
                <AgGridReact
                    theme="legacy"
                    ref={gridRef}
                    rowData={data}
                    columnDefs={columnDefs}
                    defaultColDef={defaultColDef}
                    rowHeight={48}
                    rowSelection="multiple"
                    suppressRowClickSelection={true}
                    onCellValueChanged={onCellValueChanged}
                    onCellEditingStarted={onCellEditingStarted}
                    onCellEditingStopped={onCellEditingStopped}
                    onCellKeyDown={onCellKeyDown}
                    stopEditingWhenCellsLoseFocus={true}
                    singleClickEdit={true}
                    suppressScrollOnNewData={true}
                />
            </div>


            <BatchAddModal
                open={isBatchAddOpen}
                onCancel={() => setIsBatchAddOpen(false)}
                onAdd={handleBatchAdd}
                needBioinformaticsAnalysis={needBioinformaticsAnalysis}
            />
        </div >
    );
};

export default AgSampleListTable;
