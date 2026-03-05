"use client";

import { useState } from "react";

interface CartEntry {
  productId: string;
  quantity: number;
  productName: string;
  price: number;
  subtotal: number;
}

interface CartData {
  items: CartEntry[];
  total: number;
}

export const CartDropdown = ({
  cart,
  onRemove,
}: {
  cart: CartData;
  onRemove: (productId: string) => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
        }}
      >
        <span style={{ fontSize: 18 }}>&#128722;</span>
        <span>{cart.items.length}</span>
        {cart.total > 0 && (
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
            ${cart.total.toFixed(2)}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 320,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: 16,
            zIndex: 50,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <h3
            style={{
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 12,
              color: "var(--muted)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Shopping Cart</span>
            <button
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                color: "var(--muted)",
                fontSize: 16,
                padding: 0,
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </h3>

          {cart.items.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--muted)" }}>Cart is empty</p>
          ) : (
            <>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {cart.items.map((item) => (
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
                    <button
                      onClick={() => onRemove(item.productId)}
                      style={{
                        background: "transparent",
                        color: "var(--danger)",
                        fontSize: 12,
                        padding: "4px 8px",
                      }}
                    >
                      Remove
                    </button>
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
                <span style={{ color: "var(--accent)" }}>
                  ${cart.total.toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
