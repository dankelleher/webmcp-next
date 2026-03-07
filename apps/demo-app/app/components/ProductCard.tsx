import type { Product } from "../db";
import { addToCartForm } from "../actions/cart";

export const ProductCard = ({ product }: { product: Product }) => (
  <div
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
      <div>
        <h3 style={{ fontSize: 16, fontWeight: 600 }}>{product.name}</h3>
        <span
          style={{
            fontSize: 12,
            color: "var(--muted)",
            background: "var(--border)",
            padding: "2px 8px",
            borderRadius: 12,
          }}
        >
          {product.category}
        </span>
      </div>
      <span style={{ fontSize: 18, fontWeight: 700 }}>${product.price}</span>
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
      <span style={{ fontSize: 13, color: product.inStock ? "var(--success)" : "var(--danger)" }}>
        {product.inStock ? "In stock" : "Out of stock"}
      </span>
      <form action={addToCartForm}>
        <input type="hidden" name="productId" value={product.id} />
        <button
          type="submit"
          disabled={!product.inStock}
          style={{
            background: product.inStock ? "var(--accent)" : "var(--border)",
            color: product.inStock ? "#fff" : "var(--muted)",
          }}
        >
          Add to cart
        </button>
      </form>
    </div>
  </div>
);
