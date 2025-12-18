'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button, Upload, message } from 'antd';
import { PlusOutlined, UploadOutlined, DownloadOutlined, FileExcelOutlined } from '@ant-design/icons';
import { VariableSizeList as List } from 'react-window';
import * as XLSX from 'xlsx';

import TableRow from './TableRow';
import { getColumns, ROW_HEIGHT_NORMAL, ROW_HEIGHT_ERROR, TABLE_HEIGHT } from './constants';
import styles from './SampleListTable.module.scss';

export default function SampleListTable({ data, onChange, disabled, needBioinformaticsAnalysis, errors }) {
    const listRef = useRef(null);
    const columns = getColumns(needBioinformaticsAnalysis);

    // 监听数据或错误变化，重置列表高度计算
    useEffect(() => {
        if (listRef.current) {
            listRef.current.resetAfterIndex(0);
        }
    }, [data, errors]);

    // 动态计算行高
    const getItemSize = useCallback((index) => {
        const rowErrors = errors?.[index];
        const hasError = rowErrors && Object.values(rowErrors).some(err => !!err);
        return hasError ? ROW_HEIGHT_ERROR : ROW_HEIGHT_NORMAL;
    }, [errors]);

    // 计算列表总高度
    const calculateTotalHeight = () => {
        return data.reduce((total, _, index) => total + getItemSize(index), 0);
    };

    // --- 事件处理函数 ---

    const handleAddRow = useCallback(() => {
        const newRow = {
            sampleName: '', analysisName: '', groupName: '',
            detectionOrStorage: '检测', sampleTubeCount: 1, experimentDescription: ''
        };
        onChange([...data, newRow]);
    }, [data, onChange]);

    const handleCopyRow = useCallback((index) => {
        const newData = [...data];
        newData.splice(index + 1, 0, { ...data[index] });
        onChange(newData);
        message.success('行已复制');
    }, [data, onChange]);

    const handleDeleteRow = useCallback((index) => {
        onChange(data.filter((_, i) => i !== index));
    }, [data, onChange]);

    const handleCellChange = useCallback((index, field, value) => {
        const newData = [...data];
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    }, [data, onChange]);

    const handleImport = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'binary' });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const importedData = jsonData.map(row => ({
                    sampleName: row['样本名称'] || '',
                    analysisName: row['分析名称'] || '',
                    groupName: row['分组名称'] || '',
                    detectionOrStorage: row['检测或暂存'] || '检测',
                    sampleTubeCount: parseInt(row['样品管数']) || 1,
                    experimentDescription: row['实验设计描述及样本备注'] || ''
                }));
                onChange([...data, ...importedData]);
                message.success(`成功导入 ${importedData.length} 条数据`);
            } catch (err) { message.error('导入失败'); }
        };
        reader.readAsBinaryString(file);
        return false;
    }, [data, onChange]);

    // [新增] 导出所有数据为 Excel
    const handleExportData = useCallback(() => {
        if (data.length === 0) {
            message.warning('没有数据可导出');
            return;
        }

        // 1. 构造导出数据格式
        const exportData = data.map((item, index) => {
            // 基础字段
            const row = {
                '序号': index + 1,
                '样本名称': item.sampleName || '',
            };

            // 生信分析字段
            if (needBioinformaticsAnalysis) {
                row['分析名称'] = item.analysisName || '';
                row['分组名称'] = item.groupName || '';
            }

            // 其他字段
            row['检测或暂存'] = item.detectionOrStorage || '';
            row['样品管数'] = item.sampleTubeCount || 1;
            row['实验设计描述及样本备注'] = item.experimentDescription || '';

            return row;
        });

        // 2. 创建工作表
        const worksheet = XLSX.utils.json_to_sheet(exportData);

        // 3. 设置列宽（美化）
        const wscols = [
            { wch: 8 },  // 序号
            { wch: 20 }, // 样本名称
        ];
        if (needBioinformaticsAnalysis) {
            wscols.push({ wch: 20 }); // 分析名称
            wscols.push({ wch: 20 }); // 分组名称
        }
        wscols.push(
            { wch: 15 }, // 检测或暂存
            { wch: 10 }, // 样品管数
            { wch: 40 }  // 备注
        );
        worksheet['!cols'] = wscols;

        // 4. 导出文件
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '样本清单');
        XLSX.writeFile(workbook, `样本清单_${new Date().toISOString().slice(0, 10)}.xlsx`);
        message.success('导出成功');
    }, [data, needBioinformaticsAnalysis]);

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([{'样本名称': 'Sample1', '分析名称': 'Ana1', '分组名称': 'GroupA', '检测或暂存': '检测', '样品管数': 1}]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '模板');
        XLSX.writeFile(workbook, '样本清单模板.xlsx');
    };

    // 传递给 TableRow 的上下文数据
    const itemData = {
        items: data,
        errors,
        disabled,
        needBioinformaticsAnalysis,
        onCellChange: handleCellChange,
        onDeleteRow: handleDeleteRow,
        onCopyRow: handleCopyRow
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
                                <Button icon={<UploadOutlined />}>批量导入</Button>
                            </Upload>
                        </>
                    )}
                    <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>下载模板</Button>
                    {/* [新增] 导出数据按钮 */}
                    <Button icon={<FileExcelOutlined />} onClick={handleExportData}>导出所有数据</Button>
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