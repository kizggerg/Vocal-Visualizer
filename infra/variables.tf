variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment (staging or prod)"
  type        = string

  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be 'staging' or 'prod'."
  }
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "vocal-visualizer"
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository"
  type        = string
  default     = "kizggerg"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "Vocal-Visualizer"
}
