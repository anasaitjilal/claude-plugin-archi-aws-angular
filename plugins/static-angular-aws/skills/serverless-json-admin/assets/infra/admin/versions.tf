terraform {
  # use_lockfile (verrou natif S3, sans DynamoDB) : Terraform 1.10 ou plus récent.
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.73"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.8"
    }
  }

  # Bucket créé par infra/admin/bootstrap/ (à appliquer une seule fois avant).
  backend "s3" {
    bucket       = "{{PROJECT}}-tfstate-{{AWS_ACCOUNT_ID}}"
    key          = "admin/terraform.tfstate"
    region       = "{{AWS_REGION}}"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region              = var.region
  allowed_account_ids = [var.account_id]

  default_tags {
    tags = {
      project   = "{{PROJECT}}"
      component = "admin"
    }
  }
}
