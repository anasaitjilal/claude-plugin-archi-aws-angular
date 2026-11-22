# Bucket du site (créé à la main, pas géré par Terraform) : seuls son versioning et son cycle de vie
# sont gérés ici, par son nom. Terraform ne crée, ne modifie ni ne détruit le bucket lui-même.
# Le versioning était activé sans cycle de vie : chaque déploiement accumulait des versions
# (docs/data-s3.md §14.3).

resource "aws_s3_bucket_versioning" "site" {
  bucket = var.site_bucket_name

  versioning_configuration {
    status = "Suspended"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "site" {
  bucket     = var.site_bucket_name
  depends_on = [aws_s3_bucket_versioning.site]

  rule {
    id     = "purge-anciennes-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_days
    }
    expiration {
      expired_object_delete_marker = true
    }
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
