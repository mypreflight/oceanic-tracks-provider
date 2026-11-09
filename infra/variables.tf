variable "aws_region" {
  type    = string
  default = "eu-central-1"
}

variable "log_retention_days" {
  type    = number
  default = 7
}

variable "nms_api_host" {
  type    = string
  default = "https://api-staging.cgifederal-aim.com"
}

variable "nms_client_id" {
  type      = string
  sensitive = true
  ephemeral = true

  validation {
    condition     = length(var.nms_client_id) > 0
    error_message = "Set TF_VAR_nms_client_id."
  }
}

variable "nms_client_secret" {
  type      = string
  sensitive = true
  ephemeral = true

  validation {
    condition     = length(var.nms_client_secret) > 0
    error_message = "Set TF_VAR_nms_client_secret."
  }
}

variable "nms_credentials_version" {
  type    = number
  default = 1
}
