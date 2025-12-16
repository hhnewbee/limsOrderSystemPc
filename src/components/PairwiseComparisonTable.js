'use client';

import { useCallback } from 'react';
import { Button, Select, Input, Table } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export default function PairwiseComparisonTable({ data, onChange, disabled, groupNames }) {
  // 添加行
  const handleAddRow = useCallback(() => {
    const newRow = {
      treatmentGroup: '',
      controlGroup: '',
      comparisonScheme: ''
    };
    onChange([...data, newRow]);
  }, [data, onChange]);

  // 删除行
  const handleDeleteRow = useCallback((index) => {
    const newData = data.filter((_, i) => i !== index);
    onChange(newData);
  }, [data, onChange]);

  // 更新单元格
  const handleCellChange = useCallback((index, field, value) => {
    const newData = [...data];
    newData[index] = { ...newData[index], [field]: value };
    
    // 自动生成比较组方案
    if (field === 'treatmentGroup' || field === 'controlGroup') {
      const treatment = field === 'treatmentGroup' ? value : newData[index].treatmentGroup;
      const control = field === 'controlGroup' ? value : newData[index].controlGroup;
      newData[index].comparisonScheme = treatment && control ? `${treatment} vs ${control}` : '';
    }
    
    onChange(newData);
  }, [data, onChange]);

  const groupOptions = groupNames.map(name => ({ label: name, value: name }));

  const columns = [
    {
      title: '序号',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 60,
      render: (_, __, index) => index + 1
    },
    {
      title: '处理组（分子样本）',
      dataIndex: 'treatmentGroup',
      key: 'treatmentGroup',
      width: 180,
      render: (value, _, index) => (
        <Select
          value={value}
          onChange={(val) => handleCellChange(index, 'treatmentGroup', val)}
          disabled={disabled}
          options={groupOptions}
          style={{ width: '100%' }}
          placeholder="请选择处理组"
        />
      )
    },
    {
      title: '对照组（分母样本）',
      dataIndex: 'controlGroup',
      key: 'controlGroup',
      width: 180,
      render: (value, _, index) => (
        <Select
          value={value}
          onChange={(val) => handleCellChange(index, 'controlGroup', val)}
          disabled={disabled}
          options={groupOptions}
          style={{ width: '100%' }}
          placeholder="请选择对照组"
        />
      )
    },
    {
      title: '比较组方案（处理组 vs 对照组）',
      dataIndex: 'comparisonScheme',
      key: 'comparisonScheme',
      width: 200,
      render: (value) => (
        <Input value={value} disabled className="readonly-field" />
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 60,
      render: (_, __, index) => (
        !disabled && (
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteRow(index)}
          />
        )
      )
    }
  ];

  return (
    <div className="comparison-table">
      <h3 style={{ marginBottom: 12 }}>两两比较</h3>
      
      <div className="comparison-note">
        <p>1、按"分组名称"填写。</p>
        <p>2、请仔细核对处理组、对照组，切勿颠倒。</p>
      </div>

      {!disabled && (
        <div style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddRow}
            disabled={groupNames.length === 0}
          >
            添加比较
          </Button>
          {groupNames.length === 0 && (
            <span style={{ marginLeft: 12, color: '#999' }}>
              请先在样本清单中填写分组名称
            </span>
          )}
        </div>
      )}

      <Table
        dataSource={data.map((item, index) => ({ ...item, key: index }))}
        columns={columns}
        pagination={false}
        size="small"
        locale={{ emptyText: '暂无数据' }}
      />
    </div>
  );
}

