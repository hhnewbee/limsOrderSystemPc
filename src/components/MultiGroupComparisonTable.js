'use client';

import { useCallback } from 'react';
import { Button, Select, Table, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

export default function MultiGroupComparisonTable({ data, onChange, disabled, groupNames }) {
  // 添加行
  const handleAddRow = useCallback(() => {
    const newRow = {
      comparisonGroups: []
    };
    onChange([...data, newRow]);
  }, [data, onChange]);

  // 删除行
  const handleDeleteRow = useCallback((index) => {
    const newData = data.filter((_, i) => i !== index);
    onChange(newData);
  }, [data, onChange]);

  // 更新比较组
  const handleGroupsChange = useCallback((index, groups) => {
    const newData = [...data];
    newData[index] = { ...newData[index], comparisonGroups: groups };
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
      title: '差异分析比较组',
      dataIndex: 'comparisonGroups',
      key: 'comparisonGroups',
      render: (value, _, index) => (
        <Select
          mode="multiple"
          value={value || []}
          onChange={(val) => handleGroupsChange(index, val)}
          disabled={disabled}
          options={groupOptions}
          style={{ width: '100%' }}
          placeholder="请选择比较组（可多选）"
        />
      )
    },
    {
      title: '比较方案',
      dataIndex: 'comparisonScheme',
      key: 'comparisonScheme',
      width: 200,
      render: (_, record) => {
        const groups = record.comparisonGroups || [];
        if (groups.length < 2) return '-';
        return groups.join(' vs ');
      }
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
      <h3 style={{ marginBottom: 12 }}>多组比较</h3>
      
      <div className="comparison-note">
        <p>1、按"分组名称"填写。</p>
        <p>2、多组比较的顺序建议按时间或疾病等级依次排序。</p>
      </div>

      {!disabled && (
        <div style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAddRow}
            disabled={groupNames.length === 0}
          >
            添加多组比较
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

