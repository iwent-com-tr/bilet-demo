#!/bin/bash

# Configuration
AWS_REGION="eu-central-1"  # AWS bölgesi
ECR_REPOSITORY_NAME="iwent-backend"  # ECR repository adı
IMAGE_TAG="latest"  # Docker image tag'i

# AWS ECR login
echo "AWS ECR'ye giriş yapılıyor..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image
echo "Docker image build ediliyor..."
docker build -t $ECR_REPOSITORY_NAME:$IMAGE_TAG .

# Tag the image for ECR
echo "Image tag'leniyor..."
docker tag $ECR_REPOSITORY_NAME:$IMAGE_TAG $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:$IMAGE_TAG

# Push to ECR
echo "Image ECR'ye push ediliyor..."
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY_NAME:$IMAGE_TAG

echo "Deploy tamamlandı!"