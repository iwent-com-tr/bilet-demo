// Safe Prisma query wrapper to handle engine failures
import { prisma, restartPrismaEngine, testPrismaEngine } from './prisma';

/**
 * Execute a Prisma query with automatic engine restart on failure
 */
export async function executeSafeQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string = 'unknown',
  maxRetries: number = 2
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await queryFn();
      return result;
    } catch (error: any) {
      console.error(`❌ Prisma query '${queryName}' failed (attempt ${attempt}/${maxRetries}):`, error);
      
      // Check if this is an engine communication error
      const isEngineError = error.message && (
        error.message.includes('Response from the Engine was empty') ||
        error.message.includes('Engine is not yet connected') ||
        error.message.includes('Connection lost')
      );
      
      if (isEngineError && attempt < maxRetries) {
        console.log(`🔄 Detected engine error for '${queryName}', attempting restart...`);
        
        try {
          // Test if engine is responsive
          const isResponsive = await testPrismaEngine();
          
          if (!isResponsive) {
            // Engine is unresponsive, restart it
            await restartPrismaEngine();
            console.log(`✅ Engine restarted, retrying query '${queryName}'`);
          } else {
            // Engine seems ok, just wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          continue; // Retry the query
        } catch (restartError) {
          console.error(`❌ Failed to restart engine for '${queryName}':`, restartError);
          // Fall through to throw original error
        }
      }
      
      // If this is the last attempt or not an engine error, throw it
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    }
  }
  
  throw new Error(`Failed to execute query '${queryName}' after ${maxRetries} attempts`);
}

/**
 * Wrapper for common Prisma operations with safe execution
 */
export const safePrisma = {
  // User operations
  user: {
    findMany: (args?: any) => executeSafeQuery(() => prisma.user.findMany(args), 'user.findMany'),
    findFirst: (args?: any) => executeSafeQuery(() => prisma.user.findFirst(args), 'user.findFirst'),
    findUnique: (args: any) => executeSafeQuery(() => prisma.user.findUnique(args), 'user.findUnique'),
    create: (args: any) => executeSafeQuery(() => prisma.user.create(args), 'user.create'),
    update: (args: any) => executeSafeQuery(() => prisma.user.update(args), 'user.update'),
    delete: (args: any) => executeSafeQuery(() => prisma.user.delete(args), 'user.delete'),
    count: (args?: any) => executeSafeQuery(() => prisma.user.count(args), 'user.count'),
  },
  
  // Event operations
  event: {
    findMany: (args?: any) => executeSafeQuery(() => prisma.event.findMany(args), 'event.findMany'),
    findFirst: (args?: any) => executeSafeQuery(() => prisma.event.findFirst(args), 'event.findFirst'),
    findUnique: (args: any) => executeSafeQuery(() => prisma.event.findUnique(args), 'event.findUnique'),
    create: (args: any) => executeSafeQuery(() => prisma.event.create(args), 'event.create'),
    update: (args: any) => executeSafeQuery(() => prisma.event.update(args), 'event.update'),
    delete: (args: any) => executeSafeQuery(() => prisma.event.delete(args), 'event.delete'),
    count: (args?: any) => executeSafeQuery(() => prisma.event.count(args), 'event.count'),
  },
  
  // Raw queries
  $queryRaw: (query: any, ...values: any[]) => executeSafeQuery(() => prisma.$queryRaw(query, ...values), '$queryRaw'),
  $executeRaw: (query: any, ...values: any[]) => executeSafeQuery(() => prisma.$executeRaw(query, ...values), '$executeRaw'),
  
  // Transaction support
  $transaction: (queries: any[]) => executeSafeQuery(() => prisma.$transaction(queries), '$transaction'),
};

export default safePrisma;