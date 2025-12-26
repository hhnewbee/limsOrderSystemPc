import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
    try {
        const { phone, password, name } = await request.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Missing phone or password' }, { status: 400 });
        }

        // Validate phone format
        if (!/^1[3-9]\d{9}$/.test(phone)) {
            return NextResponse.json({ error: 'Invalid phone format' }, { status: 400 });
        }

        // Create Virtual Email
        const email = `${phone}@client.lims`;

        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const exists = existingUsers?.users.some((u: any) => u.email === email);

        if (exists) {
            return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
        }

        // Create user with admin client (bypasses email validation)
        const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                role: 'customer',
                phone: phone,
                name: name || ''
            }
        });

        if (error) throw error;

        return NextResponse.json({ success: true, userId: user.user.id });
    } catch (error: any) {
        console.error('[Register API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
