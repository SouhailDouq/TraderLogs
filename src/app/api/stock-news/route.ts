import { NextRequest, NextResponse } from 'next/server';
import { eodhd } from '@/utils/eodhd';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const tags = searchParams.get('tags');
    const limit = parseInt(searchParams.get('limit') || '10');
    const context = searchParams.get('context') === 'true';

    if (!symbol && !tags) {
      return NextResponse.json({ error: 'Symbol or tags parameter required' }, { status: 400 });
    }

    let result;

    if (context && symbol) {
      // Get comprehensive stock context
      result = await eodhd.getStockContext(symbol);
    } else if (symbol) {
      // Get news for specific symbol
      const news = await eodhd.getStockNews(symbol, limit);
      result = { news };
    } else if (tags) {
      // Get news by tags
      const tagArray = tags.split(',').map(t => t.trim());
      const news = await eodhd.getNewsByTags(tagArray, limit);
      result = { news };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Stock news API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock news' },
      { status: 500 }
    );
  }
}
