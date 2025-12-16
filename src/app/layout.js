'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider locale={zhCN}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}

