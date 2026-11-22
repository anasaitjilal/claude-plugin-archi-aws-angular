/**
 * Générateur de messages de commande (WhatsApp) et de demande (mailto). Fonctions pures, testées.
 * Règles : jamais de prix inventé (null = non affiché), jamais de message vide, URL raccourcie au-delà
 * de la limite (« + N autres produits »), numéro nettoyé (chiffres seulement).
 * Textes : passer des libellés traduits (OrderLabels) plutôt que d'écrire la langue ici.
 */

export interface OrderMessageItem {
  name: string;
  /** Référence affichée à l'équipe commerciale, null si absente. */
  sku: string | null;
  /** Détails courts (marque, conditionnement), déjà filtrés. */
  details: readonly string[];
  quantity: number;
  /** Unité affichée, déjà accordée (« carton », « cartons », « kg »). */
  unitLabel: string;
  /** Prix unitaire, null si inconnu : jamais inventé. */
  price: number | null;
  /** Produit non commandable sur WhatsApp (contact par email) : refusé par le générateur. */
  emailOnly?: boolean;
}

export interface OrderCustomer {
  name: string;
  city: string;
  note: string;
}

export interface OrderLabels {
  greeting: string; // « Bonjour {{SITE_NAME}}, »
  intro: string; // « Je souhaite passer la commande suivante : »
  reference: (ref: string) => string;
  ref: (sku: string) => string;
  unitPrice: (price: string) => string;
  customer: (name: string) => string;
  city: (city: string) => string;
  note: (note: string) => string;
  omitted: (count: number) => string;
  closing: string;
  formatPrice: (value: number) => string;
}

/** Au-delà, WhatsApp et certains navigateurs tronquent l'URL. */
export const ORDER_MESSAGE_MAX_LENGTH = 3000;
/** mailto: est plus fragile (clients mail Windows) : rester court. */
export const MAILTO_MAX_LENGTH = 1800;

export function formatItemLine(item: OrderMessageItem, labels: OrderLabels): string {
  const details = [item.sku ? labels.ref(item.sku) : null, ...item.details].filter(Boolean).join(', ');
  const name = details ? `${item.name} (${details})` : item.name;
  const price = item.price !== null ? ` — ${labels.unitPrice(labels.formatPrice(item.price))}` : '';
  return `- ${name} — ${item.quantity} ${item.unitLabel}${price}`;
}

/** Référence lisible : PREFIXE-AAAAMMJJ-NNNN. */
export function generateOrderReference(
  prefix: string,
  date: Date = new Date(),
  random: () => number = Math.random,
): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const n = String(Math.floor(random() * 10000)).padStart(4, '0');
  return `${prefix}-${y}${m}${d}-${n}`;
}

function assemble(
  lines: string[],
  customer: OrderCustomer,
  reference: string,
  omitted: number,
  labels: OrderLabels,
): string {
  const note = customer.note.trim();
  return [
    labels.greeting,
    labels.intro,
    '',
    labels.reference(reference),
    '',
    ...lines,
    ...(omitted ? [labels.omitted(omitted)] : []),
    '',
    labels.customer(customer.name.trim()),
    labels.city(customer.city.trim()),
    ...(note ? [labels.note(note)] : []),
    '',
    labels.closing,
  ].join('\n');
}

/**
 * Message de commande complet ; au-delà de `maxLength`, les dernières lignes deviennent « + N … ».
 * @throws si la commande est vide ou contient un produit `emailOnly`.
 */
export function buildOrderMessage(
  items: readonly OrderMessageItem[],
  customer: OrderCustomer,
  reference: string,
  labels: OrderLabels,
  maxLength: number = ORDER_MESSAGE_MAX_LENGTH,
): string {
  const blocked = items.find((i) => i.emailOnly);
  if (blocked) throw new Error(`« ${blocked.name} » ne se commande pas sur WhatsApp.`);
  const valid = items.filter((i) => i.quantity > 0);
  if (!valid.length) throw new Error('La commande est vide.');

  const lines = valid.map((i) => formatItemLine(i, labels));
  let kept = lines.length;
  let message = assemble(lines, customer, reference, 0, labels);
  while (message.length > maxLength && kept > 1) {
    kept--;
    message = assemble(lines.slice(0, kept), customer, reference, lines.length - kept, labels);
  }
  return message;
}

/** https://wa.me/<chiffres>?text=<message encodé>. */
export function buildWhatsappUrl(number: string, message: string): string {
  const digits = number.replace(/\D/g, '');
  if (!digits) throw new Error('Numéro WhatsApp manquant.');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** mailto:<email>?subject=…&body=… (corps raccourci au-delà de MAILTO_MAX_LENGTH). */
export function buildMailtoUrl(email: string, subject: string, body: string): string {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Adresse email invalide.');
  const short = body.length > MAILTO_MAX_LENGTH ? body.slice(0, MAILTO_MAX_LENGTH - 1) + '…' : body;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(short)}`;
}
