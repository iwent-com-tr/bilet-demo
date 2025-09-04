#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { PushSubscriptionService } from './push-subscription.service.js';
import { DevToolsService } from './dev-tools.service.js';

const prisma = new PrismaClient();
const pushSubscriptionService = new PushSubscriptionService(prisma);
const devToolsService = new DevToolsService(prisma);

interface CLIOptions {
  command: string;
  userId?: string;
  endpoint?: string;
  templateId?: string;
  mockMode?: boolean;
  verbose?: boolean;
}

/**
 * Command-line interface for managing push subscriptions
 */
class SubscriptionManagerCLI {
  
  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);
    
    try {
      switch (options.command) {
        case 'list':
          await this.listSubscriptions(options);
          break;
        case 'test':
          await this.testSubscriptions(options);
          break;
        case 'send':
          await this.sendTestNotification(options);
          break;
        case 'cleanup':
          await this.cleanupInvalidSubscriptions(options);
          break;
        case 'stats':
          await this.showStats(options);
          break;
        case 'templates':
          await this.showTemplates(options);
          break;
        case 'mock':
          await this.configureMock(options);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    } finally {
      await prisma.$disconnect();
    }
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {
      command: args[0] || 'help',
    };

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--user-id':
        case '-u':
          options.userId = nextArg;
          i++;
          break;
        case '--endpoint':
        case '-e':
          options.endpoint = nextArg;
          i++;
          break;
        case '--template':
        case '-t':
          options.templateId = nextArg;
          i++;
          break;
        case '--mock':
        case '-m':
          options.mockMode = true;
          break;
        case '--verbose':
        case '-v':
          options.verbose = true;
          break;
      }
    }

    return options;
  }

  private async listSubscriptions(options: CLIOptions): Promise<void> {
    console.log('📋 Listing push subscriptions...\n');

    if (options.userId) {
      const subscriptions = await pushSubscriptionService.getUserSubscriptions(options.userId);
      
      if (subscriptions.length === 0) {
        console.log(`No subscriptions found for user ${options.userId}`);
        return;
      }

      console.log(`Found ${subscriptions.length} subscription(s) for user ${options.userId}:\n`);
      
      subscriptions.forEach((sub, index) => {
        console.log(`${index + 1}. Subscription ID: ${sub.id}`);
        console.log(`   Endpoint: ${sub.endpoint.substring(0, 50)}...`);
        console.log(`   Enabled: ${sub.enabled ? '✅' : '❌'}`);
        console.log(`   User Agent: ${sub.ua || 'Unknown'}`);
        console.log(`   Created: ${sub.createdAt.toISOString()}`);
        console.log(`   Last Seen: ${sub.lastSeenAt.toISOString()}\n`);
      });
    } else {
      const totalSubs = await prisma.pushSubscription.count();
      const activeSubs = await prisma.pushSubscription.count({ where: { enabled: true } });
      const recentSubs = await prisma.pushSubscription.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      });

      console.log(`Total subscriptions: ${totalSubs}`);
      console.log(`Active subscriptions: ${activeSubs}`);
      console.log(`New subscriptions (24h): ${recentSubs}`);

      if (options.verbose) {
        const recentSubscriptions = await prisma.pushSubscription.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, email: true },
            },
          },
        });

        console.log('\n📅 Recent subscriptions:');
        recentSubscriptions.forEach((sub, index) => {
          console.log(`${index + 1}. User: ${sub.user.email || sub.userId}`);
          console.log(`   Endpoint: ${sub.endpoint.substring(0, 50)}...`);
          console.log(`   Created: ${sub.createdAt.toISOString()}\n`);
        });
      }
    }
  }

  private async testSubscriptions(options: CLIOptions): Promise<void> {
    if (!options.userId) {
      throw new Error('User ID is required for testing subscriptions. Use --user-id or -u');
    }

    console.log(`🧪 Testing subscriptions for user ${options.userId}...\n`);

    if (options.mockMode) {
      devToolsService.enableMockMode({
        simulateFailures: true,
        failureRate: 0.1,
        responseDelay: 100,
      });
      console.log('🎭 Mock mode enabled\n');
    }

    const results = await devToolsService.testUserSubscriptions(options.userId);

    if (results.length === 0) {
      console.log('No subscriptions found for testing');
      return;
    }

    console.log(`Test Results (${results.length} subscriptions):\n`);

    results.forEach((result, index) => {
      const status = result.valid ? '✅ Valid' : '❌ Invalid';
      const responseTime = result.responseTime ? `${result.responseTime}ms` : 'N/A';
      
      console.log(`${index + 1}. ${status}`);
      console.log(`   Endpoint: ${result.endpoint.substring(0, 50)}...`);
      console.log(`   Response Time: ${responseTime}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log();
    });

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;

    console.log('📊 Summary:');
    console.log(`   Valid: ${validCount}`);
    console.log(`   Invalid: ${invalidCount}`);
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
  }

  private async sendTestNotification(options: CLIOptions): Promise<void> {
    if (!options.userId) {
      throw new Error('User ID is required for sending notifications. Use --user-id or -u');
    }

    if (!options.templateId) {
      throw new Error('Template ID is required. Use --template or -t. Run "templates" command to see available templates.');
    }

    console.log(`📤 Sending test notification to user ${options.userId}...\n`);

    if (options.mockMode) {
      devToolsService.enableMockMode({
        simulateFailures: false,
        responseDelay: 100,
      });
      console.log('🎭 Mock mode enabled\n');
    }

    const result = await devToolsService.sendTestNotification(
      options.userId,
      options.templateId
    );

    console.log('📊 Send Results:');
    console.log(`   Subscriptions: ${result.subscriptions}`);
    console.log(`   Sent: ${result.sent}`);
    console.log(`   Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (result.sent > 0) {
      console.log('\n✅ Test notification sent successfully!');
    }
  }

  private async cleanupInvalidSubscriptions(options: CLIOptions): Promise<void> {
    console.log('🧹 Cleaning up invalid subscriptions...\n');

    // Get subscriptions that haven't been seen in 30 days
    const staleSubscriptions = await prisma.pushSubscription.findMany({
      where: {
        lastSeenAt: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { endpoint: true },
    });

    if (staleSubscriptions.length === 0) {
      console.log('No stale subscriptions found');
      return;
    }

    console.log(`Found ${staleSubscriptions.length} stale subscriptions`);

    const endpoints = staleSubscriptions.map(sub => sub.endpoint);
    const cleanedCount = await pushSubscriptionService.cleanupInvalidSubscriptions(endpoints);

    console.log(`✅ Cleaned up ${cleanedCount} invalid subscriptions`);
  }

  private async showStats(options: CLIOptions): Promise<void> {
    console.log('📊 Push Notification Statistics\n');

    const stats = await devToolsService.getDevStats();

    console.log(`Total Subscriptions: ${stats.totalSubscriptions}`);
    console.log(`Active Subscriptions: ${stats.activeSubscriptions}`);
    console.log(`Recent Notifications (24h): ${stats.recentNotifications}`);
    console.log(`Error Rate: ${(stats.errorRate * 100).toFixed(2)}%`);

    if (stats.topErrors.length > 0) {
      console.log('\n🔥 Top Errors:');
      stats.topErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error} (${error.count} times)`);
      });
    }

    if (options.verbose) {
      // Additional detailed stats
      const userStats = await prisma.pushSubscription.groupBy({
        by: ['userId'],
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      });

      console.log('\n👥 Top Users by Subscription Count:');
      for (const stat of userStats) {
        const user = await prisma.user.findUnique({
          where: { id: stat.userId },
          select: { email: true },
        });
        console.log(`   ${user?.email || stat.userId}: ${stat._count.userId} subscriptions`);
      }
    }
  }

  private async showTemplates(options: CLIOptions): Promise<void> {
    console.log('📋 Available Test Templates\n');

    const templates = devToolsService.getTestTemplates();

    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.id}`);
      console.log(`   Name: ${template.name}`);
      console.log(`   Description: ${template.description}`);
      
      if (options.verbose) {
        console.log(`   Payload Preview:`);
        console.log(`     Title: ${template.payload.title}`);
        console.log(`     Body: ${template.payload.body}`);
        console.log(`     Type: ${template.payload.type}`);
      }
      console.log();
    });

    console.log(`Use --template <id> to send a specific template`);
  }

  private async configureMock(options: CLIOptions): Promise<void> {
    console.log('🎭 Configuring mock push service...\n');

    devToolsService.enableMockMode({
      simulateFailures: true,
      failureRate: 0.1,
      simulateInvalidEndpoints: true,
      invalidEndpointRate: 0.05,
      responseDelay: 100,
    });

    console.log('✅ Mock mode enabled with default settings:');
    console.log('   - Simulate failures: 10% rate');
    console.log('   - Simulate invalid endpoints: 5% rate');
    console.log('   - Response delay: 100ms');
    console.log('\nUse the web dashboard for more detailed configuration.');
  }

  private showHelp(): void {
    console.log(`
🔔 Push Notification Subscription Manager CLI

Usage: npm run push-cli <command> [options]

Commands:
  list                    List all subscriptions or user-specific subscriptions
  test                    Test subscriptions for a specific user
  send                    Send test notification to a user
  cleanup                 Clean up invalid/stale subscriptions
  stats                   Show push notification statistics
  templates               Show available test templates
  mock                    Configure mock push service
  help                    Show this help message

Options:
  --user-id, -u <id>      User ID for user-specific operations
  --endpoint, -e <url>    Specific endpoint to target
  --template, -t <id>     Template ID for test notifications
  --mock, -m              Enable mock mode for testing
  --verbose, -v           Show detailed output

Examples:
  npm run push-cli list --verbose
  npm run push-cli list --user-id 123e4567-e89b-12d3-a456-426614174000
  npm run push-cli test --user-id 123e4567-e89b-12d3-a456-426614174000 --mock
  npm run push-cli send --user-id 123e4567-e89b-12d3-a456-426614174000 --template event_time_change
  npm run push-cli cleanup
  npm run push-cli stats --verbose
  npm run push-cli templates --verbose
    `);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SubscriptionManagerCLI();
  const args = process.argv.slice(2);
  cli.run(args).catch(console.error);
}

export { SubscriptionManagerCLI };