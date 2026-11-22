import {
  MAILTO_MAX_LENGTH,
  OrderLabels,
  OrderMessageItem,
  buildMailtoUrl,
  buildOrderMessage,
  buildWhatsappUrl,
  generateOrderReference,
} from './whatsapp-message';

const labels: OrderLabels = {
  greeting: 'Bonjour Démo,',
  intro: 'Je souhaite passer la commande suivante :',
  reference: (r) => `Réf. commande : ${r}`,
  ref: (s) => `Réf. ${s}`,
  unitPrice: (p) => `${p} l'unité`,
  customer: (n) => `Client : ${n}`,
  city: (c) => `Ville : ${c}`,
  note: (n) => `Remarque : ${n}`,
  omitted: (n) => (n > 1 ? `+ ${n} autres produits` : '+ 1 autre produit'),
  closing: 'Merci de me confirmer la disponibilité et le prix.',
  formatPrice: (v) => `${v.toFixed(2).replace('.', ',')} MAD`,
};
const customer = { name: 'Restaurant Test', city: 'Ville test', note: '' };
const item = (over: Partial<OrderMessageItem> = {}): OrderMessageItem => ({
  name: 'Produit',
  sku: null,
  details: [],
  quantity: 2,
  unitLabel: 'cartons',
  price: null,
  ...over,
});

describe('buildOrderMessage', () => {
  it('liste les produits, le client et la référence', () => {
    const message = buildOrderMessage(
      [item({ name: 'Filet', sku: 'T-1', details: ['Carton 10 kg'], price: 12.5 })],
      customer,
      'DM-20260101-0001',
      labels,
    );
    expect(message).toContain('- Filet (Réf. T-1, Carton 10 kg) — 2 cartons — 12,50 MAD l\'unité');
    expect(message).toContain('Réf. commande : DM-20260101-0001');
    expect(message).toContain('Client : Restaurant Test');
    expect(message).not.toContain('Remarque');
  });

  it("n'invente jamais de prix", () => {
    expect(buildOrderMessage([item()], customer, 'R', labels)).not.toMatch(/MAD/);
  });

  it('refuse une commande vide', () => {
    expect(() => buildOrderMessage([item({ quantity: 0 })], customer, 'R', labels)).toThrow();
  });

  it('refuse un produit réservé au contact par email', () => {
    expect(() => buildOrderMessage([item({ emailOnly: true })], customer, 'R', labels)).toThrow();
  });

  it('raccourcit la liste au-delà de la limite', () => {
    const many = Array.from({ length: 80 }, (_, i) => item({ name: `Produit numéro ${i}` }));
    const message = buildOrderMessage(many, customer, 'R', labels, 600);
    expect(message.length).toBeLessThanOrEqual(600);
    expect(message).toMatch(/\+ \d+ autres produits/);
  });
});

describe('URLs', () => {
  it('nettoie le numéro WhatsApp et encode le message', () => {
    expect(buildWhatsappUrl('+212 6-12', 'a b&c')).toBe('https://wa.me/212612?text=a%20b%26c');
  });

  it('refuse un numéro vide', () => {
    expect(() => buildWhatsappUrl('', 'x')).toThrow();
  });

  it('construit un mailto court', () => {
    const url = buildMailtoUrl('contact@example.org', 'Demande', 'x'.repeat(MAILTO_MAX_LENGTH * 2));
    expect(url.startsWith('mailto:contact@example.org?subject=Demande&body=')).toBe(true);
    expect(decodeURIComponent(url.split('body=')[1]).length).toBe(MAILTO_MAX_LENGTH);
  });
});

describe('generateOrderReference', () => {
  it('suit le format PREFIXE-AAAAMMJJ-NNNN', () => {
    expect(generateOrderReference('DM', new Date(2026, 0, 5), () => 0.0042)).toBe('DM-20260105-0042');
  });
});
