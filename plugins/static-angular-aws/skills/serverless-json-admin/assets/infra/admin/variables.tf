variable "region" {
  description = "Région AWS de l'espace admin."
  type        = string
  default     = "{{AWS_REGION}}"
}

variable "account_id" {
  description = "Compte AWS autorisé (garde-fou contre un apply dans le mauvais compte)."
  type        = string
  default     = "{{AWS_ACCOUNT_ID}}"
}

variable "app_origins" {
  description = <<-EOT
    Origines qui servent l'admin. Chacune donne une URL de callback (<origine>/admin/callback),
    une URL de déconnexion (<origine>/admin/deconnexion) et une origine CORS autorisée.
    Ajouter "https://{{APEX_DOMAIN}}" (et "https://{{DOMAIN}}") quand le domaine sera branché.
  EOT
  type        = list(string)
  default = [
    "https://{{CLOUDFRONT_DOMAIN}}",
    "http://localhost:4200",
  ]

  validation {
    condition     = alltrue([for o in var.app_origins : can(regex("^https?://[^/]+$", o))])
    error_message = "Chaque origine est de la forme https://hote (sans chemin ni / final)."
  }
}

variable "cognito_domain_prefix" {
  description = "Préfixe du domaine managed login : https://<préfixe>.auth.<région>.amazoncognito.com. Unique dans la région."
  type        = string
  default     = "{{PROJECT}}-admin"
}

variable "name" {
  description = "Préfixe des ressources (Lambda, API, pool Cognito)."
  type        = string
  default     = "{{PROJECT}}-admin"
}

variable "github_owner" {
  type    = string
  default = "anasaitjilal"
}

variable "github_repo" {
  type    = string
  default = "{{GITHUB_REPO_NAME}}"
}

variable "main_branch" {
  description = "Branche de production : un push dessus déclenche deploy.yml."
  type        = string
  default     = "main"
}

variable "draft_branch" {
  description = "Branche de brouillon où l'admin enregistre ses modifications."
  type        = string
  default     = "admin-draft"
}

variable "github_token_parameter" {
  description = "Paramètre SSM (SecureString) qui contient le token GitHub de la Lambda."
  type        = string
  default     = "/{{PROJECT}}/admin/github-token"
}

variable "admin_group" {
  description = "Groupe Cognito exigé par la Lambda (claim cognito:groups)."
  type        = string
  default     = "admins"
}

variable "throttling_rate_limit" {
  description = "Requêtes par seconde (régime établi) sur l'API admin."
  type        = number
  default     = 10
}

variable "throttling_burst_limit" {
  description = "Rafale maximale sur l'API admin."
  type        = number
  default     = 20
}

variable "log_retention_days" {
  type    = number
  default = 14
}

# --- Performance (docs/admin-perf.md) ---------------------------------------------------------

variable "lambda_memory_mb" {
  description = "Mémoire de la Lambda (Mo). Le CPU est proportionnel : 1 769 Mo = 1 vCPU complet."
  type        = number
  default     = 1024
}

variable "warmup_enabled" {
  description = "Règle EventBridge qui invoque la Lambda toutes les 5 minutes ({\"warmup\": true}) pour éviter les démarrages à froid."
  type        = bool
  default     = true
}

# --- Données sur S3 (docs/data-s3.md) ----------------------------------------------------------

variable "data_bucket_name" {
  description = "Bucket de données créé par infra/data/ (output bucket_name)."
  type        = string
  default     = "{{DATA_BUCKET}}"
}

variable "github_actions_token_parameter" {
  description = "Paramètre SSM (SecureString) du token GitHub « Actions » de la Lambda."
  type        = string
  default     = "/{{PROJECT}}/admin/github-actions-token"
}

# --- Publication sans build (docs/data-s3.md §14) ----------------------------------------------

variable "site_bucket_name" {
  description = "Bucket du site (variable GitHub S3_BUCKET) : la publication y écrit data/*, produit/* et en/produit/*."
  type        = string
  default     = "{{SITE_BUCKET}}"
}

variable "cloudfront_distribution_id" {
  description = "Distribution CloudFront du site, invalidée après chaque publication."
  type        = string
  default     = "{{DISTRIBUTION_ID}}"
}
