'use client'

import { useState, useEffect } from 'react'
import { Currency } from '@/utils/currency'

export const useCurrency = () => {
  const [currency, setCurrency] = useState<Currency>('USD')

  // Load currency preference from localStorage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('traderlogs-currency') as Currency
    if (savedCurrency && (savedCurrency === 'EUR' || savedCurrency === 'USD')) {
      setCurrency(savedCurrency)
    }
  }, [])

  // Save currency preference to localStorage when it changes
  const updateCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency)
    localStorage.setItem('traderlogs-currency', newCurrency)
  }

  const toggleCurrency = () => {
    const newCurrency = currency === 'EUR' ? 'USD' : 'EUR'
    updateCurrency(newCurrency)
  }

  return {
    currency,
    setCurrency: updateCurrency,
    toggleCurrency
  }
}
