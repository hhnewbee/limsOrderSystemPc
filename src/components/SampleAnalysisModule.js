'use client';

import { useMemo } from 'react';
import SampleListTable from '@/components/SampleListTable';
import PairwiseComparisonTable from '@/components/PairwiseComparisonTable';
import MultiGroupComparisonTable from '@/components/MultiGroupComparisonTable';
import ModuleCard from "@/components/ModuleCard";
import {BarChartOutlined} from "@ant-design/icons";

export default function SampleAnalysisModule({ data, onBlur, disabled, errors }) {
  // 从样本清单中提取分组名称
  const groupNames = useMemo(() => {
    if (!data.sampleList || data.sampleList.length === 0) {
      return [];
    }
    const names = new Set();
    data.sampleList.forEach(sample => {
      if (sample.groupName) {
        names.add(sample.groupName);
      }
    });
    return Array.from(names);
  }, [data.sampleList]);

  const handleSampleListChange = (newList) => {
    onBlur('sampleList', newList);
  };

  const handlePairwiseComparisonChange = (newList) => {
    onBlur('pairwiseComparison', newList);
  };

  const handleMultiGroupComparisonChange = (newList) => {
    onBlur('multiGroupComparison', newList);
  };

  return (
    <ModuleCard title="样品分析" icon={<BarChartOutlined />}>

      {/* 样本清单 */}
      <SampleListTable
        data={data.sampleList || []}
        onChange={handleSampleListChange}
        disabled={disabled}
        needBioinformaticsAnalysis={data.needBioinformaticsAnalysis}
        errors={errors?.sampleList}
      />

      {/* 两两比较 - 仅在需要生信分析时显示 */}
      {data.needBioinformaticsAnalysis && (
        <PairwiseComparisonTable
          data={data.pairwiseComparison || []}
          onChange={handlePairwiseComparisonChange}
          disabled={disabled}
          groupNames={groupNames}
        />
      )}

      {/* 多组比较 - 仅在需要生信分析时显示 */}
      {data.needBioinformaticsAnalysis && (
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

