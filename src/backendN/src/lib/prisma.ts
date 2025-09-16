import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Enhanced Prisma client configuration for production stability
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    errorFormat: 'minimal',
  });

// Enhanced connection management
let isConnected = false;

// Function to establish database connection with retry logic
export const connectToDatabase = async (maxRetries = 5, delay = 2000): Promise<void> => {
  if (isConnected) {
    return;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Ensure clean connection state
      await prisma.$disconnect();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between disconnect/connect
      
      // Connect to database
      await prisma.$connect();
      
      // Test the connection with a simple query
      await prisma.$queryRaw`SELECT 1 as test`;
      
      // Test a real table query to ensure engine is working
      await prisma.user.findFirst({ select: { id: true } });
      
      isConnected = true;
      console.log('✅ Database connected successfully');
      return;
    } catch (error) {
      handlePrismaError(error);
      console.error(`❌ Database connection attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error('❌ All database connection attempts failed. Exiting...');
        throw new Error(`Failed to connect to database after ${maxRetries} attempts: ${error}`);
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// Function to gracefully disconnect
export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    isConnected = false;
    console.log('✅ Database disconnected successfully');
  } catch (error) {
    handlePrismaError(error);
    console.error('❌ Error disconnecting from database:', error);
  }
};

// Function to check connection status
export const isDatabaseConnected = (): boolean => {
  return isConnected;
};

// Function to restart Prisma engine when it becomes unresponsive
export const restartPrismaEngine = async (): Promise<void> => {
  try {
    console.log('🔄 Restarting Prisma engine...');
    isConnected = false;
    
    // Force disconnect
    await prisma.$disconnect();
    
    // Wait a moment for engine to fully shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconnect
    await connectToDatabase(3, 1000);
    
    console.log('✅ Prisma engine restarted successfully');
  } catch (error) {
    console.error('❌ Failed to restart Prisma engine:', error);
    throw error;
  }
};

// Function to test if Prisma engine is responsive
export const testPrismaEngine = async (): Promise<boolean> => {
  try {
    // Test with a quick query that should always work
    await prisma.$queryRaw`SELECT 1 as test`;
    return true;
  } catch (error) {
    console.error('💔 Prisma engine test failed:', error);
    return false;
  }
};

// Prisma connection error handler (commented out due to TypeScript compatibility)
// prisma.$on('error', (e) => {
//   console.error('❌ Prisma error event:', e);
//   isConnected = false;
// });

// Alternative: Handle errors in the connection functions instead
const handlePrismaError = (error: any): void => {
  console.error('❌ Prisma error:', error);
  isConnected = false;
};

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
