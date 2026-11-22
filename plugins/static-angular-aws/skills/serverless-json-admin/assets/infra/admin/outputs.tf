# Valeurs à reporter dans web/src/environments/environment*.ts (non secrètes) et dans GitHub.

output "api_url" {
  description = "environment.adminApiUrl"
  value       = aws_apigatewayv2_api.admin.api_endpoint
}

output "cognito_client_id" {
  description = "environment.cognitoClientId"
  value       = aws_cognito_user_pool_client.admin_app.id
}

output "cognito_domain" {
  description = "environment.cognitoDomain (pages de connexion et déconnexion)"
  value       = "https://${aws_cognito_user_pool_domain.admin.domain}.auth.${var.region}.amazoncognito.com"
}

output "cognito_authority" {
  description = "environment.cognitoAuthority (issuer OIDC, découverte .well-known)"
  value       = "https://${aws_cognito_user_pool.admin.endpoint}"
}

output "cognito_user_pool_id" {
  description = "Pour aws cognito-idp admin-create-user / admin-add-user-to-group"
  value       = aws_cognito_user_pool.admin.id
}

output "lambda_arn" {
  description = "Ressource de la politique IAM du rôle github-deploy-{{PROJECT}}"
  value       = aws_lambda_function.api.arn
}

output "lambda_name" {
  description = "Variable GitHub ADMIN_LAMBDA_NAME (environnement production)"
  value       = aws_lambda_function.api.function_name
}

output "lambda_alias" {
  description = "Alias appelé par l'API Gateway (retour arrière : scripts/admin-lambda.mjs rollback <version>)."
  value       = aws_lambda_alias.live.name
}
