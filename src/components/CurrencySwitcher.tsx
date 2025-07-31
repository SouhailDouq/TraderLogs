'use client'

import { Currency, getCurrencySymbol } from '@/utils/currency'
import { useDarkMode } from '@/hooks/useDarkMode'

interface CurrencySwitcherProps {
  currency: Currency
  onToggle: () => void
}

export default function CurrencySwitcher({ currency, onToggle }: CurrencySwitcherProps) {
  const isDarkMode = useDarkMode()

  return (
    <div className="flex items-center space-x-2">
      <span className={`text-sm font-medium ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        Currency:
      </span>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isDarkMode 
            ? 'bg-gray-700 focus:ring-offset-gray-800' 
            : 'bg-gray-200 focus:ring-offset-white'
        } ${
          currency === 'USD' 
            ? 'bg-blue-600' 
            : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            currency === 'USD' ? 'translate-x-9' : 'translate-x-1'
          }`}
        />
        <span className={`absolute left-1.5 text-xs font-medium ${
          currency === 'EUR' ? 'text-white' : 'text-gray-500'
        }`}>
          €
        </span>
        <span className={`absolute right-1.5 text-xs font-medium ${
          currency === 'USD' ? 'text-white' : 'text-gray-500'
        }`}>
          $
        </span>
      </button>
      <span className={`text-sm font-medium ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        {currency}
      </span>
    </div>
  )
}
