'use client';

import { useState, useCallback, useRef, memo } from 'react';
import { Button, Input, Select, InputNumber, Upload, message } from 'antd';
import { PlusOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons';
import { FixedSizeList as List } from 'react-window';
import * as XLSX from 'xlsx';

const DETECTION_OPTIONS = [
  { label: '检测', value: '检测' },
  { label: '暂存', value: '暂存' }
];

const ROW_HEIGHT = 58;
const TABLE_HEIGHT = 400;

// 表格列配置
const getColumns = (needBioinformaticsAnalysis) => {
  const baseColumns = [
    { key: 'sequenceNo', title: '序号', width: 60, flex: false },
    { key: 'sampleName', title: '样本名称', width: 120, required: true, flex: false },
  ];

  if (needBioinformaticsAnalysis) {
    baseColumns.push(
      { key: 'analysisName', title: '分析名称', width: 120, required: true, flex: false },
      { key: 'groupName', title: '分组名称', width: 120, required: true, flex: false }
    );
  }

  baseColumns.push(
    { key: 'detectionOrStorage', title: '检测或暂存', width: 100, required: true, flex: false },
    { key: 'sampleTubeCount', title: '样品管数', width: 80, required: true, flex: false },
    { key: 'experimentDescription', title: '实验设计描述及样本备注', width: 200, flex: true },
    { key: 'actions', title: '操作', width: 60, flex: false }
  );

  return baseColumns;
};

// 带错误提示的输入框组件
const InputWithError = ({ value, onChange, disabled, error, size = "small" }) => (
  <div style={{ width: '100%' }}>
    <Input
      value={value}
      onChange={onChange}
      disabled={disabled}
      size={size}
      status={error ? 'error' : ''}
    />
    {error && <div className="cell-error-text">{error}</div>}
  </div>
);

// 将 Row 组件提取到外部，避免每次渲染时重新创建
const TableRow = memo(function TableRow({ index, style, data: itemData }) {
  const { items, errors, disabled, needBioinformaticsAnalysis, onCellChange, onDeleteRow, onCopyRow } = itemData;
  const item = items[index];
  const rowErrors = errors?.[index] || {};

  return (
    <div className="table-row" style={style}>
      <div className="table-cell" style={{ flex: '0 0 60px', width: 60 }}>
        {index + 1}
      </div>
      <div className="table-cell" style={{ flex: '0 0 120px', width: 120, alignItems: 'flex-start', paddingTop: 10 }}>
        <InputWithError
          value={item.sampleName}
          onChange={(e) => onCellChange(index, 'sampleName', e.target.value)}
          disabled={disabled}
          error={rowErrors.sampleName}
        />
      </div>
      {needBioinformaticsAnalysis && (
        <>
          <div className="table-cell" style={{ flex: '0 0 120px', width: 120, alignItems: 'flex-start', paddingTop: 10 }}>
            <InputWithError
              value={item.analysisName}
              onChange={(e) => onCellChange(index, 'analysisName', e.target.value)}
              disabled={disabled}
              error={rowErrors.analysisName}
            />
          </div>
          <div className="table-cell" style={{ flex: '0 0 120px', width: 120, alignItems: 'flex-start', paddingTop: 10 }}>
            <InputWithError
              value={item.groupName}
              onChange={(e) => onCellChange(index, 'groupName', e.target.value)}
              disabled={disabled}
              error={rowErrors.groupName}
            />
          </div>
        </>
      )}
      <div className="table-cell" style={{ flex: '0 0 100px', width: 100 }}>
        <Select
          value={item.detectionOrStorage}
          onChange={(value) => onCellChange(index, 'detectionOrStorage', value)}
          disabled={disabled}
          size="small"
          options={DETECTION_OPTIONS}
          style={{ width: '100%' }}
        />
      </div>
      <div className="table-cell" style={{ flex: '0 0 80px', width: 80 }}>
        <InputNumber
          value={item.sampleTubeCount}
          onChange={(value) => onCellChange(index, 'sampleTubeCount', value)}
          disabled={disabled}
          size="small"
          min={1}
          style={{ width: '100%' }}
        />
      </div>
      <div className="table-cell" style={{ flex: 1, minWidth: 200 }}>
        <Input
          value={item.experimentDescription}
          onChange={(e) => onCellChange(index, 'experimentDescription', e.target.value)}
          disabled={disabled}
          size="small"
        />
      </div>
      <div className="table-cell" style={{ flex: '0 0 80px', width: 80, justifyContent: 'center', gap: 4 }}>
        {!disabled && (
          <div style={{ display: 'flex', gap: 4 }}>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => onCopyRow(index)}
              size="small"
              title="复制行"
            />
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDeleteRow(index)}
              size="small"
              title="删除行"
            />
          </div>
        )}
      </div>
    </div>
  );
});

export default function SampleListTable({ data, onChange, disabled, needBioinformaticsAnalysis, errors }) {
  const [selectedRows, setSelectedRows] = useState(new Set());
  const listRef = useRef(null);

  const columns = getColumns(needBioinformaticsAnalysis);
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);

  // 添加行
  const handleAddRow = useCallback(() => {
    const newRow = {
      sampleName: '',
      analysisName: '',
      groupName: '',
      detectionOrStorage: '检测',
      sampleTubeCount: 1,
      experimentDescription: ''
    };
    onChange([...data, newRow]);
  }, [data, onChange]);

  // 复制行
  const handleCopyRow = useCallback((index) => {
    const rowToCopy = data[index];
    const newRow = { ...rowToCopy };
    const newData = [...data];
    newData.splice(index + 1, 0, newRow);
    onChange(newData);
    message.success('行已复制');
  }, [data, onChange]);

  // 删除行
  const handleDeleteRow = useCallback((index) => {
    const newData = data.filter((_, i) => i !== index);
    onChange(newData);
  }, [data, onChange]);

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    const newData = data.filter((_, index) => !selectedRows.has(index));
    onChange(newData);
    setSelectedRows(new Set());
  }, [data, selectedRows, onChange]);

  // 更新单元格
  const handleCellChange = useCallback((index, field, value) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    onChange(newData);
  }, [data, onChange]);

  // 导入Excel
  const handleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const importedData = jsonData.map(row => ({
          sampleName: row['样本名称'] || row['sampleName'] || '',
          analysisName: row['分析名称'] || row['analysisName'] || '',
          groupName: row['分组名称'] || row['groupName'] || '',
          detectionOrStorage: row['检测或暂存'] || row['detectionOrStorage'] || '检测',
          sampleTubeCount: parseInt(row['样品管数'] || row['sampleTubeCount']) || 1,
          experimentDescription: row['实验设计描述及样本备注'] || row['experimentDescription'] || ''
        }));

        onChange([...data, ...importedData]);
        message.success(`成功导入 ${importedData.length} 条数据`);
      } catch (error) {
        console.error('导入失败:', error);
        message.error('导入失败，请检查文件格式');
      }
    };
    reader.readAsBinaryString(file);
    return false;
  }, [data, onChange]);

  // 下载模板
  const handleDownloadTemplate = useCallback(() => {
    const templateData = [
      {
        '样本名称': 'Sample1',
        '分析名称': 'Ana1',
        '分组名称': 'GroupA',
        '检测或暂存': '检测',
        '样品管数': 1,
        '实验设计描述及样本备注': ''
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '样本清单');
    XLSX.writeFile(workbook, '样本清单模板.xlsx');
  }, []);

  // 导出数据
  const handleExportData = useCallback(() => {
    if (data.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

    const exportData = data.map((item, index) => {
      let row = {
        '序号': index + 1,
        '样本名称': item.sampleName || '',
        '检测或暂存': item.detectionOrStorage || '',
        '样品管数': item.sampleTubeCount || 1,
      };

      // 如果需要生信分析，添加相关字段（必须在最后）
      if (needBioinformaticsAnalysis) {
        row = {
          '序号': index + 1,
          '样本名称': item.sampleName || '',
          '分析名称': item.analysisName || '',
          '分组名称': item.sampleTubeCount || 1,
          '检测或暂存': item.detectionOrStorage || '',
          '样品管数': item.sampleTubeCount || 1,
        };
      }

      row['实验设计描述及样本备注'] = item.experimentDescription || ''


      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // 设置列宽
    const columnWidths = needBioinformaticsAnalysis
      ? [
          { wch: 8 },   // 序号
          { wch: 15 },  // 样本名称
          { wch: 12 },  // 分析名称
          { wch: 12 },  // 分组名称
          { wch: 12 },  // 检测或暂存
          { wch: 12 },  // 样品管数
          { wch: 30 },  // 实验设计描述及样本备注
        ]
      : [
          { wch: 8 },   // 序号
          { wch: 15 },  // 样本名称
          { wch: 12 },  // 检测或暂存
          { wch: 12 },  // 样品管数
          { wch: 30 }   // 实验设计描述及样本备注
        ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '样本清单');
    XLSX.writeFile(workbook, `样本清单_${new Date().getTime()}.xlsx`);
    message.success('导出成功');
  }, [data, needBioinformaticsAnalysis]);

  // 准备传递给 Row 组件的数据
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
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ marginBottom: 12 }}>样本清单</h3>
      
      {/* 填写要求说明 */}
      <div className="comparison-note" style={{ marginBottom: 16 }}>
        <p>1. "样本名称"应与送样的管子上完全一致，便于核对样本。名称须具有唯一性，不能出现中文字符、特殊字符（如￥、$、&、@、%等），字符长度在10个以内。</p>
        <p>2. "分析名称"为生信分析时样本所用名称。"分析名称"和"分组名称"请采用字母、数字和下划线 (即_) 表示(不能有空格和中横线，点号)，长度控制在8个字符以内，首字符必须为字母。</p>
      </div>

      {/* 工具栏 */}
      <div className="table-toolbar">
        <div className="table-actions">
          {!disabled && (
            <>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddRow}
              >
                添加行
              </Button>
              <Upload
                accept=".xlsx,.xls"
                showUploadList={false}
                beforeUpload={handleImport}
              >
                <Button icon={<UploadOutlined />}>导入</Button>
              </Upload>
              {selectedRows.size > 0 && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                >
                  删除选中 ({selectedRows.size})
                </Button>
              )}
            </>
          )}
          <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
            下载模板
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportData}>
            导出数据
          </Button>
        </div>
        <span>共 {data.length} 条数据</span>
      </div>

      {/* 虚拟表格 */}
      <div className="virtual-table-container">
        {/* 表头 */}
        <div className="table-header">
          {columns.map(col => (
            <div
              key={col.key}
              className="table-header-cell"
              style={{
                width: col.flex ? undefined : col.width,
                flex: col.flex ? 1 : `0 0 ${col.width}px`,
                minWidth: col.width
              }}
            >
              {col.required && <span style={{ color: '#ff4d4f' }}>*</span>}
              {col.title}
            </div>
          ))}
        </div>

        {/* 表体 - 使用虚拟滚动 */}
        {data.length > 0 ? (
          <List
            ref={listRef}
            height={Math.min(TABLE_HEIGHT, data.length * ROW_HEIGHT)}
            itemCount={data.length}
            itemSize={ROW_HEIGHT}
            width="100%"
            itemData={itemData}
          >
            {TableRow}
          </List>
        ) : (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#999',
            backgroundColor: '#fafafa',
            borderTop: '1px dashed #e8e8e8'
          }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>暂无数据</div>
            <div style={{ fontSize: 12, color: '#bbb' }}>请点击"添加行"或"导入"添加样本</div>
          </div>
        )}
      </div>
    </div>
  );
}

