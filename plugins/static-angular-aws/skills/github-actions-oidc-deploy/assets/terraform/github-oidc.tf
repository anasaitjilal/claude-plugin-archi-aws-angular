# Rôle IAM assumé par GitHub Actions via OIDC pour déployer le site (équivalent de infra/github-oidc/).
#   terraform init && terraform apply -var github_repository=OWNER/REPO -var bucket_name=... -var distribution_id=...
# Mettre create_oidc_provider = false si le provider GitHub existe déjà dans le compte.

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}

variable "github_repository" {
  description = "Dépôt tel qu'il apparaît dans le « sub » OIDC : OWNER/REPO, ou OWNER@OWNER_ID/REPO@REPO_ID si le compte utilise les identifiants immuables (voir infra/github-oidc/README.md)."
  type        = string
}

variable "bucket_name" {
  description = "Bucket S3 du site (sans s3://)."
  type        = string
}

variable "distribution_id" {
  description = "ID de la distribution CloudFront."
  type        = string
}

variable "create_oidc_provider" {
  description = "Créer le provider OIDC GitHub (une seule fois par compte)."
  type        = bool
  default     = true
}

data "aws_caller_identity" "current" {}

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

locals {
  oidc_provider_arn = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [local.oidc_provider_arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:environment:production"]
    }
  }
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "ListSiteBucket"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::${var.bucket_name}"]
  }
  statement {
    sid       = "WriteSiteObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::${var.bucket_name}/*"]
  }
  statement {
    sid       = "InvalidateCdn"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.distribution_id}"]
  }
}

resource "aws_iam_role" "deploy" {
  name               = "github-deploy-{{PROJECT}}"
  description        = "Déploiement du site {{SITE_NAME}} depuis GitHub Actions"
  assume_role_policy = data.aws_iam_policy_document.trust.json
  depends_on         = [aws_iam_openid_connect_provider.github]
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy-s3-cloudfront"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}

output "aws_role_arn" {
  description = "À renseigner dans la variable GitHub AWS_ROLE_ARN."
  value       = aws_iam_role.deploy.arn
}
