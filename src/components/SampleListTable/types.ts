'use client';

// Type definitions for SampleListTable

export interface SampleItem {
    sampleName?: string;
    analysisName?: string;
    groupName?: string;
    detectionOrStorage?: string;
    sampleTubeCount?: number;
    experimentDescription?: string;
    [key: string]: any;
}

export interface SampleListTableProps {
    data: SampleItem[];
    onChange: (newData: SampleItem[]) => void;
    onBlur?: (field: string) => void;
    disabled?: boolean;
    needBioinformaticsAnalysis?: boolean | string;
    errors?: any;
    message?: any;
    // For export functionality
    pairwiseComparison?: any[];
    multiGroupComparison?: any[];
}
