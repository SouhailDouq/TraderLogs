export type Currency = 'EUR' | 'USD'

// Exchange rate EUR to USD (you can make this dynamic later)
const EUR_TO_USD_RATE = 1.08 // Approximate rate, can be updated to fetch real-time rates

export const convertCurrency = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
  if (fromCurrency === toCurrency) {
    return amount
  }
  
  if (fromCurrency === 'EUR' && toCurrency === 'USD') {
    return amount * EUR_TO_USD_RATE
  }
  
  if (fromCurrency === 'USD' && toCurrency === 'EUR') {
    return amount / EUR_TO_USD_RATE
  }
  
  return amount
}

export const formatCurrencyWithSymbol = (amount: number, currency: Currency): string => {
  const symbol = currency === 'EUR' ? '€' : '$'
  const formattedAmount = Math.abs(amount).toFixed(2)
  
  if (currency === 'EUR') {
    return `${formattedAmount}${symbol}`
  } else {
    return `${symbol}${formattedAmount}`
  }
}

export const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'EUR' ? '€' : '$'
}
