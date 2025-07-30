'use client'

import React, { useEffect, useState } from 'react'
import { Trading212API } from '@/utils/trading212'
// processCSV is now a method in the TradeStore
import toast from 'react-hot-toast'
import { useTradeStore } from '@/utils/store'

interface Trade {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  date: string
  total: number
  fees?: number
  notes?: string
  importedAt?: string
  source?: string
  fileName?: string
}

interface Trading212ConfigProps {
  defaultApiKey?: string
  onSaveTrades: (trades: Trade[]) => Promise<void>
}

export default function Trading212Config({ defaultApiKey, onSaveTrades }: Trading212ConfigProps) {
  const [apiKey, setApiKey] = useState(defaultApiKey)
  const [accountType, setAccountType] = useState<'LIVE' | 'DEMO'>('DEMO')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { processCSV: csvProcessor } = useTradeStore()

  const processTradeCSV = async (text: string): Promise<Trade[]> => {
    const result = await csvProcessor(text)
    if (!Array.isArray(result)) {
      throw new Error('Invalid CSV format')
    }
    return result
  }

  useEffect(() => {
    // Check if API key is configured
    if (!defaultApiKey) {
      setError('Trading212 API key is not configured. Please check your .env.local file.')
    }
  }, [defaultApiKey])

  const saveTradesToDB = async (trades: Trade[], source: 'CSV' | 'API') => {
    const response = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades, source })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to save trades')
    }

    return response.json()
  }

  const handleSync = async () => {
    if (!apiKey) {
      toast.error('Please enter your Trading212 API key')
      return
    }

    try {
      setIsLoading(true)
      const api = new Trading212API({ apiKey, accountType })
      const result = await api.exportData()
      
      if (result.trades && result.trades.length > 0) {
        // Save trades to database
        const saveResult = await saveTradesToDB(result.trades, 'API')
        toast.success(`Successfully synced ${saveResult.saved} trades (${saveResult.skipped} duplicates skipped)`)
      } else {
        toast('No trades found in Trading212 data', { icon: '⚠️' })
      }
    } catch (error) {
      console.error('Failed to get trading data:', error)
      toast.error(`Failed to get trading data: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      toast.error('Please select one or more CSV files')
      return
    }

    setIsLoading(true)
    try {
      let totalSaved = 0
      let totalSkipped = 0

      for (const file of files) {
        console.log('Processing file:', file.name)
        const text = await file.text()
        console.log('File content:', text.substring(0, 200)) // Show first 200 chars
        const trades = await processTradeCSV(text)
        console.log('Processed trades:', trades.length)
        
        if (trades && trades.length > 0) {
          // Save trades to database
          console.log('Saving trades to DB...')
          const saveResult = await saveTradesToDB(trades, 'CSV')
          console.log('Save result:', saveResult)
          totalSaved += saveResult.saved
          totalSkipped += saveResult.skipped
          toast.success(`Processed ${file.name}: ${saveResult.saved} saved, ${saveResult.skipped} duplicates skipped`)
        } else {
          toast(`No trades found in ${file.name}`, { icon: '⚠️' })
        }
      }
      
      if (totalSaved > 0 || totalSkipped > 0) {
        toast.success(`Total: ${totalSaved} trades saved, ${totalSkipped} duplicates skipped`)
      }
    } catch (error) {
      console.error('Failed to import CSV:', error)
      toast.error(`Failed to import CSV: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Trading212 Integration</h3>
      {error && (
        <div className="mb-4 p-4 text-sm text-red-700 bg-red-100 rounded-lg">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="Enter your Trading212 API key"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Account Type</label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as 'LIVE' | 'DEMO')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="LIVE">Live Account</option>
            <option value="DEMO">Demo Account</option>
          </select>
        </div>
        <button
          onClick={handleSync}
          disabled={isLoading || !apiKey}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
            ${isLoading || !apiKey ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {isLoading ? 'Syncing...' : 'Sync with Trading212'}
        </button>

        <div className="relative">
          <label
            htmlFor="csv-upload"
            className={`w-full flex justify-center py-2 px-4 border-2 border-dashed rounded-md cursor-pointer
              ${isLoading ? 'bg-gray-100 border-gray-300' : 'border-indigo-300 hover:border-indigo-400'}`}
          >
            <div className="space-y-1 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-indigo-600 hover:text-indigo-500">
                  Upload CSV files
                </span>
                {' or drag and drop'}
              </div>
              <p className="text-xs text-gray-500">Trading212 CSV export files</p>
            </div>
            <input
              id="csv-upload"
              name="csv-upload"
              type="file"
              className="sr-only"
              multiple
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={isLoading}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
