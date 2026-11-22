# API Gateway HTTP API devant la Lambda : authorizer JWT Cognito sur chaque route,
# CORS limité aux origines de l'admin, throttling par défaut.

locals {
  # Routes explicites (pas de $default) : tout le reste répond 404 sans appeler la Lambda.
  routes = toset([
    "GET /admin/catalog",
    "PUT /admin/products/{id}",
    "DELETE /admin/products/{id}",
    "PATCH /admin/products/{id}/status",
    "PATCH /admin/products/status",
    "POST /admin/images/upload-url",
    "POST /admin/products/{id}/images",
    "PUT /admin/products/{id}/images/order",
    "POST /admin/import",
    "GET /admin/export.csv",
    "GET /admin/changes",
    "GET /admin/audit",
    "POST /admin/publish",
    "GET /admin/publish/status",
    "POST /admin/discard",
    "GET /admin/history",
    "POST /admin/history/{key}/restore-draft",
  ])
}

resource "aws_apigatewayv2_api" "admin" {
  name          = "${var.name}-api"
  protocol_type = "HTTP"
  description   = "API de l'espace admin {{SITE_NAME}}."

  # Les requêtes préliminaires OPTIONS sont traitées par API Gateway lui-même (sans authorizer).
  cors_configuration {
    allow_origins  = var.app_origins
    allow_methods  = ["GET", "PUT", "PATCH", "POST", "DELETE"]
    allow_headers  = ["authorization", "content-type"]
    expose_headers = ["content-disposition", "server-timing"]
    max_age        = 600
  }
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.admin.id
  name             = "cognito"
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]

  # L'access token Cognito n'a pas de claim aud : API Gateway vérifie alors client_id.
  jwt_configuration {
    issuer   = "https://${aws_cognito_user_pool.admin.endpoint}"
    audience = [aws_cognito_user_pool_client.admin_app.id]
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.admin.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_alias.live.invoke_arn
  payload_format_version = "2.0"
  timeout_milliseconds   = 30000

  # La permission sur l'alias existe avant que l'intégration ne l'appelle : aucune coupure de l'API.
  depends_on = [aws_lambda_permission.api_live]
}

resource "aws_apigatewayv2_route" "admin" {
  for_each = local.routes

  api_id               = aws_apigatewayv2_api.admin.id
  route_key            = each.value
  target               = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type   = "JWT"
  authorizer_id        = aws_apigatewayv2_authorizer.cognito.id
  authorization_scopes = ["openid"]
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/apigateway/${var.name}-api"
  retention_in_days = var.log_retention_days
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.admin.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_rate_limit  = var.throttling_rate_limit
    throttling_burst_limit = var.throttling_burst_limit
  }

  # Journal d'accès sans en-têtes ni corps (donc sans jeton).
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      time           = "$context.requestTime"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      latencyMs      = "$context.responseLatency"
      integrationErr = "$context.integrationErrorMessage"
      authorizerErr  = "$context.authorizer.error"
      sourceIp       = "$context.identity.sourceIp"
    })
  }
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.admin.execution_arn}/*/*"
}

# L'intégration appelle l'alias « live » : permission sur l'alias. L'ancienne permission (fonction
# sans alias) reste en place, pour que l'ordre de création ne coupe jamais l'API.
resource "aws_lambda_permission" "api_live" {
  statement_id  = "AllowApiGatewayInvokeLive"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.live.name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.admin.execution_arn}/*/*"
}
