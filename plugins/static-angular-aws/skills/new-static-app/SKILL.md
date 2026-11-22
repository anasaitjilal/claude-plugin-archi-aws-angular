---
name: new-static-app
description: Crée de bout en bout un nouveau site statique Angular + AWS (architecture static-angular-aws) dans un dossier, de façon guidée - recueil des informations, scaffold, build et contrôles verts, premier commit sur une branche.
argument-hint: <nom-du-projet> [dossier parent]
disable-model-invocation: true
---

# /new-static-app

Projet demandé : `$ARGUMENTS` (premier mot = slug kebab-case du projet ; second, facultatif = dossier
parent, sinon le dossier courant).

1. Charger les skills `static-angular-aws-architecture` puis `scaffold-static-app` et suivre ce dernier.
2. Demander en **une seule question groupée** ce qui manque, sans rien inventer : nom affiché du site,
   activité du client en une phrase, publics, domaine visé, numéro WhatsApp confirmé, email de contact,
   langues. Toute réponse « je ne sais pas » reste vide (`[À valider]` dans les textes).
3. Vérifier que le dossier cible n'existe pas ou est vide ; sinon s'arrêter et demander.
4. Exécuter la procédure du scaffold (`ng new`, `@angular/localize`, `gsap`, `sharp`, `apply-template.mjs`).
5. Lancer et rapporter : `npm run build`, `npm run test:ci`, `npm run check:seo`, `npm run check:cloudfront`.
   Corriger le gabarit du plugin (pas seulement la copie) si une erreur vient de lui, et le signaler.
6. `git init -b main` si besoin, `git checkout -b feat/initialisation`, commit
   `chore: initialisation (static-angular-aws)`. **Ne pas pousser**, ne rien créer sur AWS ni GitHub.
7. Résumé : arborescence, ce qui est vert, textes `[À valider]`, prochaines étapes
   (`prompts/01-contenu.md`, direction artistique, puis hébergement avec `aws-static-hosting`).
