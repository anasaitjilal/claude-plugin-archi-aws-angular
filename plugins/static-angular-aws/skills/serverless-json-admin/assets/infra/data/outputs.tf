output "bucket_name" {
  description = "Variable GitHub DATA_BUCKET (environnement production) et variable data_bucket_name de infra/admin/."
  value       = aws_s3_bucket.data.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.data.arn
}

output "bucket_regional_domain_name" {
  description = "Domaine de l'origine CloudFront (scripts/cloudfront-add-data-origin.mjs --origin-domain)."
  value       = aws_s3_bucket.data.bucket_regional_domain_name
}

output "origin_access_control_id" {
  description = "OAC de l'origine CloudFront (scripts/cloudfront-add-data-origin.mjs --oac)."
  value       = aws_cloudfront_origin_access_control.data.id
}
