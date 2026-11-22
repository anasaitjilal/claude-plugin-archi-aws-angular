# Maintien à chaud (docs/admin-perf.md) : EventBridge invoque la Lambda toutes les 5 minutes avec
# {"warmup": true}. Le handler répond aussitôt, sans S3, SSM ni GitHub (environ 1 ms facturée).
# 8 640 invocations par mois : dans l'offre gratuite de Lambda et d'EventBridge (règles planifiées
# gratuites). Désactivable : warmup_enabled = false.
# Limite : garde UN environnement chaud ; deux requêtes simultanées peuvent encore en démarrer un second.

resource "aws_cloudwatch_event_rule" "warmup" {
  count               = var.warmup_enabled ? 1 : 0
  name                = "${local.function_name}-warmup"
  description         = "Maintien à chaud de la Lambda de l'admin"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "warmup" {
  count = var.warmup_enabled ? 1 : 0
  rule  = aws_cloudwatch_event_rule.warmup[0].name
  arn   = aws_lambda_alias.live.arn
  input = jsonencode({ warmup = true })
}

resource "aws_lambda_permission" "warmup" {
  count         = var.warmup_enabled ? 1 : 0
  statement_id  = "AllowEventBridgeWarmupLive"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  qualifier     = aws_lambda_alias.live.name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.warmup[0].arn
}
