// Temporary stub for Alpha Vantage API
// This file exists only to prevent compilation errors
// TODO: Implement proper Alpha Vantage integration if needed

export async function getCompanyFundamentals(symbol: string) {
  console.log(`⚠️ Alpha Vantage fundamentals not implemented for ${symbol}`);
  return null;
}

export async function getTopGainersLosers() {
  console.log('⚠️ Alpha Vantage top gainers/losers not implemented');
  return {
    top_gainers: [],
    top_losers: [],
    most_actively_traded: []
  };
}
