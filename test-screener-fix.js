const { EODHDClient } = require('./src/utils/eodhd.ts');

async function testScreenerFix() {
  console.log('🧪 Testing EODHD screener API fixes...');
  
  try {
    const client = new EODHDClient(process.env.EODHD_API_KEY);
    
    // Test the fixed screener queries
    const result = await client.getPremarketMovers({
      minVolume: 500000,
      maxPrice: 20,
      minMarketCap: 50000000
    });
    
    console.log(`✅ Success! Retrieved ${result.length} stocks`);
    console.log('Sample results:', result.slice(0, 3).map(s => ({
      symbol: s.code,
      price: s.close,
      volume: s.volume,
      change: s.change_p
    })));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('422')) {
      console.error('Still getting 422 errors - field names may still be incorrect');
    }
  }
}

testScreenerFix();
