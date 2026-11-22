# Mise en place S3 + CloudFront (procédure)

Valeurs : `{{PROJECT}}`, `{{AWS_REGION}}`, `{{AWS_ACCOUNT_ID}}`, `{{SITE_BUCKET}}`, `{{DISTRIBUTION_ID}}`.
Tout ce qui suit est gratuit dans les limites du niveau gratuit / forfait Free, **sauf mention**.
L'utilisateur exécute ; Claude prépare et relit.

## 1. Bucket du site

```bash
aws s3api create-bucket --bucket {{SITE_BUCKET}} --region {{AWS_REGION}} \
  --create-bucket-configuration LocationConstraint={{AWS_REGION}}
aws s3api put-public-access-block --bucket {{SITE_BUCKET}} \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-ownership-controls --bucket {{SITE_BUCKET}} \
  --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
```

Pas d'hébergement de site web S3 (endpoint public) : l'origine est le bucket REST, via OAC.
Pas de versioning sur le bucket du site (chaque déploiement créerait des milliers de versions).

## 2. Distribution (console, plus sûr pour le forfait Free)

1. CloudFront → *Create distribution* → choisir le forfait **Free** quand l'assistant le propose.
2. Origine : le bucket `{{SITE_BUCKET}}.s3.{{AWS_REGION}}.amazonaws.com`, **Origin access control**
   (créer un OAC, signature « Sign requests »), puis copier la policy de bucket proposée :

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontOAC",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::{{SITE_BUCKET}}/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "arn:aws:cloudfront::{{AWS_ACCOUNT_ID}}:distribution/{{DISTRIBUTION_ID}}" } }
  }]
}
```

3. Comportement par défaut : *Redirect HTTP to HTTPS*, GET/HEAD, *CachingOptimized*, compression
   automatique ; **aucune** politique de query string dans la clé de cache sauf besoin réel.
4. *Default root object* : `index.html`.
5. *Error pages* : 403 → `/404.html` (code 404) et 404 → `/404.html` (code 404), TTL 60 s.
6. Ne pas activer : journaux standard vers S3 (coût de stockage), journaux temps réel, métriques
   additionnelles, Lambda@Edge, Origin Shield.

## 3. CloudFront Function

```bash
node scripts/build-cloudfront-function.mjs && node scripts/check-cloudfront-function.mjs
aws cloudfront create-function --name {{PROJECT}}-viewer-request \
  --function-config Comment="viewer-request {{PROJECT}}",Runtime=cloudfront-js-2.0 \
  --function-code fileb://infra/cloudfront/viewer-request.js
# mises à jour suivantes :
ETAG=$(aws cloudfront describe-function --name {{PROJECT}}-viewer-request --query ETag --output text)
aws cloudfront update-function --name {{PROJECT}}-viewer-request --if-match "$ETAG" \
  --function-config Comment="viewer-request {{PROJECT}}",Runtime=cloudfront-js-2.0 \
  --function-code fileb://infra/cloudfront/viewer-request.js
ETAG=$(aws cloudfront describe-function --name {{PROJECT}}-viewer-request --query ETag --output text)
aws cloudfront test-function --name {{PROJECT}}-viewer-request --if-match "$ETAG" --stage DEVELOPMENT \
  --event-object fileb://infra/cloudfront/test-event-scraper.json   # attendu : statusCode 403
aws cloudfront publish-function --name {{PROJECT}}-viewer-request --if-match "$ETAG"
```

Puis associer (une fois) la fonction publiée (LIVE) à l'événement *Viewer request* du comportement par
défaut — et du comportement `/images/products/*` s'il existe — dans la console.

## 4. Vérifications

```bash
UA="Mozilla/5.0"
curl -sI -A "$UA" https://<domaine>/            # 200, cache-control no-cache
curl -sI -A "$UA" https://<domaine>/a-propos    # 200 (sinon : Function non associée → AccessDenied XML)
curl -sI -A "$UA" https://<domaine>/inexistant  # 404, page 404 du site
curl -sI https://<domaine>/                     # 403 (curl bloqué)
curl -sI -A "$UA" "https://<domaine>/ancienne-url/?a=1%20b"   # 301, location avec ?a=1%20b
```

## 5. WAF (forfait Free uniquement)

Console → la distribution → *Security* : la web ACL du forfait. *Add rules* → *Rate-based rule* :
reprendre `infra/cloudfront/waf-rate-rule.json` (2 000 / 5 min / IP, action Count). Après 3 à 7 jours
de requêtes échantillonnées sans faux positif, passer en Block. Si des visiteurs légitimes partagent
une IP (bureau, restaurant) : monter la limite.

## 6. Coûts

Billing → Budgets : budget mensuel (ex. 5 $) avec alertes email ; Cost Anomaly Detection : moniteur
par défaut + abonnement email (seuil 5 $). Vérifier chaque mois les rapports CloudFront (gratuits).
