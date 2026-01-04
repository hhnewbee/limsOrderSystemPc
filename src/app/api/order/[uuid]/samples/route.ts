import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';

/**
 * Public API to get sample data for an order
 * No authentication required - for internal staff viewing
 * Only returns sampleList and basic order info (no sensitive customer data)
 * 
 * 🎉 使用 camelCase 列名
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string }> }
) {
    const { uuid } = await params;

    try {
        // Try to get from database first - use related tables (camelCase)
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                uuid,
                "projectNumber",
                "serviceType",
                status,
                "needBioinformaticsAnalysis",
                "createdAt",
                "updatedAt",
                sampleList:sample_list(*),
                pairwiseComparison:pairwise_comparison(*),
                multiGroupComparison:multi_group_comparison(*)
            `)
            .eq('uuid', uuid)
            .maybeSingle();

        if (error) {
            console.error('[Public Samples API] Database error:', error);
        }

        if (order) {
            console.log('[Public Samples API] Found in database, sample count:', order.sampleList?.length || 0);
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
        }

        // If not in database, try to get from DingTalk
        console.log('[Public Samples API] Not in database, trying DingTalk...');
        const dingTalkData = await searchFormData(uuid);
        if (!dingTalkData) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const parsedData = parseYidaFormData(dingTalkData);
        console.log('[Public Samples API] Got from DingTalk, sample count:', parsedData?.sampleList?.length || 0);

        return NextResponse.json({
            uuid: uuid,
            projectNumber: parsedData?.projectNumber || '',
            serviceType: parsedData?.serviceType || '',
            status: 'draft',
            sampleList: parsedData?.sampleList || [],
            pairwiseComparison: parsedData?.pairwiseComparison || [],
            multiGroupComparison: parsedData?.multiGroupComparison || [],
            needBioinformaticsAnalysis: parsedData?.needBioinformaticsAnalysis || false,
            createdAt: null,
            updatedAt: null
        });

    } catch (error: any) {
        console.error('[Public Samples API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
