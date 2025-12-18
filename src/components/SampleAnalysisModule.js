'use client';

import { useMemo } from 'react';
import SampleListTable from '@/components/SampleListTable';
import PairwiseComparisonTable from '@/components/PairwiseComparisonTable';
import MultiGroupComparisonTable from '@/components/MultiGroupComparisonTable';

export default function SampleAnalysisModule({ data, onChange, disabled, errors }) {
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
    onChange('sampleList', newList);
  };

  const handlePairwiseComparisonChange = (newList) => {
    onChange('pairwiseComparison', newList);
  };

  const handleMultiGroupComparisonChange = (newList) => {
    onChange('multiGroupComparison', newList);
  };

  return (
    <div className="module-card">
      <h2 className="module-title">样品分析</h2>

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
    </div>
  );
}

