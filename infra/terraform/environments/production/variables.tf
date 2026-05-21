variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "database_password" {
  type      = string
  sensitive = true

  validation {
    condition     = length(var.database_password) >= 20
    error_message = "production database_password must be at least 20 characters."
  }
}

variable "container_image" {
  type = string

  validation {
    condition     = length(var.container_image) > 0
    error_message = "container_image must be an explicit API image URI."
  }
}

variable "api_allowed_origins" {
  type        = list(string)
  description = "Browser origins allowed to call the BrokerOps API."
  default     = ["https://brokerops-platform-web.pages.dev"]
}

variable "web_app_url" {
  type        = string
  description = "Public BrokerOps web app URL returned from the API root endpoint."
  default     = "https://brokerops-platform-web.pages.dev"
}

variable "workspace_api_key" {
  type        = string
  description = "Workspace key required by operational BrokerOps API routes."
  sensitive   = true

  validation {
    condition     = length(var.workspace_api_key) >= 20
    error_message = "production workspace_api_key must be at least 20 characters."
  }
}

variable "workspace_name" {
  type        = string
  description = "Display name for the production BrokerOps workspace."
  default     = "BrokerOps Production Workspace"
}
