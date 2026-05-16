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
