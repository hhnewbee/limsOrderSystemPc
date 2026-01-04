import { NextRequest, NextResponse } from 'next/server';
import { supabase as supabaseClient } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * API for lab staff to list all samples from orders
 * Only accessible by users with 'lab' or 'admin' role
 * 
 * 🎉 使用 camelCase 列名
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Verify user and check role
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const role = user.user_metadata?.role;
        if (role !== 'lab' && role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden: Not a lab staff' }, { status: 403 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '50');
        const search = searchParams.get('search') || '';

        // Query orders with sampleList (camelCase columns)
        let query = supabaseAdmin
            .from('orders')
            .select(`
                uuid,
                "projectNumber",
                "customerName",
                "salesmanName",
                "serviceType",
                status,
                "createdAt",
                "updatedAt",
                sampleList:sample_list(*)
            `)
            .order('updatedAt', { ascending: false });

        // Apply search filter
        if (search) {
            query = query.or(`projectNumber.ilike.%${search}%,customerName.ilike.%${search}%`);
        }

        // Get total count first
        const { count } = await supabaseAdmin
            .from('orders')
            .select('uuid', { count: 'exact', head: true });

        // Apply pagination
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: orders, error } = await query;

        if (error) {
            console.error('[Lab Samples API] Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Transform orders to sample list format
        const samples: any[] = [];
        orders?.forEach((order: any) => {
            const sampleList = order.sampleList || [];
            sampleList.forEach((sample: any, index: number) => {
                samples.push({
                    id: `${order.uuid}-${index}`,
                    orderUuid: order.uuid,
                    projectNumber: order.projectNumber,
                    customerName: order.customerName,
                    salesmanName: order.salesmanName,
                    serviceType: order.serviceType,
                    orderStatus: order.status,
                    sampleName: sample.sampleName,
                    analysisName: sample.analysisName,
                    groupName: sample.groupName,
                    detectionOrStorage: sample.detectionOrStorage,
                    sampleCount: sample.sampleTubeCount,
                    remarks: sample.experimentDescription,
                    orderCreatedAt: order.createdAt,
                    orderUpdatedAt: order.updatedAt
                });
            });
        });

        return NextResponse.json({
            samples,
            pagination: {
                page,
                pageSize,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / pageSize)
            }
        });

    } catch (error: any) {
        console.error('[Lab Samples API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
