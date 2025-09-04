import { Request, Response } from 'express';
import { ZodError, z } from 'zod';
import { DevToolsService } from '../../lib/push/dev-tools.service.js';
import { prisma } from '../../lib/prisma.js';

// Validation schemas
const TestNotificationRequestSchema = z.object({
  userId: z.string().uuid(),
  templateId: z.string(),
  customPayload: z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    url: z.string().optional(),
    icon: z.string().optional(),
    badge: z.string().optional(),
  }).optional(),
});

const MockConfigRequestSchema = z.object({
  enabled: z.boolean(),
  options: z.object({
    simulateFailures: z.boolean().optional(),
    failureRate: z.number().min(0).max(1).optional(),
    simulateInvalidEndpoints: z.boolean().optional(),
    invalidEndpointRate: z.number().min(0).max(1).optional(),
    responseDelay: z.number().min(0).max(5000).optional(),
  }).optional(),
});

const PayloadDebugRequestSchema = z.object({
  payload: z.object({
    type: z.string(),
    eventId: z.string(),
    title: z.string(),
    body: z.string(),
    url: z.string(),
    icon: z.string().optional(),
    badge: z.string().optional(),
    actions: z.array(z.object({
      action: z.string(),
      title: z.string(),
      icon: z.string().optional(),
    })).optional(),
    change: z.object({
      field: z.string(),
      oldValue: z.any(),
      newValue: z.any(),
    }).optional(),
  }),
});

/**
 * Development controller for push notification testing and debugging
 * Only available in development environment
 */
export class DevController {
  private devToolsService: DevToolsService;

  constructor() {
    this.devToolsService = new DevToolsService(prisma);
  }

  /**
   * GET /api/push/dev/templates
   * Get available test notification templates
   */
  getTestTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = this.devToolsService.getTestTemplates();
      res.json({
        templates,
        count: templates.length,
      });
    } catch (error) {
      console.error('Error getting test templates:', error);
      res.status(500).json({
        error: 'Failed to get test templates',
        code: 'TEMPLATES_ERROR',
      });
    }
  };

  /**
   * POST /api/push/dev/test-notification
   * Send test notification to specific user
   */
  sendTestNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = TestNotificationRequestSchema.parse(req.body);
      
      const result = await this.devToolsService.sendTestNotification(
        validatedData.userId,
        validatedData.templateId,
        validatedData.customPayload
      );

      res.json({
        message: 'Test notification sent',
        result,
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to send test notification',
        code: 'TEST_NOTIFICATION_ERROR',
      });
    }
  };

  /**
   * POST /api/push/dev/test-subscriptions
   * Test all subscriptions for a user
   */
  testUserSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'MISSING_USER_ID',
        });
        return;
      }

      const results = await this.devToolsService.testUserSubscriptions(userId);

      res.json({
        message: 'Subscription test completed',
        results,
        summary: {
          total: results.length,
          valid: results.filter(r => r.valid).length,
          invalid: results.filter(r => !r.valid).length,
          averageResponseTime: results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length,
        },
      });
    } catch (error) {
      console.error('Error testing user subscriptions:', error);
      res.status(500).json({
        error: 'Failed to test user subscriptions',
        code: 'SUBSCRIPTION_TEST_ERROR',
      });
    }
  };

  /**
   * POST /api/push/dev/mock-config
   * Configure mock push service for local development
   */
  configureMockService = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = MockConfigRequestSchema.parse(req.body);
      
      if (validatedData.enabled) {
        this.devToolsService.enableMockMode(validatedData.options);
        res.json({
          message: 'Mock push service enabled',
          config: validatedData.options,
        });
      } else {
        this.devToolsService.disableMockMode();
        res.json({
          message: 'Mock push service disabled',
        });
      }
    } catch (error) {
      console.error('Error configuring mock service:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid mock configuration',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to configure mock service',
        code: 'MOCK_CONFIG_ERROR',
      });
    }
  };

  /**
   * POST /api/push/dev/debug-payload
   * Debug notification payload
   */
  debugPayload = async (req: Request, res: Response): Promise<void> => {
    try {
      const validatedData = PayloadDebugRequestSchema.parse(req.body);
      
      const debugInfo = this.devToolsService.debugPayload(validatedData.payload);

      res.json({
        message: 'Payload analysis completed',
        debug: debugInfo,
      });
    } catch (error) {
      console.error('Error debugging payload:', error);
      
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Invalid payload data',
          code: 'VALIDATION_ERROR',
          details: error.issues.map(issue => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to debug payload',
        code: 'PAYLOAD_DEBUG_ERROR',
      });
    }
  };

  /**
   * GET /api/push/dev/stats
   * Get development statistics
   */
  getDevStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.devToolsService.getDevStats();

      res.json({
        message: 'Development statistics retrieved',
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error getting dev stats:', error);
      res.status(500).json({
        error: 'Failed to get development statistics',
        code: 'DEV_STATS_ERROR',
      });
    }
  };

  /**
   * GET /api/push/dev/dashboard
   * Serve development dashboard HTML
   */
  getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const dashboardHtml = this.generateDashboardHtml();
      res.setHeader('Content-Type', 'text/html');
      res.send(dashboardHtml);
    } catch (error) {
      console.error('Error serving dashboard:', error);
      res.status(500).json({
        error: 'Failed to serve dashboard',
        code: 'DASHBOARD_ERROR',
      });
    }
  };

  /**
   * Generate HTML for development dashboard
   */
  private generateDashboardHtml(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Push Notifications Development Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        
        .header h1 {
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .card h2 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.2em;
        }
        
        .form-group {
            margin-bottom: 15px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .form-group textarea {
            height: 100px;
            resize: vertical;
        }
        
        .btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
        }
        
        .btn:hover {
            background: #2980b9;
        }
        
        .btn-success {
            background: #27ae60;
        }
        
        .btn-success:hover {
            background: #229954;
        }
        
        .btn-warning {
            background: #f39c12;
        }
        
        .btn-warning:hover {
            background: #e67e22;
        }
        
        .btn-danger {
            background: #e74c3c;
        }
        
        .btn-danger:hover {
            background: #c0392b;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .stat-item {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: #3498db;
        }
        
        .stat-label {
            color: #7f8c8d;
            font-size: 0.9em;
        }
        
        .result {
            margin-top: 15px;
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .result.success {
            background: #d5f4e6;
            border: 1px solid #27ae60;
            color: #1e8449;
        }
        
        .result.error {
            background: #fadbd8;
            border: 1px solid #e74c3c;
            color: #c0392b;
        }
        
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
        }
        
        .checkbox-group input[type="checkbox"] {
            width: auto;
        }
        
        .templates {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
        }
        
        .template-item {
            padding: 8px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .template-item:hover {
            background: #f8f9fa;
        }
        
        .template-item:last-child {
            border-bottom: none;
        }
        
        .template-name {
            font-weight: 500;
            color: #2c3e50;
        }
        
        .template-desc {
            font-size: 0.9em;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Push Notifications Development Dashboard</h1>
            <p>Test and debug push notifications for the iWent PWA</p>
        </div>
        
        <div id="stats" class="stats">
            <!-- Stats will be loaded here -->
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>📤 Send Test Notification</h2>
                <form id="testNotificationForm">
                    <div class="form-group">
                        <label for="userId">User ID:</label>
                        <input type="text" id="userId" name="userId" placeholder="Enter user UUID" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="templateId">Template:</label>
                        <select id="templateId" name="templateId" required>
                            <option value="">Select a template...</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="customTitle">Custom Title (optional):</label>
                        <input type="text" id="customTitle" name="customTitle" placeholder="Override template title">
                    </div>
                    
                    <div class="form-group">
                        <label for="customBody">Custom Body (optional):</label>
                        <textarea id="customBody" name="customBody" placeholder="Override template body"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-success">Send Test Notification</button>
                </form>
                <div id="testResult" class="result" style="display: none;"></div>
            </div>
            
            <div class="card">
                <h2>🔍 Test User Subscriptions</h2>
                <form id="testSubscriptionsForm">
                    <div class="form-group">
                        <label for="testUserId">User ID:</label>
                        <input type="text" id="testUserId" name="testUserId" placeholder="Enter user UUID" required>
                    </div>
                    
                    <button type="submit" class="btn btn-warning">Test All Subscriptions</button>
                </form>
                <div id="subscriptionTestResult" class="result" style="display: none;"></div>
            </div>
            
            <div class="card">
                <h2>🎭 Mock Service Configuration</h2>
                <form id="mockConfigForm">
                    <div class="checkbox-group">
                        <input type="checkbox" id="mockEnabled" name="mockEnabled">
                        <label for="mockEnabled">Enable Mock Mode</label>
                    </div>
                    
                    <div class="form-group">
                        <label for="failureRate">Failure Rate (0-1):</label>
                        <input type="number" id="failureRate" name="failureRate" min="0" max="1" step="0.1" value="0.1">
                    </div>
                    
                    <div class="checkbox-group">
                        <input type="checkbox" id="simulateFailures" name="simulateFailures">
                        <label for="simulateFailures">Simulate Failures</label>
                    </div>
                    
                    <div class="checkbox-group">
                        <input type="checkbox" id="simulateInvalidEndpoints" name="simulateInvalidEndpoints">
                        <label for="simulateInvalidEndpoints">Simulate Invalid Endpoints</label>
                    </div>
                    
                    <div class="form-group">
                        <label for="responseDelay">Response Delay (ms):</label>
                        <input type="number" id="responseDelay" name="responseDelay" min="0" max="5000" value="100">
                    </div>
                    
                    <button type="submit" class="btn">Update Mock Config</button>
                </form>
                <div id="mockConfigResult" class="result" style="display: none;"></div>
            </div>
            
            <div class="card">
                <h2>🐛 Debug Payload</h2>
                <form id="debugPayloadForm">
                    <div class="form-group">
                        <label for="debugPayload">Notification Payload (JSON):</label>
                        <textarea id="debugPayload" name="debugPayload" placeholder='{"type": "test", "eventId": "123", "title": "Test", "body": "Test message", "url": "/"}' style="height: 150px;"></textarea>
                    </div>
                    
                    <button type="submit" class="btn btn-warning">Debug Payload</button>
                </form>
                <div id="debugResult" class="result" style="display: none;"></div>
            </div>
        </div>
        
        <div class="card">
            <h2>📋 Available Templates</h2>
            <div id="templates" class="templates">
                <!-- Templates will be loaded here -->
            </div>
        </div>
    </div>

    <script>
        // Load initial data
        document.addEventListener('DOMContentLoaded', function() {
            loadStats();
            loadTemplates();
        });

        // Load statistics
        async function loadStats() {
            try {
                const response = await fetch('/api/push/dev/stats');
                const data = await response.json();
                
                const statsHtml = \`
                    <div class="stat-item">
                        <div class="stat-value">\${data.stats.totalSubscriptions}</div>
                        <div class="stat-label">Total Subscriptions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${data.stats.activeSubscriptions}</div>
                        <div class="stat-label">Active Subscriptions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${data.stats.recentNotifications}</div>
                        <div class="stat-label">Recent Notifications</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">\${(data.stats.errorRate * 100).toFixed(1)}%</div>
                        <div class="stat-label">Error Rate</div>
                    </div>
                \`;
                
                document.getElementById('stats').innerHTML = statsHtml;
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        // Load templates
        async function loadTemplates() {
            try {
                const response = await fetch('/api/push/dev/templates');
                const data = await response.json();
                
                // Populate template select
                const select = document.getElementById('templateId');
                select.innerHTML = '<option value="">Select a template...</option>';
                
                data.templates.forEach(template => {
                    const option = document.createElement('option');
                    option.value = template.id;
                    option.textContent = template.name;
                    select.appendChild(option);
                });
                
                // Populate templates list
                const templatesDiv = document.getElementById('templates');
                templatesDiv.innerHTML = data.templates.map(template => \`
                    <div class="template-item" onclick="selectTemplate('\${template.id}')">
                        <div class="template-name">\${template.name}</div>
                        <div class="template-desc">\${template.description}</div>
                    </div>
                \`).join('');
                
            } catch (error) {
                console.error('Failed to load templates:', error);
            }
        }

        // Select template
        function selectTemplate(templateId) {
            document.getElementById('templateId').value = templateId;
        }

        // Form handlers
        document.getElementById('testNotificationForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                userId: formData.get('userId'),
                templateId: formData.get('templateId'),
                customPayload: {}
            };
            
            if (formData.get('customTitle')) {
                data.customPayload.title = formData.get('customTitle');
            }
            
            if (formData.get('customBody')) {
                data.customPayload.body = formData.get('customBody');
            }
            
            try {
                const response = await fetch('/api/push/dev/test-notification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                showResult('testResult', result, response.ok);
            } catch (error) {
                showResult('testResult', { error: error.message }, false);
            }
        });

        document.getElementById('testSubscriptionsForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = { userId: formData.get('testUserId') };
            
            try {
                const response = await fetch('/api/push/dev/test-subscriptions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                showResult('subscriptionTestResult', result, response.ok);
            } catch (error) {
                showResult('subscriptionTestResult', { error: error.message }, false);
            }
        });

        document.getElementById('mockConfigForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const data = {
                enabled: formData.get('mockEnabled') === 'on',
                options: {
                    simulateFailures: formData.get('simulateFailures') === 'on',
                    failureRate: parseFloat(formData.get('failureRate')),
                    simulateInvalidEndpoints: formData.get('simulateInvalidEndpoints') === 'on',
                    invalidEndpointRate: 0.05,
                    responseDelay: parseInt(formData.get('responseDelay'))
                }
            };
            
            try {
                const response = await fetch('/api/push/dev/mock-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                showResult('mockConfigResult', result, response.ok);
            } catch (error) {
                showResult('mockConfigResult', { error: error.message }, false);
            }
        });

        document.getElementById('debugPayloadForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            let payload;
            
            try {
                payload = JSON.parse(formData.get('debugPayload'));
            } catch (error) {
                showResult('debugResult', { error: 'Invalid JSON payload' }, false);
                return;
            }
            
            const data = { payload };
            
            try {
                const response = await fetch('/api/push/dev/debug-payload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                showResult('debugResult', result, response.ok);
            } catch (error) {
                showResult('debugResult', { error: error.message }, false);
            }
        });

        // Show result helper
        function showResult(elementId, result, success) {
            const element = document.getElementById(elementId);
            element.style.display = 'block';
            element.className = 'result ' + (success ? 'success' : 'error');
            element.textContent = JSON.stringify(result, null, 2);
        }

        // Auto-refresh stats every 30 seconds
        setInterval(loadStats, 30000);
    </script>
</body>
</html>
    `;
  }
}