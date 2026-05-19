"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type EventMedia = {
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  thumbnailUrl?: string | null;
  mobileBannerUrl?: string | null;
  sectorMapImageUrl?: string | null;
  gallery?: string[] | null;
};

type EventContent = {
  headline?: string | null;
  summary?: string | null;
  fullDescription?: string | null;
  attractions?: string | null;
  schedule?: string | null;
  sectorDetails?: string | null;
  importantInfo?: string | null;
  faq?: string | null;
  producerDescription?: string | null;
  purchaseInstructions?: string | null;
};

type EventLocation = {
  mode?: string | null;
  venueName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  reference?: string | null;
  mapUrl?: string | null;
  instructions?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

type EventPolicy = {
  ageRating?: string | null;
  refundPolicy?: string | null;
  halfEntryPolicy?: string | null;
  transferPolicy?: string | null;
  termsNotes?: string | null;
  entryRules?: string | null;
  documentRules?: string | null;
};

type EventSession = {
  id: string;
  name?: string | null;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  status?: string | null;
  displayOrder?: number | null;
};

type VenueSector = {
  id: string;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  occupancyMode?: string | null;
  capacity?: number | null;
  displayOrder?: number | null;
  color?: string | null;
  gateName?: string | null;
};

type TicketType = {
  id: string;
  name?: string | null;
  lotLabel?: string | null;
  description?: string | null;
  price?: string | number | null;
  quantity?: number | null;
  soldQuantity?: number | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  minPerOrder?: number | null;
  maxPerOrder?: number | null;
  displayOrder?: number | null;
  isHidden?: boolean | null;
  status?: string | null;
  occupancyMode?: string | null;
  eventSessionId?: string | null;
  venueSectorId?: string | null;
  eventSession?: EventSession | null;
  venueSector?: VenueSector | null;
};

type VenueLayout = {
  id: string;
  name?: string | null;
  occupancyMode?: string | null;
  width?: number | null;
  height?: number | null;
  isDefault?: boolean | null;
  status?: string | null;
  mapObjects?: {
    id?: string;
    code?: string | null;
    label?: string | null;
    type?: string | null;
    capacity?: number | null;
    x?: number | null;
    y?: number | null;
    width?: number | null;
    height?: number | null;
    status?: string | null;
    rotation?: number | null;
    venueSectorId?: string | null;
    venueSector?: VenueSector | null;
    metadata?: Record<string, unknown> | null;
  }[];
};

type EventDetails = {
  id: string;
  name?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  slug?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  capacity?: number | null;
  status?: string | null;
  category?: string | { name?: string | null } | null;
  categoryName?: string | null;
  visibility?: string | null;
  timezone?: string | null;
  occupancyMode?: string | null;
  multiSession?: boolean | null;
  allowSeatMap?: boolean | null;
  allowTableMap?: boolean | null;
  organizer?: {
    id?: string;
    tradeName?: string | null;
    legalName?: string | null;
    email?: string | null;
    phone?: string | null;
    document?: string | null;
  } | null;
  content?: EventContent | null;
  location?: EventLocation | null;
  media?: EventMedia | null;
  policy?: EventPolicy | null;
  sessions?: EventSession[];
  sectors?: VenueSector[];
  ticketTypes?: TicketType[];
  venueLayouts?: VenueLayout[];
};

type TabId = "overview" | "sessions" | "sectors" | "tickets" | "map" | "policies" | "raw";
type TicketKind = "INTEIRA" | "MEIA" | "SOCIAL";

const ticketKindOptions: { id: TicketKind; label: string; description: string }[] = [
  { id: "INTEIRA", label: "Inteira", description: "Ingressos de valor cheio" },
  { id: "MEIA", label: "Meia", description: "Meia-entrada" },
  { id: "SOCIAL", label: "Social", description: "Ingresso social" },
];

function normalizeText(value?: string | number | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function numberFormat(value?: number | string | null) {
  const numeric = typeof value === "number" ? value : Number(value || 0);

  if (Number.isNaN(numeric)) return "0";

  return numeric.toLocaleString("pt-BR");
}

function moneyFormat(value?: string | number | null) {
  const numeric =
    typeof value === "number"
      ? value
      : Number(String(value || "0").replace(".", ".").replace(",", "."));

  if (Number.isNaN(numeric)) return "R$ 0,00";

  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value?: string | null, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

function getDaysUntil(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = startOfDate.getTime() - startOfToday.getTime();

  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getCategory(event: EventDetails) {
  if (typeof event.category === "string") return event.category;
  if (event.category?.name) return event.category.name;
  if (event.categoryName) return event.categoryName;

  return "Evento";
}

function getEventImage(event: EventDetails) {
  return (
    event.media?.bannerImageUrl ||
    event.media?.coverImageUrl ||
    event.media?.thumbnailUrl ||
    event.media?.mobileBannerUrl ||
    event.media?.gallery?.[0] ||
    ""
  );
}

function getMainDate(event: EventDetails) {
  return event.sessions?.[0]?.startsAt || event.startDate || event.eventDate || "";
}

function getLocationText(location?: EventLocation | null) {
  if (!location) return "Local a confirmar";

  const venue = location.venueName || location.addressLine1;
  const cityState = [location.city, location.state].filter(Boolean).join(" - ");

  if (venue && cityState) return `${venue}, ${cityState}`;
  if (venue) return venue;
  if (cityState) return cityState;

  return "Local a confirmar";
}

function getStatusLabel(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  if (normalized === "ACTIVE") return "Ativo";
  if (normalized === "DRAFT") return "Rascunho";
  if (normalized === "PUBLISHED") return "Publicado";
  if (normalized === "CANCELED") return "Cancelado";
  if (normalized === "FINISHED") return "Finalizado";
  if (normalized === "SOLD_OUT") return "Esgotado";

  return status || "Publicado";
}

function getStatusClasses(status?: string | null) {
  const normalized = String(status || "").toUpperCase();

  if (["ACTIVE", "PUBLISHED", ""].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (normalized === "DRAFT") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "CANCELED" || normalized === "SOLD_OUT") return "border-rose-200 bg-rose-50 text-rose-700";

  return "border-slate-200 bg-slate-100 text-slate-700";
}

function getTicketKind(ticket: TicketType): TicketKind {
  const text = normalizeText([ticket.name, ticket.lotLabel, ticket.description].filter(Boolean).join(" "));

  if (text.includes("social")) return "SOCIAL";
  if (text.includes("meia")) return "MEIA";

  return "INTEIRA";
}

function getTicketKindLabel(kind: TicketKind) {
  return ticketKindOptions.find((option) => option.id === kind)?.label || "Inteira";
}

function summarizeTickets(tickets: TicketType[]) {
  const quantity = tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
  const hidden = tickets.filter((ticket) => ticket.isHidden).length;
  const active = tickets.filter((ticket) => String(ticket.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
  const prices = tickets
    .map((ticket) => Number(String(ticket.price || "0").replace(",", ".")))
    .filter((price) => !Number.isNaN(price) && price > 0);

  return {
    quantity,
    hidden,
    active,
    lotCount: tickets.length,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
  };
}

type MapPoint = { x: number; y: number };
type LayoutMapObject = NonNullable<NonNullable<VenueLayout["mapObjects"]>[number]>;

type MapShape = "RECTANGLE" | "ROUNDED" | "PILL" | "CIRCLE" | "FREEFORM";

function toFiniteNumber(value?: number | string | null, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : fallback;
}

function mapObjectWidth(object: LayoutMapObject) {
  return Math.max(30, toFiniteNumber(object.width, 160));
}

function mapObjectHeight(object: LayoutMapObject) {
  return Math.max(30, toFiniteNumber(object.height, 100));
}

function mapObjectMetaNumber(object: LayoutMapObject, key: string, fallback = 0) {
  const value = object.metadata?.[key];

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  return fallback;
}

function defaultMapPolygon(): MapPoint[] {
  return [
    { x: 0, y: 12 },
    { x: 24, y: 0 },
    { x: 100, y: 0 },
    { x: 88, y: 45 },
    { x: 100, y: 100 },
    { x: 18, y: 88 },
    { x: 0, y: 100 },
  ];
}

function isMapPoint(value: unknown): value is MapPoint {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Record<string, unknown>;
  return typeof point.x === "number" && typeof point.y === "number";
}

function mapObjectShape(object: LayoutMapObject): MapShape {
  const shape = String(object.metadata?.shape || "ROUNDED").toUpperCase();

  if (["RECTANGLE", "ROUNDED", "PILL", "CIRCLE", "FREEFORM"].includes(shape)) {
    return shape as MapShape;
  }

  return "ROUNDED";
}

function mapObjectPoints(object: LayoutMapObject): MapPoint[] {
  const raw = object.metadata?.polygonPoints;
  return Array.isArray(raw) && raw.every(isMapPoint) ? raw : defaultMapPolygon();
}

function mapObjectSvgPoints(object: LayoutMapObject) {
  const width = mapObjectWidth(object);
  const height = mapObjectHeight(object);

  return mapObjectPoints(object)
    .map((point) => `${(point.x / 100) * width},${(point.y / 100) * height}`)
    .join(" ");
}

function mapObjectCssPoints(object: LayoutMapObject) {
  return mapObjectPoints(object).map((point) => `${point.x}% ${point.y}%`).join(", ");
}

function smoothMapObjectPath(object: LayoutMapObject) {
  const width = mapObjectWidth(object);
  const height = mapObjectHeight(object);
  const points = mapObjectPoints(object).map((point) => ({
    x: (point.x / 100) * width,
    y: (point.y / 100) * height,
  }));

  if (points.length < 3) return mapObjectSvgPoints(object);

  const cornerSoftness = 0.18;
  const commands: string[] = [];

  points.forEach((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    const start = {
      x: point.x + (previous.x - point.x) * cornerSoftness,
      y: point.y + (previous.y - point.y) * cornerSoftness,
    };
    const end = {
      x: point.x + (next.x - point.x) * cornerSoftness,
      y: point.y + (next.y - point.y) * cornerSoftness,
    };

    if (index === 0) {
      commands.push(`M ${start.x} ${start.y}`);
    } else {
      commands.push(`L ${start.x} ${start.y}`);
    }

    commands.push(`Q ${point.x} ${point.y} ${end.x} ${end.y}`);
  });

  commands.push("Z");
  return commands.join(" ");
}

function shouldSmoothMapObject(object: LayoutMapObject) {
  return mapObjectShape(object) === "FREEFORM" && object.metadata?.smoothPolygon !== false;
}

function mapObjectRadius(object: LayoutMapObject) {
  const shape = mapObjectShape(object);

  if (shape === "CIRCLE" || shape === "PILL") return "9999px";
  if (shape === "RECTANGLE") return "0.75rem";

  return "2rem";
}

function isPointInsidePolygon(point: MapPoint, polygon: MapPoint[]) {
  let inside = false;

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const currentPoint = polygon[currentIndex];
    const previousPoint = polygon[previousIndex];

    const intersects =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y || 1) +
          currentPoint.x;

    if (intersects) inside = !inside;
  }

  return inside;
}

function isWholeIconInsidePolygon(
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  polygon: MapPoint[],
) {
  const testPoints: MapPoint[] = [
    { x: centerX, y: centerY },
    { x: centerX - radiusX, y: centerY },
    { x: centerX + radiusX, y: centerY },
    { x: centerX, y: centerY - radiusY },
    { x: centerX, y: centerY + radiusY },
    { x: centerX - radiusX * 0.72, y: centerY - radiusY * 0.72 },
    { x: centerX + radiusX * 0.72, y: centerY - radiusY * 0.72 },
    { x: centerX - radiusX * 0.72, y: centerY + radiusY * 0.72 },
    { x: centerX + radiusX * 0.72, y: centerY + radiusY * 0.72 },
  ];

  return testPoints.every((point) => isPointInsidePolygon(point, polygon));
}

function getMapObjectSector(event: EventDetails, object: LayoutMapObject) {
  const sectorName = String(object.metadata?.sectorName || object.label || object.code || "");
  const objectSectorId = object.venueSectorId || object.venueSector?.id;

  return event.sectors?.find((sector) => {
    if (objectSectorId && sector.id === objectSectorId) return true;
    if (sectorName && normalizeText(sector.name) === normalizeText(sectorName)) return true;
    return false;
  });
}

function getMapObjectColor(event: EventDetails, object: LayoutMapObject) {
  const sector = getMapObjectSector(event, object);
  const metadataColor = object.metadata?.sectorColor;

  if (sector?.color) return sector.color;
  if (typeof metadataColor === "string" && metadataColor.trim()) return metadataColor;
  if (String(object.type || "").toUpperCase() === "STAGE") return "#111827";

  return "#0284c7";
}

function getMapObjectKindLabel(object: LayoutMapObject) {
  const objectType = String(object.type || "").toUpperCase();
  const sectorKind = String(object.metadata?.sectorKind || "").toUpperCase();

  if (objectType === "STAGE") return "Palco";
  if (sectorKind === "NUMBERED_SEATS") return "Cadeiras numeradas";
  if (sectorKind === "TABLES" || objectType === "TABLE") return "Mesas";
  if (sectorKind === "GENERAL" || sectorKind === "STANDING" || sectorKind === "AUDIENCE") return "Plateia";

  return "Setor";
}

function mapObjectCapacityLabel(object: LayoutMapObject) {
  const sectorKind = String(object.metadata?.sectorKind || "").toUpperCase();
  const objectType = String(object.type || "").toUpperCase();

  if (sectorKind === "NUMBERED_SEATS") {
    const rows = mapObjectMetaNumber(object, "chairRows", 0);
    const columns = mapObjectMetaNumber(object, "chairsPerRow", 0);
    const chairCount = mapObjectMetaNumber(
      object,
      "chairCount",
      rows * columns || toFiniteNumber(object.capacity, 0),
    );

    return rows > 0 && columns > 0
      ? `${numberFormat(chairCount)} cadeiras • ${rows}x${columns}`
      : `${numberFormat(chairCount)} cadeiras`;
  }

  if (sectorKind === "TABLES" || objectType === "TABLE") {
    const tableCount = mapObjectMetaNumber(object, "tableCount", 0);
    const seats = mapObjectMetaNumber(object, "seatsPerTable", 0);

    if (tableCount > 0 && seats > 0) {
      return `${numberFormat(tableCount)} mesas • ${seats} lugares`;
    }
  }

  return `${numberFormat(object.capacity)} pessoas`;
}

function MapGuides() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.28) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(14,165,233,0.32) 1px, transparent 1px), linear-gradient(to bottom, rgba(14,165,233,0.32) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-sky-500/30" />
      <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-sky-500/30" />
    </>
  );
}

function SeatIcon({ size, innerSize, left, top }: { size: number; innerSize: number; left: number; top: number }) {
  return (
    <span
      className="absolute flex items-center justify-center"
      style={{ left: left - size / 2, top: top - size / 2, width: size, height: size }}
    >
      <span className="relative block rounded-[35%] bg-white/95 shadow" style={{ width: size, height: size }}>
        <span
          className="absolute left-1/2 top-[13%] -translate-x-1/2 rounded-t-md bg-slate-900/25"
          style={{ width: innerSize * 1.35, height: Math.max(1, innerSize * 0.42) }}
        />
        <span
          className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded-md bg-slate-900/25"
          style={{ width: innerSize * 1.25, height: Math.max(1, innerSize * 0.48) }}
        />
        <span
          className="absolute bottom-[12%] left-[24%] rounded-full bg-slate-900/25"
          style={{ width: Math.max(1, innerSize * 0.22), height: Math.max(1, innerSize * 0.5) }}
        />
        <span
          className="absolute bottom-[12%] right-[24%] rounded-full bg-slate-900/25"
          style={{ width: Math.max(1, innerSize * 0.22), height: Math.max(1, innerSize * 0.5) }}
        />
      </span>
    </span>
  );
}

function TableIcon({ size, innerSize, left, top }: { size: number; innerSize: number; left: number; top: number }) {
  return (
    <span
      className="absolute flex items-center justify-center"
      style={{ left: left - size / 2, top: top - size / 2, width: size, height: size }}
    >
      <span className="relative block rounded-full bg-white/95 shadow" style={{ width: size, height: size }}>
        <span
          className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/25"
          style={{ width: innerSize, height: innerSize }}
        />
        <span className="absolute left-1/2 top-[8%] h-[16%] w-[16%] -translate-x-1/2 rounded-full bg-white/75" />
        <span className="absolute bottom-[8%] left-1/2 h-[16%] w-[16%] -translate-x-1/2 rounded-full bg-white/75" />
        <span className="absolute left-[8%] top-1/2 h-[16%] w-[16%] -translate-y-1/2 rounded-full bg-white/75" />
        <span className="absolute right-[8%] top-1/2 h-[16%] w-[16%] -translate-y-1/2 rounded-full bg-white/75" />
      </span>
    </span>
  );
}

function ObjectInternalPreview({ object }: { object: LayoutMapObject }) {
  const sectorKind = String(object.metadata?.sectorKind || "").toUpperCase();
  const objectType = String(object.type || "").toUpperCase();
  const width = mapObjectWidth(object);
  const height = mapObjectHeight(object);
  const isFreeform = mapObjectShape(object) === "FREEFORM";
  const polygon = mapObjectPoints(object);
  const labelHeight = 42;
  const inset = 14;
  const gridX = inset;
  const gridY = inset;
  const gridW = Math.max(40, width - inset * 2);
  const gridH = Math.max(30, height - inset * 2 - labelHeight);

  if (sectorKind === "NUMBERED_SEATS") {
    const rows = mapObjectMetaNumber(object, "chairRows", 0);
    const columns = mapObjectMetaNumber(object, "chairsPerRow", 0);
    const chairCount = mapObjectMetaNumber(object, "chairCount", rows * columns);

    if (rows <= 0 || columns <= 0 || chairCount <= 0) return null;

    const cellW = gridW / columns;
    const cellH = gridH / rows;
    const iconSize = Math.max(3, Math.min(18, Math.floor(Math.min(cellW, cellH) * 0.72)));
    const innerSize = Math.max(1, Math.floor(iconSize * 0.42));
    const radiusXPercent = ((iconSize / 2) / width) * 100;
    const radiusYPercent = ((iconSize / 2) / height) * 100;
    const maxPreview = Math.min(chairCount, rows * columns, 2500);

    const chairs = Array.from({ length: maxPreview })
      .map((_, chairIndex) => {
        const row = Math.floor(chairIndex / columns);
        const column = chairIndex % columns;
        const left = gridX + column * cellW + cellW / 2;
        const top = gridY + row * cellH + cellH / 2;
        const centerX = (left / width) * 100;
        const centerY = (top / height) * 100;

        if (left - iconSize / 2 < inset || left + iconSize / 2 > width - inset) return null;
        if (top - iconSize / 2 < inset || top + iconSize / 2 > height - inset - labelHeight) return null;
        if (isFreeform && !isWholeIconInsidePolygon(centerX, centerY, radiusXPercent, radiusYPercent, polygon)) return null;

        return { chairIndex, left, top };
      })
      .filter((chair): chair is { chairIndex: number; left: number; top: number } => Boolean(chair));

    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-3 overflow-hidden rounded-2xl bg-black/5"
          style={isFreeform ? { clipPath: `polygon(${mapObjectCssPoints(object)})` } : undefined}
        >
          {chairs.map((chair) => (
            <SeatIcon key={`chair-${object.id || object.code}-${chair.chairIndex}`} size={iconSize} innerSize={innerSize} left={chair.left} top={chair.top} />
          ))}
        </div>
      </div>
    );
  }

  if (sectorKind === "TABLES" || objectType === "TABLE") {
    const tableCount = mapObjectMetaNumber(object, "tableCount", 0);

    if (tableCount <= 0) return null;

    const ratio = gridW / Math.max(gridH, 1);
    let columns = Math.max(1, Math.ceil(Math.sqrt(tableCount * ratio)));
    let rows = Math.max(1, Math.ceil(tableCount / columns));
    let cellW = gridW / columns;
    let cellH = gridH / rows;
    let iconSize = Math.max(4, Math.min(24, Math.floor(Math.min(cellW, cellH) * 0.74)));

    if (iconSize <= 5) {
      columns = Math.max(1, Math.floor(gridW / 5));
      rows = Math.max(1, Math.floor(gridH / 5));
      cellW = gridW / columns;
      cellH = gridH / rows;
      iconSize = 4;
    }

    const innerSize = Math.max(1, Math.floor(iconSize * 0.44));
    const radiusXPercent = ((iconSize / 2) / width) * 100;
    const radiusYPercent = ((iconSize / 2) / height) * 100;
    const maxPreview = Math.min(tableCount, rows * columns, 2500);

    const tables = Array.from({ length: maxPreview })
      .map((_, tableIndex) => {
        const row = Math.floor(tableIndex / columns);
        const column = tableIndex % columns;
        const left = gridX + column * cellW + cellW / 2;
        const top = gridY + row * cellH + cellH / 2;
        const centerX = (left / width) * 100;
        const centerY = (top / height) * 100;

        if (left - iconSize / 2 < inset || left + iconSize / 2 > width - inset) return null;
        if (top - iconSize / 2 < inset || top + iconSize / 2 > height - inset - labelHeight) return null;
        if (isFreeform && !isWholeIconInsidePolygon(centerX, centerY, radiusXPercent, radiusYPercent, polygon)) return null;

        return { tableIndex, left, top };
      })
      .filter((table): table is { tableIndex: number; left: number; top: number } => Boolean(table));

    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-3 overflow-hidden rounded-2xl bg-black/5"
          style={isFreeform ? { clipPath: `polygon(${mapObjectCssPoints(object)})` } : undefined}
        >
          {tables.map((table) => (
            <TableIcon key={`table-${object.id || object.code}-${table.tableIndex}`} size={iconSize} innerSize={innerSize} left={table.left} top={table.top} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function MapObjectPreview({
  event,
  object,
  selectedSectorId,
  onSelectSector,
}: {
  event: EventDetails;
  object: LayoutMapObject;
  selectedSectorId?: string | null;
  onSelectSector?: (sectorId: string) => void;
}) {
  const type = String(object.type || "").toUpperCase();
  const isStage = type === "STAGE";
  const isFreeform = mapObjectShape(object) === "FREEFORM";
  const width = mapObjectWidth(object);
  const height = mapObjectHeight(object);
  const bg = getMapObjectColor(event, object);
  const label = object.label || object.code || "Setor";
  const sector = getMapObjectSector(event, object);
  const isSelected = Boolean(sector?.id && selectedSectorId === sector.id);
  const canSelect = Boolean(sector?.id && !isStage && onSelectSector);

  return (
    <button
      type="button"
      onClick={() => {
        if (sector?.id && onSelectSector) onSelectSector(sector.id);
      }}
      className={`absolute select-none text-left ${canSelect ? "cursor-pointer" : "cursor-default"}`}
      style={{
        left: toFiniteNumber(object.x, 0),
        top: toFiniteNumber(object.y, 0),
        width,
        height,
        transform: `rotate(${toFiniteNumber(object.rotation, 0)}deg)`,
        outline: isSelected ? "6px solid rgba(14,165,233,0.88)" : undefined,
        outlineOffset: isSelected ? "6px" : undefined,
        borderRadius: isSelected ? mapObjectRadius(object) : undefined,
        zIndex: isSelected ? 30 : isStage ? 20 : 10,
      }}
    >
      {isFreeform ? (
        <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {shouldSmoothMapObject(object) ? (
            <path d={smoothMapObjectPath(object)} fill={bg} stroke="#ffffff" strokeWidth="5" filter="drop-shadow(0px 12px 12px rgba(15,23,42,0.25))" />
          ) : (
            <polygon points={mapObjectSvgPoints(object)} fill={bg} stroke="#ffffff" strokeWidth="5" filter="drop-shadow(0px 12px 12px rgba(15,23,42,0.25))" />
          )}
        </svg>
      ) : (
        <div
          className={`absolute inset-0 border-4 shadow-xl ${isStage ? "border-slate-950 bg-slate-950" : "border-white"}`}
          style={{ backgroundColor: bg, borderRadius: mapObjectRadius(object) }}
        />
      )}

      {!isStage ? <ObjectInternalPreview object={object} /> : null}

      {isStage ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white">
          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">Palco</span>
          <strong className="mt-2 px-3 text-2xl font-black uppercase leading-none">{label}</strong>
        </div>
      ) : (
        <div
          className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-slate-950/80 px-2 py-1.5 text-center text-white shadow-lg backdrop-blur-sm"
          style={isFreeform ? { clipPath: `polygon(${mapObjectCssPoints(object)})` } : undefined}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">{getMapObjectKindLabel(object)}</p>
          <p className="mt-0.5 truncate text-xs font-black uppercase leading-tight">{label}</p>
          <p className="mt-0.5 truncate text-[9px] font-black text-white/80">{mapObjectCapacityLabel(object)}</p>
        </div>
      )}
    </button>
  );
}

function EventMapPreview({
  event,
  layout,
  selectedSectorId,
  onSelectSector,
}: {
  event: EventDetails;
  layout: VenueLayout;
  selectedSectorId?: string | null;
  onSelectSector?: (sectorId: string) => void;
}) {
  const width = Math.max(600, toFiniteNumber(layout.width, 1280));
  const height = Math.max(420, toFiniteNumber(layout.height, 900));
  const objects = layout.mapObjects || [];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [availableWidth, setAvailableWidth] = useState(width);

  useEffect(() => {
    const element = wrapperRef.current;

    if (!element) return;

    function updateWidth() {
      if (!element) return;
      const rect = element.getBoundingClientRect();
      setAvailableWidth(Math.max(280, rect.width));
    }

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const scale = Math.min(1, availableWidth / width);
  const scaledHeight = Math.max(260, Math.ceil(height * scale));

  return (
    <div ref={wrapperRef} className="mt-5 w-full overflow-hidden rounded-[30px] border border-slate-200 bg-slate-100 p-3 sm:p-4">
      <div
        className="relative mx-auto overflow-hidden rounded-[28px] bg-slate-50 shadow-inner"
        style={{ width: "100%", height: scaledHeight }}
      >
        <div
          className="absolute left-0 top-0 overflow-hidden rounded-[28px] bg-slate-50 shadow-inner"
          style={{
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <MapGuides />
          <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
            Mapa salvo • guias 40px / 120px
          </div>
          <div
            className="absolute rounded-t-[2rem] bg-white/70 shadow-inner"
            style={{ left: width / 2 - 45, top: 150, width: 90, height: Math.max(0, height - 220) }}
          />

          {objects.map((object, index) => (
            <MapObjectPreview
              key={object.id || object.code || `${layout.id}-${index}`}
              event={event}
              object={object}
              selectedSectorId={selectedSectorId}
              onSelectSector={onSelectSector}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function compact(value?: string | null) {
  const text = String(value || "").trim();
  return text || "-";
}

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
      {detail ? <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p> : null}
    </div>
  );
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      {eyebrow ? (
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">{eyebrow}</p>
      ) : null}
      <h2 className="mt-1 text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">
      {text}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-black text-slate-800">{value || "-"}</div>
    </div>
  );
}

export default function AdminEventDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const eventId = params?.id;

  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>("overview");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedTicketKind, setSelectedTicketKind] = useState<TicketKind>("INTEIRA");

  useEffect(() => {
    async function loadEvent() {
      const token = sessionStorage.getItem("astro_session_token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(`http://localhost:3001/v1/events/${eventId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          alert(typeof result?.message === "string" ? result.message : "Erro ao carregar evento");
          router.push("/admin/events");
          return;
        }

        setEvent(result);
      } catch (error) {
        console.error(error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadEvent();
    }
  }, [eventId, router]);

  useEffect(() => {
    if (!event) return;

    const firstSessionId = event.sessions?.[0]?.id || null;
    const firstSectorId = event.sectors?.[0]?.id || null;

    setSelectedSessionId((current) => current || firstSessionId);
    setSelectedSectorId((current) => current || firstSectorId);
  }, [event]);

  const summary = useMemo(() => {
    const tickets = event?.ticketTypes || [];
    const sessions = event?.sessions || [];
    const sectors = event?.sectors || [];
    const layouts = event?.venueLayouts || [];
    const mapObjects = layouts.flatMap((layout) => layout.mapObjects || []);

    const totalQuantity = tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
    const hiddenTickets = tickets.filter((ticket) => ticket.isHidden).length;
    const activeTickets = tickets.filter((ticket) => String(ticket.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
    const prices = tickets
      .map((ticket) => Number(String(ticket.price || "0").replace(",", ".")))
      .filter((price) => !Number.isNaN(price) && price > 0);

    return {
      sessionsCount: sessions.length,
      sectorsCount: sectors.length,
      layoutsCount: layouts.length,
      mapObjectsCount: mapObjects.length,
      ticketCount: tickets.length,
      activeTickets,
      hiddenTickets,
      totalQuantity,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [event]);

  const filteredTickets = useMemo(() => {
    const query = normalizeText(ticketSearch);
    const tickets = event?.ticketTypes || [];

    if (!query) return tickets;

    return tickets.filter((ticket) => {
      const content = normalizeText(
        [
          ticket.name,
          ticket.lotLabel,
          ticket.description,
          ticket.eventSession?.name,
          ticket.venueSector?.name,
          ticket.price,
          ticket.quantity,
          ticket.status,
        ].join(" "),
      );

      return content.includes(query);
    });
  }, [event, ticketSearch]);

  const ticketsBySessionSector = useMemo(() => {
    const groups = new Map<string, TicketType[]>();

    for (const ticket of event?.ticketTypes || []) {
      const sessionName = ticket.eventSession?.name || "Todas as datas";
      const sectorName = ticket.venueSector?.name || "Setor não informado";
      const key = `${sessionName} • ${sectorName}`;
      const current = groups.get(key) || [];
      current.push(ticket);
      groups.set(key, current);
    }

    return Array.from(groups.entries()).map(([key, tickets]) => ({ key, tickets }));
  }, [event]);

  const selectedSession = useMemo(() => {
    return event?.sessions?.find((session) => session.id === selectedSessionId) || event?.sessions?.[0] || null;
  }, [event, selectedSessionId]);

  const selectedSector = useMemo(() => {
    return event?.sectors?.find((sector) => sector.id === selectedSectorId) || event?.sectors?.[0] || null;
  }, [event, selectedSectorId]);

  const ticketsForSelectedSession = useMemo(() => {
    const tickets = event?.ticketTypes || [];
    if (!selectedSession?.id) return tickets;

    return tickets.filter((ticket) => {
      const ticketSessionId = ticket.eventSessionId || ticket.eventSession?.id;
      return ticketSessionId === selectedSession.id;
    });
  }, [event, selectedSession]);

  const sectorsForSelectedSession = useMemo(() => {
    const baseSectors = event?.sectors || [];

    return baseSectors.map((sector) => {
      const tickets = ticketsForSelectedSession.filter((ticket) => {
        const ticketSectorId = ticket.venueSectorId || ticket.venueSector?.id;
        return ticketSectorId === sector.id;
      });
      const totalQuantity = tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
      const activeTickets = tickets.filter((ticket) => String(ticket.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
      const hiddenTickets = tickets.filter((ticket) => ticket.isHidden).length;

      return {
        sector,
        tickets,
        totalQuantity,
        activeTickets,
        hiddenTickets,
      };
    });
  }, [event, ticketsForSelectedSession]);

  const selectedTickets = useMemo(() => {
    if (!selectedSector?.id) return [];

    return ticketsForSelectedSession.filter((ticket) => {
      const ticketSectorId = ticket.venueSectorId || ticket.venueSector?.id;
      return ticketSectorId === selectedSector.id;
    });
  }, [selectedSector, ticketsForSelectedSession]);

  const selectedTicketSummary = useMemo(() => {
    const totalQuantity = selectedTickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
    const hiddenTickets = selectedTickets.filter((ticket) => ticket.isHidden).length;
    const activeTickets = selectedTickets.filter((ticket) => String(ticket.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
    const prices = selectedTickets
      .map((ticket) => Number(String(ticket.price || "0").replace(",", ".")))
      .filter((price) => !Number.isNaN(price) && price > 0);

    return {
      totalQuantity,
      hiddenTickets,
      activeTickets,
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
    };
  }, [selectedTickets]);

  const ticketKindSummaries = useMemo(() => {
    return ticketKindOptions.map((option) => {
      const tickets = selectedTickets.filter((ticket) => getTicketKind(ticket) === option.id);
      return {
        ...option,
        tickets,
        summary: summarizeTickets(tickets),
      };
    });
  }, [selectedTickets]);

  const selectedKindTickets = useMemo(() => {
    return selectedTickets.filter((ticket) => getTicketKind(ticket) === selectedTicketKind);
  }, [selectedTickets, selectedTicketKind]);

  const selectedKindSummary = useMemo(() => {
    return summarizeTickets(selectedKindTickets);
  }, [selectedKindTickets]);


  if (loading) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 py-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">Carregando evento...</p>
        </section>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 py-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">Evento não encontrado</h1>
          <Link href="/admin/events" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">
            Voltar para eventos
          </Link>
        </section>
      </main>
    );
  }

  const image = getEventImage(event);
  const mainDate = getMainDate(event);
  const daysUntil = getDaysUntil(mainDate);
  const publicHref = `/events/${event.slug || event.id}`;

  const tabs: { id: TabId; title: string; description: string }[] = [
    { id: "overview", title: "Resumo", description: "Visão geral" },
    { id: "sessions", title: "Datas", description: `${summary.sessionsCount} data(s)` },
    { id: "policies", title: "Políticas", description: "Regras" },
    { id: "raw", title: "Técnico", description: "Dados" },
  ];

  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-14 pt-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/events" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
          ← Voltar para eventos
        </Link>

        <div className="flex flex-wrap gap-2">
          <Link href={publicHref} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            Página pública
          </Link>
          <Link href={`/admin/events/${event.id}/edit`} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-700">
            Editar evento
          </Link>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-[38px] border border-slate-200 bg-slate-950 text-white shadow-sm">
        {image ? (
          <img src={image} alt={event.name || "Evento"} className="absolute inset-0 h-full w-full object-cover opacity-45" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.34),transparent_30%),linear-gradient(135deg,#020617,#0f172a,#082f49)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/55" />

        <div className="relative z-10 grid gap-8 p-7 md:p-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950">{getCategory(event)}</span>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-black ${getStatusClasses(event.status)}`}>{getStatusLabel(event.status)}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white">{event.visibility || "PUBLIC"}</span>
            </div>

            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">{event.name || "Evento sem nome"}</h1>
            <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/75">{event.shortDescription || event.description || event.content?.summary || "Sem descrição cadastrada."}</p>

            <div className="mt-7 grid gap-3 md:grid-cols-3">
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Data principal</p>
                <p className="mt-1 text-lg font-black">{formatDate(mainDate)}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Quando</p>
                <p className="mt-1 text-lg font-black">{daysUntil === null ? "-" : daysUntil < 0 ? "Já passou" : `${daysUntil} dia(s)`}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-4 backdrop-blur">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">Local</p>
                <p className="mt-1 line-clamp-2 text-lg font-black">{getLocationText(event.location)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/50">Produtora</p>
            <p className="mt-2 text-2xl font-black">{event.organizer?.tradeName || event.organizer?.legalName || "-"}</p>
            <div className="mt-4 space-y-2 text-sm font-semibold text-white/70">
              <p>{event.organizer?.email || "E-mail não informado"}</p>
              <p>{event.organizer?.phone || "Telefone não informado"}</p>
              <p>{event.organizer?.document || "Documento não informado"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Capacidade" value={numberFormat(event.capacity)} detail="Capacidade geral" />
        <StatCard label="Datas" value={summary.sessionsCount} detail="Sessões cadastradas" />
        <StatCard label="Setores" value={summary.sectorsCount} detail="Áreas de venda" />
        <StatCard label="Ingressos" value={numberFormat(summary.totalQuantity)} detail={`${summary.ticketCount} lote(s) ou tipo(s)`} />
      </section>

      <section className="mt-6 rounded-[32px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2 md:grid-cols-4">
          {tabs.map((item) => {
            const active = tab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`rounded-3xl border p-4 text-left transition ${
                  active ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-black text-slate-950">{item.title}</p>
                <p className="mt-1 text-[11px] font-bold text-slate-500">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 space-y-6">
        {tab === "overview" ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <Section title="Resumo operacional" eyebrow="Painel">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="Nome" value={event.name} />
                <DetailRow label="Slug" value={event.slug || "-"} />
                <DetailRow label="Categoria" value={getCategory(event)} />
                <DetailRow label="Ocupação" value={event.occupancyMode || "-"} />
                <DetailRow label="Status" value={getStatusLabel(event.status)} />
                <DetailRow label="Visibilidade" value={event.visibility || "PUBLIC"} />
                <DetailRow label="Fuso horário" value={event.timezone || "America/Sao_Paulo"} />
                <DetailRow label="Faixa de preço" value={`${moneyFormat(summary.minPrice)} até ${moneyFormat(summary.maxPrice)}`} />
              </div>
            </Section>

            <Section title="Local e acesso" eyebrow="Endereço">
              <div className="grid gap-3">
                <DetailRow label="Nome do local" value={event.location?.venueName || "-"} />
                <DetailRow label="Endereço" value={[event.location?.addressLine1, event.location?.addressLine2].filter(Boolean).join(", ") || "-"} />
                <DetailRow label="Bairro" value={event.location?.neighborhood || "-"} />
                <DetailRow label="Cidade/Estado" value={[event.location?.city, event.location?.state].filter(Boolean).join(" - ") || "-"} />
                <DetailRow label="Referência" value={event.location?.reference || "-"} />
                <DetailRow label="Coordenadas" value={[event.location?.latitude, event.location?.longitude].filter(Boolean).join(", ") || "-"} />
                {event.location?.mapUrl ? (
                  <a href={event.location.mapUrl} target="_blank" rel="noreferrer" className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-sky-700">
                    Abrir mapa
                  </a>
                ) : null}
              </div>
            </Section>
          </div>
        ) : null}

        {tab === "sessions" ? (
          <Section title="Datas, setores, mapa e ingressos" eyebrow="Agenda operacional">
            {event.sessions?.length ? (
              <div className="space-y-6">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">Selecione a data</p>
                      <h3 className="mt-1 text-2xl font-black text-slate-950">Datas do evento</h3>
                    </div>
                    <span className="rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm">
                      {summary.sessionsCount} data(s)
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {event.sessions.map((session, index) => {
                      const active = selectedSession?.id === session.id;
                      const sessionDaysUntil = getDaysUntil(session.startsAt);
                      const sessionTickets = (event.ticketTypes || []).filter((ticket) => {
                        const ticketSessionId = ticket.eventSessionId || ticket.eventSession?.id;
                        return ticketSessionId === session.id;
                      });
                      const sessionQuantity = sessionTickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);

                      return (
                        <button
                          key={session.id || index}
                          type="button"
                          onClick={() => {
                            setSelectedSessionId(session.id);
                            setSelectedSectorId(event.sectors?.[0]?.id || null);
                          }}
                          className={`rounded-[24px] border p-4 text-left transition ${
                            active
                              ? "border-sky-500 bg-sky-50 shadow-sm ring-4 ring-sky-100"
                              : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
                          }`}
                        >
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Data {index + 1}</p>
                          <h4 className="mt-1 text-xl font-black text-slate-950">{session.name || `Sessão ${index + 1}`}</h4>
                          <p className="mt-1 text-xs font-bold text-slate-500">{formatDate(session.startsAt)}</p>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <div className="rounded-2xl bg-white p-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Faltam</p>
                              <p className="mt-1 font-black text-slate-950">
                                {sessionDaysUntil === null ? "-" : sessionDaysUntil < 0 ? "Passou" : `${sessionDaysUntil} dia(s)`}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white p-3">
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Ingressos</p>
                              <p className="mt-1 font-black text-slate-950">{numberFormat(sessionQuantity)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedSession ? (
                  <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">Data selecionada</p>
                        <h3 className="mt-1 text-3xl font-black text-slate-950">{selectedSession.name || "Data"}</h3>
                        <p className="mt-2 text-sm font-bold text-slate-500">
                          {formatDate(selectedSession.startsAt)} até {formatDate(selectedSession.endsAt)} • Capacidade {numberFormat(selectedSession.capacity)}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(selectedSession.status)}`}>
                        {getStatusLabel(selectedSession.status)}
                      </span>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
                      <div className="space-y-4">
                        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Setores desta data</p>
                          <div className="mt-4 grid gap-3">
                            {sectorsForSelectedSession.map(({ sector, totalQuantity, activeTickets, hiddenTickets }) => {
                              const active = selectedSector?.id === sector.id;
                              return (
                                <button
                                  key={sector.id}
                                  type="button"
                                  onClick={() => setSelectedSectorId(sector.id)}
                                  className={`rounded-[22px] border p-4 text-left transition ${
                                    active
                                      ? "border-sky-500 bg-white shadow-sm ring-4 ring-sky-100"
                                      : "border-slate-200 bg-white hover:border-sky-200 hover:bg-white"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Setor</p>
                                      <h4 className="mt-1 text-lg font-black text-slate-950">{sector.name || "Setor"}</h4>
                                      <p className="mt-1 text-xs font-bold text-slate-500">Cap. {numberFormat(sector.capacity)} • {numberFormat(totalQuantity)} ingresso(s)</p>
                                    </div>
                                    <span className="h-8 w-8 rounded-xl border border-white shadow-sm" style={{ background: sector.color || "#e2e8f0" }} />
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{activeTickets} ativo(s)</span>
                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{hiddenTickets} oculto(s)</span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-5">
                        <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mapa da data</p>
                              <h4 className="mt-1 text-xl font-black text-slate-950">Clique em um setor no mapa ou na lista</h4>
                            </div>
                            {selectedSector ? (
                              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-700">
                                {selectedSector.name}
                              </span>
                            ) : null}
                          </div>

                          {event.venueLayouts?.length ? (
                            <EventMapPreview
                              event={event}
                              layout={event.venueLayouts[0]}
                              selectedSectorId={selectedSector?.id || null}
                              onSelectSector={setSelectedSectorId}
                            />
                          ) : (
                            <EmptyState text="Nenhum mapa cadastrado." />
                          )}
                        </div>

                        {selectedSector ? (
                          <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">Ingressos do setor</p>
                                <h4 className="mt-1 text-2xl font-black text-slate-950">{selectedSector.name}</h4>
                                <p className="mt-1 text-sm font-bold text-slate-500">
                                  {selectedSession.name} • somente lotes deste setor e desta data
                                </p>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Qtd.</p>
                                  <p className="mt-1 font-black text-slate-950">{numberFormat(selectedTicketSummary.totalQuantity)}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Ativos</p>
                                  <p className="mt-1 font-black text-slate-950">{selectedTicketSummary.activeTickets}</p>
                                </div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">Ocultos</p>
                                  <p className="mt-1 font-black text-slate-950">{selectedTicketSummary.hiddenTickets}</p>
                                </div>
                              </div>
                            </div>

                            {selectedTickets.length ? (
                              <div className="mt-5 space-y-4">
                                <div className="grid gap-3 md:grid-cols-3">
                                  {ticketKindSummaries.map((kind) => {
                                    const active = selectedTicketKind === kind.id;

                                    return (
                                      <button
                                        key={kind.id}
                                        type="button"
                                        onClick={() => setSelectedTicketKind(kind.id)}
                                        className={`rounded-[22px] border p-4 text-left transition ${
                                          active
                                            ? "border-sky-500 bg-sky-50 shadow-sm ring-4 ring-sky-100"
                                            : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                              Tipo
                                            </p>
                                            <h5 className="mt-1 text-xl font-black text-slate-950">
                                              {kind.label}
                                            </h5>
                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                              {kind.description}
                                            </p>
                                          </div>
                                          {kind.summary.lotCount > 0 ? (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
                                              OK
                                            </span>
                                          ) : (
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-500">
                                              Sem lote
                                            </span>
                                          )}
                                        </div>

                                        <div className="mt-4 grid grid-cols-2 gap-2">
                                          <div className="rounded-2xl bg-white p-3">
                                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                                              Lotes
                                            </p>
                                            <p className="mt-1 font-black text-slate-950">
                                              {numberFormat(kind.summary.lotCount)}
                                            </p>
                                          </div>
                                          <div className="rounded-2xl bg-white p-3">
                                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                                              Qtd.
                                            </p>
                                            <p className="mt-1 font-black text-slate-950">
                                              {numberFormat(kind.summary.quantity)}
                                            </p>
                                          </div>
                                        </div>

                                        <p className="mt-3 text-xs font-black text-slate-600">
                                          {kind.summary.lotCount
                                            ? `${moneyFormat(kind.summary.minPrice)} até ${moneyFormat(kind.summary.maxPrice)}`
                                            : "Nenhum lote criado"}
                                        </p>
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-600">
                                        Tipo selecionado
                                      </p>
                                      <h5 className="mt-1 text-2xl font-black text-slate-950">
                                        {getTicketKindLabel(selectedTicketKind)}
                                      </h5>
                                      <p className="mt-1 text-sm font-bold text-slate-500">
                                        Resumo dos lotes deste tipo. A lista completa de lotes pode virar uma tela própria depois.
                                      </p>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center">
                                      <div className="rounded-2xl bg-white px-4 py-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                                          Lotes
                                        </p>
                                        <p className="mt-1 font-black text-slate-950">
                                          {numberFormat(selectedKindSummary.lotCount)}
                                        </p>
                                      </div>
                                      <div className="rounded-2xl bg-white px-4 py-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                                          Qtd.
                                        </p>
                                        <p className="mt-1 font-black text-slate-950">
                                          {numberFormat(selectedKindSummary.quantity)}
                                        </p>
                                      </div>
                                      <div className="rounded-2xl bg-white px-4 py-3">
                                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                                          Ocultos
                                        </p>
                                        <p className="mt-1 font-black text-slate-950">
                                          {numberFormat(selectedKindSummary.hidden)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {selectedKindTickets.length ? (
                                    <div className="mt-4 overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                                      <div className="grid grid-cols-[1.2fr_130px_120px_120px_120px] bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white max-xl:hidden">
                                        <span>Lote</span>
                                        <span>Preço</span>
                                        <span>Qtd.</span>
                                        <span>Venda</span>
                                        <span>Status</span>
                                      </div>
                                      <div className="divide-y divide-slate-200">
                                        {selectedKindTickets
                                          .slice()
                                          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                                          .map((ticket) => (
                                            <article key={ticket.id} className="grid gap-3 bg-white px-4 py-4 text-sm max-xl:grid-cols-1 xl:grid-cols-[1.2fr_130px_120px_120px_120px] xl:items-center">
                                              <div>
                                                <p className="font-black text-slate-950">{ticket.name || ticket.lotLabel || "Ingresso"}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">{ticket.lotLabel || "Sem lote"} • {ticket.isHidden ? "Oculto" : "Visível"}</p>
                                              </div>
                                              <p className="font-black text-slate-950">{moneyFormat(ticket.price)}</p>
                                              <p className="font-black text-slate-950">{numberFormat(ticket.quantity)}</p>
                                              <p className="text-xs font-bold text-slate-500">{formatDate(ticket.salesStartAt, { hour: undefined, minute: undefined })} → {formatDate(ticket.salesEndAt, { hour: undefined, minute: undefined })}</p>
                                              <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                                            </article>
                                          ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-4">
                                      <EmptyState text={`Nenhum lote encontrado para ${getTicketKindLabel(selectedTicketKind)} neste setor e nesta data.`} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-5">
                                <EmptyState text="Nenhum ingresso encontrado para este setor nesta data." />
                              </div>
                            )}
                          </div>
                        ) : (
                          <EmptyState text="Selecione um setor para ver os ingressos." />
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyState text="Nenhuma data cadastrada." />
            )}
          </Section>
        ) : null}

        {tab === "sectors" ? (
          <Section title="Setores e áreas" eyebrow="Capacidade">
            {event.sectors?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {event.sectors.map((sector, index) => (
                  <article key={sector.id || index} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Setor {index + 1}</p>
                        <h3 className="mt-1 text-2xl font-black text-slate-950">{sector.name || "Setor"}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{sector.description || "Sem descrição."}</p>
                      </div>
                      <span className="h-10 w-10 rounded-2xl border border-slate-200" style={{ background: sector.color || "#e2e8f0" }} />
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2">
                      <DetailRow label="Tipo" value={sector.type || "-"} />
                      <DetailRow label="Ocupação" value={sector.occupancyMode || "-"} />
                      <DetailRow label="Capacidade" value={numberFormat(sector.capacity)} />
                      <DetailRow label="Portão" value={sector.gateName || "-"} />
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum setor cadastrado." />
            )}
          </Section>
        ) : null}

        {tab === "tickets" ? (
          <Section title="Ingressos e lotes" eyebrow="Venda">
            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <StatCard label="Lotes/tipos" value={summary.ticketCount} />
              <StatCard label="Ativos" value={summary.activeTickets} />
              <StatCard label="Ocultos" value={summary.hiddenTickets} />
              <StatCard label="Quantidade" value={numberFormat(summary.totalQuantity)} />
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <input
                value={ticketSearch}
                onChange={(event) => setTicketSearch(event.target.value)}
                placeholder="Buscar por lote, setor, data, tipo, preço ou status..."
                className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
              />
            </div>

            {filteredTickets.length ? (
              <div className="overflow-hidden rounded-[26px] border border-slate-200">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_130px_130px_120px] gap-0 bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white max-xl:hidden">
                  <span>Ingresso</span>
                  <span>Data</span>
                  <span>Setor</span>
                  <span>Preço</span>
                  <span>Qtd.</span>
                  <span>Status</span>
                </div>

                <div className="divide-y divide-slate-200">
                  {filteredTickets.map((ticket) => (
                    <article key={ticket.id} className="grid gap-3 bg-white px-4 py-4 text-sm max-xl:grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr_130px_130px_120px] xl:items-center">
                      <div>
                        <p className="font-black text-slate-950">{ticket.name || ticket.lotLabel || "Ingresso"}</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">{ticket.lotLabel || "Sem lote"} • {ticket.isHidden ? "Oculto" : "Visível"}</p>
                      </div>
                      <p className="font-bold text-slate-600">{ticket.eventSession?.name || "Todas"}</p>
                      <p className="font-bold text-slate-600">{ticket.venueSector?.name || "-"}</p>
                      <p className="font-black text-slate-950">{moneyFormat(ticket.price)}</p>
                      <p className="font-black text-slate-950">{numberFormat(ticket.quantity)}</p>
                      <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(ticket.status)}`}>{getStatusLabel(ticket.status)}</span>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="Nenhum ingresso encontrado." />
            )}

            {ticketsBySessionSector.length ? (
              <div className="mt-6 grid gap-3">
                <h3 className="text-lg font-black text-slate-950">Resumo por data e setor</h3>
                {ticketsBySessionSector.map((group) => {
                  const total = group.tickets.reduce((sum, ticket) => sum + Number(ticket.quantity || 0), 0);
                  const prices = group.tickets.map((ticket) => Number(String(ticket.price || "0").replace(",", "."))).filter((price) => !Number.isNaN(price));
                  return (
                    <div key={group.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black text-slate-950">{group.key}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">{group.tickets.length} lote(s) • {numberFormat(total)} ingresso(s) • {moneyFormat(Math.min(...prices))} até {moneyFormat(Math.max(...prices))}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Section>
        ) : null}

        {tab === "map" ? (
          <Section title="Mapa do evento" eyebrow="Layout">
            {event.venueLayouts?.length ? (
              <div className="grid gap-5">
                {event.venueLayouts.map((layout) => (
                  <article key={layout.id} className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-2xl font-black text-slate-950">{layout.name || "Mapa"}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{layout.occupancyMode || "-"} • {layout.width || 0} x {layout.height || 0}</p>
                      </div>
                      {layout.isDefault ? <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">Principal</span> : null}
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-4">
                      <DetailRow label="Objetos" value={layout.mapObjects?.length || 0} />
                      <DetailRow label="Status" value={getStatusLabel(layout.status)} />
                      <DetailRow label="Largura" value={layout.width || "-"} />
                      <DetailRow label="Altura" value={layout.height || "-"} />
                    </div>
                    {layout.mapObjects?.length ? (
                      <>
                        <EventMapPreview event={event} layout={layout} />

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Legenda dos objetos</p>
                          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {layout.mapObjects.map((object, index) => (
                              <div key={object.id || `${layout.id}-${index}`} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                                <span
                                  className="h-10 w-10 shrink-0 rounded-2xl border border-white shadow-sm"
                                  style={{ background: getMapObjectColor(event, object) }}
                                />
                                <div className="min-w-0">
                                  <p className="truncate font-black text-slate-950">{object.label || object.code || `Item ${index + 1}`}</p>
                                  <p className="mt-1 truncate text-xs font-semibold text-slate-500">{getMapObjectKindLabel(object)} • {mapObjectCapacityLabel(object)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5">
                        <EmptyState text="Nenhum objeto no mapa." />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Nenhum mapa cadastrado." />
            )}
          </Section>
        ) : null}

        {tab === "policies" ? (
          <Section title="Políticas e conteúdo público" eyebrow="Regras">
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="space-y-3">
                <DetailRow label="Classificação indicativa" value={event.policy?.ageRating || "-"} />
                <DetailRow label="Política de reembolso" value={event.policy?.refundPolicy || "-"} />
                <DetailRow label="Política de transferência" value={event.policy?.transferPolicy || "-"} />
                <DetailRow label="Meia-entrada" value={event.policy?.halfEntryPolicy || "-"} />
                <DetailRow label="Documentos obrigatórios" value={event.policy?.documentRules || "-"} />
              </div>
              <div className="space-y-3">
                <DetailRow label="Chamada" value={event.content?.headline || "-"} />
                <DetailRow label="Resumo" value={event.content?.summary || "-"} />
                <DetailRow label="Atrações" value={event.content?.attractions || "-"} />
                <DetailRow label="Informações importantes" value={event.content?.importantInfo || "-"} />
                <DetailRow label="Termos e observações" value={event.policy?.termsNotes || "-"} />
              </div>
            </div>
          </Section>
        ) : null}

        {tab === "raw" ? (
          <Section title="Dados técnicos" eyebrow="JSON">
            <pre className="max-h-[620px] overflow-auto rounded-[24px] bg-slate-950 p-5 text-xs font-semibold leading-6 text-slate-100">
              {JSON.stringify(event, null, 2)}
            </pre>
          </Section>
        ) : null}
      </div>
    </main>
  );
}
