import { useState, useEffect, useCallback } from 'react'
import { Trading212API } from '@/utils/trading212'

export interface Trading212Position {
  ticker: string
  quantity: number
  averagePrice: number
  currentPrice: number
  ppl: number // Profit/Loss
  pplPercent?: number
  marketValue?: number
  frontend?: {
    instrumentCode: string
  }
}

export interface Trading212Account {
  cash: number
  total: number
  ppl: number
  result: number
  invested: number
  pieCash: number
  blockedForStocks: number
  maxRiskAmount: number
}

export interface UseTrading212Options {
  apiKey: string
  accountType: 'LIVE' | 'DEMO'
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
}

export interface UseTrading212Return {
  positions: Trading212Position[]
  account: Trading212Account | null
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

export function useTrading212(options: UseTrading212Options): UseTrading212Return {
  const { apiKey, accountType, autoRefresh = false, refreshInterval = 60000 } = options
  
  const [positions, setPositions] = useState<Trading212Position[]>([])
  const [account, setAccount] = useState<Trading212Account | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    if (!apiKey) {
      setError('API key is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const api = new Trading212API({ apiKey, accountType })
      
      // Use the auth token as-is (already formatted as "Basic <token>" from portfolio page)
      const authToken = apiKey
      
      // Fetch portfolio positions
      const positionsResponse = await fetch(
        `/api/trading212/proxy?endpoint=/v0/equity/portfolio&accountType=${accountType}`,
        {
          headers: {
            'Authorization': authToken,
            'Accept': 'application/json'
          }
        }
      )

      if (!positionsResponse.ok) {
        throw new Error(`Failed to fetch positions: ${positionsResponse.statusText}`)
      }

      const positionsData = await positionsResponse.json()
      
      // Trading 212 API returns an array directly, not { items: [] }
      const fetchedPositions: Trading212Position[] = Array.isArray(positionsData) 
        ? positionsData 
        : (positionsData.items || [])
      
      console.log('📊 Trading 212 API Response:', {
        accountType,
        isArray: Array.isArray(positionsData),
        positionsCount: fetchedPositions.length,
        positions: fetchedPositions.map(p => ({
          ticker: p.ticker,
          quantity: p.quantity,
          currentPrice: p.currentPrice,
          ppl: p.ppl
        }))
      })
      
      if (fetchedPositions.length === 0) {
        console.log('⚠️ No positions returned from Trading 212 API')
        console.log('Possible reasons:')
        console.log('1. No open positions in your account')
        console.log('2. Wrong account type (LIVE vs DEMO)')
        console.log('3. API permissions issue')
      }
      
      // Calculate additional fields
      const enrichedPositions = fetchedPositions.map(pos => {
        const costBasis = pos.averagePrice * pos.quantity;
        const currentValue = pos.currentPrice * pos.quantity;
        const pplPercent = costBasis > 0 ? ((currentValue - costBasis) / costBasis) * 100 : 0;
        
        console.log(`📊 ${pos.ticker} calculation:`, {
          averagePrice: pos.averagePrice,
          currentPrice: pos.currentPrice,
          quantity: pos.quantity,
          costBasis,
          currentValue,
          ppl: pos.ppl,
          pplPercent: pplPercent.toFixed(2) + '%'
        });
        
        return {
          ...pos,
          pplPercent,
          marketValue: currentValue
        };
      })

      setPositions(enrichedPositions)

      // Fetch account info
      const accountResponse = await fetch(
        `/api/trading212/proxy?endpoint=/v0/equity/account/cash&accountType=${accountType}`,
        {
          headers: {
            'Authorization': authToken, // Already formatted as "Basic <token>"
            'Accept': 'application/json'
          }
        }
      )

      if (accountResponse.ok) {
        const accountData = await accountResponse.json()
        setAccount(accountData)
      }

      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Trading212 API Error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, accountType])

  // Initial fetch
  useEffect(() => {
    if (apiKey) {
      fetchData()
    }
  }, [apiKey, accountType, fetchData])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !apiKey) return

    const interval = setInterval(() => {
      fetchData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchData, apiKey])

  return {
    positions,
    account,
    isLoading,
    error,
    refresh: fetchData,
    lastUpdated
  }
}
