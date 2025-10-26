#!/usr/bin/env node

/**
 * Migrate Trades from localStorage to Database
 * 
 * This script helps you migrate trades that are stored in browser localStorage
 * to the database so they appear in production.
 */

console.log('\n📦 Trade Migration Guide\n');
console.log('=' .repeat(60));

console.log('\n🎯 ISSUE IDENTIFIED:\n');
console.log('   Your trades are stored in browser localStorage (local only)');
console.log('   They need to be in the database to appear in production.\n');

console.log('💡 SOLUTION - Choose one of these methods:\n');

console.log('─'.repeat(60));
console.log('\n📄 METHOD 1: Export/Import via CSV (RECOMMENDED)\n');
console.log('   This is the easiest and safest method.\n');

console.log('   Step 1: Export from Local Browser');
console.log('   ──────────────────────────────────');
console.log('   1. Open your LOCAL app: http://localhost:3000');
console.log('   2. Go to Dashboard (homepage)');
console.log('   3. Look for "Upload Trades" or "Import/Export" section');
console.log('   4. Click "Export to CSV" or "Download Trades"');
console.log('   5. Save the CSV file\n');

console.log('   Step 2: Import to Database');
console.log('   ──────────────────────────');
console.log('   1. Stay on LOCAL app (to test first)');
console.log('   2. Click "Upload CSV" or "Import Trades"');
console.log('   3. Select your exported CSV file');
console.log('   4. Click "Import" - trades will save to database');
console.log('   5. Refresh page - trades should still be there');
console.log('   6. Check production - trades should now appear!\n');

console.log('─'.repeat(60));
console.log('\n🔧 METHOD 2: Manual Database Entry\n');
console.log('   If you only have a few trades, add them manually.\n');

console.log('   1. Open your LOCAL app: http://localhost:3000');
console.log('   2. Go to "Trade Entry" page');
console.log('   3. Enter each trade manually');
console.log('   4. Trades will save to database automatically');
console.log('   5. Check production - trades should appear!\n');

console.log('─'.repeat(60));
console.log('\n🔍 METHOD 3: Extract from Browser Console\n');
console.log('   For advanced users - extract localStorage data.\n');

console.log('   Step 1: Get localStorage Data');
console.log('   ─────────────────────────────');
console.log('   1. Open LOCAL app in browser');
console.log('   2. Open DevTools (F12)');
console.log('   3. Go to Console tab');
console.log('   4. Run this command:\n');
console.log('      ```javascript');
console.log('      const trades = JSON.parse(localStorage.getItem("trade-store") || "{}");');
console.log('      console.log(JSON.stringify(trades.state?.trades || [], null, 2));');
console.log('      ```\n');
console.log('   5. Copy the output (your trades in JSON format)\n');

console.log('   Step 2: Import via API');
console.log('   ─────────────────────');
console.log('   1. Save the JSON to a file: trades.json');
console.log('   2. Use the import script (coming next)');
console.log('   3. Or manually add via Trade Entry page\n');

console.log('─'.repeat(60));
console.log('\n✅ RECOMMENDED WORKFLOW:\n');
console.log('   1. Use METHOD 1 (CSV Export/Import) - safest & easiest');
console.log('   2. Test on local first to verify it works');
console.log('   3. Once working locally, check production');
console.log('   4. Trades should automatically sync (same database)\n');

console.log('─'.repeat(60));
console.log('\n🔍 VERIFY AFTER MIGRATION:\n');
console.log('   Run: npm run check-users');
console.log('   You should see: "📈 Trades: X" (where X > 0)\n');

console.log('─'.repeat(60));
console.log('\n❓ WHY THIS HAPPENED:\n');
console.log('   - Old version stored trades in browser localStorage');
console.log('   - localStorage is local to each browser/device');
console.log('   - Database stores trades centrally for all devices');
console.log('   - After migration, trades work everywhere!\n');

console.log('─'.repeat(60));
console.log('\n🎯 NEXT STEPS:\n');
console.log('   1. Choose a migration method above');
console.log('   2. Export your trades from local browser');
console.log('   3. Import them via CSV upload');
console.log('   4. Run: npm run check-users (should show trades)');
console.log('   5. Check production - trades should appear!\n');

console.log('Need help? Check the CSV upload feature in your dashboard.\n');
