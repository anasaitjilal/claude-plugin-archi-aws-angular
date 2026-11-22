import { environment } from '../../../environments/environment';

/** Nom affiché (titres, Open Graph, message WhatsApp). */
export const SITE_NAME = '{{SITE_NAME}}';
/** URL publique sans barre finale : seule source (environment.ts). */
export const SITE_URL = environment.siteUrl.replace(/\/$/, '');
export const WHATSAPP_NUMBER = environment.whatsappNumber;
export const CONTACT_EMAIL = environment.contactEmail;
