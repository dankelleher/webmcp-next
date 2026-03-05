"use client";

import { useState, useCallback, useEffect } from "react";
import type { Product } from "../db";
import { ProductCard } from "./ProductCard";
import { SearchBar } from "./SearchBar";
import { CartDropdown } from "./Cart";

interface CartData {
  items: Array<{
    productId: string;
    quantity: number;
    productName: string;
    price: number;
    subtotal: number;
  }>;
  total: number;
}

export const StoreFront = ({ products }: { products: Product[] }) => {
  const [displayProducts, setDisplayProducts] = useState<Product[]>(products);
  const [cart, setCart] = useState<CartData>({ items: [], total: 0 });
  const [searchActive, setSearchActive] = useState(false);

  /** Refresh cart from the GET /api/cart resource (same data as MCP resource) */
  const refreshCart = useCallback(async () => {
    const res = await fetch("/api/cart");
    const data: CartData = await res.json();
    setCart(data);
  }, []);

  // Fetch cart on mount + poll every 2s (picks up changes from MCP tools / curl)
  useEffect(() => {
    refreshCart();
    const interval = setInterval(refreshCart, 2000);
    return () => clearInterval(interval);
  }, [refreshCart]);

  const handleAddToCart = async (productId: string) => {
    await fetch("/api/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, quantity: 1 }),
    });
    await refreshCart();
  };

  const handleRemoveFromCart = async (productId: string) => {
    await fetch("/api/cart/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    await refreshCart();
  };

  const handleSearchResults = (results: Product[]) => {
    setDisplayProducts(results);
    setSearchActive(true);
  };

  const clearSearch = () => {
    setDisplayProducts(products);
    setSearchActive(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <SearchBar onResults={handleSearchResults} />
        </div>
        <CartDropdown cart={cart} onRemove={handleRemoveFromCart} />
      </div>

      {searchActive && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {displayProducts.length} result{displayProducts.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={clearSearch}
            style={{ background: "var(--border)", color: "var(--fg)", fontSize: 12 }}
          >
            Clear search
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {displayProducts.map((product) => (
          <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
        ))}
      </div>
    </div>
  );
};
