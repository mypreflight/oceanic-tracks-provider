resource "random_password" "function_secret" {
  length  = 64
  special = false
}

resource "aws_cloudwatch_log_group" "function" {
  name              = "/aws/lambda/${local.name}"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "function" {
  function_name    = local.name
  role             = aws_iam_role.function.arn
  runtime          = "nodejs24.x"
  architectures    = ["arm64"]
  handler          = "lambda.handler"
  filename         = "${path.module}/../dist.zip"
  source_code_hash = filebase64sha256("${path.module}/../dist.zip")
  memory_size      = 256
  timeout          = 60

  environment {
    variables = {
      OCEANIC_TRACKS_FUNCTION_SECRET = random_password.function_secret.result
      NMS_API_HOST                   = var.nms_api_host
      NMS_CLIENT_ID                  = data.aws_ssm_parameter.nms_client_id.value
      NMS_CLIENT_SECRET              = data.aws_ssm_parameter.nms_client_secret.value
    }
  }

  logging_config {
    log_format = "Text"
    log_group  = aws_cloudwatch_log_group.function.name
  }

  depends_on = [aws_iam_role_policy.function_logs]
}

resource "aws_lambda_function_url" "function" {
  function_name      = aws_lambda_function.function.function_name
  authorization_type = "NONE"
}

resource "aws_lambda_permission" "function_url" {
  statement_id           = "FunctionUrlAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.function.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "function_url_invoke" {
  statement_id             = "FunctionUrlAllowInvokeAction"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.function.function_name
  principal                = "*"
  invoked_via_function_url = true
}
