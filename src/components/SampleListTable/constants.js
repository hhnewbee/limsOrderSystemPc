// src/components/SampleListTable/constants.js

export const DETECTION_OPTIONS = [
    { label: '检测', value: '检测' },
    { label: '暂存', value: '暂存' }
];

// 行高定义
export const ROW_HEIGHT_NORMAL = 60;
export const ROW_HEIGHT_ERROR = 90;
export const TABLE_HEIGHT = 3400;

// 表格列配置
export const getColumns = (needBioinformaticsAnalysis) => {
    const baseColumns = [
        { key: 'selection', title: '', width: 50, flex: false },
        { key: 'sequenceNo', title: '序号', width: 70, flex: false },
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
        { key: 'experimentDescription', title: '实验设计描述及样本备注', width: 250, flex: true },
        { key: 'actions', title: '操作', width: 100, flex: false },
    );

    return baseColumns;
};