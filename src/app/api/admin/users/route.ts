import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// GET logic imported from previous step? No, better separate or export properly.
// Next.js App Router allows multiple methods in one file.

export async function GET(request: NextRequest) {
    try {
        const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1000 // Simple list for now
        });

        if (error) throw error;

        const userList = users.map(u => ({
            id: u.id,
            email: u.email,
            phone: u.email?.endsWith('@client.lims') ? u.email.replace('@client.lims', '') : u.phone,
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at,
            is_banned: u.banned_until ? true : false,
            role: u.user_metadata?.role || 'customer' // 🟢 Return Role
        }));

        return NextResponse.json({ users: userList });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 🟢 Create User
export async function POST(request: NextRequest) {
    try {
        const { phone, password, role = 'customer' } = await request.json(); // 🟢 Accept Role

        if (!phone || !password) {
            return NextResponse.json({ error: 'Missing phone or password' }, { status: 400 });
        }

        // Create Virtual Email
        const email = `${phone}@client.lims`;

        const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // Auto confirm
            user_metadata: { role } // 🟢 Store Role in Metadata
        });

        if (error) throw error;

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// 🟢 Update User (Reset Password / Ban)
export async function PUT(request: NextRequest) {
    try {
        const { id, password, ban } = await request.json();

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        const updates: any = {};
        if (password) updates.password = password;
        if (ban !== undefined) {
            updates.ban_duration = ban ? '876000h' : 'none'; // 100 years or none
        }

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, updates);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
