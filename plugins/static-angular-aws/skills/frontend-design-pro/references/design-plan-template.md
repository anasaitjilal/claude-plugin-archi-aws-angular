# Plan de design — {{SITE_NAME}}

## Ce que disent les données et les images

- Volume (produits, catégories), ce qui manque (prix ? photos ?), nature des photos (packshots, ambiance).
- Logo : couleurs, contraintes.

## Concept (une phrase + l'objet graphique qui le porte)

## Palette

| Nom | Hex | Rôle | Contrastes vérifiés (WCAG) |
|---|---|---|---|
| Fond | | fond principal | encre sur fond x:1 |
| Surface | | cartes, cadres photo | |
| Encre | | texte fort | |
| Secondaire | | légendes | ≥ 4.5:1 sur fond et surface |
| Accent | | liens, focus | |
| Action | | action principale uniquement | texte blanc dessus ≥ 4.5:1 |

## Typographie

| Rôle | Réglages (axes, graisse) | Taille `clamp()` | Interligne |
|---|---|---|---|
| Display | | | |
| H1 / H2 / H3 | | | |
| Texte | | 1rem | 1.6 |
| Données | `tabular-nums` | | |

## Grille et espacements

Colonnes, gouttière, marges `clamp()`, largeur max, échelle d'espacement (base 4 px), rayons, points de rupture.

## Mouvement

Le moment fort unique de chaque page (lequel, où, comment il se dégrade en mouvement réduit).

## Wireframes ASCII

Accueil (mobile + ordinateur), liste / catégorie, fiche, panier.
