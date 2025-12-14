/**
 * EODHD API Client - STUB FILE
 * This file is a placeholder to fix build errors.
 * The actual EODHD functionality has been replaced with Finviz Elite + Marketstack.
 */

export interface EODHDNewsItem {
  title: string;
  content: string;
  date: string;
  link: string;
  symbols: string[];
  tags: string[];
  sentiment: any;
}

export class EODHDClient {
  async getStockNews(symbol: string, limit: number = 10): Promise<EODHDNewsItem[]> {
    console.warn('⚠️ EODHD is deprecated - use Finviz Elite or Marketstack instead');
    return [];
  }
}

export const eodhd = new EODHDClient();

// Helper functions for news components
export function categorizeNewsByTags(news: EODHDNewsItem[]): Record<string, EODHDNewsItem[]> {
  return {};
}

export function getNewsFreshness(date: string): string {
  return 'recent';
}

export function getSentimentLabel(sentiment: any): string {
  return 'neutral';
}

export function getSentimentColor(sentiment: any): string {
  return 'gray';
}

export function summarizeNewsImpact(news: EODHDNewsItem[]): string {
  return 'No news impact data available';
}
