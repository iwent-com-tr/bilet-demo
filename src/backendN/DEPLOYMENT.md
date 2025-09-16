# iWent Backend - AWS Deployment Guide

Bu rehber, iWent Backend uygulamasının AWS'de Docker ile deploy edilmesi için gerekli adımları içerir.

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Docker ve Docker Compose yüklü olmalı
- AWS CLI kurulu ve yapılandırılmış olmalı
- PostgreSQL veritabanı (AWS RDS önerilir)
- Redis instance (AWS ElastiCache önerilir)

### 1. Environment Variables

`env.production.example` dosyasını `.env` olarak kopyalayın ve değerlerinizi girin:

```bash
cp env.production.example .env
```

**Kritik değişkenler:**
- `DATABASE_URL`: PostgreSQL bağlantı string'i
- `JWT_SECRET`: Güçlü bir JWT secret
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: VAPID push notification için
- `REDIS_URL`: Redis bağlantı string'i
- `CORS_ORIGIN`: Frontend domain'leriniz

### 2. Local Test

Docker image'ı local olarak test edin:

```bash
# Production build test
docker-compose -f docker-compose.prod.yml up --build

# Health check
curl http://localhost:3001/api/v1/health
```

### 3. AWS ECR Deployment

AWS ECR'a deploy etmek için:

```bash
# Script'i çalıştırılabilir yapın (Linux/Mac)
chmod +x deploy-aws.sh

# Deploy edin
./deploy-aws.sh [region] [repository-name] [tag]

# Örnek:
./deploy-aws.sh eu-west-1 iwent-backend latest
```

## 📋 AWS Infrastructure Gereksinimleri

### 1. Database (RDS)

```bash
# PostgreSQL RDS instance oluşturun
aws rds create-db-instance \
  --db-instance-identifier iwent-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.9 \
  --master-username iwentadmin \
  --master-user-password YourSecurePassword123 \
  --allocated-storage 20 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name your-db-subnet-group \
  --backup-retention-period 7 \
  --storage-encrypted
```

### 2. Redis (ElastiCache)

```bash
# Redis cluster oluşturun
aws elasticache create-cache-cluster \
  --cache-cluster-id iwent-prod-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-group-name your-cache-subnet-group
```

### 3. ECS Service

```yaml
# task-definition.json örneği
{
  "family": "iwent-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "iwent-backend",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/iwent-backend:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3001"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:iwent/database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:REGION:ACCOUNT:secret:iwent/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/iwent-backend",
          "awslogs-region": "eu-west-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3001/api/v1/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

## 🔧 Production Optimizations

### 1. Security

- JWT secret'ları AWS Secrets Manager'da saklayın
- Database şifrelerini encrypt edin
- VPC içinde private subnet'ler kullanın
- Security Group'ları minimum izinlerle yapılandırın

### 2. Monitoring

```yaml
# CloudWatch alarms
- CPUUtilization > 80%
- MemoryUtilization > 80%
- HealthCheck failures
- Database connections
```

### 3. Scaling

```yaml
# Auto Scaling configuration
- Target CPU: 70%
- Min capacity: 2
- Max capacity: 10
- Scale-out cooldown: 300s
- Scale-in cooldown: 300s
```

## 🌐 Load Balancer Configuration

### Application Load Balancer

```yaml
# Target Group Health Check
- Path: /api/v1/health
- Interval: 30s
- Timeout: 5s
- Healthy threshold: 2
- Unhealthy threshold: 5
```

## 📊 Monitoring & Logging

### CloudWatch Logs

```bash
# Log group oluşturun
aws logs create-log-group --log-group-name /ecs/iwent-backend
```

### Metrics

- Request latency
- Error rates
- Database connection pool
- Redis connections
- Memory/CPU usage

## 🔄 CI/CD Pipeline

### GitHub Actions örneği:

```yaml
name: Deploy to AWS
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-west-1
      
      - name: Deploy to ECR
        run: |
          cd src/backendN
          ./deploy-aws.sh eu-west-1 iwent-backend ${{ github.sha }}
      
      - name: Update ECS Service
        run: |
          aws ecs update-service \
            --cluster iwent-prod \
            --service iwent-backend \
            --force-new-deployment
```

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - VPC security groups kontrol edin
   - Database credentials doğrulayın
   - Network ACL'leri kontrol edin

2. **Redis Connection Failed**
   - ElastiCache security groups
   - Subnet groups yapılandırması
   - Redis endpoint doğruluğu

3. **Health Check Failures**
   - Container logs kontrol edin: `aws logs tail /ecs/iwent-backend --follow`
   - Environment variables doğruluğu
   - Port mapping kontrolü

### Useful Commands

```bash
# ECS task logs
aws logs tail /ecs/iwent-backend --follow

# Service status
aws ecs describe-services --cluster iwent-prod --services iwent-backend

# Task definition
aws ecs describe-task-definition --task-definition iwent-backend

# Container health
docker exec -it container_id curl http://localhost:3001/api/v1/health
```

## 📞 Support

Deployment sırasında sorun yaşarsanız:

1. CloudWatch logs kontrol edin
2. ECS service events kontrol edin
3. Security groups ve network yapılandırmasını doğrulayın
4. Environment variables'ları kontrol edin 