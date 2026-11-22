# Bucket de données du catalogue (docs/data-s3.md) :
#   draft/catalog.json   brouillon de l'admin (un seul objet, écritures conditionnelles)
#   live/catalog.json    version publiée, lue par la pipeline de déploiement
#   live/publish.json    état de la dernière publication
#   audit/AAAA/MM/JJ/    journal, un objet par action
#   images/products/     photos des produits, servies par CloudFront (seconde origine)

resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "data" {
  bucket                  = aws_s3_bucket.data.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Versioning suspendu (docs/data-s3.md §14.3) : il ne peut pas être désactivé une fois activé, ni
# limité à un préfixe. Les objets écrits ensuite n'ont plus qu'une version ; les sauvegardes utiles
# sont faites par la Lambda dans history/ (avant chaque publication et chaque annulation).
# Le verrou anti-écrasement (If-Match sur l'ETag) n'en dépend pas.
resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id

  versioning_configuration {
    status = "Suspended"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket     = aws_s3_bucket.data.id
  depends_on = [aws_s3_bucket_versioning.data]

  # Purge des versions accumulées tant que le versioning était actif, puis des versions qui
  # apparaîtraient encore (objet remplacé ou supprimé) : rien n'est gardé plus d'un jour.
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

  # Sauvegardes ciblées : 30 jours.
  rule {
    id     = "sauvegardes-30-jours"
    status = "Enabled"
    filter {
      prefix = "history/"
    }
    expiration {
      days = var.history_days
    }
  }

  # Aucune expiration sur audit/ : le journal est conservé.
}

# Envoi direct des photos par le navigateur (POST présigné par la Lambda).
resource "aws_s3_bucket_cors_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  cors_rule {
    allowed_methods = ["POST", "PUT"]
    allowed_origins = var.upload_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Lecture des photos par CloudFront : contrôle d'accès à l'origine (OAC) et politique du bucket
# limitée à images/* pour la seule distribution du site. La distribution elle-même n'est pas gérée
# par Terraform : l'origine et le comportement /images/products/* sont ajoutés par
# scripts/cloudfront-add-data-origin.mjs (docs/data-s3.md §9).

data "aws_caller_identity" "current" {}

resource "aws_cloudfront_origin_access_control" "data" {
  name                              = "${var.bucket_name}-images"
  description                       = "Lecture des photos de produits (images/*) du bucket de données."
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "bucket" {
  statement {
    sid       = "CloudFrontReadsImagesOnly"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.data.arn}/images/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = ["arn:aws:cloudfront::${data.aws_caller_identity.current.account_id}:distribution/${var.cloudfront_distribution_id}"]
    }
  }

  statement {
    sid       = "DenyInsecureTransport"
    effect    = "Deny"
    actions   = ["s3:*"]
    resources = [aws_s3_bucket.data.arn, "${aws_s3_bucket.data.arn}/*"]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "data" {
  bucket     = aws_s3_bucket.data.id
  policy     = data.aws_iam_policy_document.bucket.json
  depends_on = [aws_s3_bucket_public_access_block.data]
}
