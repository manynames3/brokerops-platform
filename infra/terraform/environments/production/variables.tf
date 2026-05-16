variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "database_password" {
  type      = string
  sensitive = true
  default   = "replace-this-password"
}

variable "container_image" {
  type    = string
  default = "public.ecr.aws/docker/library/nginx:latest"
}
