'use client';

import { useState } from 'react'
import ClientTradeUpload from '@/components/Trade/TradeUpload'

export default function Header() {
  const [showImport, setShowImport] = useState(false)

  return (
    <>
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center">
              <span className="text-xl font-semibold text-blue-600">TraderLogs</span>
            </div>
            <div className="flex items-center">
              <button 
                onClick={() => setShowImport(true)}
                className="inline-flex items-center justify-center px-4 py-1.5 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Import Trades
              </button>
            </div>
          </div>
        </div>
      </nav>

      {showImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Import Trades</h2>
              <button
                onClick={() => setShowImport(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ClientTradeUpload />
          </div>
        </div>
      )}
    </>
  )
}
