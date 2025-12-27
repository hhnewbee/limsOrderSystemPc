'use client';

import { SampleItem } from './types';

/**
 * Export data to Excel with multiple sheets
 */
export const exportToExcel = async (
    data: SampleItem[],
    pairwiseComparison?: any[],
    multiGroupComparison?: any[]
): Promise<void> => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Sheet 1: 样本清单
    const sampleExportData = data.map((item, index) => ({
        '序号': index + 1,
        '样本名称': item.sampleName || '',
        '分析名称': item.analysisName || '',
        '分组名称': item.groupName || '',
        '检测或暂存': item.detectionOrStorage || '',
        '样品管数': item.sampleTubeCount || '',
        '实验设计描述及样本备注': item.experimentDescription || ''
    }));
    const sampleSheet = XLSX.utils.json_to_sheet(sampleExportData);
    XLSX.utils.book_append_sheet(workbook, sampleSheet, '样本清单');

    // Sheet 2: 两两比较 (if available)
    if (pairwiseComparison && pairwiseComparison.length > 0) {
        const pairwiseExportData = pairwiseComparison.map((item, index) => ({
            '序号': index + 1,
            '对照组 (Control)': item.controlGroup || '',
            '实验组 (Case)': item.treatmentGroup || '',
            '比较方案名称': item.comparisonScheme || ''
        }));
        const pairwiseSheet = XLSX.utils.json_to_sheet(pairwiseExportData);
        XLSX.utils.book_append_sheet(workbook, pairwiseSheet, '两两比较');
    }

    // Sheet 3: 多组比较 (if available)
    if (multiGroupComparison && multiGroupComparison.length > 0) {
        const multiGroupExportData = multiGroupComparison.map((item, index) => ({
            '序号': index + 1,
            '差异分析比较组': (item.comparisonGroups || []).join(', '),
            '比较方案': item.comparisonName || ''
        }));
        const multiGroupSheet = XLSX.utils.json_to_sheet(multiGroupExportData);
        XLSX.utils.book_append_sheet(workbook, multiGroupSheet, '多组比较');
    }

    XLSX.writeFile(workbook, `样本数据_${new Date().toLocaleDateString()}.xlsx`);
};

/**
 * Import data from Excel file
 * Validates that required columns exist before importing
 */
export const importFromExcel = async (file: File, requiredColumns?: string[]): Promise<SampleItem[]> => {
    // Default required columns for sample list
    const defaultRequiredColumns = [
        '样本名称',
        '分析名称',
        '分组名称',
        '检测或暂存',
        '样品管数'
    ];

    const columnsToValidate = requiredColumns || defaultRequiredColumns;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const XLSX = await import('xlsx');
                const workbook = XLSX.read(e.target?.result, { type: 'binary' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];

                // Get header row to validate columns
                const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 });
                if (jsonData.length === 0) {
                    reject(new Error('Excel文件为空'));
                    return;
                }

                // First row is header
                const headerRow = jsonData[0] as string[];
                const headerSet = new Set(headerRow.map(h => String(h).trim()));

                // Check for missing required columns
                const missingColumns = columnsToValidate.filter(col => !headerSet.has(col));

                if (missingColumns.length > 0) {
                    reject(new Error(`缺少必需列: ${missingColumns.join('、')}\n\n请确保Excel文件包含以下列名称:\n${columnsToValidate.join('、')}`));
                    return;
                }

                // Parse data with validated structure
                const dataRows = XLSX.utils.sheet_to_json<any>(sheet);
                const importedData: SampleItem[] = dataRows.map(row => ({
                    sampleName: row['样本名称'] || '',
                    analysisName: row['分析名称'] || '',
                    groupName: row['分组名称'] || '',
                    detectionOrStorage: row['检测或暂存'] || '检测',
                    sampleTubeCount: parseInt(row['样品管数']) || 1,
                    experimentDescription: row['实验设计描述及样本备注'] || row['备注'] || ''
                }));

                resolve(importedData);
            } catch (err: any) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsBinaryString(file);
    });
};

