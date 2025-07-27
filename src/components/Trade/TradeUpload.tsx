'use client'

import { useState } from 'react'
import { useTradeStore } from '@/utils/store'
import { toast } from 'react-hot-toast'



export default function TradeUpload() {
  const [dragActive, setDragActive] = useState(false)

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



  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Import Trades</h2>
      
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

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">📊 Enhanced CSV Support</h3>
          <p className="text-sm text-blue-700 mb-2">
            Your CSV can now include extended analysis fields for better strategy tracking:
          </p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• <strong>Volume</strong> - Daily trading volume</li>
            <li>• <strong>Avg Volume</strong> - 30-day average volume</li>
            <li>• <strong>52 Week High</strong> - Yearly high price</li>
            <li>• <strong>4 Week Performance</strong> - Monthly performance %</li>
            <li>• <strong>Market Cap</strong> - Market capitalization</li>
            <li>• <strong>Notes</strong> - Trade notes and comments</li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">
            These fields are optional but enable advanced strategy analysis and compliance tracking.
          </p>
        </div>
      </div>
    </div>
  )
}
