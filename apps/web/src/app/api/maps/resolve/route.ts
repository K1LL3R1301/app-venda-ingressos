import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Coordinates = {
  latitude: string;
  longitude: string;
};

function normalizeExternalUrl(value: string | null) {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|google\.|maps\.app\.goo\.gl|goo\.gl|waze\.com|openstreetmap\.org|bing\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function extractCoordinatesFromText(value: string): Coordinates | null {
  const decodedValue = decodeURIComponent(value);
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|center|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
    /\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:\?|\/|$)/,
  ];

  for (const pattern of patterns) {
    const match = decodedValue.match(pattern);
    if (match?.[1] && match?.[2]) {
      return { latitude: match[1], longitude: match[2] };
    }
  }

  return null;
}

function extractPlaceName(value: string) {
  try {
    const url = new URL(value);
    const placeMatch = url.pathname.match(/\/maps\/place\/([^/@]+)/);
    if (!placeMatch?.[1]) return undefined;
    return decodeURIComponent(placeMatch[1]).replace(/\+/g, " ");
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  const normalized = normalizeExternalUrl(urlParam);

  if (!normalized) {
    return NextResponse.json({ message: "Informe a URL do mapa." }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalized);
  } catch {
    return NextResponse.json({ message: "URL de mapa invalida." }, { status: 400 });
  }

  const allowedHosts = ["google.", "maps.app.goo.gl", "goo.gl", "waze.com", "openstreetmap.org", "bing.com"];
  const host = parsedUrl.hostname.toLowerCase();

  if (!allowedHosts.some((allowedHost) => host.includes(allowedHost))) {
    return NextResponse.json({ message: "Use um link do Google Maps, Waze, OpenStreetMap ou Bing." }, { status: 400 });
  }

  let finalUrl = normalized;
  let html = "";

  try {
    const response = await fetch(normalized, {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    finalUrl = response.url || normalized;
    html = await response.text().catch(() => "");
  } catch (error) {
    const coordinates = extractCoordinatesFromText(normalized);
    if (coordinates) {
      return NextResponse.json({ finalUrl: normalized, coordinates, placeName: extractPlaceName(normalized) });
    }
    return NextResponse.json(
      {
        message: "Nao foi possivel abrir o encurtador do mapa. Tente copiar a URL completa da barra do navegador.",
        detail: error instanceof Error ? error.message : "Erro desconhecido.",
      },
      { status: 502 },
    );
  }

  const coordinates = extractCoordinatesFromText(finalUrl) || extractCoordinatesFromText(html) || extractCoordinatesFromText(normalized);
  return NextResponse.json({ originalUrl: normalized, finalUrl, coordinates, placeName: extractPlaceName(finalUrl) });
}
