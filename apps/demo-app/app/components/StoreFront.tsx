"use client";

import { useState } from "react";
import type { Product } from "../db";
import { ProductCard } from "./ProductCard";
import { SearchBar } from "./SearchBar";

export const StoreFront = ({ products }: { products: Product[] }) => {
  const [displayProducts, setDisplayProducts] = useState<Product[]>(products);
  const [searchActive, setSearchActive] = useState(false);

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
        <SearchBar onResults={handleSearchResults} />
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
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
