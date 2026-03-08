/** Fake in-memory database for demo purposes */

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

/**
 * Creates a singleton store on globalThis so all server contexts
 * (route handlers, server components, server actions) share the same state.
 */
const createStore = <T>(key: string, init: () => T): T => {
  const g = globalThis as Record<string, unknown>;
  if (!g[key]) g[key] = init();
  return g[key] as T;
};

const products = createStore<Product[]>("__demo_products", () => [
  { id: "1", name: "Wireless Headphones", category: "electronics", price: 79.99, inStock: true },
  { id: "2", name: "USB-C Cable", category: "electronics", price: 12.99, inStock: true },
  { id: "3", name: "Mechanical Keyboard", category: "electronics", price: 149.99, inStock: false },
  { id: "4", name: "Running Shoes", category: "footwear", price: 119.99, inStock: true },
  { id: "5", name: "Hiking Boots", category: "footwear", price: 189.99, inStock: true },
  { id: "6", name: "Cotton T-Shirt", category: "clothing", price: 24.99, inStock: true },
  { id: "7", name: "Denim Jacket", category: "clothing", price: 89.99, inStock: true },
]);

const cart = createStore<CartItem[]>("__demo_cart", () => []);

export const db = {
  products: {
    findMany: (filter?: { category?: string }) =>
      filter?.category
        ? products.filter((p) => p.category === filter.category)
        : products,
    search: (query: string) =>
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      ),
    findById: (id: string) => products.find((p) => p.id === id),
  },
  cart: {
    items: () => [...cart],
    add: (productId: string, quantity: number) => {
      const existing = cart.find((item) => item.productId === productId);
      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.push({ productId, quantity });
      }
      return cart;
    },
    remove: (productId: string) => {
      const index = cart.findIndex((item) => item.productId === productId);
      if (index >= 0) cart.splice(index, 1);
      return cart;
    },
  },
  shippingRegions: ["US", "EU", "UK", "CA", "AU"],
};
