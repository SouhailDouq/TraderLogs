'use client'

import { useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'

interface LoadingOverlayProps {
  isVisible: boolean
  title: string
  subtitle?: string
  progress?: number
}

export default function LoadingOverlay({ isVisible, title, subtitle, progress }: LoadingOverlayProps) {
  const isDarkMode = useDarkMode()
  useEffect(() => {
    if (isVisible) {
      // Prevent page navigation during loading
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault()
        e.returnValue = 'CSV import is in progress. Are you sure you want to leave?'
        return e.returnValue
      }

      window.addEventListener('beforeunload', handleBeforeUnload)
      
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          </div>
          
          {subtitle && (
            <p className="text-sm text-gray-600">{subtitle}</p>
          )}
          
          {typeof progress === 'number' && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{progress}% complete</p>
            </div>
          )}
          
          <div className={`mt-6 p-3 rounded-lg border ${
            isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-xs font-medium ${
              isDarkMode ? 'text-blue-200' : 'text-blue-800'
            }`}>
              ⚠️ Please don't close this tab or navigate away
            </p>
            <p className={`text-xs mt-1 ${
              isDarkMode ? 'text-blue-300' : 'text-blue-700'
            }`}>
              Your CSV import is in progress and will be lost if interrupted
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
