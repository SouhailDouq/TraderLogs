'use client'

import { useState } from 'react'
import { useTradeStore } from '@/utils/store'
import { toast } from 'react-hot-toast'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import { IBKRParser } from '@/utils/ibkr'

type ImportType = 'trading212' | 'ibkr'

export default function TradeUpload() {
  const [dragActive, setDragActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState('')
  const [progress, setProgress] = useState(0)
  const [importType, setImportType] = useState<ImportType>('trading212')

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
    console.log('Processing file:', file.name, 'Type:', file.type, 'Import type:', importType)
    
    if (file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }

    setIsProcessing(true)
    setProgress(0)
    setProcessingStep('Reading file...')
    
    // Show immediate feedback
    toast.loading(`Starting ${importType === 'ibkr' ? 'IBKR' : 'Trading 212'} CSV import...`, { id: 'csv-import' })

    try {
      console.log('Starting file processing...')
      
      // Process CSV content
      const content = await file.text()
      console.log('File content length:', content.length)

      // Handle IBKR import differently
      if (importType === 'ibkr') {
        setProcessingStep('Parsing IBKR CSV...')
        setProgress(30)
        
        const ibkrTrades = IBKRParser.parseCSV(content)
        
        if (ibkrTrades.length === 0) {
          toast.dismiss('csv-import')
          toast.error('No trades found in IBKR CSV. Please check the file format.')
          setIsProcessing(false)
          return
        }

        // Check for future dates (likely a mistake in Flex Query date range)
        const now = new Date()
        const futureTrades = ibkrTrades.filter(t => new Date(t.date) > now)
        if (futureTrades.length > 0) {
          const futureDate = new Date(futureTrades[0].date).toLocaleDateString()
          const confirmed = window.confirm(
            `⚠️ Warning: ${futureTrades.length} trade(s) have future dates (e.g., ${futureDate}).\n\n` +
            `This is likely a mistake in your IBKR Flex Query date range.\n\n` +
            `These trades won't appear on the calendar until that date.\n\n` +
            `Do you want to continue importing anyway?`
          )
          if (!confirmed) {
            toast.dismiss('csv-import')
            toast.error('Import cancelled. Please check your IBKR Flex Query date range.')
            setIsProcessing(false)
            return
          }
        }

        setProcessingStep('Saving trades to database...')
        setProgress(60)

        // Save to database via API
        const response = await fetch('/api/trades/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            trades: ibkrTrades.map(t => ({
              symbol: t.symbol,
              type: t.type.toLowerCase(),
              quantity: t.quantity,
              price: t.price,
              date: t.date,
              total: t.total,
              fees: t.fees || null,
              notes: t.notes || 'IBKR Import',
              currency: t.currency || 'USD',
              source: 'IBKR',
              sourceId: `IBKR-${t.symbol}-${t.date}-${t.type}-${t.quantity}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
            }))
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save IBKR trades to database')
        }

        const result = await response.json()
        
        setProgress(100)
        setProcessingStep('Complete!')
        
        toast.dismiss('csv-import')
        toast.success(`Imported ${result.saved} IBKR trades (${result.skipped} duplicates skipped). Refreshing page...`)
        
        // Simple page reload to refresh calendar with new trades
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        
        return
      }

      // Original Trading 212 CSV processing
      console.log('File content preview:', content.substring(0, 500))
      console.log('Full content (first 1000 chars):', content.substring(0, 1000))
      
      setProgress(20)
      setProcessingStep('Parsing CSV data...')
      
      // Split content into lines to see structure
      const lines = content.trim().split(/\r?\n/)
      console.log('Total lines in CSV:', lines.length)
      console.log('First 3 lines:', lines.slice(0, 3))
      
      try {
        console.log('About to call processCSV...')
        processCSV(content)
        console.log('CSV processing completed successfully')
        setProgress(50)
        setProcessingStep('Validating trade data...')
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
      setProgress(70)
      setProcessingStep('Saving trades to database...')
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
      setProgress(90)
      setProcessingStep('Refreshing data...')
      
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
              date: dbTrade.date.split('T')[0], // Normalize ISO date to yyyy-MM-dd
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
      
      setProgress(100)
      setProcessingStep('Complete!')
      
      // Dismiss loading toast
      toast.dismiss('csv-import')
      
      setTimeout(() => {
        setIsProcessing(false)
        setProcessingStep('')
        setProgress(0)
      }, 1000)
    } catch (error) {
      console.error('Error processing file:', error)
      toast.dismiss('csv-import')
      toast.error(`Failed to import trades: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsProcessing(false)
      setProcessingStep('')
      setProgress(0)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    console.log('Drop event triggered')
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (isProcessing) return // Prevent multiple uploads

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log('File dropped:', e.dataTransfer.files[0].name)
      await processFile(e.dataTransfer.files[0])
    } else {
      console.log('No files in drop event')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('File input change event triggered')
    
    if (isProcessing) return // Prevent multiple uploads
    
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name)
      await processFile(e.target.files[0])
    } else {
      console.log('No files selected')
    }
  }



  return (
    <>
      <LoadingOverlay 
        isVisible={isProcessing}
        title="Importing CSV Data"
        subtitle={processingStep}
        progress={progress}
      />
      
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Import Trades</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">Upload your CSV file to import trading data</p>
          </div>
        </div>

        {/* Import Type Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Broker
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setImportType('trading212')}
              disabled={isProcessing}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                importType === 'trading212'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Trading 212
            </button>
            <button
              onClick={() => setImportType('ibkr')}
              disabled={isProcessing}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                importType === 'ibkr'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Interactive Brokers
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {importType === 'trading212' 
              ? '📊 Upload Trading 212 CSV export file' 
              : '📊 Upload IBKR Flex Query or Activity Statement CSV'}
          </p>
        </div>
      
      <div className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            dragActive 
              ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-600/5 scale-[1.02]' 
              : isProcessing 
                ? 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-700/30' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/20'
          }`}
          onDragEnter={!isProcessing ? handleDrag : undefined}
          onDragLeave={!isProcessing ? handleDrag : undefined}
          onDragOver={!isProcessing ? handleDrag : undefined}
          onDrop={!isProcessing ? handleDrop : undefined}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv"
            onChange={handleFileChange}
            disabled={isProcessing}
          />
          
          {isProcessing ? (
            <div className="space-y-6">
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-blue-500 border-t-transparent"></div>
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Processing CSV...</span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out shadow-lg"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{processingStep}</p>
              
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/30 rounded-xl">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  ⚠️ Please don't refresh the page or navigate away during import
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-center group"
                >
                  <span className="block text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Drag and drop your CSV file here
                  </span>
                  <span className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Browse Files
                  </span>
                </label>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Supports CSV files only</span>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      </div>
    </>
  )
}
