# Lambda de l'API admin. Terraform crée la fonction avec un code provisoire (placeholder/) ;
# le vrai code est publié par .github/workflows/admin-api.yml (aws lambda update-function-code),
# d'où ignore_changes sur le paquet.

locals {
  function_name   = "${var.name}-api"
  data_bucket_arn = "arn:aws:s3:::${var.data_bucket_name}"
  site_bucket_arn = "arn:aws:s3:::${var.site_bucket_name}"
}

data "archive_file" "placeholder" {
  type        = "zip"
  source_file = "${path.module}/placeholder/index.mjs"
  output_path = "${path.module}/.build/placeholder.zip"
}

resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.function_name}"
  retention_in_days = var.log_retention_days
}

data "aws_iam_policy_document" "lambda_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${local.function_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# Droits minimaux : écrire ses logs, lire le seul paramètre du token, lire l'email d'un
# administrateur (l'access token Cognito ne le contient pas ; il sert aux messages de commit).
# Pas de kms:Decrypt : la clé gérée aws/ssm autorise déjà, par sa propre politique, tout principal
# du compte qui passe par SSM (condition kms:ViaService), ce qui est le cas de ssm:GetParameter.
data "aws_iam_policy_document" "lambda" {
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.lambda.arn}:*"]
  }
  statement {
    sid     = "ReadGithubToken"
    actions = ["ssm:GetParameter"]
    # Ancien token (Contents) : encore lu par la version précédente de la Lambda, gardée pour le
    # retour arrière jusqu'à la fin de la migration (docs/data-s3.md §9, étape 8).
    resources = [aws_ssm_parameter.github_token.arn, aws_ssm_parameter.github_actions_token.arn]
  }
  # Bucket de données (docs/data-s3.md §2) : lecture et écriture du catalogue, du journal et des
  # photos ; suppression limitée aux photos ; liste limitée au journal et aux photos.
  statement {
    sid     = "ReadWriteData"
    actions = ["s3:GetObject", "s3:PutObject"]
    resources = [
      "${local.data_bucket_arn}/draft/*",
      "${local.data_bucket_arn}/live/*",
      "${local.data_bucket_arn}/audit/*",
      "${local.data_bucket_arn}/images/*",
      "${local.data_bucket_arn}/history/*",
    ]
  }
  statement {
    sid       = "ReadCatalogVersions"
    actions   = ["s3:GetObjectVersion"]
    resources = ["${local.data_bucket_arn}/draft/*", "${local.data_bucket_arn}/live/*"]
  }
  statement {
    sid       = "ListAuditAndImages"
    actions   = ["s3:ListBucket"]
    resources = [local.data_bucket_arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["audit/*", "images/products/*", "live/*", "history/*"]
    }
  }
  # Publication sans build (docs/data-s3.md §14.2) : écriture des fichiers publics et des pages
  # produit dans le bucket du site, rien d'autre ; lecture des deux shells du rendu navigateur.
  statement {
    sid     = "PublishSiteFiles"
    actions = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = [
      "${local.site_bucket_arn}/data/*",
      "${local.site_bucket_arn}/produit/*",
      "${local.site_bucket_arn}/en/produit/*",
    ]
  }
  statement {
    sid     = "ReadClientShells"
    actions = ["s3:GetObject"]
    resources = [
      "${local.site_bucket_arn}/index.csr.html",
      "${local.site_bucket_arn}/en/index.csr.html",
    ]
  }
  statement {
    sid       = "ListProductPages"
    actions   = ["s3:ListBucket"]
    resources = [local.site_bucket_arn]
    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["data/*", "produit/*", "en/produit/*"]
    }
  }
  statement {
    sid       = "InvalidateSiteCache"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["arn:aws:cloudfront::${var.account_id}:distribution/${var.cloudfront_distribution_id}"]
  }
  statement {
    sid       = "DeleteImagesOnly"
    actions   = ["s3:DeleteObject"]
    resources = ["${local.data_bucket_arn}/images/*"]
  }
  statement {
    sid       = "ReadAdminEmail"
    actions   = ["cognito-idp:AdminGetUser"]
    resources = [aws_cognito_user_pool.admin.arn]
  }
}

resource "aws_iam_role_policy" "lambda" {
  name   = "${local.function_name}-policy"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda.json
}

resource "aws_lambda_function" "api" {
  function_name = local.function_name
  description   = "API de l'espace admin {{SITE_NAME}} (catalogue dans le bucket ${var.data_bucket_name})."
  role          = aws_iam_role.lambda.arn

  runtime       = "nodejs24.x"
  architectures = ["arm64"]
  handler       = "index.handler"
  memory_size   = var.lambda_memory_mb
  timeout       = 30

  filename         = data.archive_file.placeholder.output_path
  source_code_hash = data.archive_file.placeholder.output_base64sha256

  logging_config {
    log_format = "JSON"
    log_group  = aws_cloudwatch_log_group.lambda.name
  }

  environment {
    variables = {
      GITHUB_OWNER       = var.github_owner
      GITHUB_REPO        = var.github_repo
      MAIN_BRANCH        = var.main_branch
      DRAFT_BRANCH       = var.draft_branch
      GITHUB_TOKEN_PARAM = aws_ssm_parameter.github_token.name
      ADMIN_GROUP        = var.admin_group
      USER_POOL_ID       = aws_cognito_user_pool.admin.id
      DEPLOY_WORKFLOW    = "deploy.yml"
      # Mode maintenance : basculé par scripts/admin-lambda.mjs (ignore_changes ci-dessous).
      ADMIN_READ_ONLY            = "false"
      DATA_BUCKET                = var.data_bucket_name
      GITHUB_ACTIONS_TOKEN_PARAM = aws_ssm_parameter.github_actions_token.name
      SITE_BUCKET                = var.site_bucket_name
      CLOUDFRONT_DISTRIBUTION_ID = var.cloudfront_distribution_id
      ALLOWED_ORIGINS            = join(",", var.app_origins)
      NODE_OPTIONS               = "--enable-source-maps"
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash, environment[0].variables["ADMIN_READ_ONLY"]]
  }

  depends_on = [aws_iam_role_policy.lambda]
}

# Alias « live » : c'est lui qu'appellent l'API Gateway et le maintien à chaud. Terraform le crée sur
# $LATEST (comportement inchangé) ; ensuite admin-api.yml publie une version à chaque déploiement et
# déplace l'alias. Retour arrière : node scripts/admin-lambda.mjs rollback <version>.
resource "aws_lambda_alias" "live" {
  name             = "live"
  description      = "Version en service de l'API admin."
  function_name    = aws_lambda_function.api.function_name
  function_version = "$LATEST"

  lifecycle {
    ignore_changes = [function_version, routing_config]
  }
}
