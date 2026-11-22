---
name: gsap-motion
description: Animations GSAP et CSS sobres dans Angular (SSR/prérendu, zoneless) - un seul moment fort par page, transform et opacity uniquement, jamais sur l'élément LCP ni au-dessus de la ligne de flottaison, prefers-reduced-motion via gsap.matchMedia, chargement différé de GSAP, nettoyage revert. Complète les skills GSAP officiels. À utiliser pour « animation », « GSAP », « ScrollTrigger », « scroll », « parallaxe », « micro-interaction », « reduced motion », « animation qui saccade ».
---

# Mouvement sobre avec GSAP dans Angular

**Charger les skills officiels GSAP s'ils sont disponibles** avant d'écrire une animation :
`gsap-core` (API, `matchMedia`), `gsap-scrolltrigger`, `gsap-timeline`, `gsap-performance`,
`gsap-frameworks` (cycle de vie, nettoyage). Ignorer `gsap-react`. Ce skill n'en recopie rien : il
fixe les règles du plugin et l'intégration Angular.

## Intégration (assets)

- `use-gsap.ts` → `core/animation/use-gsap.ts` : `useGsap((conditions, scope) => { … })`, à appeler dans
  le constructeur. Il exécute la fonction dans `afterNextRender` (jamais au prérendu), crée un
  `gsap.matchMedia()` **scopé à l'hôte** avec `motionOk` / `reduceMotion` / `isDesktop`, rafraîchit
  ScrollTrigger après chaque navigation et appelle `revert()` via `DestroyRef`.
- `motion.ts` : `withGsap(run)` pour les micro-interactions déclenchées par l'utilisateur (compteur du
  panier, tiroir) : GSAP importé dynamiquement au premier usage, rien en mouvement réduit.
- `signature-moment.ts` : exemple de moment fort, chargé par `@defer (on viewport; hydrate on viewport)`
  → GSAP + ScrollTrigger sont dans un chunk paresseux, pas dans le bundle initial.

## Règles

1. **Un seul moment fort par page**, choisi dans le plan de design. Le reste est calme : pas de
   fade-up générique sur chaque section.
2. **Rien au-dessus de la ligne de flottaison** au chargement, et jamais sur l'élément LCP (un `from({opacity:0})`
   sur le titre repousse le LCP à la fin de l'animation).
3. Plus bas : au plus une apparition douce par section, une fois (`once: true`), opacité + 12 à 24 px,
   ~300 à 500 ms, `power2.out`.
4. `transform` et `opacity` uniquement. Jamais `width`, `height`, `top`, `left`, `filter` animés en continu.
5. `prefers-reduced-motion: reduce` : aucune animation, l'état final est l'état CSS par défaut (on anime
   **depuis** un état caché avec `gsap.from`, donc sans JS ou sans mouvement tout est visible).
6. Pas d'épinglage (`pin`) lourd sur mobile ; `scrub` léger ; défilements infinis (logos) en CSS
   `transform` avec pause au survol et au focus.
7. Micro-interactions : ≤ 200 ms, retour visuel d'une action (ajout au panier), jamais bloquantes.
8. 3D (Three.js) : exception justifiée, sous la ligne de flottaison, en `@defer`, désactivée en
   mouvement réduit et sur petit écran ; charger alors les skills `threejs-*`.

## Vérifier

- Lighthouse : TBT < 200 ms, aucune « animation non composée » dans le diagnostic.
- DevTools → Rendering → émuler `prefers-reduced-motion` : tout le contenu visible, rien ne bouge.
- Naviguer entre deux pages et revenir : aucune animation en double (revert OK), ScrollTrigger recalé.

## Pièges déjà rencontrés

- Trop d'animations au chargement (scène épinglée dans le hero, fade sur chaque section, vidéo) :
  TBT 450 ms, 1 s de « Style & Layout », LCP 4,4 s. Corrigé par : hero immobile, un seul moment plus bas,
  GSAP chargé en différé.
- Animation créée dans le constructeur : erreur au prérendu (`window` inexistant) ou animation jouée
  avant l'hydratation puis rejouée.
- Sélecteurs globaux (`gsap.to('.card')`) : animent les cartes d'autres composants ; toujours scoper au
  `scope` fourni par `useGsap`.
- ScrollTrigger non rafraîchi après une navigation : déclencheurs décalés sur la page suivante.
