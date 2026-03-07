"use client";

import { type ReactNode, useState } from "react";

export const CartDropdown = ({
  count,
  total,
  children,
}: {
  count: number;
  total: number;
  children: ReactNode;
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
        <span>{count}</span>
        {total > 0 && (
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
            ${total.toFixed(2)}
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

          {children}
        </div>
      )}
    </div>
  );
};
