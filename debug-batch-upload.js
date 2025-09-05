const { PrismaClient } = require('./src/generated/prisma');

async function debugBatchUpload() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging batch upload process...\n');
    
    // Check users
    const users = await prisma.user.findMany();
    console.log('👥 Users in database:');
    users.forEach(user => {
      console.log(`  - ${user.email} (ID: ${user.id})`);
    });
    
    // Check trades before
    const tradesBefore = await prisma.trade.findMany();
    console.log(`\n📊 Trades before test: ${tradesBefore.length}`);
    
    // Simulate creating a trade (like the batch upload would do)
    if (users.length > 0) {
      const testUser = users[0];
      console.log(`\n🧪 Testing trade creation for user: ${testUser.email}`);
      
      const testTrade = {
        userId: testUser.id,
        symbol: 'TEST',
        type: 'BUY',
        quantity: 10,
        price: 100,
        date: new Date(),
        total: 1000,
        source: 'CSV',
        sourceId: 'test-trade-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const createdTrade = await prisma.trade.create({
        data: testTrade
      });
      
      console.log('✅ Test trade created successfully:', {
        id: createdTrade.id,
        symbol: createdTrade.symbol,
        userId: createdTrade.userId
      });
      
      // Check trades after
      const tradesAfter = await prisma.trade.findMany();
      console.log(`\n📊 Trades after test: ${tradesAfter.length}`);
      
      // Clean up test trade
      await prisma.trade.delete({
        where: { id: createdTrade.id }
      });
      console.log('🧹 Test trade cleaned up');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugBatchUpload();
