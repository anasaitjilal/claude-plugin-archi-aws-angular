# Authentification de l'admin : pas d'inscription publique, MFA TOTP obligatoire,
# managed login (code + PKCE) pour une app publique (sans secret).

resource "aws_cognito_user_pool" "admin" {
  name = var.name

  # Le managed login (pages de connexion hébergées par Cognito, nouvelle version) demande le
  # niveau Essentials : gratuit jusqu'à 10 000 utilisateurs actifs par mois.
  user_pool_tier      = "ESSENTIALS"
  deletion_protection = "ACTIVE"

  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]
  username_configuration {
    case_sensitive = false
  }

  # Comptes créés uniquement par l'administrateur (aws cognito-idp admin-create-user).
  admin_create_user_config {
    allow_admin_create_user_only = true
    invite_message_template {
      email_subject = "Votre accès à l'administration {{SITE_NAME}}"
      email_message = "Bonjour,<br><br>Votre compte d'administration {{SITE_NAME}} est prêt.<br>Identifiant : {username}<br>Mot de passe provisoire : {####}<br><br>À la première connexion, vous choisirez un nouveau mot de passe et configurerez une application d'authentification (Google Authenticator, Microsoft Authenticator…)."
      sms_message   = "Identifiant {username}, mot de passe provisoire {####}"
    }
  }

  mfa_configuration = "ON"
  software_token_mfa_configuration {
    enabled = true
  }

  password_policy {
    minimum_length                   = 14
    require_lowercase                = true
    require_uppercase                = true
    require_numbers                  = true
    require_symbols                  = true
    temporary_password_validity_days = 3
    password_history_size            = 5
  }

  sign_in_policy {
    allowed_first_auth_factors = ["PASSWORD"]
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  user_attribute_update_settings {
    attributes_require_verification_before_update = ["email"]
  }

  # Courriels envoyés par Cognito (limite de 50 par jour, largement suffisant pour quelques admins).
  email_configuration {
    email_sending_account = "COGNITO_DEFAULT"
  }
}

resource "aws_cognito_user_group" "admins" {
  name         = var.admin_group
  user_pool_id = aws_cognito_user_pool.admin.id
  description  = "Accès à l'API d'administration du catalogue."
}

resource "aws_cognito_user_pool_client" "admin_app" {
  name         = "${var.name}-web"
  user_pool_id = aws_cognito_user_pool.admin.id

  # App publique (SPA) : pas de secret, PKCE obligatoire côté client.
  generate_secret                      = false
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["openid", "email"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = [for o in var.app_origins : "${o}/admin/callback"]
  logout_urls                          = [for o in var.app_origins : "${o}/admin/deconnexion"]

  explicit_auth_flows = ["ALLOW_USER_SRP_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]

  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true

  access_token_validity  = 60
  id_token_validity      = 60
  refresh_token_validity = 12
  token_validity_units {
    access_token  = "minutes"
    id_token      = "minutes"
    refresh_token = "hours"
  }
}

resource "aws_cognito_user_pool_domain" "admin" {
  domain                = var.cognito_domain_prefix
  user_pool_id          = aws_cognito_user_pool.admin.id
  managed_login_version = 2
}

# Style par défaut de Cognito pour les pages de connexion (obligatoire avec managed login v2).
resource "aws_cognito_managed_login_branding" "admin" {
  user_pool_id                = aws_cognito_user_pool.admin.id
  client_id                   = aws_cognito_user_pool_client.admin_app.id
  use_cognito_provided_values = true
}
