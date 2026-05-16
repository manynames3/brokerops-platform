variable "name" { type = string }

variable "cidr_block" {
  type    = string
  default = "10.40.0.0/16"
}

variable "enable_nat_gateway" {
  type    = bool
  default = false
}

variable "tags" {
  type    = map(string)
  default = {}
}
