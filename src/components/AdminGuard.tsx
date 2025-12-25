'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, message } from 'antd';
import { supabase } from '@/lib/supabase';

// ⚠️ Simple Admin List (For MPV). 
// In production, use DB Roles or Row Level Security.
const ADMIN_EMAILS = [
    'admin@lims.com',
    'manager@lims.com',
    // Add your admin login email here for testing
    // e.g. '138... @client.lims' if you logged in as a specific user
];

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();

    useEffect(() => {
        checkAdmin();
    }, []);

    const checkAdmin = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.replace('/admin/login');
            return;
        }

        // 🟢 Check if user is Admin using User Metadata
        const role = session.user.user_metadata?.role;

        console.log('[AdminGuard] Access Check:', { email: session.user.email, role });

        if (role !== 'admin') {
            message.error('您不是管理员，无法访问后台');
            router.replace('/'); // Redirect to home or user login
            return;
        }

        setAuthorized(true);
        setLoading(false);
    };

    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}><Spin size="large" /></div>;
    }

    return <>{children}</>;
}
