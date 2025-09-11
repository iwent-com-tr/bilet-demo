#!/bin/bash

# AWS ECR Deployment Script for iWent Backend
# Usage: ./deploy-aws.sh [region] [repository-name] [tag]

set -e

# Configuration
AWS_REGION=${1:-eu-west-1}
REPOSITORY_NAME=${2:-iwent-backend}
IMAGE_TAG=${3:-latest}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting AWS ECR deployment for iWent Backend${NC}"
echo -e "${YELLOW}Region: ${AWS_REGION}${NC}"
echo -e "${YELLOW}Repository: ${REPOSITORY_NAME}${NC}"
echo -e "${YELLOW}Tag: ${IMAGE_TAG}${NC}"
echo -e "${YELLOW}Account ID: ${AWS_ACCOUNT_ID}${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Dockerfile not found. Please run this script from the backend directory.${NC}"
    exit 1
fi

# Step 1: Create ECR repository if it doesn't exist
echo -e "${BLUE}📦 Creating ECR repository if it doesn't exist...${NC}"
aws ecr describe-repositories --repository-names ${REPOSITORY_NAME} --region ${AWS_REGION} >/dev/null 2>&1 || \
aws ecr create-repository --repository-name ${REPOSITORY_NAME} --region ${AWS_REGION} \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256

# Step 2: Get ECR login token
echo -e "${BLUE}🔐 Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 3: Build the Docker image
echo -e "${BLUE}🏗️  Building Docker image...${NC}"
docker build -t ${REPOSITORY_NAME}:${IMAGE_TAG} .

# Step 4: Tag the image for ECR
ECR_URI=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPOSITORY_NAME}:${IMAGE_TAG}
echo -e "${BLUE}🏷️  Tagging image: ${ECR_URI}${NC}"
docker tag ${REPOSITORY_NAME}:${IMAGE_TAG} ${ECR_URI}

# Step 5: Push to ECR
echo -e "${BLUE}📤 Pushing image to ECR...${NC}"
docker push ${ECR_URI}

# Step 6: Clean up local images (optional)
echo -e "${BLUE}🧹 Cleaning up local images...${NC}"
docker rmi ${REPOSITORY_NAME}:${IMAGE_TAG} ${ECR_URI} || true

# Success message
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo -e "${GREEN}📍 Image URI: ${ECR_URI}${NC}"
echo -e "${YELLOW}💡 You can now use this image in your AWS services (ECS, EKS, etc.)${NC}"

# Output useful information
echo -e "\n${BLUE}📋 Next steps:${NC}"
echo -e "${YELLOW}1. Update your ECS task definition or Kubernetes deployment with the new image URI${NC}"
echo -e "${YELLOW}2. Make sure your environment variables are properly configured${NC}"
echo -e "${YELLOW}3. Ensure your database and Redis instances are accessible${NC}"
echo -e "${YELLOW}4. Configure your load balancer and security groups${NC}"

echo -e "\n${BLUE}🔧 Environment variables needed in production:${NC}"
echo -e "${YELLOW}- DATABASE_URL${NC}"
echo -e "${YELLOW}- JWT_SECRET${NC}"
echo -e "${YELLOW}- ONESIGNAL_APP_ID${NC}"
echo -e "${YELLOW}- ONESIGNAL_API_KEY${NC}"
echo -e "${YELLOW}- VAPID_PUBLIC_KEY${NC}"
echo -e "${YELLOW}- VAPID_PRIVATE_KEY${NC}"
echo -e "${YELLOW}- VAPID_SUBJECT${NC}"
echo -e "${YELLOW}- REDIS_URL${NC}"
echo -e "${YELLOW}- CORS_ORIGIN${NC}" 