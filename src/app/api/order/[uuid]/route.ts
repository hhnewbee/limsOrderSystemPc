// src/app/api/order/[uuid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchFormData, parseYidaFormData } from '@/lib/dingtalk';
import type { DBOrder, DBSample, DBPairwise, DBMultiGroup } from '@/types/order';
// 🟢 引入转换器
import { dbToApp, appToDb } from '@/lib/converters';

interface RouteParams {
  params: Promise<{ uuid: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { uuid } = await params;
  console.log(`[API] 获取订单: ${uuid}`);

  try {
    // 1. 从 Supabase 获取数据 (SnakeCase)
    let { data: rawOrder } = await supabase
        .from('orders')
        .select(`
        *,
        sample_list(*),
        pairwise_comparison(*),
        multi_group_comparison(*)
      `)
        .eq('uuid', uuid)
        .maybeSingle();

    // 类型断言
    const order = rawOrder as (DBOrder & {
      sample_list: DBSample[];
      pairwise_comparison: DBPairwise[];
      multi_group_comparison: DBMultiGroup[];
    }) | null;

    // 2. 检查有效性
    const hasValidData = order && order.customer_name;

    if (!order || !hasValidData) {
      console.log('[API] 本地无数据，尝试从钉钉获取...');

      if (order && !hasValidData) {
        await supabase.from('orders').delete().eq('uuid', uuid);
      }

      // 钉钉回退逻辑
      const yidaData = await searchFormData(uuid);
      // parseYidaFormData 内部现在也应该使用 converter (见下文 dingtalk.ts 重构)
      const parsedData = parseYidaFormData(yidaData);

      if (!parsedData) {
        return NextResponse.json({ error: '订单不存在' }, { status: 404 });
      }

      // 🟢 使用转换器构建 DB 数据 (App -> DB)
      // 注意：这里我们需要手动补充一些初始状态
      const insertPayload = appToDb({
        ...parsedData,
        uuid: uuid, // 确保 UUID 存在
        status: 'draft',
      });

      const { data: newOrder, error: insertError } = await supabase
          .from('orders')
          .insert(insertPayload)
          .select()
          .single();

      if (insertError) {
        throw new Error(`初始化订单失败: ${insertError.message}`);
      }

      // 重新构造 rawOrder 结构
      rawOrder = {
        ...newOrder,
        sample_list: [],
        pairwise_comparison: [],
        multi_group_comparison: []
      };
    }

    // 再次断言
    const finalOrder = rawOrder as (DBOrder & {
      sample_list: DBSample[];
      pairwise_comparison: DBPairwise[];
      multi_group_comparison: DBMultiGroup[];
    });

    // 🟢 3. 使用转换器返回前端 (DB -> App)
    // 所有的字段映射逻辑都在 converters.ts 中，这里非常干净
    const formattedData = dbToApp(finalOrder);

    return NextResponse.json(formattedData);

  } catch (error: any) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}