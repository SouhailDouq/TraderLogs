export const formatCurrency = (value: number): string => {
  return `€${Math.abs(value).toFixed(2)}`
}
