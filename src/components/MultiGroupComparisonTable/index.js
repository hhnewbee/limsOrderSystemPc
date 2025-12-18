'use client';

import { useCallback } from 'react';
import { Button, Input, Select } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import styles from './MultiGroupComparisonTable.module.scss';

export default function MultiGroupComparisonTable({ data = [], onChange, disabled, groupNames = [] }) {

    const handleAddRow = useCallback(() => {
        onChange([...data, { comparisonName: '', groups: [] }]);
    }, [data, onChange]);

    const handleDeleteRow = useCallback((index) => {
        onChange(data.filter((_, i) => i !== index));
    }, [data, onChange]);

    const handleCellChange = useCallback((index, field, value) => {
        const newData = [...data];
        newData[index] = { ...newData[index], [field]: value };
        onChange(newData);
    }, [data, onChange]);

    const groupOptions = groupNames.map(name => ({ label: name, value: name }));

    return (
        <div className={styles.container}>
            <div className={styles.headerTitle}>
                <h3>多组比较 / 韦恩图分析</h3>
                {!disabled && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAddRow}
                        style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }} // 使用橙色按钮
                    >
                        添加多组方案
                    </Button>
                )}
            </div>

            {/* 填写说明提示 */}
            <div className={styles.instructionNote}>
                <p>1. <b>适用场景</b>：用于韦恩图分析、多组间共有/特有差异基因寻找、或时间序列趋势分析。</p>
                <p>2. <b>组别选择</b>：请在右侧下拉框中选择 <b>2个或以上</b> 的组别。</p>
            </div>

            <div className={styles.tableHeader}>
                <div className={styles.headerCell} style={{ flex: '0 0 60px' }}>序号</div>
                <div className={styles.headerCell} style={{ flex: 1 }}>分析名称 <span style={{color:'#ff4d4f', marginLeft:4}}>*</span></div>
                <div className={styles.headerCell} style={{ flex: 2 }}>参与比较的组别 (多选) <span style={{color:'#ff4d4f', marginLeft:4}}>*</span></div>
                <div className={styles.headerCell} style={{ flex: '0 0 80px' }}>操作</div>
            </div>

            {data.length > 0 ? (
                data.map((item, index) => (
                    <div key={index} className={styles.row}>
                        <div className={styles.cell} style={{ flex: '0 0 60px', paddingTop: 8, color: '#888', justifyContent: 'center' }}>
                            {index + 1}
                        </div>

                        <div className={styles.cell} style={{ flex: 1 }}>
                            <Input
                                placeholder="例如: Venn_A_B_C"
                                value={item.comparisonName}
                                onChange={(e) => handleCellChange(index, 'comparisonName', e.target.value)}
                                disabled={disabled}
                            />
                        </div>

                        <div className={styles.cell} style={{ flex: 2 }}>
                            <Select
                                mode="multiple"
                                placeholder="请选择至少两个组别"
                                value={item.groups}
                                onChange={(val) => handleCellChange(index, 'groups', val)}
                                options={groupOptions}
                                disabled={disabled}
                                style={{ width: '100%' }}
                                maxTagCount="responsive"
                                allowClear
                            />
                        </div>

                        <div className={styles.cell} style={{ flex: '0 0 80px', justifyContent: 'center' }}>
                            {!disabled && (
                                <Button
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => handleDeleteRow(index)}
                                    title="删除此行"
                                />
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <div className={styles.empty}>暂无数据，请点击右上角“添加多组方案”</div>
            )}
        </div>
    );
}