export const environment = {
  production: true,
  // URL publique, sans barre finale : canonical, hreflang, Open Graph, JSON-LD, liens WhatsApp,
  // sitemap et robots.txt (lue aussi par site.config.mjs). Changer ici le jour de la bascule DNS.
  siteUrl: '{{SITE_URL}}',
  // Numéro WhatsApp des commandes : format international, chiffres seulement (ex. 2126XXXXXXXX).
  // Vide tant que le client ne l'a pas confirmé : les boutons WhatsApp sont alors masqués.
  whatsappNumber: '{{WHATSAPP_NUMBER}}',
  contactEmail: '{{CONTACT_EMAIL}}',
};
