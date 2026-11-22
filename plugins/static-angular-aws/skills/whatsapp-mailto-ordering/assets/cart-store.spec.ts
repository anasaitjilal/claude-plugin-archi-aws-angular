import { TestBed } from '@angular/core/testing';
import { CartStore, addLine, setLineQuantity, withoutMissing } from './cart-store';

describe('fonctions du panier', () => {
  it('ajoute puis cumule une ligne', () => {
    const once = addLine([], 'a', 2);
    expect(addLine(once, 'a', 3)).toEqual([{ productId: 'a', quantity: 5 }]);
  });

  it('ignore une quantité nulle ou négative', () => {
    expect(addLine([], 'a', 0)).toEqual([]);
  });

  it('retire la ligne à 0', () => {
    expect(setLineQuantity([{ productId: 'a', quantity: 2 }], 'a', 0)).toEqual([]);
  });

  it('garde la même référence si aucun produit ne manque', () => {
    const lines = [{ productId: 'a', quantity: 1 }];
    expect(withoutMissing(lines, () => true)).toBe(lines);
    expect(withoutMissing(lines, () => false)).toEqual([]);
  });
});

describe('CartStore', () => {
  it('expose les totaux en signals', () => {
    const store = TestBed.inject(CartStore);
    store.add('a', 2);
    store.add('b');
    store.setQuantity('b', 4);
    expect(store.lineCount()).toBe(2);
    expect(store.totalQuantity()).toBe(6);
    store.remove('a');
    store.clear();
    expect(store.isEmpty()).toBe(true);
  });
});
