variable "name" { type = string }
variable "alb_arn_suffix" { type = string }
variable "target_group_arn_suffix" { type = string }

variable "tags" {
  type    = map(string)
  default = {}
}
