import { describe, it, expect, vi } from 'vitest';

// Mock VAPID configuration
vi.mock('./vapid-config.js', () => ({
  getVapidConfig: vi.fn(() => ({
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
    subject: 'mailto:test@example.com',
  })),
}));

// Mock Prisma
const mockPrisma = {
  pushSubscription: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  notificationLog: {
    count: vi.fn(),
  },
  pushError: {
    findMany: vi.fn(),
  },
} as any;

describe('DevToolsService Basic Tests', () => {
  it('should import DevToolsService successfully', async () => {
    const { DevToolsService } = await import('./dev-tools.service.js');
    expect(DevToolsService).toBeDefined();
    
    const service = new DevToolsService(mockPrisma);
    expect(service).toBeDefined();
  });

  it('should get test templates', async () => {
    const { DevToolsService } = await import('./dev-tools.service.js');
    const service = new DevToolsService(mockPrisma);
    
    const templates = service.getTestTemplates();
    expect(templates).toHaveLength(5);
    expect(templates[0]).toHaveProperty('id');
    expect(templates[0]).toHaveProperty('name');
    expect(templates[0]).toHaveProperty('payload');
  });

  it('should enable and disable mock mode', async () => {
    const { DevToolsService } = await import('./dev-tools.service.js');
    const service = new DevToolsService(mockPrisma);
    
    // Should not throw
    service.enableMockMode();
    service.disableMockMode();
    
    expect(true).toBe(true);
  });
});