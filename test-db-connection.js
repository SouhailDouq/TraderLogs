const { PrismaClient } = require('./src/generated/prisma');

async function testConnection() {
  console.log('DATABASE_URL from env:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Test if we can query users
    const userCount = await prisma.user.count();
    console.log(`✅ Found ${userCount} users in database`);
    
    // Test if we can query trades
    const tradeCount = await prisma.trade.count();
    console.log(`✅ Found ${tradeCount} trades in database`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
