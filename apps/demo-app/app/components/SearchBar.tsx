"use client";

import { useState } from "react";
import type { Product } from "../db";

export const SearchBar = ({
  onResults,
}: {
  onResults: (products: Product[]) => void;
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch("/api/products/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const data = await res.json();
    onResults(data.results);
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="Search products..."
        style={{ flex: 1 }}
      />
      <button
        onClick={handleSearch}
        disabled={loading}
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {loading ? "..." : "Search"}
      </button>
    </div>
  );
};
