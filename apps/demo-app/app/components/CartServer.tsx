import { db } from "../db";
import { removeFromCart } from "../actions/cart";

export interface CartEntry {
  productId: string;
  quantity: number;
  productName: string;
  price: number;
  subtotal: number;
}

const getCartItems = () => {
  const items = db.cart.items();
  return items.map((item) => {
    const product = db.products.findById(item.productId);
    return {
      productId: item.productId,
      quantity: item.quantity,
      productName: product?.name ?? "Unknown",
      price: product?.price ?? 0,
      subtotal: (product?.price ?? 0) * item.quantity,
    } satisfies CartEntry;
  });
};

export const CartServer = () => {
  const items = getCartItems();
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);

  if (items.length === 0) {
    return <p style={{ fontSize: 13, color: "var(--muted)" }}>Cart is empty</p>;
  }

  return (
    <>
      <ul
        style={{
          listStyle: "none",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {items.map((item) => (
          <li
            key={item.productId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
              paddingBottom: 10,
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div>
              <div style={{ fontWeight: 500 }}>{item.productName}</div>
              <div style={{ color: "var(--muted)", fontSize: 12 }}>
                {item.quantity} x ${item.price.toFixed(2)} = $
                {item.subtotal.toFixed(2)}
              </div>
            </div>
            <form action={removeFromCart}>
              <input type="hidden" name="productId" value={item.productId} />
              <button
                type="submit"
                style={{
                  background: "transparent",
                  color: "var(--danger)",
                  fontSize: 12,
                  padding: "4px 8px",
                }}
              >
                Remove
              </button>
            </form>
          </li>
        ))}
      </ul>
      <div
        style={{
          marginTop: 12,
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        <span>Total</span>
        <span style={{ color: "var(--accent)" }}>${total.toFixed(2)}</span>
      </div>
    </>
  );
};
