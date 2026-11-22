variable "region" {
  description = "Région AWS du bucket de données (la même que la Lambda de l'admin)."
  type        = string
  default     = "{{AWS_REGION}}"
}

variable "account_id" {
  description = "Compte AWS autorisé (garde-fou contre un apply dans le mauvais compte)."
  type        = string
  default     = "{{AWS_ACCOUNT_ID}}"
}

variable "bucket_name" {
  description = "Nom du bucket de données. Séparé du bucket du site, qui est synchronisé avec --delete."
  type        = string
  default     = "{{DATA_BUCKET}}"
}

variable "upload_origins" {
  description = "Origines de l'admin autorisées à envoyer des photos directement sur S3 (CORS, POST présigné)."
  type        = list(string)
  default = [
    "https://{{CLOUDFRONT_DOMAIN}}",
    "https://{{DOMAIN}}",
    "http://localhost:4200",
  ]

  validation {
    condition     = alltrue([for o in var.upload_origins : can(regex("^https?://[^/]+$", o))])
    error_message = "Chaque origine est de la forme https://hote (sans chemin ni / final)."
  }
}

variable "cloudfront_distribution_id" {
  description = "Identifiant de la distribution CloudFront du site (variable GitHub CLOUDFRONT_DISTRIBUTION_ID) : seule autorisée à lire images/*."
  type        = string

  validation {
    condition     = can(regex("^E[A-Z0-9]{10,}$", var.cloudfront_distribution_id))
    error_message = "Identifiant de distribution attendu, par exemple E1ABCDEF234567."
  }
}

variable "noncurrent_days" {
  description = "Versioning suspendu : versions non courantes (déjà accumulées ou résiduelles) supprimées après ce délai, sur les deux buckets."
  type        = number
  default     = 1
}

variable "history_days" {
  description = "Durée de conservation des sauvegardes history/ (avant chaque publication et chaque annulation)."
  type        = number
  default     = 30
}

variable "site_bucket_name" {
  description = "Bucket du site (variable GitHub S3_BUCKET). Seuls son versioning et son cycle de vie sont gérés ici."
  type        = string
  default     = "{{SITE_BUCKET}}"
}
