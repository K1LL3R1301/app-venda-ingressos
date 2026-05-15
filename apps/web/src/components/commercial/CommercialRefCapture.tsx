"use client";

import { useEffect } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

export default function CommercialRefCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;
    localStorage.setItem("astro_promoter_ref", ref);
    fetch(`${API_BASE_URL}/commercial-checkout/resolve-ref`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
    }).catch(() => {});
  }, []);
  return null;
}