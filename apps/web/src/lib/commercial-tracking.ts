const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3001/v1";

export function getStoredPromoterRef() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("astro_promoter_ref") || "";
}

export async function validateCommercialCoupon(params: {
  eventId: string;
  code: string;
  subtotal: string | number;
  customerCpf?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/commercial-checkout/validate-coupon`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.message || "Nao foi possivel aplicar o cupom.");
  return result;
}

export function withCommercialTracking<T extends Record<string, any>>(orderPayload: T, couponCode?: string) {
  const promoterRef = getStoredPromoterRef();
  return { ...orderPayload, couponCode: couponCode || undefined, promoterRef: promoterRef || undefined };
}