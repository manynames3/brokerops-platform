variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "database_password" {
  type      = string
  sensitive = true

  validation {
    condition     = length(var.database_password) >= 16
    error_message = "database_password must be at least 16 characters."
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
  description = "Automation fallback key for controlled BrokerOps smoke tests; end-user routes use signed sessions."
  sensitive   = true

  validation {
    condition     = length(var.workspace_api_key) >= 16
    error_message = "workspace_api_key must be at least 16 characters."
  }
}

variable "workspace_name" {
  type        = string
  description = "Display name for the preview BrokerOps workspace."
  default     = "BrokerOps Preview Workspace"
}

variable "auth_token_secret" {
  type        = string
  description = "HMAC secret used to sign BrokerOps API session tokens."
  sensitive   = true

  validation {
    condition     = length(var.auth_token_secret) >= 32
    error_message = "auth_token_secret must be at least 32 characters."
  }
}

variable "auth_admin_email" {
  type        = string
  description = "Initial BrokerOps admin email for the preview workspace."
  default     = "ops@brokerops.local"
}

variable "auth_admin_password" {
  type        = string
  description = "Initial BrokerOps admin password for the preview workspace."
  sensitive   = true

  validation {
    condition     = length(var.auth_admin_password) >= 16
    error_message = "auth_admin_password must be at least 16 characters."
  }
}
