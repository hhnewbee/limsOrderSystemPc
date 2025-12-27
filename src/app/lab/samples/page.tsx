'use client';

import React from 'react';
import { Result, Button } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

export default function LabSamplesPage() {
    const router = useRouter();

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: '100vh', background: '#f0f2f5'
        }}>
            <Result
                icon={<ExperimentOutlined style={{ color: '#1890ff' }} />}
                title="实验室端暂时关闭"
                subTitle="此功能正在维护或开发中，暂时停止服务。"
                extra={
                    <Button type="primary" onClick={() => router.push('/')}>
                        返回首页
                    </Button>
                }
            />
        </div>
    );
}
