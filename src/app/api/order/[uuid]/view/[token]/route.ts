import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * API to get sample data for an order using a view token
 * Token must match the samplesViewToken in the orders table
 * 
 * 🎉 使用 camelCase 列名
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string; token: string }> }
) {
    const { uuid, token } = await params;

    try {
        // Validate token and get order data (camelCase columns)
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                uuid,
                "projectNumber",
                "serviceType",
                status,
                "needBioinformaticsAnalysis",
                "samplesViewToken",
                "createdAt",
                "updatedAt",
                sampleList:sample_list(*),
                pairwiseComparison:pairwise_comparison(*),
                multiGroupComparison:multi_group_comparison(*)
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
        if (!order.samplesViewToken || order.samplesViewToken !== token) {
            return NextResponse.json({ error: '链接无效或已过期' }, { status: 403 });
        }

        console.log('[Samples View API] Token validated, sample count:', order.sampleList?.length || 0);

        return NextResponse.json({
            uuid: order.uuid,
            projectNumber: order.projectNumber,
            serviceType: order.serviceType,
            status: order.status,
            sampleList: order.sampleList || [],
            pairwiseComparison: order.pairwiseComparison || [],
            multiGroupComparison: order.multiGroupComparison || [],
            needBioinformaticsAnalysis: order.needBioinformaticsAnalysis,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt
        });

    } catch (error: any) {
        console.error('[Samples View API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
