import { Service, afterNextRender, computed, effect, signal } from '@angular/core';
import { readStorage, writeStorage } from './browser-storage';

export interface CartLine {
  productId: string;
  quantity: number;
}

export const CART_STORAGE_KEY = '{{PROJECT}}.cart.v1';

const isCartLines = (value: unknown): value is CartLine[] =>
  Array.isArray(value) &&
  value.every(
    (l: Partial<CartLine>) =>
      typeof l?.productId === 'string' && typeof l.quantity === 'number' && l.quantity > 0,
  );

/** Ajoute (ou cumule) une ligne. Fonction pure : testée sans Angular. */
export function addLine(lines: readonly CartLine[], productId: string, quantity = 1): CartLine[] {
  if (quantity <= 0) return [...lines];
  return lines.some((l) => l.productId === productId)
    ? lines.map((l) => (l.productId === productId ? { ...l, quantity: l.quantity + quantity } : l))
    : [...lines, { productId, quantity }];
}

/** Fixe une quantité ; 0 ou moins retire la ligne. */
export function setLineQuantity(lines: readonly CartLine[], productId: string, quantity: number): CartLine[] {
  return quantity <= 0
    ? lines.filter((l) => l.productId !== productId)
    : lines.map((l) => (l.productId === productId ? { ...l, quantity } : l));
}

/** Retire les lignes de produits disparus ; renvoie le même tableau si rien ne change. */
export function withoutMissing(lines: CartLine[], exists: (id: string) => boolean): CartLine[] {
  const next = lines.filter((l) => exists(l.productId));
  return next.length === lines.length ? lines : next;
}

/**
 * Panier en signals, persisté dans localStorage côté navigateur uniquement.
 * Restauration dans afterNextRender : le HTML prérendu (panier vide) reste identique à l'hydratation.
 */
@Service()
export class CartStore {
  readonly lines = signal<CartLine[]>([]);
  private readonly restored = signal(false);

  readonly lineCount = computed(() => this.lines().length);
  readonly totalQuantity = computed(() => this.lines().reduce((n, l) => n + l.quantity, 0));
  readonly isEmpty = computed(() => this.lines().length === 0);

  constructor() {
    afterNextRender(() => {
      const saved = readStorage(CART_STORAGE_KEY, isCartLines);
      if (saved) this.lines.set(saved);
      this.restored.set(true);
    });
    effect(() => {
      const lines = this.lines();
      if (this.restored()) writeStorage(CART_STORAGE_KEY, lines);
    });
  }

  add(productId: string, quantity = 1): void {
    this.lines.update((lines) => addLine(lines, productId, quantity));
  }

  setQuantity(productId: string, quantity: number): void {
    this.lines.update((lines) => setLineQuantity(lines, productId, quantity));
  }

  remove(productId: string): void {
    this.setQuantity(productId, 0);
  }

  clear(): void {
    this.lines.set([]);
  }
}
