'use client'

import { useRef } from 'react'
import { useTradeStore } from '@/utils/store'

export default function TradeUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { processCSV } = useTradeStore()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        processCSV(content)
      } catch (error) {
        console.error('Error reading file:', error)
        alert('Error processing file. Please check the format and try again.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Trade History (CSV)
        </label>
        <div className="flex items-center justify-center w-full">
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition"
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                className="w-8 h-8 mb-3 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">CSV only (Max 5MB)</p>
            </div>
            <input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      <div className="bg-indigo-50 p-4 rounded-lg">
        <h3 className="font-medium text-indigo-800 mb-2">CSV Format Requirements</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Action column (Market buy/Limit sell)
          </li>
          <li className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Time column (YYYY-MM-DD format)
          </li>
          <li className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Ticker column
          </li>
          <li className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            No. of shares column
          </li>
          <li className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Price / share column
          </li>
          <li className="flex items-center">
            <svg
              className="w-4 h-4 mr-2 text-indigo-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Total column
          </li>
        </ul>
      </div>
    </div>
  )
}
