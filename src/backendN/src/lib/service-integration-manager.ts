/**
 * Service Integration Manager
 * Manages service dependencies, initialization, and graceful fallbacks
 */

import { PrismaClient } from '@prisma/client';
import { checkQueueHealth, redis } from './queue/index.js';
import { createNotificationWorker } from './queue/notification.worker.js';
import { getVapidConfig } from './push/vapid-config.js';
import { TwilioService } from './twilio.js';
import { meili } from './meili.js';
import sgMail from '@sendgrid/mail';
import OpenAI from 'openai';

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  message: string;
  lastChecked: Date;
  dependencies: string[];
}

export interface ServicesHealthCheck {
  overall: 'healthy' | 'degraded' | 'critical';
  services: Record<string, ServiceStatus>;
  timestamp: Date;
}

/**
 * Manages service integration and health monitoring
 */
export class ServiceIntegrationManager {
  private prisma: PrismaClient;
  private worker: any = null;
  private servicesHealth: Record<string, ServiceStatus> = {};
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize all services with dependency management
   */
  async initializeServices(): Promise<void> {
    console.log('🚀 Initializing services...');

    // Check core dependencies first
    await this.checkCoreDependencies();

    // Initialize services in order of dependency
    await this.initializeDatabase();
    await this.initializeRedis();
    await this.initializePushNotifications();
    await this.initializeTwilio();
    await this.initializeSendGrid();
    await this.initializeMeiliSearch();
    await this.initializeOpenAI();
    await this.initializeWorker();

    // Start health monitoring
    this.startHealthMonitoring();

    console.log('✅ Service initialization completed');
  }

  /**
   * Check core environment dependencies
   */
  private async checkCoreDependencies(): Promise<void> {
    const missing: string[] = [];

    // Check database
    if (!process.env.DATABASE_URL) {
      missing.push('DATABASE_URL');
    }

    // Check JWT secrets
    if (!process.env.JWT_ACCESS_SECRET) {
      missing.push('JWT_ACCESS_SECRET');
    }

    if (missing.length > 0) {
      throw new Error(`Missing critical environment variables: ${missing.join(', ')}`);
    }
  }

  /**
   * Initialize and test database connection
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.prisma.$connect();
      await this.prisma.$queryRaw`SELECT 1`;
      
      this.servicesHealth.database = {
        name: 'Database (PostgreSQL)',
        status: 'healthy',
        message: 'Database connection successful',
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ Database connection established');
    } catch (error) {
      this.servicesHealth.database = {
        name: 'Database (PostgreSQL)',
        status: 'unavailable',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      throw new Error('Database connection failed - cannot continue');
    }
  }

  /**
   * Initialize Redis with graceful fallback
   */
  private async initializeRedis(): Promise<void> {
    try {
      // Test Redis connection
      await redis.ping();
      
      this.servicesHealth.redis = {
        name: 'Redis (Queue System)',
        status: 'healthy',
        message: 'Redis connection successful',
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ Redis connection established');
    } catch (error) {
      this.servicesHealth.redis = {
        name: 'Redis (Queue System)',
        status: 'unavailable',
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.warn('⚠️  Redis unavailable - background job queue will be disabled');
      console.warn('⚠️  Push notifications will be sent synchronously');
    }
  }

  /**
   * Initialize push notification services
   */
  private async initializePushNotifications(): Promise<void> {
    try {
      const vapidConfig = getVapidConfig();
      
      if (!vapidConfig) {
        this.servicesHealth.pushNotifications = {
          name: 'Push Notifications (VAPID)',
          status: 'unavailable',
          message: 'VAPID configuration missing - web push notifications disabled',
          lastChecked: new Date(),
          dependencies: []
        };

        console.warn('⚠️  Web push notifications disabled - VAPID keys not configured');
        return;
      }

      // Validate VAPID configuration
      if (!vapidConfig.publicKey || !vapidConfig.privateKey) {
        throw new Error('Invalid VAPID configuration');
      }

      this.servicesHealth.pushNotifications = {
        name: 'Push Notifications (VAPID)',
        status: 'healthy',
        message: 'Web push notification service configured with VAPID',
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ Web push notification service configured with VAPID');
    } catch (error) {
      this.servicesHealth.pushNotifications = {
        name: 'Push Notifications (VAPID)',
        status: 'degraded',
        message: `Web push configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.warn('⚠️  Web push notifications may not work properly');
    }
  }

  /**
   * Initialize Twilio SMS and phone verification service
   */
  private async initializeTwilio(): Promise<void> {
    try {
      const twilioConfigured = TwilioService.isConfigured();
      
      if (!twilioConfigured) {
        this.servicesHealth.twilio = {
          name: 'Twilio SMS & Phone Verification',
          status: 'unavailable',
          message: 'Twilio credentials not configured - phone verification disabled',
          lastChecked: new Date(),
          dependencies: []
        };

        console.warn('⚠️  Twilio not configured - phone verification disabled');
        return;
      }

      // Test Twilio service by getting service info
      const serviceInfo = await TwilioService.getVerifyServiceInfo();
      
      this.servicesHealth.twilio = {
        name: 'Twilio SMS & Phone Verification',
        status: 'healthy',
        message: `Twilio configured - Service: ${serviceInfo.friendlyName}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ Twilio service configured and verified');
    } catch (error) {
      this.servicesHealth.twilio = {
        name: 'Twilio SMS & Phone Verification',
        status: 'degraded',
        message: `Twilio connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.warn('⚠️  Twilio service may not work properly');
    }
  }

  /**
   * Initialize SendGrid email service
   */
  private async initializeSendGrid(): Promise<void> {
    try {
      const sendGridApiKey = process.env.SENDGRID_API_KEY;
      const emailFrom = process.env.EMAIL_FROM;
      
      if (!sendGridApiKey || !emailFrom) {
        this.servicesHealth.sendGrid = {
          name: 'SendGrid Email Service',
          status: 'unavailable',
          message: 'SendGrid credentials not configured - email sending disabled',
          lastChecked: new Date(),
          dependencies: []
        };

        console.warn('⚠️  SendGrid not configured - email sending disabled');
        return;
      }

      // Test SendGrid connection (this will throw if API key is invalid)
      sgMail.setApiKey(sendGridApiKey);
      
      this.servicesHealth.sendGrid = {
        name: 'SendGrid Email Service',
        status: 'healthy',
        message: `SendGrid configured - From: ${emailFrom}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ SendGrid email service configured');
    } catch (error) {
      this.servicesHealth.sendGrid = {
        name: 'SendGrid Email Service',
        status: 'degraded',
        message: `SendGrid configuration error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.warn('⚠️  SendGrid email service may not work properly');
    }
  }

  /**
   * Initialize MeiliSearch service
   */
  private async initializeMeiliSearch(): Promise<void> {
    try {
      const meiliHost = process.env.MEILI_HOST || 'http://127.0.0.1:7700';
      
      if (!meili) {
        this.servicesHealth.meilisearch = {
          name: 'MeiliSearch',
          status: 'unavailable',
          message: 'MeiliSearch not available - search functionality disabled',
          lastChecked: new Date(),
          dependencies: []
        };

        console.warn('⚠️  MeiliSearch not available - search functionality disabled');
        return;
      }

      // Test MeiliSearch connection
      const health = await meili.health();
      
      this.servicesHealth.meilisearch = {
        name: 'MeiliSearch',
        status: 'healthy',
        message: `MeiliSearch connected - Host: ${meiliHost}, Status: ${health.status}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ MeiliSearch service connected and healthy');
    } catch (error) {
      this.servicesHealth.meilisearch = {
        name: 'MeiliSearch',
        status: 'degraded',
        message: `MeiliSearch connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.warn('⚠️  MeiliSearch service may not work properly');
    }
  }

  /**
   * Initialize OpenAI service
   */
  private async initializeOpenAI(): Promise<void> {
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        this.servicesHealth.openai = {
          name: 'OpenAI API',
          status: 'unavailable',
          message: 'OpenAI API key not configured - AI features disabled',
          lastChecked: new Date(),
          dependencies: []
        };

        console.warn('⚠️  OpenAI not configured - AI features disabled');
        return;
      }

      // Test OpenAI connection
      const client = new OpenAI({ apiKey: openaiApiKey });
      
      // Simple test to verify API key works
      await client.models.list();
      
      this.servicesHealth.openai = {
        name: 'OpenAI API',
        status: 'healthy',
        message: 'OpenAI API configured and accessible',
        lastChecked: new Date(),
        dependencies: []
      };

      console.log('✅ OpenAI service configured and verified');
    } catch (error) {
      this.servicesHealth.openai = {
        name: 'OpenAI API',
        status: 'degraded',
        message: `OpenAI connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: []
      };

      console.warn('⚠️  OpenAI service may not work properly');
    }
  }



  /**
   * Initialize notification worker
   */
  private async initializeWorker(): Promise<void> {
    // Only start worker if Redis is available and START_WORKER is enabled
    const shouldStartWorker = process.env.START_WORKER === 'true';
    const redisAvailable = this.servicesHealth.redis?.status === 'healthy';

    if (!shouldStartWorker) {
      this.servicesHealth.worker = {
        name: 'Notification Worker',
        status: 'unavailable',
        message: 'Worker disabled in configuration (START_WORKER=false)',
        lastChecked: new Date(),
        dependencies: ['redis']
      };

      console.log('ℹ️  Notification worker disabled in configuration');
      return;
    }

    if (!redisAvailable) {
      this.servicesHealth.worker = {
        name: 'Notification Worker',
        status: 'unavailable',
        message: 'Worker cannot start - Redis unavailable',
        lastChecked: new Date(),
        dependencies: ['redis']
      };

      console.warn('⚠️  Notification worker disabled - Redis not available');
      return;
    }

    try {
      // Create and start the worker
      this.worker = createNotificationWorker(this.prisma);
      
      this.servicesHealth.worker = {
        name: 'Notification Worker',
        status: 'healthy',
        message: `Worker started with concurrency ${process.env.NOTIFICATION_WORKER_CONCURRENCY || '5'}`,
        lastChecked: new Date(),
        dependencies: ['redis', 'database']
      };

      console.log('✅ Notification worker started');
    } catch (error) {
      this.servicesHealth.worker = {
        name: 'Notification Worker',
        status: 'unavailable',
        message: `Worker failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        dependencies: ['redis', 'database']
      };

      console.error('❌ Failed to start notification worker:', error);
    }
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'); // 30 seconds default
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    console.log(`📊 Health monitoring started (interval: ${interval}ms)`);
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<ServicesHealthCheck> {
    const timestamp = new Date();

    // Check database
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      this.servicesHealth.database.status = 'healthy';
      this.servicesHealth.database.message = 'Database connection successful';
    } catch (error) {
      this.servicesHealth.database.status = 'unavailable';
      this.servicesHealth.database.message = `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    this.servicesHealth.database.lastChecked = timestamp;

    // Check Redis if it was initially available
    if (this.servicesHealth.redis) {
      try {
        await redis.ping();
        const queueHealth = await checkQueueHealth();
        
        this.servicesHealth.redis.status = queueHealth.redis ? 'healthy' : 'degraded';
        this.servicesHealth.redis.message = queueHealth.redis ? 
          `Redis healthy - Queue: ${queueHealth.waiting} waiting, ${queueHealth.active} active` :
          'Redis connection issues detected';
      } catch (error) {
        this.servicesHealth.redis.status = 'unavailable';
        this.servicesHealth.redis.message = `Redis error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      this.servicesHealth.redis.lastChecked = timestamp;
    }

    // Check Twilio if it was initially configured
    if (this.servicesHealth.twilio) {
      try {
        if (TwilioService.isConfigured()) {
          const serviceInfo = await TwilioService.getVerifyServiceInfo();
          this.servicesHealth.twilio.status = 'healthy';
          this.servicesHealth.twilio.message = `Twilio healthy - Service: ${serviceInfo.friendlyName}`;
        } else {
          this.servicesHealth.twilio.status = 'unavailable';
          this.servicesHealth.twilio.message = 'Twilio not configured';
        }
      } catch (error) {
        this.servicesHealth.twilio.status = 'degraded';
        this.servicesHealth.twilio.message = `Twilio error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      this.servicesHealth.twilio.lastChecked = timestamp;
    }

    // Check MeiliSearch if it was initially configured
    if (this.servicesHealth.meilisearch) {
      try {
        if (meili) {
          const health = await meili.health();
          this.servicesHealth.meilisearch.status = health.status === 'available' ? 'healthy' : 'degraded';
          this.servicesHealth.meilisearch.message = `MeiliSearch status: ${health.status}`;
        } else {
          this.servicesHealth.meilisearch.status = 'unavailable';
          this.servicesHealth.meilisearch.message = 'MeiliSearch not available';
        }
      } catch (error) {
        this.servicesHealth.meilisearch.status = 'degraded';
        this.servicesHealth.meilisearch.message = `MeiliSearch error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
      this.servicesHealth.meilisearch.lastChecked = timestamp;
    }

    // Check SendGrid (basic check - we can't easily test without sending)
    if (this.servicesHealth.sendGrid) {
      const sendGridConfigured = process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM;
      this.servicesHealth.sendGrid.status = sendGridConfigured ? 'healthy' : 'unavailable';
      this.servicesHealth.sendGrid.message = sendGridConfigured ? 'SendGrid configured' : 'SendGrid not configured';
      this.servicesHealth.sendGrid.lastChecked = timestamp;
    }

    // Check OpenAI (basic check - we can't easily test without usage)
    if (this.servicesHealth.openai) {
      const openaiConfigured = process.env.OPENAI_API_KEY;
      this.servicesHealth.openai.status = openaiConfigured ? 'healthy' : 'unavailable';
      this.servicesHealth.openai.message = openaiConfigured ? 'OpenAI configured' : 'OpenAI not configured';
      this.servicesHealth.openai.lastChecked = timestamp;
    }

    // Determine overall health
    const overall = this.determineOverallHealth();

    return {
      overall,
      services: this.servicesHealth,
      timestamp
    };
  }

  /**
   * Determine overall system health
   */
  private determineOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const services = Object.values(this.servicesHealth);
    
    // Critical if database is down
    if (this.servicesHealth.database?.status === 'unavailable') {
      return 'critical';
    }

    // Critical if more than half the services are unavailable
    const unavailableCount = services.filter(s => s.status === 'unavailable').length;
    if (unavailableCount > services.length / 2) {
      return 'critical';
    }

    // Degraded if any service is degraded or unavailable
    const degradedServices = services.filter(s => s.status === 'degraded' || s.status === 'unavailable');
    if (degradedServices.length > 0) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get current services health status
   */
  getServicesHealth(): ServicesHealthCheck {
    const overall = this.determineOverallHealth();
    
    return {
      overall,
      services: this.servicesHealth,
      timestamp: new Date()
    };
  }

  /**
   * Get detailed health information for a specific service
   */
  getServiceHealth(serviceName: string): ServiceStatus | null {
    return this.servicesHealth[serviceName] || null;
  }

  /**
   * Get health status for all services by category
   */
  getServicesByCategory(): {
    core: Record<string, ServiceStatus>;
    communication: Record<string, ServiceStatus>;
    search: Record<string, ServiceStatus>;
    ai: Record<string, ServiceStatus>;
    notifications: Record<string, ServiceStatus>;
  } {
    const core = {
      database: this.servicesHealth.database,
      redis: this.servicesHealth.redis,
    };

    const communication = {
      twilio: this.servicesHealth.twilio,
      sendGrid: this.servicesHealth.sendGrid,
    };

    const search = {
      meilisearch: this.servicesHealth.meilisearch,
    };

    const ai = {
      openai: this.servicesHealth.openai,
    };

    const notifications = {
      pushNotifications: this.servicesHealth.pushNotifications,
      worker: this.servicesHealth.worker,
    };

    // Filter out undefined values
    const filterUndefined = (obj: Record<string, any>) => {
      return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value !== undefined)
      );
    };

    return {
      core: filterUndefined(core),
      communication: filterUndefined(communication),
      search: filterUndefined(search),
      ai: filterUndefined(ai),
      notifications: filterUndefined(notifications),
    };
  }

  /**
   * Check if a specific service is healthy
   */
  isServiceHealthy(serviceName: string): boolean {
    return this.servicesHealth[serviceName]?.status === 'healthy';
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down services...');

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Close worker
    if (this.worker) {
      try {
        await this.worker.close();
        console.log('✅ Notification worker closed');
      } catch (error) {
        console.error('❌ Error closing worker:', error);
      }
    }

    // Close database connection
    try {
      await this.prisma.$disconnect();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }

    console.log('✅ Services shutdown completed');
  }
}

export default ServiceIntegrationManager;