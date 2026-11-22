terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.73"
    }
  }

  # Même bucket d'état que infra/admin/ (créé par infra/admin/bootstrap/), clé séparée : une erreur
  # sur la Lambda ne peut pas toucher au bucket de données, et inversement.
  backend "s3" {
    bucket       = "{{PROJECT}}-tfstate-{{AWS_ACCOUNT_ID}}"
    key          = "data/terraform.tfstate"
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
      component = "data"
    }
  }
}
