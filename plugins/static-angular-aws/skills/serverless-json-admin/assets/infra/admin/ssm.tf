# Token GitHub de la Lambda (fine-grained PAT, voir docs/ADMIN.md).
# Terraform crée le paramètre avec une valeur factice et ne la touche plus ensuite :
#   aws ssm put-parameter --name /{{PROJECT}}/admin/github-token --type SecureString --overwrite --value <token>
# La vraie valeur n'entre donc jamais dans l'état Terraform.
resource "aws_ssm_parameter" "github_token" {
  name        = var.github_token_parameter
  description = "Token GitHub (fine-grained, repo ${var.github_owner}/${var.github_repo}) de la Lambda ${var.name}-api."
  type        = "SecureString"
  key_id      = "alias/aws/ssm"
  value       = "a-remplacer"

  lifecycle {
    ignore_changes = [value]
  }
}

# Token de la Lambda sur S3 (docs/data-s3.md §6) : fine-grained PAT limité au repo, avec seulement
# « Actions : Read and write » et « Metadata : Read ». Il ne peut ni lire ni modifier le code.
#   aws ssm put-parameter --name /{{PROJECT}}/admin/github-actions-token --type SecureString --overwrite --value <token>
resource "aws_ssm_parameter" "github_actions_token" {
  name        = var.github_actions_token_parameter
  description = "Token GitHub (Actions seulement, repo ${var.github_owner}/${var.github_repo}) : lancement et suivi de deploy.yml."
  type        = "SecureString"
  key_id      = "alias/aws/ssm"
  value       = "a-remplacer"

  lifecycle {
    ignore_changes = [value]
  }
}
