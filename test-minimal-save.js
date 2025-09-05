// Minimal test to save a trade directly
const { PrismaClient } = require('./src/generated/prisma');

async function testMinimalSave() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing minimal trade save...');
    
    // Create a simple test trade
    const testTrade = await prisma.trade.create({
      data: {
        userId: '68bb400f94dc40c06284ebd3', // Your user ID from logs
        symbol: 'TEST',
        type: 'BUY',
        quantity: 10,
        price: 100,
        date: new Date(),
        total: 1000,
        source: 'CSV',
        sourceId: 'test-' + Date.now(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('✅ Trade created successfully:', testTrade.id);
    
    // Verify it exists
    const count = await prisma.trade.count();
    console.log('📊 Total trades in database:', count);
    
    // Clean up
    await prisma.trade.delete({ where: { id: testTrade.id } });
    console.log('🧹 Test trade cleaned up');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMinimalSave();
