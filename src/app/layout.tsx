'use client';
import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="zh-CN">
            <body>
                <ConfigProvider locale={zhCN}>
                    <App>
                        {children}
                    </App>
                </ConfigProvider>
            </body>
        </html>
    );
}
