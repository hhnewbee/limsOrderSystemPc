'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 首页重定向到示例订单页面
    // 实际使用时，用户会通过带有uuid的链接访问
  }, []);

  return (
    <div className="page-container">
      <div className="module-card">
        <h1 style={{ textAlign: 'center', marginBottom: 24 }}>LIMS客户端下单系统</h1>
        <p style={{ textAlign: 'center', color: '#666' }}>
          请通过销售人员发送的链接访问下单页面
        </p>
      </div>
    </div>
  );
}

