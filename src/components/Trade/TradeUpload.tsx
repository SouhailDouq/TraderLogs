'use client'

import { useState } from 'react'
import { useTradeStore } from '@/utils/store'
import { toast } from 'react-hot-toast'

interface TradeFormData {
  date: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  notes?: string
  volume?: number
  avgVolume?: number
  weekHigh52?: number
  weekPerf4?: number
  marketCap?: number
}

export default function TradeUpload() {
  const [dragActive, setDragActive] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [formData, setFormData] = useState<TradeFormData>({
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'BUY',
    quantity: 0,
    price: 0
  })

  const processCSV = useTradeStore(state => state.processCSV)
  const trades = useTradeStore(state => state.trades)
  const clearTrades = useTradeStore(state => state.clearTrades)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const processFile = async (file: File) => {
    console.log('Processing file:', file.name, 'Type:', file.type)
    
    if (file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }

    try {
      console.log('Starting file processing...')
      
      // Process CSV content
      const content = await file.text()
      console.log('File content length:', content.length)
      console.log('File content preview:', content.substring(0, 500))
      console.log('Full content (first 1000 chars):', content.substring(0, 1000))
      
      // Split content into lines to see structure
      const lines = content.trim().split(/\r?\n/)
      console.log('Total lines in CSV:', lines.length)
      console.log('First 3 lines:', lines.slice(0, 3))
      
      try {
        console.log('About to call processCSV...')
        processCSV(content)
        console.log('CSV processing completed successfully')
      } catch (csvError) {
        console.error('Error in processCSV:', csvError)
        throw csvError
      }

      // Wait for next tick to ensure trades are updated in store
      await new Promise(resolve => setTimeout(resolve, 100))

      // Get current trades from store
      const currentTrades = useTradeStore.getState().trades
      console.log('Current trades in store:', currentTrades.length)
      
      if (currentTrades.length === 0) {
        toast.error('No trades were parsed from the CSV file')
        return
      }

      // Save trades to database
      console.log('Saving trades to database...')
      const response = await fetch('/api/trades/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trades: currentTrades, source: 'CSV' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save trades to database')
      }

      const result = await response.json()
      console.log('Save result:', result)
      
      // Show detailed feedback about saved vs skipped trades
      if (result.saved > 0 && result.skipped > 0) {
        toast.success(`Import complete: ${result.saved} new trades saved, ${result.skipped} duplicates skipped`)
      } else if (result.saved > 0) {
        toast.success(`${result.saved} trades imported and saved successfully`)
      } else if (result.skipped > 0) {
        toast.success(`All ${result.skipped} trades were already in the database (no duplicates added)`)
      } else {
        toast.success('Import completed')
      }
      
      // Reload all trades from database to refresh the UI with both old and new data
      try {
        const allTradesResponse = await fetch('/api/trades')
        if (allTradesResponse.ok) {
          const allTradesData = await allTradesResponse.json()
          if (allTradesData.trades && Array.isArray(allTradesData.trades)) {
            const mappedTrades = allTradesData.trades.map((dbTrade: any) => ({
              id: dbTrade.id,
              date: dbTrade.date,
              symbol: dbTrade.symbol,
              type: dbTrade.type,
              name: dbTrade.name || '',
              price: dbTrade.price,
              quantity: dbTrade.quantity,
              profitLoss: dbTrade.profitLoss || 0,
              journal: dbTrade.journal || {
                notes: '',
                tags: [],
                emotion: 'neutral',
                rating: 3,
                createdAt: new Date().toISOString()
              }
            }))
            // Clear and reload all trades to show both old and new data
            clearTrades()
            useTradeStore.getState().setTrades(mappedTrades)
          }
        }
      } catch (reloadError) {
        console.error('Error reloading trades after import:', reloadError)
        // Don't show error to user as the import was successful
      }
    } catch (error) {
      console.error('Error processing file:', error)
      toast.error(`Failed to import trades: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    console.log('Drop event triggered')
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log('File dropped:', e.dataTransfer.files[0].name)
      await processFile(e.dataTransfer.files[0])
    } else {
      console.log('No files in drop event')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input change event triggered')
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name)
      await processFile(e.target.files[0])
    } else {
      console.log('No files selected')
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error('Failed to save trade')
      
      toast.success('Trade saved successfully')
      setFormData({
        date: new Date().toISOString().split('T')[0],
        symbol: '',
        type: 'BUY',
        quantity: 0,
        price: 0
      })
    } catch (error) {
      toast.error('Failed to save trade')
      console.error(error)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Add Trades</h2>
      
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer text-sm text-gray-600"
          >
            <span className="block mb-2">
              Drag and drop a CSV file or click to upload
            </span>
            <span className="text-blue-600 hover:text-blue-700">
              Browse files
            </span>
          </label>
        </div>

        <div className="text-center">
          <button
            onClick={() => setManualEntry(!manualEntry)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {manualEntry ? 'Hide manual entry' : 'Manual entry'}
          </button>
        </div>

        {manualEntry && (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Symbol
                </label>
                <input
                  type="text"
                  required
                  value={formData.symbol}
                  onChange={e => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value as 'BUY' | 'SELL' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity || ''}
                  onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Volume
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.volume || ''}
                  onChange={e => setFormData({ ...formData, volume: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Avg Volume (30d)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.avgVolume || ''}
                  onChange={e => setFormData({ ...formData, avgVolume: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  52 Week High
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weekHigh52 || ''}
                  onChange={e => setFormData({ ...formData, weekHigh52: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  4 Week Performance %
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weekPerf4 || ''}
                  onChange={e => setFormData({ ...formData, weekPerf4: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Market Cap (M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.marketCap || ''}
                  onChange={e => setFormData({ ...formData, marketCap: parseFloat(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Add any trade notes here..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Trade
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
