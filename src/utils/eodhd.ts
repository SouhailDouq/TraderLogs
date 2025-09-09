// EODHD API utilities for real-time and historical stock data
// Documentation: https://eodhd.com/financial-apis/

import { getWebSocketManager, type WebSocketMessage } from './websocket';

// Helper function to safely convert API values to numbers
function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (value === 'NA' || value === 'N/A' || value === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export interface EODHDQuote {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  change_p: number;
}

export interface EODHDRealTimeData {
  code: string;
  timestamp: number;
  gmtoffset: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  previousClose: number;
  change: number;
  change_p: number;
}

export interface EODHDTechnicals {
  SMA_20?: number;
  SMA_50?: number;
  SMA_200?: number;
  EMA_20?: number;
  RSI_14?: number;
  MACD?: number;
  MACD_Signal?: number;
  MACD_Histogram?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
  high_52weeks?: number;
}

export interface EODHDFundamentals {
  MarketCapitalization?: number;
  SharesOutstanding?: number;
  DividendYield?: number;
  PERatio?: number;
  Beta?: number;
  '52WeekHigh'?: number;
  '52WeekLow'?: number;
}

export interface EODHDNewsItem {
  date: string;
  title: string;
  content: string;
  link: string;
  symbols: string[];
  tags: string[];
  sentiment: {
    polarity: number; // -1 to 1 (negative to positive)
    neg: number;      // 0 to 1 (negative sentiment strength)
    neu: number;      // 0 to 1 (neutral sentiment strength)
    pos: number;      // 0 to 1 (positive sentiment strength)
  };
}

export interface EODHDCalendarEvent {
  date: string;
  country: string;
  event: string;
  actual?: string;
  previous?: string;
  estimate?: string;
  change?: number;
  change_percentage?: number;
  updated_at: string;
}

export interface EODHDEarningsEvent {
  code: string;
  report_date: string;
  date: string;
  before_after_market: string;
  currency: string;
  actual_eps?: number;
  estimate_eps?: number;
  difference?: number;
  surprise_pct?: number;
}

class EODHDClient {
  private apiKey: string;
  private baseUrl = 'https://eodhd.com/api';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.apiKey) {
      throw new Error('EODHD API key is required');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.append('api_token', this.apiKey);
    url.searchParams.append('fmt', 'json');
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    // Add small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Only log URLs for debugging when needed
    // console.log('EODHD API Request URL:', url.toString());
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EODHD API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Get live (delayed) quote for a single symbol - includes premarket/extended hours
  async getRealTimeQuote(symbol: string): Promise<EODHDRealTimeData> {
    // Use WebSocket for truly live data during market hours
    if (this.isLiveDataFresh()) {
      try {
        const wsManager = getWebSocketManager();
        await wsManager.connect();
        
        const wsData = await wsManager.getLiveQuote(symbol, 5000);
        const convertedData = this.convertWebSocketToRealTimeData(wsData);
        
        console.log(`WebSocket live data for ${symbol}: ${new Date().toISOString()} (real-time)`);
        return convertedData;
      } catch (error) {
        console.log(`WebSocket failed for ${symbol}, falling back to REST API:`, error);
      }
    }
    
    // Fallback to REST API
    const data = await this.makeRequest(`/real-time/${symbol}.US`);
    
    // Log timestamp for debugging data freshness
    if (data?.timestamp) {
      const dataTime = new Date(data.timestamp * 1000);
      const now = new Date();
      const ageMinutes = Math.round((now.getTime() - dataTime.getTime()) / (1000 * 60));
      console.log(`REST API data for ${symbol}: ${dataTime.toISOString()} (${ageMinutes} min old)`);
    }
    
    return data;
  }

  // Get live (delayed) quotes for multiple symbols - includes premarket/extended hours
  async getRealTimeQuotes(symbols: string[]): Promise<EODHDRealTimeData[]> {
    if (symbols.length === 0) return [];
    
    // Use REST API exclusively (WebSocket has too many API limits)
    
    // Use REST API for reliable data
    // For EODHD real-time API, we need to use the correct format:
    // /real-time/SYMBOL.US?s=OTHER1.US,OTHER2.US for multiple symbols
    // Remove any existing .US suffix to avoid double suffixes
    const cleanSymbols = symbols.map(s => s.replace('.US', ''));
    const firstSymbol = `${cleanSymbols[0]}.US`;
    const additionalSymbols = cleanSymbols.slice(1).map(s => `${s}.US`).join(',');
    
    const params: any = {};
    if (additionalSymbols) {
      params.s = additionalSymbols;
    }
    
    const result = await this.makeRequest(`/real-time/${firstSymbol}`, params);
    
    // Handle both single object and array responses
    let dataArray: EODHDRealTimeData[] = [];
    if (Array.isArray(result)) {
      dataArray = result;
    } else if (result && typeof result === 'object') {
      dataArray = [result];
    }
    
    // Log successful data retrieval - convert string values to numbers
    const processedData = dataArray.map(d => ({
      ...d,
      open: toNumber(d.open),
      high: toNumber(d.high),
      low: toNumber(d.low),
      close: toNumber(d.close),
      volume: toNumber(d.volume),
      previousClose: toNumber(d.previousClose),
      change: toNumber(d.change),
      change_p: toNumber(d.change_p)
    }));
    
    const validData = processedData.filter(d => d.close > 0 && !isNaN(d.close));
    console.log(`📊 Retrieved ${validData.length}/${processedData.length} valid stock quotes from REST API`);
    
    return processedData;
  }

  // Convert WebSocket message to EODHDRealTimeData format
  private convertWebSocketToRealTimeData(wsData: WebSocketMessage): EODHDRealTimeData {
    return {
      code: `${wsData.s}.US`,
      timestamp: wsData.t / 1000, // Convert milliseconds to seconds
      gmtoffset: 0,
      open: toNumber(wsData.p), // WebSocket only provides last price
      high: toNumber(wsData.p),
      low: toNumber(wsData.p),
      close: toNumber(wsData.p),
      volume: toNumber(wsData.v) || 0,
      previousClose: toNumber(wsData.p), // Approximation
      change: 0, // Would need previous close to calculate
      change_p: 0 // Would need previous close to calculate
    };
  }

  // Get technical indicators
  async getTechnicals(symbol: string, period = 'd', order = 'd'): Promise<EODHDTechnicals[]> {
    try {
      // Try simpler function parameter format
      return await this.makeRequest(`/technical/${symbol}.US`, {
        period,
        order,
        function: 'sma'
      });
    } catch (error) {
      // Technical indicators might not be available for all symbols
      // or might require a higher tier API plan - fail silently
      return [];
    }
  }

  // Get fundamental data
  async getFundamentals(symbol: string): Promise<{ General?: any, Highlights?: EODHDFundamentals, Technicals?: EODHDTechnicals }> {
    return this.makeRequest(`/fundamentals/${symbol}.US`);
  }

  // Get historical data
  async getHistoricalData(symbol: string, from?: string, to?: string, period = 'd') {
    const params: any = { period };
    if (from) params.from = from;
    if (to) params.to = to;
    
    return this.makeRequest(`/eod/${symbol}.US`, params);
  }

  // Get premarket/after-hours data with market hours detection
  async getExtendedHoursData(symbol: string): Promise<{
    data: EODHDRealTimeData;
    marketStatus: 'premarket' | 'regular' | 'afterhours' | 'closed';
    isExtendedHours: boolean;
  }> {
    const data = await this.getRealTimeQuote(symbol);
    const marketStatus = this.getMarketHoursStatus();
    
    return {
      data,
      marketStatus,
      isExtendedHours: marketStatus === 'premarket' || marketStatus === 'afterhours'
    };
  }

  // Determine current market hours status
  getMarketHoursStatus(): 'premarket' | 'regular' | 'afterhours' | 'closed' {
    const now = new Date();
    // Use Intl.DateTimeFormat for more reliable timezone conversion
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const timeInMinutes = etTime.getHours() * 60 + etTime.getMinutes();
    
    console.log(`Current ET time: ${etTime.toLocaleString()}, minutes: ${timeInMinutes}`);
    
    // Skip weekends
    const dayOfWeek = etTime.getDay(); // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      console.log(`Weekend detected (day ${dayOfWeek}), market closed`);
      return 'closed';
    }
    
    // Premarket: 4:00 AM - 9:30 AM ET
    if (timeInMinutes >= 240 && timeInMinutes < 570) {
      console.log('Market status: premarket');
      return 'premarket';
    }
    
    // Regular hours: 9:30 AM - 4:00 PM ET
    if (timeInMinutes >= 570 && timeInMinutes < 960) {
      console.log('Market status: regular hours');
      return 'regular';
    }
    
    // After hours: 4:00 PM - 8:00 PM ET
    if (timeInMinutes >= 960 && timeInMinutes < 1200) {
      console.log('Market status: afterhours');
      return 'afterhours';
    }
    
    // Closed
    console.log('Market status: closed');
    return 'closed';
  }

  // Check if live data is expected to be fresh
  isLiveDataFresh(): boolean {
    const status = this.getMarketHoursStatus();
    return ['premarket', 'regular', 'afterhours'].includes(status);
  }

  // Get next market open time
  getNextMarketOpen(): Date {
    const now = new Date();
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const nextOpen = new Date(etTime);
    
    // If it's weekend, go to Monday
    const dayOfWeek = etTime.getDay();
    if (dayOfWeek === 0) { // Sunday
      nextOpen.setDate(nextOpen.getDate() + 1);
    } else if (dayOfWeek === 6) { // Saturday
      nextOpen.setDate(nextOpen.getDate() + 2);
    } else if (this.getMarketHoursStatus() !== 'closed') {
      // Market is open, return current time
      return etTime;
    } else {
      // Weekday but after hours, go to next day
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
    
    // Set to 4:00 AM ET (premarket open)
    nextOpen.setHours(4, 0, 0, 0);
    return nextOpen;
  }

  // Get live premarket movers using fresh market-wide discovery
  async getPremarketMovers(params: {
    minVolume?: number;
    maxPrice?: number;
    minChange?: number;
    maxChange?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
  } = {}): Promise<EODHDRealTimeData[]> {
    try {
      console.log('🔍 Fresh market discovery: Scanning entire market for today\'s momentum opportunities');
      
      // Use multiple screener approaches to find fresh daily movers
      const screenerQueries = [
        // Query 1: Volume leaders with movement
        {
          filters: [
            ['exchange', '=', 'US'],
            ['avgvol_1d', '>', params.minVolume || 500000],
            ['adjusted_close', '<', params.maxPrice || 20],
            ['adjusted_close', '>', 1], // Avoid penny stocks
            ['market_capitalization', '>', params.minMarketCap || 50000000]
          ],
          sort: 'avgvol_1d.desc',
          limit: 30
        },
        // Query 2: Percentage gainers
        {
          filters: [
            ['exchange', '=', 'US'],
            ['refund_1d_p', '>', 2], // At least 2% movement
            ['adjusted_close', '<', params.maxPrice || 20],
            ['avgvol_1d', '>', 200000]
          ],
          sort: 'refund_1d_p.desc',
          limit: 30
        },
        // Query 3: Percentage losers (for contrarian plays)
        {
          filters: [
            ['exchange', '=', 'US'],
            ['refund_1d_p', '<', -2], // At least -2% movement
            ['adjusted_close', '<', params.maxPrice || 20],
            ['avgvol_1d', '>', 200000]
          ],
          sort: 'refund_1d_p.asc',
          limit: 20
        }
      ];
      
      const allCandidates = new Set<string>();
      
      // Execute multiple screener queries to get diverse fresh candidates
      for (const [index, query] of screenerQueries.entries()) {
        try {
          console.log(`Running screener query ${index + 1}/3...`);
          
          const screenerData = await this.makeRequest('/screener', {
            filters: JSON.stringify(query.filters),
            sort: query.sort,
            limit: query.limit
          });
          
          if (screenerData?.data && Array.isArray(screenerData.data)) {
            screenerData.data.forEach((item: any) => {
              if (item.code) {
                allCandidates.add(`${item.code}.US`);
              }
            });
          }
          
          // Brief delay between queries
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`Error in screener query ${index + 1}:`, error);
        }
      }
      
      const symbols = Array.from(allCandidates);
      console.log(`📊 Found ${symbols.length} unique candidates from fresh market screening`);
      
      if (symbols.length === 0) {
        console.log('No fresh candidates found from screener');
        return [];
      }
      
      // Get live quotes for discovered candidates
      const liveData: EODHDRealTimeData[] = [];
      const batchSize = 10;
      
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        
        try {
          const batchData = await this.getRealTimeQuotes(batch);
          if (Array.isArray(batchData)) {
            // Apply quality filters to fresh data
            const qualified = batchData.filter(stock => {
              const price = stock.close;
              const volume = stock.volume;
              const changePercent = Math.abs(stock.change_p);
              
              return price >= 1 && // Minimum $1
                     price <= (params.maxPrice || 25) &&
                     volume >= (params.minVolume || 200000) &&
                     changePercent >= 0.5; // At least 0.5% movement for more candidates
            });
            
            liveData.push(...qualified);
          }
          
          // Rate limiting delay
          if (i + batchSize < symbols.length) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`Error fetching live data for batch:`, error);
        }
      }
      
      // Sort by absolute change percentage to prioritize most active
      liveData.sort((a, b) => Math.abs(b.change_p || 0) - Math.abs(a.change_p || 0));
      
      // Return top candidates for further analysis
      const topCandidates = liveData.slice(0, 20);
      
      console.log(`🎯 Fresh discovery complete: ${topCandidates.length} live candidates`);
      if (topCandidates.length > 0) {
        console.log('Today\'s top movers:', topCandidates.slice(0, 5).map(s => 
          `${s.code.replace('.US', '')}: ${s.change_p?.toFixed(2)}%`
        ).join(', '));
      }
      
      return topCandidates;
      
    } catch (error) {
      console.error('Error in fresh market discovery:', error);
      return [];
    }
  }
  
  // Legacy method for backward compatibility
  async searchStocks(params: {
    minVolume?: number;
    maxPrice?: number;
    minChange?: number;
    maxChange?: number;
    minMarketCap?: number;
    maxMarketCap?: number;
  } = {}): Promise<EODHDRealTimeData[]> {
    return this.getPremarketMovers(params);
  }

  // Get financial news for a specific stock
  async getStockNews(symbol: string, limit = 10, offset = 0): Promise<EODHDNewsItem[]> {
    try {
      const data = await this.makeRequest('/news', {
        s: `${symbol}.US`,
        limit,
        offset
      });
      
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.warn(`Failed to get news for ${symbol}:`, error);
      return [];
    }
  }

  // Get news by tags (e.g., earnings, FDA approvals, etc.)
  async getNewsByTags(tags: string[], limit = 20, offset = 0): Promise<EODHDNewsItem[]> {
    try {
      const tagString = tags.join(',');
      const data = await this.makeRequest('/news', {
        t: tagString,
        limit,
        offset
      });
      
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.warn(`Failed to get news for tags ${tags.join(',')}:`, error);
      return [];
    }
  }

  // Get upcoming earnings
  async getUpcomingEarnings(from?: string, to?: string): Promise<EODHDEarningsEvent[]> {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      
      const data = await this.makeRequest('/calendar/earnings', params);
      
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.warn('Failed to get earnings calendar:', error);
      return [];
    }
  }

  // Get economic calendar events
  async getEconomicCalendar(from?: string, to?: string): Promise<EODHDCalendarEvent[]> {
    try {
      const params: any = {};
      if (from) params.from = from;
      if (to) params.to = to;
      
      const data = await this.makeRequest('/calendar/economic', params);
      
      if (Array.isArray(data)) {
        return data;
      }
      return [];
    } catch (error) {
      console.warn('Failed to get economic calendar:', error);
      return [];
    }
  }

  // Get comprehensive stock context (news + earnings + fundamentals)
  async getStockContext(symbol: string): Promise<{
    news: EODHDNewsItem[];
    upcomingEarnings: EODHDEarningsEvent[];
    fundamentals?: { General?: any, Highlights?: EODHDFundamentals, Technicals?: EODHDTechnicals };
  }> {
    try {
      const [news, earnings, fundamentals] = await Promise.allSettled([
        this.getStockNews(symbol, 5),
        this.getUpcomingEarnings(),
        this.getFundamentals(symbol)
      ]);

      // Filter earnings for this specific symbol
      const symbolEarnings = earnings.status === 'fulfilled' 
        ? earnings.value.filter(e => e.code === symbol) 
        : [];

      return {
        news: news.status === 'fulfilled' ? news.value : [],
        upcomingEarnings: symbolEarnings,
        fundamentals: fundamentals.status === 'fulfilled' ? fundamentals.value : undefined
      };
    } catch (error) {
      console.warn(`Failed to get stock context for ${symbol}:`, error);
      return {
        news: [],
        upcomingEarnings: [],
        fundamentals: undefined
      };
    }
  }

  // Get market status
  async getMarketStatus(): Promise<{ isOpen: boolean, nextOpen?: string, nextClose?: string }> {
    try {
      const data = await this.makeRequest('/exchange-details/US');
      return {
        isOpen: data.IsOpen || false,
        nextOpen: data.From,
        nextClose: data.To
      };
    } catch (error) {
      console.warn('Failed to get market status:', error);
      // Fallback to time-based detection
      const marketStatus = this.getMarketHoursStatus();
      return { isOpen: marketStatus === 'regular' };
    }
  }
}

// Export singleton instance
export const eodhd = new EODHDClient(process.env.EODHD_API_KEY || '');

// Helper functions for data transformation
export function calculateRelativeVolume(currentVolume: number, avgVolume: number): number {
  return avgVolume > 0 ? currentVolume / avgVolume : 1;
}

// Calculate momentum score - focuses on technical strength over daily gaps
function calculateMomentumScore(data: EODHDRealTimeData, technicals?: EODHDTechnicals): number {
  let score = 0;
  const price = data.close || 0;
  const changePercent = data.change_p || 0;
  const volume = data.volume || 0;

  // 1. Technical Trend Analysis (40 points max) - CRITICAL for momentum
  if (technicals) {
    const { SMA_20, SMA_50, SMA_200, high_52weeks } = technicals;
    
    // Price above SMAs (essential momentum indicator)
    if (SMA_20 && price > SMA_20) score += 15; // Above 20-day SMA
    if (SMA_50 && price > SMA_50) score += 10;  // Above 50-day SMA  
    if (SMA_200 && price > SMA_200) score += 10; // Above 200-day SMA
    
    // 52-week high proximity (new highs detection)
    if (high_52weeks) {
      const highProximity = (price / high_52weeks) * 100;
      if (highProximity > 95) score += 20; // Near new highs
      else if (highProximity > 90) score += 15;
      else if (highProximity > 80) score += 10;
      else if (highProximity < 50) score -= 10; // Far from highs
    }
  }

  // 2. Volume Strength (20 points max)
  if (volume > 2000000) score += 20;
  else if (volume > 1000000) score += 15;
  else if (volume > 500000) score += 10;
  else score += 5;

  // 3. Price Action (20 points max) - Less emphasis on daily change
  if (changePercent > 5) score += 20;
  else if (changePercent > 2) score += 15;
  else if (changePercent > 0) score += 10;
  else if (changePercent > -2) score += 5;
  else score -= 10; // Penalty for significant decline

  // 4. Price Range (10 points max)
  if (price >= 2 && price <= 15) score += 10;
  else if (price > 15 && price <= 25) score += 5;
  else if (price < 1) score -= 15;

  // 5. RSI Momentum (10 points max)
  if (technicals?.RSI_14) {
    const rsi = technicals.RSI_14;
    if (rsi >= 55 && rsi <= 75) score += 10;
    else if (rsi > 75) score += 5; // Still bullish but overbought
    else if (rsi < 45) score -= 5;
  }

  return Math.min(Math.max(score, 0), 100);
}

// Calculate score based on trading strategy
export function calculateScore(
  data: EODHDRealTimeData, 
  technicals?: EODHDTechnicals, 
  strategy: 'momentum' | 'breakout' = 'momentum'
): number {
  if (strategy === 'momentum') {
    return calculateMomentumScore(data, technicals);
  } else {
    return calculateBreakoutScore(data, technicals);
  }
}

// Breakout strategy scoring - optimized for news-driven low float plays
function calculateBreakoutScore(data: EODHDRealTimeData, technicals?: EODHDTechnicals): number {
  let score = 0;

  // Premarket price action (0-30 points) - higher weight for big moves
  const changePercent = Math.abs(data.change_p || 0);
  if (changePercent > 20) score += 30; // Major news catalyst
  else if (changePercent > 15) score += 25;
  else if (changePercent > 10) score += 20; // Minimum breakout threshold
  else if (changePercent > 5) score += 10;
  else score -= 10; // Penalize weak moves

  // Volume explosion (0-30 points) - critical for breakouts
  const volume = data.volume || 0;
  if (volume > 10000000) score += 30; // Massive volume
  else if (volume > 5000000) score += 20;
  else if (volume > 2000000) score += 15;
  else if (volume > 1000000) score += 10;
  else if (volume < 500000) score -= 5; // Penalize low volume

  // Sweet spot price range for breakouts (0-20 points)
  const breakoutPrice = data.close || 0;
  if (breakoutPrice >= 2 && breakoutPrice <= 20) {
    if (breakoutPrice >= 5 && breakoutPrice <= 15) score += 20; // Optimal range
    else if (breakoutPrice >= 3 && breakoutPrice <= 18) score += 15;
    else score += 10;
  } else if (breakoutPrice < 2) {
    score -= 10; // Too risky/penny stock
  } else if (breakoutPrice > 20) {
    score -= 5; // Higher priced, less explosive potential
  }

  // Market cap estimation (0-20 points)
  // Note: Using approximate market cap calculation
  const estimatedMarketCap = (data.close || 0) * 100000000; // Rough estimate
  if (estimatedMarketCap < 300000000) {
    score += 20; // Small cap with potential for big moves
  } else if (estimatedMarketCap < 1000000000) {
    score += 15;
  } else if (estimatedMarketCap < 5000000000) {
    score += 10;
  } else {
    score -= 5; // Large caps move slower
  }

  // Technical setup (0-30 points)
  if (technicals) {
    const { RSI_14, SMA_50, SMA_200, MACD, MACD_Signal } = technicals;
    const currentPrice = data.close || 0;

    // RSI breakout levels
    if (RSI_14) {
      if (RSI_14 > 50 && RSI_14 < 75) score += 10; // Healthy breakout zone
      else if (RSI_14 > 75) score += 5; // Strong but overbought
      else if (RSI_14 < 40) score -= 5; // Weak setup
    }

    // Moving average alignment
    if (SMA_50 && SMA_200) {
      if (SMA_50 > SMA_200 && currentPrice > SMA_50) score += 10; // Bullish alignment
      else if (currentPrice > SMA_50) score += 5; // Above short-term MA
    }

    // MACD momentum
    if (MACD && MACD_Signal) {
      if (MACD > MACD_Signal && MACD > 0) score += 10; // Bullish MACD
      else if (MACD > MACD_Signal) score += 5; // MACD turning bullish
    }
  }

  return Math.min(Math.max(score, 0), 100);
}

export function getSignal(score: number, strategy: 'momentum' | 'breakout' = 'momentum'): 'Strong' | 'Moderate' | 'Weak' | 'Avoid' {
  if (strategy === 'momentum') {
    // More aggressive thresholds for momentum plays
    if (score >= 75) return 'Strong';
    if (score >= 55) return 'Moderate';
    if (score >= 35) return 'Weak';
    return 'Avoid';
  } else {
    // Conservative thresholds for breakout plays
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Moderate';
    if (score >= 40) return 'Weak';
    return 'Avoid';
  }
}

export function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(1)}M`;
  return `$${marketCap.toLocaleString()}`;
}

// News analysis helpers
export function getSentimentLabel(polarity: number): 'Very Positive' | 'Positive' | 'Neutral' | 'Negative' | 'Very Negative' {
  if (polarity >= 0.6) return 'Very Positive';
  if (polarity >= 0.2) return 'Positive';
  if (polarity >= -0.2) return 'Neutral';
  if (polarity >= -0.6) return 'Negative';
  return 'Very Negative';
}

export function getSentimentColor(polarity: number): string {
  if (polarity >= 0.6) return 'text-green-600 dark:text-green-400';
  if (polarity >= 0.2) return 'text-green-500 dark:text-green-300';
  if (polarity >= -0.2) return 'text-gray-600 dark:text-gray-400';
  if (polarity >= -0.6) return 'text-red-500 dark:text-red-300';
  return 'text-red-600 dark:text-red-400';
}

export function categorizeNewsByTags(tags: string[]): {
  category: 'Earnings' | 'FDA/Regulatory' | 'M&A' | 'Analyst' | 'Corporate' | 'Market' | 'Other';
  priority: 'High' | 'Medium' | 'Low';
  icon: string;
} {
  const tagString = tags.join(' ').toLowerCase();
  
  // High priority catalysts
  if (tagString.includes('earnings') || tagString.includes('quarterly results')) {
    return { category: 'Earnings', priority: 'High', icon: '📊' };
  }
  if (tagString.includes('fda') || tagString.includes('approval') || tagString.includes('regulatory')) {
    return { category: 'FDA/Regulatory', priority: 'High', icon: '🏥' };
  }
  if (tagString.includes('merger') || tagString.includes('acquisition') || tagString.includes('buyout')) {
    return { category: 'M&A', priority: 'High', icon: '🤝' };
  }
  
  // Medium priority
  if (tagString.includes('rating') || tagString.includes('price target') || tagString.includes('analyst')) {
    return { category: 'Analyst', priority: 'Medium', icon: '🎯' };
  }
  if (tagString.includes('dividend') || tagString.includes('split') || tagString.includes('announcement')) {
    return { category: 'Corporate', priority: 'Medium', icon: '🏢' };
  }
  
  // Low priority
  if (tagString.includes('market') || tagString.includes('sector') || tagString.includes('industry')) {
    return { category: 'Market', priority: 'Low', icon: '📈' };
  }
  
  return { category: 'Other', priority: 'Low', icon: '📰' };
}

export function getNewsFreshness(dateString: string): {
  label: 'Breaking' | 'Recent' | 'Today' | 'Yesterday' | 'This Week' | 'Old';
  color: string;
} {
  const newsDate = new Date(dateString);
  const now = new Date();
  const diffHours = (now.getTime() - newsDate.getTime()) / (1000 * 60 * 60);
  
  if (diffHours < 1) {
    return { label: 'Breaking', color: 'text-red-600 dark:text-red-400' };
  } else if (diffHours < 6) {
    return { label: 'Recent', color: 'text-orange-600 dark:text-orange-400' };
  } else if (diffHours < 24) {
    return { label: 'Today', color: 'text-blue-600 dark:text-blue-400' };
  } else if (diffHours < 48) {
    return { label: 'Yesterday', color: 'text-gray-600 dark:text-gray-400' };
  } else if (diffHours < 168) { // 7 days
    return { label: 'This Week', color: 'text-gray-500 dark:text-gray-500' };
  } else {
    return { label: 'Old', color: 'text-gray-400 dark:text-gray-600' };
  }
}

export function summarizeNewsImpact(news: EODHDNewsItem[]): {
  overallSentiment: number;
  highImpactCount: number;
  recentNewsCount: number;
  topCatalysts: string[];
} {
  if (news.length === 0) {
    return {
      overallSentiment: 0,
      highImpactCount: 0,
      recentNewsCount: 0,
      topCatalysts: []
    };
  }

  const recentNews = news.filter(item => {
    const diffHours = (new Date().getTime() - new Date(item.date).getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  });

  const highImpactNews = news.filter(item => {
    const { priority } = categorizeNewsByTags(item.tags);
    return priority === 'High';
  });

  const overallSentiment = news.reduce((sum, item) => sum + item.sentiment.polarity, 0) / news.length;

  const catalystCounts: Record<string, number> = {};
  news.forEach(item => {
    const { category } = categorizeNewsByTags(item.tags);
    catalystCounts[category] = (catalystCounts[category] || 0) + 1;
  });

  const topCatalysts = Object.entries(catalystCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category]) => category);

  return {
    overallSentiment,
    highImpactCount: highImpactNews.length,
    recentNewsCount: recentNews.length,
    topCatalysts
  };
}
