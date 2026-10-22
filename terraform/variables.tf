variable "atlas_org_id" {
  description = "MongoDB Atlas organization ID"
  type        = string
}

variable "project_name" {
  description = "Atlas project name"
  type        = string
  default     = "farmacia-pms"
}

variable "cluster_name" {
  description = "Atlas cluster name"
  type        = string
  default     = "farmacia-dev"
}

variable "aws_region" {
  description = "AWS region supported by Atlas M0"
  type        = string
  default     = "US_EAST_1"
}
