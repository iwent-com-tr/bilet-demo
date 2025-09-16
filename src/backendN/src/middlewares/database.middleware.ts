// Database middleware for handling connection issues
import { Request, Response, NextFunction } from 'express';
import { prisma, isDatabaseConnected, connectToDatabase, testPrismaEngine, restartPrismaEngine } from '../lib/prisma';

// Track if database is fully ready
let isDatabaseReady = false;

/**
 * Mark database as ready after successful initialization
 */
export const markDatabaseReady = (): void => {
  isDatabaseReady = true;
  console.log('✅ Database marked as ready for requests');
};

/**
 * Check if database is ready for requests
 */
export const isDatabaseReadyForRequests = (): boolean => {
  return isDatabaseReady && isDatabaseConnected();
};

/**
 * Middleware to ensure database connection before processing requests
 */
export const ensureDatabaseConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip database check for health endpoints
    if (req.path.includes('/health') || req.path.includes('/db-check')) {
      return next();
    }

    // Check if database is ready
    if (!isDatabaseReadyForRequests()) {
      console.warn('🔄 Database not ready, returning service unavailable');
      res.status(503).json({
        success: false,
        error: 'Database initializing',
        code: 'DATABASE_INITIALIZING',
        message: 'Database is still initializing. Please try again in a moment.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Quick connection test
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      console.error('💔 Database connection test failed during request:', error);
      
      // Check if this is an engine responsiveness issue
      const isEngineResponsive = await testPrismaEngine();
      
      if (!isEngineResponsive) {
        console.log('🔄 Engine unresponsive, attempting restart...');
        try {
          await restartPrismaEngine();
        } catch (restartError) {
          console.error('❌ Engine restart failed:', restartError);
          throw error; // Use original error
        }
      } else {
        // Try regular reconnection
        try {
          console.log('🔄 Attempting database reconnection...');
          await connectToDatabase(2, 1000); // Quick retry
        } catch (reconnectError) {
          console.error('❌ Database reconnection failed:', reconnectError);
          throw error; // Use original error
        }
      }
    }

    next();
  } catch (error: any) {
    console.error('❌ Database middleware error:', error);
    
    // Return appropriate error response
    res.status(503).json({
      success: false,
      error: 'Database temporarily unavailable',
      code: 'DATABASE_UNAVAILABLE',
      message: 'Please try again in a few moments',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware for handling Prisma-specific errors
 */
export const handlePrismaErrors = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle Prisma-specific errors
  if (err.code) {
    switch (err.code) {
      case 'P1001':
        console.error('🚫 Database server unreachable:', err.message);
        res.status(503).json({
          success: false,
          error: 'Database connection failed',
          code: 'DATABASE_UNREACHABLE',
          message: 'Database server is currently unreachable'
        });
        return;
        
      case 'P1002':
        console.error('⏰ Database connection timeout:', err.message);
        res.status(503).json({
          success: false,
          error: 'Database connection timeout',
          code: 'DATABASE_TIMEOUT',
          message: 'Database connection timed out'
        });
        return;
        
      case 'P1008':
        console.error('⏱️ Database operation timeout:', err.message);
        res.status(503).json({
          success: false,
          error: 'Database operation timeout',
          code: 'OPERATION_TIMEOUT',
          message: 'Database operation took too long'
        });
        return;
        
      case 'P2025':
        console.error('🔍 Record not found for update:', err.message);
        res.status(404).json({
          success: false,
          error: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          message: 'The requested record could not be found'
        });
        return;
        
      default:
        console.error('🔧 Prisma error:', err.code, err.message);
        break;
    }
  }
  
  // Handle "Response from the Engine was empty" errors
  if (err.message && err.message.includes('Response from the Engine was empty')) {
    console.error('😱 Prisma engine empty response error:', err.message);
    
    // This indicates engine communication failure
    res.status(503).json({
      success: false,
      error: 'Database engine communication failed',
      code: 'ENGINE_COMMUNICATION_ERROR',
      message: 'Database temporarily unavailable due to engine issues'
    });
    return;
  }

  // If not a handled Prisma error, pass to next error handler
  next(err);
};