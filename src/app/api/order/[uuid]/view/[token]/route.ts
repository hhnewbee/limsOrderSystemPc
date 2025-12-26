import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * API to get sample data for an order using a view token
 * Token must match the samples_view_token in the orders table
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string; token: string }> }
) {
    const { uuid, token } = await params;

    try {
        // Validate token and get order data
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                uuid,
                project_number,
                service_type,
                status,
                need_bioinformatics_analysis,
                samples_view_token,
                created_at,
                updated_at,
                sample_list(*),
                pairwise_comparison(*),
                multi_group_comparison(*)
            `)
            .eq('uuid', uuid)
            .maybeSingle();

        if (error) {
            console.error('[Samples View API] Database error:', error);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!order) {
            return NextResponse.json({ error: '订单不存在' }, { status: 404 });
        }

        // Validate token
        if (!order.samples_view_token || order.samples_view_token !== token) {
            return NextResponse.json({ error: '链接无效或已过期' }, { status: 403 });
        }

        console.log('[Samples View API] Token validated, sample count:', order.sample_list?.length || 0);

        return NextResponse.json({
            uuid: order.uuid,
            projectNumber: order.project_number,
            serviceType: order.service_type,
            status: order.status,
            sampleList: order.sample_list || [],
            pairwiseComparison: order.pairwise_comparison || [],
            multiGroupComparison: order.multi_group_comparison || [],
            needBioinformaticsAnalysis: order.need_bioinformatics_analysis,
            createdAt: order.created_at,
            updatedAt: order.updated_at
        });

    } catch (error: any) {
        console.error('[Samples View API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
