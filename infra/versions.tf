terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3 with DynamoDB locking.
  # Bootstrap instructions: see infra/README.md
  # Partial backend config — the state key is set per-environment at init time:
  #   terraform init -backend-config="key=staging/terraform.tfstate"
  #   terraform init -backend-config="key=prod/terraform.tfstate"
  backend "s3" {
    bucket         = "vocal-visualizer-tfstate"
    region         = "us-east-1"
    dynamodb_table = "vocal-visualizer-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
