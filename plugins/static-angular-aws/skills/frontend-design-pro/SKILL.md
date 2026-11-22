---
name: frontend-design-pro
description: Direction artistique « pro et sobre » pour site vitrine ou catalogue B2B/B2C - plan de design validé avant le code, design tokens en custom properties CSS, palette avec contrastes WCAG AA chiffrés, une famille de police variable auto-hébergée, grille, hero clair sans animation, accessibilité. Complète le skill frontend-design d'Anthropic. À utiliser pour « design », « direction artistique », « refonte », « palette », « typographie », « tokens », « hero », « page d'accueil », « look pro ».
---

# Design pro et sobre

**Charger d'abord le skill `frontend-design` (Anthropic) s'il est disponible** : il donne la démarche
créative (concept fort, éviter le look générique). Ce skill ajoute les règles du plugin.

## Procédure

1. Lire les données réelles (`data/*.json`, photos) : le design part du contenu, pas d'un thème.
   Ex. : pas de prix → mettre en avant la fiche technique ; packshots sur fond blanc → surfaces blanches.
2. Écrire `docs/design-plan.md` (gabarit : `references/design-plan-template.md`) : concept en une
   phrase, palette (rôle + contraste mesuré de chaque paire texte/fond), typo (rôles, `clamp()`),
   grille, espacements, wireframes ASCII (accueil mobile + ordinateur, liste, fiche).
3. **Point d'arrêt : faire valider le plan.** Ne pas recopier le design du site existant.
4. Reporter le plan dans `web/src/styles/_tokens.scss` (asset de départ) : aucune couleur, taille ou
   espacement en dur dans les composants, uniquement `var(--…)`.

## Règles

- **Le premier écran se comprend en 3 secondes** : qui, quoi, que faire. Titre `h1` visible, une phrase
  précise, deux actions au plus, trois repères de confiance **tirés des données** (jamais inventés).
- Hero **immobile** : pas d'animation d'entrée, pas de vidéo au chargement, pas de section épinglée.
  Image : version mobile légère, `priority`, `sizes` exact (asset `home-hero.ts`).
- Palette : un fond, une surface, une encre, un texte secondaire, **une** couleur d'action réservée à
  l'action principale. Texte ≥ 4.5:1, grands textes et éléments d'interface ≥ 3:1. Le vert WhatsApp
  `#25D366` ne passe pas avec du texte blanc : l'assombrir.
- Typo : une famille variable, woff2 auto-hébergé, sous-ensemble latin, `font-display: swap`, preload
  de la seule police du titre ; jamais Google Fonts en direct (RGPD, requête tierce, perf).
- Lignes ≤ 68ch ; `text-wrap: balance` sur les titres ; tableaux de données en `tabular-nums`.
- Pas d'ombres grises génériques ni d'arrondis « bulles » par défaut : séparer par le fond et des filets.
- Accessibilité AA : focus visible, cibles ≥ 44 px, lien d'évitement, un seul `h1`, ordre des titres,
  `alt` utiles (packshot : nom + marque), formulaires étiquetés, `prefers-reduced-motion`.
- B2B : vue liste en plus de la grille, informations techniques visibles sans clic, unités claires.
- Le logo du client reste ; la palette l'accueille.

## Pièges déjà rencontrés

- Un accueil trop riche (vidéo, scène épinglée, carrousels) : score Lighthouse 73. La version sobre
  (image fixe, un seul moment animé plus bas) atteint ≥ 90 sans perdre l'impact.
- Vignettes servies en 960 px pour un affichage de 120 px (`sizes="auto, 100vw"`) : toujours calculer
  `sizes` à partir de la grille réelle.
- Changement visuel « global » demandé pour une seule page : passer par une option du composant partagé
  et vérifier par captures avant/après que les autres pages n'ont pas bougé.
