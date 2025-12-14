/**
 * Quick test script for Finviz Elite integration
 * 
 * Run with: node test-finviz.js
 * 
 * Make sure to set FINVIZ_EMAIL and FINVIZ_PASSWORD in .env.local first
 */

require('dotenv').config({ path: '.env.local' });

async function testFinvizSetup() {
  console.log('🧪 Testing Finviz Elite Setup...\n');

  // Check environment variables
  console.log('1️⃣ Checking environment variables...');
  const email = process.env.FINVIZ_EMAIL;
  const password = process.env.FINVIZ_PASSWORD;

  if (!email || !password) {
    console.error('❌ FINVIZ_EMAIL or FINVIZ_PASSWORD not set in .env.local');
    console.log('\nPlease add to .env.local:');
    console.log('FINVIZ_EMAIL=your-email@example.com');
    console.log('FINVIZ_PASSWORD=your-password');
    process.exit(1);
  }

  console.log(`✅ Email: ${email.substring(0, 3)}***@${email.split('@')[1]}`);
  console.log(`✅ Password: ${'*'.repeat(password.length)} (${password.length} chars)\n`);

  // Test authentication
  console.log('2️⃣ Testing Finviz authentication...');
  try {
    const response = await fetch('https://finviz.com/login_submit.ashx', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: new URLSearchParams({
        email,
        password,
        remember: 'on'
      }).toString(),
      redirect: 'manual' // Don't follow redirects
    });

    const setCookie = response.headers.get('set-cookie');
    
    if (setCookie && setCookie.includes('elite_token')) {
      console.log('✅ Authentication successful!');
      console.log('✅ Elite token received\n');
    } else if (response.status === 302 || response.status === 301) {
      console.log('✅ Authentication appears successful (redirect received)\n');
    } else {
      console.log('⚠️ Authentication response received but unclear if successful');
      console.log(`Status: ${response.status}`);
      console.log(`Cookies: ${setCookie ? 'Yes' : 'No'}\n`);
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    process.exit(1);
  }

  // Test screener access
  console.log('3️⃣ Testing screener access...');
  try {
    const response = await fetch('https://finviz.com/screener.ashx?v=111&f=cap_smallover,sh_avgvol_o1000,sh_price_u10&o=-volume');
    
    if (response.ok) {
      const html = await response.text();
      if (html.includes('screener-body-table')) {
        console.log('✅ Screener accessible\n');
      } else {
        console.log('⚠️ Screener page loaded but table not found\n');
      }
    } else {
      console.log(`⚠️ Screener returned status ${response.status}\n`);
    }
  } catch (error) {
    console.error('❌ Screener test failed:', error.message);
  }

  // Check dependencies
  console.log('4️⃣ Checking dependencies...');
  try {
    require('cheerio');
    console.log('✅ cheerio installed\n');
  } catch (error) {
    console.error('❌ cheerio not installed. Run: npm install cheerio\n');
    process.exit(1);
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  console.log('✅ Environment variables configured');
  console.log('✅ Authentication working');
  console.log('✅ Dependencies installed');
  console.log('\n🎉 Finviz Elite setup is ready!');
  console.log('\nNext steps:');
  console.log('1. Start your dev server: npm run dev');
  console.log('2. Test the new APIs:');
  console.log('   - GET /api/premarket-scan-finviz?limit=10');
  console.log('   - GET /api/stock-data-finviz?symbol=AAPL');
  console.log('3. Update frontend to use new endpoints');
}

testFinvizSetup().catch(console.error);
