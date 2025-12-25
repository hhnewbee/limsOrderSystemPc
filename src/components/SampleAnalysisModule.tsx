'use client';

import React, { useMemo, useCallback } from 'react';
import SampleListTable, { SampleItem } from '@/components/SampleListTable';
import PairwiseComparisonTable from '@/components/PairwiseComparisonTable';
import MultiGroupComparisonTable from '@/components/MultiGroupComparisonTable';
import ModuleCard from "@/components/ModuleCard";
import { BarChartOutlined } from "@ant-design/icons";
import { OrderFormData } from '@/types/order';

interface SampleAnalysisModuleProps {
    data: OrderFormData;
    onChange: (field: keyof OrderFormData, value: any) => void;
    onBlur?: (field: keyof OrderFormData) => void;
    disabled?: boolean;
    errors?: any;
    message?: any;
}

export default function SampleAnalysisModule({ data, onChange, onBlur, disabled, errors, message }: SampleAnalysisModuleProps) {
    // 从样本清单中提取分组名称
    const groupNames = useMemo<string[]>(() => {
        if (!data.sampleList || data.sampleList.length === 0) {
            return [];
        }
        const names = new Set<string>();
        data.sampleList.forEach(sample => {
            if (sample.groupName) {
                names.add(sample.groupName);
            }
        });
        return Array.from(names);
    }, [data.sampleList]);

    const handleSampleListChange = useCallback((newList: any[]) => {
        onChange('sampleList', newList);
    }, [onChange]);

    const handlePairwiseComparisonChange = useCallback((newList: any[]) => {
        onChange('pairwiseComparison', newList);
    }, [onChange]);

    const handleMultiGroupComparisonChange = useCallback((newList: any[]) => {
        onChange('multiGroupComparison', newList);
    }, [onChange]);

    const isBio = data.needBioinformaticsAnalysis === true || (data.needBioinformaticsAnalysis as any) === 'true'; // Compatible with boolean or string logic

    return (
        <ModuleCard title="样品分析" icon={<BarChartOutlined />}>

            {/* 样本清单 */}
            <SampleListTable
                data={(data.sampleList as SampleItem[]) || []}
                onChange={handleSampleListChange}
                onBlur={onBlur as any}
                disabled={disabled}
                needBioinformaticsAnalysis={data.needBioinformaticsAnalysis}
                errors={errors?.sampleList}
                message={message}
                pairwiseComparison={data.pairwiseComparison}
                multiGroupComparison={data.multiGroupComparison}
            />

            {/* 两两比较 - 仅在需要生信分析时显示 */}
            {isBio && (
                <PairwiseComparisonTable
                    data={data.pairwiseComparison || []}
                    onChange={handlePairwiseComparisonChange}
                    disabled={disabled}
                    groupNames={groupNames}
                />
            )}

            {/* 多组比较 - 仅在需要生信分析时显示 */}
            {isBio && (
                <MultiGroupComparisonTable
                    data={data.multiGroupComparison || []}
                    onChange={handleMultiGroupComparisonChange}
                    disabled={disabled}
                    groupNames={groupNames}
                />
            )}
        </ModuleCard>
    );
}
