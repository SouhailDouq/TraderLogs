/**
 * Alpha Vantage API Client
 * Provides fundamental data (float, shares outstanding, institutional ownership)
 */

const ALPHA_VANTAGE_API_KEY = process.env.NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY || '';
const BASE_URL = 'https://www.alphavantage.co/query';

interface CompanyOverview {
  Symbol: string;
  SharesFloat?: string;
  SharesOutstanding?: string;
  PercentInstitutions?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  Beta?: string;
}

export async function getCompanyFundamentals(symbol: string) {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.log(`⚠️ Alpha Vantage API key not configured`);
    return null;
  }

  try {
    console.log(`📊 Fetching fundamentals for ${symbol} from Alpha Vantage...`);
    
    const url = `${BASE_URL}?function=OVERVIEW&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.log(`⚠️ Alpha Vantage API error: ${response.status}`);
      return null;
    }
    
    const data: CompanyOverview = await response.json();
    
    // Check for rate limit or error
    if ('Note' in data || 'Error Message' in data) {
      console.log(`⚠️ Alpha Vantage rate limit or error for ${symbol}`);
      return null;
    }
    
    // Parse float and institutional ownership
    const sharesFloat = data.SharesFloat ? parseFloat(data.SharesFloat) : null;
    const sharesOutstanding = data.SharesOutstanding ? parseFloat(data.SharesOutstanding) : null;
    const institutionalOwnership = data.PercentInstitutions ? parseFloat(data.PercentInstitutions) * 100 : null;
    
    console.log(`✅ ${symbol} fundamentals: Float=${sharesFloat?.toLocaleString()}, Institutional=${institutionalOwnership?.toFixed(1)}%`);
    
    return {
      symbol: data.Symbol,
      sharesFloat,
      sharesOutstanding,
      institutionalOwnership,
      marketCap: data.MarketCapitalization ? parseFloat(data.MarketCapitalization) : null,
      peRatio: data.PERatio ? parseFloat(data.PERatio) : null,
      beta: data.Beta ? parseFloat(data.Beta) : null
    };
  } catch (error) {
    console.log(`⚠️ Error fetching Alpha Vantage fundamentals for ${symbol}:`, error);
    return null;
  }
}

export async function getTopGainersLosers() {
  console.log('⚠️ Alpha Vantage top gainers/losers not implemented');
  return {
    top_gainers: [],
    top_losers: [],
    most_actively_traded: []
  };
}
