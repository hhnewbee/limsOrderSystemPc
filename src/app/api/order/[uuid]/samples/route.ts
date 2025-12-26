import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';

/**
 * Public API to get sample data for an order
 * No authentication required - for internal staff viewing
 * Only returns sample_list and basic order info (no sensitive customer data)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ uuid: string }> }
) {
    const { uuid } = await params;

    try {
        // Try to get from database first - use related tables
        const { data: order, error } = await supabaseAdmin
            .from('orders')
            .select(`
                uuid,
                project_number,
                service_type,
                status,
                need_bioinformatics_analysis,
                created_at,
                updated_at,
                sample_list(*),
                pairwise_comparison(*),
                multi_group_comparison(*)
            `)
            .eq('uuid', uuid)
            .maybeSingle();

        if (error) {
            console.error('[Public Samples API] Database error:', error);
        }

        if (order) {
            console.log('[Public Samples API] Found in database, sample count:', order.sample_list?.length || 0);
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
        }

        // If not in database, try to get from DingTalk
        console.log('[Public Samples API] Not in database, trying DingTalk...');
        const dingTalkData = await searchFormData(uuid);
        if (!dingTalkData) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const parsedData = parseYidaFormData(dingTalkData);
        console.log('[Public Samples API] Got from DingTalk, sample count:', parsedData.sampleList?.length || 0);

        return NextResponse.json({
            uuid: uuid,
            projectNumber: parsedData.projectNumber || '',
            serviceType: parsedData.serviceType || '',
            status: 'draft',
            sampleList: parsedData.sampleList || [],
            pairwiseComparison: parsedData.pairwiseComparison || [],
            multiGroupComparison: parsedData.multiGroupComparison || [],
            needBioinformaticsAnalysis: parsedData.needBioinformaticsAnalysis || false,
            createdAt: null,
            updatedAt: null
        });

    } catch (error: any) {
        console.error('[Public Samples API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
