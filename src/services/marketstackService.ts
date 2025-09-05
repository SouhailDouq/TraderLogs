/**
 * Unified Market Data Service using Marketstack API
 * Replaces all inconsistent data sources with a single, reliable API
 */

export interface MarketstackEODData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  adj_high: number
  adj_low: number
  adj_close: number
  adj_open: number
  adj_volume: number
  split_factor: number
  dividend: number
  name: string
  exchange_code: string
  asset_type: string
  price_currency: string
  symbol: string
  exchange: string
  date: string
}

export interface MarketstackIntradayData {
  open: number
  high: number
  low: number
  close: number
  last: number
  volume: number
  mid: number
  last_size: number
  bid_size: number
  bid_price: number
  ask_price: number
  ask_size: number
  marketstack_last: number
  date: string
  symbol: string
  exchange: string
}

export interface MarketstackResponse<T> {
  pagination: {
    limit: number
    offset: number
    count: number
    total: number
  }
  data: T[]
}

export interface UnifiedStockData {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  avgVolume: number
  marketCap: string
  open: number
  high: number
  low: number
  close: number
  previousClose: number
  
  // Technical indicators (calculated)
  sma20?: number
  sma50?: number
  sma200?: number
  rsi?: number
  relativeVolume: number
  
  // Market data
  exchange: string
  currency: string
  lastUpdated: string
  
  // After hours data
  afterHoursPrice?: number
  afterHoursChange?: number
  afterHoursChangePercent?: number
  
  // Additional data
  week52High?: number
  week52Low?: number
  pe?: number
  beta?: number
}

class MarketstackService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.marketstack.com/v2'
  private lastRequestTime = 0
  private readonly minRequestInterval = 250 // Minimum 250ms between requests

  constructor() {
    this.apiKey = process.env.MARKETSTACK_API_KEY || ''
    if (!this.apiKey) {
      console.warn('MARKETSTACK_API_KEY not found in environment variables')
    }
  }

  /**
   * Rate limiting helper - ensures minimum delay between API requests
   */
  private async rateLimitDelay(): Promise<void> {
    const now = Date.now()
    const timeSinceLastRequest = now - this.lastRequestTime
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delayNeeded = this.minRequestInterval - timeSinceLastRequest
      await new Promise(resolve => setTimeout(resolve, delayNeeded))
    }
    
    this.lastRequestTime = Date.now()
  }

  /**
   * Get end-of-day data for one or multiple symbols
   */
  async getEODData(
    symbols: string | string[],
    options: {
      dateFrom?: string
      dateTo?: string
      limit?: number
      exchange?: string
    } = {}
  ): Promise<MarketstackEODData[]> {
    const symbolsParam = Array.isArray(symbols) ? symbols.join(',') : symbols
    
    const params = new URLSearchParams({
      access_key: this.apiKey,
      symbols: symbolsParam,
      limit: (options.limit || 100).toString(),
    })

    if (options.dateFrom) params.append('date_from', options.dateFrom)
    if (options.dateTo) params.append('date_to', options.dateTo)
    if (options.exchange) params.append('exchange', options.exchange)

    const response = await fetch(`${this.baseUrl}/eod?${params}`)
    
    if (!response.ok) {
      throw new Error(`Marketstack EOD API error: ${response.status} ${response.statusText}`)
    }

    const data: MarketstackResponse<MarketstackEODData> = await response.json()
    return data.data
  }

  /**
   * Get latest EOD data for a symbol
   */
  async getLatestEOD(symbol: string): Promise<MarketstackEODData[]> {
    await this.rateLimitDelay()
    
    const url = `${this.baseUrl}/eod/latest?access_key=${this.apiKey}&symbols=${symbol}`
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Marketstack Latest EOD API error: ${response.status} ${response.statusText}`)
    }

    const data: MarketstackResponse<MarketstackEODData> = await response.json()
    return data.data
  }

  /**
   * Get intraday data with support for after-hours trading
   */
  async getIntradayData(
    symbols: string | string[],
    options: {
      interval?: '1min' | '5min' | '10min' | '15min' | '30min' | '1hour' | '3hour' | '6hour' | '12hour' | '24hour'
      dateFrom?: string
      dateTo?: string
      limit?: number
      afterHours?: boolean
    } = {}
  ): Promise<MarketstackIntradayData[]> {
    await this.rateLimitDelay()
    
    const symbolsParam = Array.isArray(symbols) ? symbols.join(',') : symbols
    
    const params = new URLSearchParams({
      access_key: this.apiKey,
      symbols: symbolsParam,
      interval: options.interval || '1min',
      limit: (options.limit || 100).toString(),
    })

    if (options.dateFrom) params.append('date_from', options.dateFrom)
    if (options.dateTo) params.append('date_to', options.dateTo)
    if (options.afterHours) params.append('after_hours', 'true')

    const response = await fetch(`${this.baseUrl}/intraday?${params}`)
    
    if (!response.ok) {
      throw new Error(`Marketstack Intraday API error: ${response.status} ${response.statusText}`)
    }

    const data: MarketstackResponse<MarketstackIntradayData> = await response.json()
    return data.data
  }

  /**
   * Get latest intraday data (real-time or near real-time)
   */
  async getLatestIntraday(
    symbols: string | string[],
    options: {
      interval?: '1min' | '5min' | '10min'
      afterHours?: boolean
    } = {}
  ): Promise<MarketstackIntradayData[]> {
    await this.rateLimitDelay()
    
    const symbolsParam = Array.isArray(symbols) ? symbols.join(',') : symbols
    
    const params = new URLSearchParams({
      access_key: this.apiKey,
      symbols: symbolsParam,
      interval: options.interval || '1min',
    })

    if (options.afterHours) params.append('after_hours', 'true')

    const url = `${this.baseUrl}/intraday/latest?${params}`
    console.log(`Calling Marketstack real-time endpoint: ${url}`)
    
    const response = await fetch(url)
    
    if (!response.ok) {
      throw new Error(`Marketstack Latest Intraday API error: ${response.status} ${response.statusText}`)
    }

    const data: MarketstackResponse<MarketstackIntradayData> = await response.json()
    return data.data
  }

  /**
   * Convert Marketstack data to unified format for the app
   */
  async getUnifiedStockData(symbol: string): Promise<UnifiedStockData | null> {
    try {
      // Get latest EOD data for basic info
      const eodData = await this.getLatestEOD(symbol)
      if (!eodData || eodData.length === 0) {
        return null
      }

      const eod = eodData[0]
      
      // Get latest intraday for current price
      let currentPrice = eod.adj_close
      let afterHoursPrice: number | undefined
      let afterHoursChange: number | undefined
      let afterHoursChangePercent: number | undefined

      try {
        const isCurrentlyPremarket = this.isPremarket()
        const isCurrentlyAfterHours = this.isAfterHours()
        
        console.log(`⚠️  NOTE: Using Marketstack Basic plan - real-time data requires Professional plan ($49.99/month)`)
        console.log(`Current data will be delayed/end-of-day only. For real-time pre-market prices, upgrade to Professional plan.`)
        
        // Try to get extended hours data (covers both pre-market and after-hours)
        // Note: On Basic plan, this will return delayed data
        const extendedHoursData = await this.getLatestIntraday(symbol, { 
          interval: '1min', 
          afterHours: true 
        })
        if (extendedHoursData && extendedHoursData.length > 0) {
          const extended = extendedHoursData[0]
          const extendedPrice = extended.last || extended.close
          const dataTimestamp = extended.date || 'unknown'
          const now = new Date()
          const dataAge = extended.date ? Math.round((now.getTime() - new Date(extended.date).getTime()) / (1000 * 60)) : 'unknown'
          
          console.log(`Marketstack data for ${symbol}: Price=${extendedPrice}, Timestamp=${dataTimestamp}, Age=${dataAge} minutes`)
          
          // Add data freshness warning for stale data
          if (typeof dataAge === 'number' && dataAge > 20) {
            console.warn(`⚠️  WARNING: Marketstack data for ${symbol} is ${dataAge} minutes old - TOO STALE FOR TRADING!`)
          }
          
          if (extendedPrice && extendedPrice !== eod.adj_close) {
            if (isCurrentlyPremarket) {
              currentPrice = extendedPrice
              console.log(`Using pre-market price for ${symbol}: ${extendedPrice} (data is ${dataAge} minutes old)`)
            } else if (isCurrentlyAfterHours) {
              afterHoursPrice = extendedPrice
              afterHoursChange = extendedPrice - eod.adj_close
              afterHoursChangePercent = (afterHoursChange / eod.adj_close) * 100
              currentPrice = extendedPrice
              console.log(`Using after-hours price for ${symbol}: ${extendedPrice} (data is ${dataAge} minutes old)`)
            }
          }
        }

        // If no extended hours data or during regular hours, try regular intraday
        if (currentPrice === eod.adj_close) {
          const intradayData = await this.getLatestIntraday(symbol, { interval: '1min' })
          if (intradayData && intradayData.length > 0) {
            const latest = intradayData[0]
            const intradayPrice = latest.last || latest.close
            const dataTimestamp = latest.date || 'unknown'
            const now = new Date()
            const dataAge = latest.date ? Math.round((now.getTime() - new Date(latest.date).getTime()) / (1000 * 60)) : 'unknown'
            
            if (intradayPrice && intradayPrice !== eod.adj_close) {
              currentPrice = intradayPrice
              console.log(`Using regular market price for ${symbol}: ${intradayPrice} (data is ${dataAge} minutes old)`)
            }
            
            const latestDataAge = latest.date ? Math.round((now.getTime() - new Date(latest.date).getTime()) / (1000 * 60)) : 0
            if (latestDataAge > 20) {
              console.warn(`⚠️  WARNING: Marketstack data for ${symbol} is ${latestDataAge} minutes old - TOO STALE FOR TRADING!`)
            }
          }
        }
      } catch (error) {
        // Handle 403 errors gracefully (free plan limitations)
        if (error instanceof Error && error.message.includes('403')) {
          console.warn(`Intraday data not available on current plan for ${symbol}. Using EOD data.`)
        } else {
          console.warn(`Could not fetch intraday data for ${symbol}:`, error)
        }
        
        // For after-hours, try to get a more recent price from a different source if available
        if (this.isAfterHours()) {
          try {
            // Fallback: try to get latest EOD which might be more recent
            const latestEOD = await this.getLatestEOD(symbol)
            if (latestEOD && latestEOD.length > 0) {
              const latest = latestEOD[0]
              // If the latest EOD is from today, it might include after-hours close
              const today = new Date().toISOString().split('T')[0]
              const dataDate = latest.date.split('T')[0]
              
              if (dataDate === today && latest.adj_close !== eod.adj_close) {
                afterHoursPrice = latest.adj_close
                afterHoursChange = afterHoursPrice - eod.adj_close
                afterHoursChangePercent = (afterHoursChange / eod.adj_close) * 100
                currentPrice = afterHoursPrice // Use after-hours price as current
              }
            }
          } catch (fallbackError) {
            console.warn(`Fallback after-hours data fetch failed for ${symbol}:`, fallbackError)
          }
        }
      }

      // Calculate basic metrics
      const change = currentPrice - eod.adj_close
      const changePercent = (change / eod.adj_close) * 100

      // Get historical data for technical indicators
      const historicalData = await this.getEODData(symbol, {
        limit: 200, // Get enough data for 200-day SMA
        dateTo: new Date().toISOString().split('T')[0]
      })

      // Calculate technical indicators
      const { sma20, sma50, sma200, rsi } = this.calculateTechnicalIndicators(historicalData)
      
      // Calculate relative volume (current vs average)
      const avgVolume = this.calculateAverageVolume(historicalData, 10)
      const relativeVolume = eod.adj_volume / avgVolume

      // Get 52-week high/low
      const { week52High, week52Low } = this.calculate52WeekRange(historicalData)

      return {
        symbol: eod.symbol,
        name: eod.name,
        price: currentPrice,
        change,
        changePercent,
        volume: eod.adj_volume,
        avgVolume,
        marketCap: 'N/A', // Marketstack doesn't provide market cap directly
        open: eod.adj_open,
        high: eod.adj_high,
        low: eod.adj_low,
        close: eod.adj_close,
        previousClose: eod.adj_close, // This would be previous day's close
        
        // Technical indicators
        sma20,
        sma50,
        sma200,
        rsi,
        relativeVolume,
        
        // Market data
        exchange: eod.exchange,
        currency: eod.price_currency,
        lastUpdated: new Date().toISOString(),
        
        // After hours
        afterHoursPrice,
        afterHoursChange,
        afterHoursChangePercent,
        
        // Additional data
        week52High,
        week52Low,
      }
    } catch (error) {
      console.error(`Error fetching unified data for ${symbol}:`, error)
      return null
    }
  }

  /**
   * Get multiple stocks data efficiently with rate limiting
   */
  async getMultipleStocksData(symbols: string[]): Promise<UnifiedStockData[]> {
    const results: UnifiedStockData[] = []
    
    // Process in smaller batches with delays to avoid rate limits
    const batchSize = 3 // Reduced batch size
    const delayBetweenBatches = 1000 // 1 second delay between batches
    
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(symbols.length/batchSize)}: ${batch.join(', ')}`)
      
      // Process batch sequentially to avoid overwhelming the API
      const batchResults: UnifiedStockData[] = []
      for (const symbol of batch) {
        try {
          const result = await this.getUnifiedStockData(symbol)
          if (result) {
            batchResults.push(result)
          }
          // Small delay between individual requests within batch
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (error) {
          console.warn(`Failed to fetch data for ${symbol}:`, error)
        }
      }
      
      results.push(...batchResults)
      
      // Delay between batches (except for the last batch)
      if (i + batchSize < symbols.length) {
        console.log(`Waiting ${delayBetweenBatches}ms before next batch...`)
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
      }
    }
    
    return results
  }

  /**
   * Calculate technical indicators from historical data
   */
  private calculateTechnicalIndicators(data: MarketstackEODData[]) {
    if (!data || data.length === 0) {
      return { sma20: undefined, sma50: undefined, sma200: undefined, rsi: undefined }
    }

    // Sort by date (oldest first)
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const closes = sortedData.map(d => d.adj_close)

    return {
      sma20: this.calculateSMA(closes, 20),
      sma50: this.calculateSMA(closes, 50),
      sma200: this.calculateSMA(closes, 200),
      rsi: this.calculateRSI(closes, 14)
    }
  }

  /**
   * Calculate Simple Moving Average
   */
  private calculateSMA(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined
    
    const recentPrices = prices.slice(-period)
    const sum = recentPrices.reduce((acc, price) => acc + price, 0)
    return sum / period
  }

  /**
   * Calculate RSI (Relative Strength Index)
   */
  private calculateRSI(prices: number[], period: number = 14): number | undefined {
    if (prices.length < period + 1) return undefined

    const gains: number[] = []
    const losses: number[] = []

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }

    if (gains.length < period) return undefined

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period

    if (avgLoss === 0) return 100
    
    const rs = avgGain / avgLoss
    return 100 - (100 / (1 + rs))
  }

  /**
   * Calculate average volume over specified days
   */
  private calculateAverageVolume(data: MarketstackEODData[], days: number): number {
    if (!data || data.length === 0) return 1000000 // Default fallback

    const recentData = data.slice(-days)
    const totalVolume = recentData.reduce((sum, d) => sum + d.adj_volume, 0)
    return totalVolume / recentData.length
  }

  /**
   * Calculate 52-week high and low
   */
  private calculate52WeekRange(data: MarketstackEODData[]): { week52High?: number, week52Low?: number } {
    if (!data || data.length === 0) {
      return { week52High: undefined, week52Low: undefined }
    }

    // Get last 252 trading days (approximately 1 year)
    const yearData = data.slice(-252)
    const highs = yearData.map(d => d.adj_high)
    const lows = yearData.map(d => d.adj_low)

    return {
      week52High: Math.max(...highs),
      week52Low: Math.min(...lows)
    }
  }

  /**
   * Check if market is in premarket/after-hours
   */
  isAfterHours(): boolean {
    const now = new Date()
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const hour = estTime.getHours()
    const minutes = estTime.getMinutes()
    const currentTime = hour * 60 + minutes

    // After 4 PM EST or before 9:30 AM EST
    return currentTime >= 960 || currentTime < 570
  }

  /**
   * Check if market is in premarket hours
   */
  isPremarket(): boolean {
    const now = new Date()
    const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const hour = estTime.getHours()
    const minutes = estTime.getMinutes()
    const currentTime = hour * 60 + minutes

    // 4:00 AM - 9:30 AM EST
    return currentTime >= 240 && currentTime < 570
  }
}

export const marketstackService = new MarketstackService()
export default MarketstackService
