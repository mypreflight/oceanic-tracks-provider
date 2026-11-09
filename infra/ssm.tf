resource "aws_ssm_parameter" "url" {
  name  = "/mypreflight/${local.name}/url"
  type  = "String"
  value = trimsuffix(aws_lambda_function_url.function.function_url, "/")
}

resource "aws_ssm_parameter" "secret" {
  name  = "/mypreflight/${local.name}/secret"
  type  = "SecureString"
  value = random_password.function_secret.result
}

resource "aws_ssm_parameter" "nms_client_id" {
  name             = "/mypreflight/${local.name}/nms-client-id"
  type             = "SecureString"
  value_wo         = var.nms_client_id
  value_wo_version = var.nms_credentials_version
}

resource "aws_ssm_parameter" "nms_client_secret" {
  name             = "/mypreflight/${local.name}/nms-client-secret"
  type             = "SecureString"
  value_wo         = var.nms_client_secret
  value_wo_version = var.nms_credentials_version
}

data "aws_ssm_parameter" "nms_client_id" {
  name = aws_ssm_parameter.nms_client_id.name
}

data "aws_ssm_parameter" "nms_client_secret" {
  name = aws_ssm_parameter.nms_client_secret.name
}
