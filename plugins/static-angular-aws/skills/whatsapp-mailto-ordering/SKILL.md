---
name: whatsapp-mailto-ordering
description: Commande sans backend pour site statique - panier en signals persisté dans localStorage (restauré après l'hydratation), message de commande WhatsApp prérempli (wa.me) avec référence, troncature au-delà de 3000 caractères, aucun prix inventé, secours copier le message, catégories non commandables orientées vers un mailto. Tests unitaires inclus. À utiliser pour « panier », « commande WhatsApp », « wa.me », « lien WhatsApp », « mailto », « demande de devis », « commander sans paiement en ligne ».
---

# Commande par WhatsApp et mailto

## Pièces (assets → `core/order/`)

| Fichier | Rôle |
|---|---|
| `whatsapp-message.ts` (+ spec) | `buildOrderMessage(items, client, référence, libellés)`, `buildWhatsappUrl`, `buildMailtoUrl`, `generateOrderReference` — fonctions pures |
| `cart-store.ts` (+ spec) | `CartStore` (signals), fonctions pures `addLine`, `setLineQuantity`, `withoutMissing` |
| `browser-storage.ts` | `localStorage` tolérant (mode privé, quota, JSON corrompu) |
| `order-mode.config.ts` | catégories commandées par email (`mailto:`) au lieu de WhatsApp, héritées par les sous-catégories |

Le numéro (`environment.whatsappNumber`, chiffres seulement, indicatif sans `+`) doit être **confirmé
par le client**. Vide → boutons WhatsApp masqués, jamais un numéro de test en production.

## Parcours

1. Fiche ou carte : « Ajouter » (quantité, unité du produit) ; retour visuel discret (compteur, tiroir).
2. Tiroir / page commande : lignes, quantités, suppression ; total estimé **seulement** si tous les prix
   sont connus.
3. Formulaire minimal (nom, ville, remarque ; type de client si utile au commerce), mémorisé localement.
4. Bouton « Envoyer sur WhatsApp » → `wa.me/<numéro>?text=<message>` dans un nouvel onglet ;
   bouton secondaire « Copier le message » (WhatsApp Web absent, ordinateur de bureau).
5. Produit seul : « Commander ce produit » depuis la fiche (message court avec le lien de la fiche).
6. Produit indisponible : « Me prévenir » → message de demande de disponibilité.
7. Catégories `EMAIL_ONLY` : pas d'ajout au panier, lien `mailto:` avec sujet et corps préremplis ;
   un panier restauré qui en contient les retire avec un message discret.

## Règles

- Le message reprend uniquement des données réelles (nom, référence, conditionnement, quantité, prix
  publié). Langue du message = langue du site (libellés passés au générateur).
- Référence lisible `PREFIXE-AAAAMMJJ-NNNN` pour que le commercial retrouve la demande.
- Au-delà de 3 000 caractères : dernières lignes remplacées par « + N autres produits » ; mailto ≤ ~1 800.
- Panier restauré dans `afterNextRender` (le HTML prérendu affiche un panier vide → pas d'erreur
  d'hydratation) ; lignes de produits disparus retirées quand le catalogue est chargé (sinon badge
  faux et ligne impossible à supprimer).
- Clé de stockage versionnée (`<projet>.cart.v1`) ; produit renommé : table ancien id → nouvel id, en
  phase avec les redirections 301.
- Page panier/commande : `noindex`, `Disallow` dans robots.txt.
- Tests obligatoires : générateur de message et store panier (`ng test`).

## Pièges déjà rencontrés

- Numéro saisi avec `+`, espaces ou un 0 initial : `wa.me` ouvre une conversation vide ; nettoyer
  (chiffres seulement) et valider le format avec le client.
- Message trop long : WhatsApp ou le navigateur coupe l'URL sans prévenir.
- Badge du panier qui compte des produits supprimés du catalogue.
- Demande « export / devis » par formulaire séparé puis retirée : un simple `mailto:` sur les catégories
  concernées suffit et ne demande aucun backend.
