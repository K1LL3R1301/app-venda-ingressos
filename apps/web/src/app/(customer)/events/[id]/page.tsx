"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

const DEFAULT_MAP_WIDTH = 1280;
const DEFAULT_MAP_HEIGHT = 900;
const FALLBACK_MAX_TICKETS_PER_PURCHASE = 4;
const MAX_RENDERED_RESERVED_PLACES = 1200;

type TicketKind = "INTEIRA" | "MEIA" | "SOCIAL";
type MapShape = "ROUNDED" | "RECTANGLE" | "PILL" | "CIRCLE" | "FREEFORM";
type ReservedPlaceKind = "SEAT" | "TABLE_CHAIR" | "TABLE_FULL";

type OrganizerInfo = {
  id?: string | null;
  tradeName?: string | null;
  legalName?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  bio?: string | null;
  logoUrl?: string | null;
  city?: string | null;
  state?: string | null;
};

type EventContent = {
  headline?: string | null;
  summary?: string | null;
  fullDescription?: string | null;
  attractions?: string | null;
  schedule?: string | null;
  importantInfo?: string | null;
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
  mapUrl?: string | null;
  instructions?: string | null;
};

type EventMedia = {
  coverImageUrl?: string | null;
  bannerImageUrl?: string | null;
  thumbnailUrl?: string | null;
  mobileBannerUrl?: string | null;
  sectorMapImageUrl?: string | null;
  gallery?: string[] | null;
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
  color?: string | null;
  gateName?: string | null;
  displayOrder?: number | null;
};

type TicketTypeItem = {
  id: string;
  eventSessionId?: string | null;
  venueSectorId?: string | null;
  eventSession?: EventSession | null;
  venueSector?: VenueSector | null;
  name?: string | null;
  lotLabel?: string | null;
  description?: string | null;
  price?: string | number | null;
  quantity?: number | null;
  status?: string | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  minPerOrder?: number | null;
  maxPerOrder?: number | null;
  displayOrder?: number | null;
  feeAmount?: string | number | null;
  feeDescription?: string | null;
  benefitDescription?: string | null;
  isHidden?: boolean | null;
  occupancyMode?: string | null;
};

type MapPoint = { x: number; y: number };

type SeatMapObject = {
  id?: string | null;
  localId?: string | null;
  venueSectorId?: string | null;
  venueSectorLocalId?: string | null;
  code?: string | null;
  label?: string | null;
  type?: string | null;
  row?: string | null;
  number?: string | null;
  capacity?: number | string | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  rotation?: number | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type VenueLayout = {
  id?: string | null;
  name?: string | null;
  occupancyMode?: string | null;
  width?: number | null;
  height?: number | null;
  mapData?: Record<string, unknown> | null;
  isDefault?: boolean | null;
  status?: string | null;
  mapObjects?: SeatMapObject[] | null;
  objects?: SeatMapObject[] | null;
};



type PublicPlaceReservation = {
  id: string;
  eventId?: string | null;
  eventSessionId?: string | null;
  venueSectorId?: string | null;
  seatMapObjectId?: string | null;
  ticketTypeId?: string | null;
  physicalKey?: string | null;
  kind?: string | null;
  label?: string | null;
  quantity?: number | string | null;
  chairCount?: number | string | null;
  status?: string | null;
  expiresAt?: string | null;
};

type EventDetail = {
  id: string;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  capacity?: number | null;
  status?: string | null;
  visibility?: string | null;
  category?: string | null;
  occupancyMode?: string | null;
  highlightTag?: string | null;
  checkoutTitle?: string | null;
  checkoutSubtitle?: string | null;
  organizer?: OrganizerInfo | null;
  ticketTypes?: TicketTypeItem[] | null;
  content?: EventContent | null;
  location?: EventLocation | null;
  media?: EventMedia | null;
  policy?: EventPolicy | null;
  sessions?: EventSession[] | null;
  sectors?: VenueSector[] | null;
  venueLayouts?: VenueLayout[] | null;
};

type SelectedItem = {
  ticketTypeId: string;
  quantity: number;
};

type ReservedPlaceSubTicket = {
  ticketTypeId: string;
  kind: TicketKind;
  label: string;
  quantity: number;
  unitAmount: number;
};

type ReservedPlaceSelection = {
  id: string;
  ticketTypeId: string;
  sessionId: string;
  sectorId: string;
  objectId: string;
  kind: ReservedPlaceKind;
  label: string;
  quantity: number;
  amount?: number;
  chairCount?: number;
  subTickets?: ReservedPlaceSubTicket[];
};

type TicketSummary = {
  kind: TicketKind;
  label: string;
  activeTickets: TicketTypeItem[];
  nextTicket: TicketTypeItem | null;
  minPrice: number | null;
};

const TICKET_KIND_OPTIONS: Array<{ value: TicketKind; label: string }> = [
  { value: "INTEIRA", label: "Inteira" },
  { value: "MEIA", label: "Meia" },
  { value: "SOCIAL", label: "Social" },
];

function normalizeText(value?: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

function normalizeUrl(value?: string | null) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return "";
}

function toNumber(value?: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (value === undefined || value === null) return 0;
  const parsed = Number(String(value).replace(".", "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value?: unknown) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(toNumber(value));
}

function formatInteger(value?: unknown) {
  return new Intl.NumberFormat("pt-BR").format(
    Math.max(0, Math.floor(toNumber(value))),
  );
}

function asDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(value?: string | null) {
  const date = asDate(value);
  if (!date) return value || "-";
  return date.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value?: string | null) {
  const date = asDate(value);
  if (!date) return "Data";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

function formatTimeOnly(value?: string | null) {
  const date = asDate(value);
  if (!date) return "";
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value?: string | null) {
  const date = asDate(value);
  if (!date) return value || "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function hasText(value?: string | null) {
  return Boolean(value && value.trim());
}

function textLines(value?: string | null) {
  if (!hasText(value)) return [];
  return String(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function categoryLabel(value?: string | null) {
  const normalized = normalizeText(value);
  const labels: Record<string, string> = {
    FESTAS_SHOWS: "Festas e shows",
    TEATROS_ESPETACULOS: "Teatros e espetáculos",
    STAND_UP_COMEDY: "Stand-up comedy",
    CONGRESSOS: "Congressos e palestras",
    GASTRONOMIA: "Gastronomia",
    ESPORTES: "Esportes",
    PASSEIOS_TOURS: "Passeios e tours",
    INFANTIL: "Infantil",
  };
  return labels[normalized] || value || "Evento";
}

function getStatusLabel(status?: string | null) {
  const normalized = normalizeText(status || "PUBLISHED");
  if (normalized === "PUBLISHED") return "Publicado";
  if (normalized === "DRAFT") return "Rascunho";
  if (normalized === "CANCELED" || normalized === "CANCELLED")
    return "Cancelado";
  if (normalized === "ACTIVE" || normalized === "AVAILABLE") return "Ativo";
  if (normalized === "INACTIVE") return "Indisponível";
  if (normalized === "SOLD_OUT") return "Esgotado";
  return status || "Disponível";
}

function getStatusClass(status?: string | null) {
  const normalized = normalizeText(status || "PUBLISHED");
  if (["PUBLISHED", "ACTIVE", "AVAILABLE"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["DRAFT", "PAUSED"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (["CANCELED", "CANCELLED", "INACTIVE", "SOLD_OUT"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function sectorKindLabel(value?: string | null) {
  const normalized = normalizeText(value);
  const labels: Record<string, string> = {
    OPEN_ADMISSION: "Livre",
    GENERAL_ADMISSION: "Livre",
    PLATEIA: "Plateia",
    NUMBERED_SEATS: "Cadeiras numeradas",
    RESERVED_SEATING: "Cadeiras numeradas",
    TABLES: "Mesas",
    RESERVED_TABLE: "Mesas",
    MIXED: "Misto",
  };
  return labels[normalized] || value || "Setor";
}

function getLocationLabel(location?: EventLocation | null) {
  if (!location) return "Local a confirmar";
  if (normalizeText(location.mode) === "ONLINE") return "Evento online";
  const cityState = [location.city, location.state].filter(Boolean).join(" - ");
  return (
    [location.venueName, cityState].filter(Boolean).join(", ") ||
    "Local a confirmar"
  );
}

function getFullAddress(location?: EventLocation | null) {
  if (!location) return "Endereço não informado";
  if (normalizeText(location.mode) === "ONLINE") {
    return "O acesso será enviado ao participante pelos canais do evento.";
  }
  const pieces = [
    location.addressLine1,
    location.addressLine2,
    location.neighborhood,
    location.city,
    location.state,
    location.zipCode,
  ].filter(Boolean);
  return pieces.length > 0 ? pieces.join(", ") : "Endereço não informado";
}

function getOrganizerName(event?: EventDetail | null) {
  return (
    event?.organizer?.tradeName ||
    event?.organizer?.legalName ||
    event?.organizer?.name ||
    "Organizador parceiro"
  );
}

function getCoverImage(event?: EventDetail | null) {
  if (!event) return "";
  const gallery = Array.isArray(event.media?.gallery)
    ? event.media?.gallery
    : [];
  return normalizeUrl(
    event.media?.bannerImageUrl ||
      event.media?.coverImageUrl ||
      event.media?.mobileBannerUrl ||
      event.media?.thumbnailUrl ||
      gallery[0] ||
      "",
  );
}

function getSessions(event?: EventDetail | null) {
  const sessions = Array.isArray(event?.sessions) ? event?.sessions || [] : [];
  if (sessions.length > 0) {
    return [...sessions].sort((a, b) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return (
        new Date(a.startsAt || "").getTime() -
        new Date(b.startsAt || "").getTime()
      );
    });
  }
  if (!event) return [];
  return [
    {
      id: "default-session",
      name: "Data principal",
      startsAt: event.startDate || event.eventDate || "",
      endsAt: event.endDate || event.startDate || event.eventDate || "",
      capacity: event.capacity,
      status: "ACTIVE",
      displayOrder: 0,
    },
  ];
}

function getSectors(event?: EventDetail | null) {
  const sectors = Array.isArray(event?.sectors) ? event?.sectors || [] : [];
  if (sectors.length > 0) {
    return [...sectors].sort((a, b) => {
      const orderA = a.displayOrder ?? 0;
      const orderB = b.displayOrder ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return String(a.name || "").localeCompare(String(b.name || ""), "pt-BR");
    });
  }
  if (!event) return [];
  return [
    {
      id: "default-sector",
      name: "Entrada geral",
      capacity: event.capacity,
      color: "#2563eb",
      occupancyMode: event.occupancyMode || "GENERAL_ADMISSION",
    },
  ];
}

function getTickets(event?: EventDetail | null) {
  return Array.isArray(event?.ticketTypes) ? event?.ticketTypes || [] : [];
}

function getTicketSessionId(ticket: TicketTypeItem) {
  return ticket.eventSessionId || ticket.eventSession?.id || "default-session";
}

function getTicketSectorId(ticket: TicketTypeItem) {
  return ticket.venueSectorId || ticket.venueSector?.id || "default-sector";
}

function getTicketKind(ticket: TicketTypeItem): TicketKind {
  const text = normalizeText(
    [
      ticket.name,
      ticket.lotLabel,
      ticket.description,
      ticket.benefitDescription,
    ].join(" "),
  );
  if (text.includes("SOCIAL")) return "SOCIAL";
  if (text.includes("MEIA") || text.includes("1/2")) return "MEIA";
  return "INTEIRA";
}

function isPassportTicket(ticket: TicketTypeItem) {
  return normalizeText(
    [ticket.name, ticket.lotLabel, ticket.description].join(" "),
  ).includes("PASSAPORTE");
}

function lotNumber(label?: string | null) {
  const parsed = Number.parseInt(String(label || "").replace(/\D/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isTicketVisibleToPublic(ticket: TicketTypeItem) {
  const status = normalizeText(ticket.status || "ACTIVE");
  if (ticket.isHidden) return false;
  if (["INACTIVE", "CANCELED", "CANCELLED", "PAUSED", "DRAFT"].includes(status))
    return false;
  if (toNumber(ticket.quantity) <= 0) return false;
  return true;
}

function isTicketOnSaleNow(ticket: TicketTypeItem, now = new Date()) {
  if (!isTicketVisibleToPublic(ticket)) return false;
  const startsAt = ticket.salesStartAt ? new Date(ticket.salesStartAt) : null;
  const endsAt = ticket.salesEndAt ? new Date(ticket.salesEndAt) : null;
  if (startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now)
    return false;
  if (endsAt && !Number.isNaN(endsAt.getTime()) && endsAt < now) return false;
  return true;
}

function isTicketUpcoming(ticket: TicketTypeItem, now = new Date()) {
  if (!isTicketVisibleToPublic(ticket)) return false;
  const startsAt = ticket.salesStartAt ? new Date(ticket.salesStartAt) : null;
  return Boolean(
    startsAt && !Number.isNaN(startsAt.getTime()) && startsAt > now,
  );
}

function sortTicketsBySalePriority(tickets: TicketTypeItem[]) {
  return [...tickets].sort((a, b) => {
    const lotA = lotNumber(a.lotLabel);
    const lotB = lotNumber(b.lotLabel);
    if (lotA !== lotB) return lotA - lotB;
    const startA = new Date(a.salesStartAt || "").getTime() || 0;
    const startB = new Date(b.salesStartAt || "").getTime() || 0;
    if (startA !== startB) return startA - startB;
    return toNumber(a.price) - toNumber(b.price);
  });
}

function getMaximumPerPurchase(tickets: TicketTypeItem[]) {
  const configured = tickets
    .map((ticket) => toNumber(ticket.maxPerOrder))
    .filter((value) => value > 0);
  if (configured.length === 0) return FALLBACK_MAX_TICKETS_PER_PURCHASE;
  return Math.max(1, Math.min(...configured));
}

function getMapLayouts(event?: EventDetail | null) {
  return Array.isArray(event?.venueLayouts) ? event?.venueLayouts || [] : [];
}

function getDefaultLayout(event?: EventDetail | null) {
  const layouts = getMapLayouts(event).filter((layout) => {
    const objects = layout.mapObjects || layout.objects || [];
    return objects.length > 0;
  });
  if (layouts.length === 0) return null;
  return layouts.find((layout) => layout.isDefault) || layouts[0];
}

function getLayoutObjects(layout?: VenueLayout | null) {
  const objects = layout?.mapObjects || layout?.objects || [];
  return [...objects].sort((a, b) =>
    String(a.code || "").localeCompare(String(b.code || "")),
  );
}

function getLayoutWidth(layout?: VenueLayout | null) {
  return toNumber(layout?.width) || DEFAULT_MAP_WIDTH;
}

function getLayoutHeight(layout?: VenueLayout | null) {
  return toNumber(layout?.height) || DEFAULT_MAP_HEIGHT;
}

function metadataNumber(object: SeatMapObject, key: string, fallback = 0) {
  const value = object.metadata?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") return toNumber(value);
  return fallback;
}

function objectShape(object: SeatMapObject): MapShape {
  const shape = String(object.metadata?.shape || "ROUNDED").toUpperCase();
  if (["ROUNDED", "RECTANGLE", "PILL", "CIRCLE", "FREEFORM"].includes(shape))
    return shape as MapShape;
  return "ROUNDED";
}

function objectPoints(object: SeatMapObject): MapPoint[] {
  const points = object.metadata?.polygonPoints;
  if (Array.isArray(points) && points.length >= 3) {
    return points
      .map((point) => {
        const item = point as Partial<MapPoint>;
        return { x: toNumber(item.x), y: toNumber(item.y) };
      })
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }
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

function cssPoints(object: SeatMapObject) {
  return objectPoints(object)
    .map((point) => `${point.x}% ${point.y}%`)
    .join(", ");
}

function svgPoints(object: SeatMapObject) {
  const width = toNumber(object.width) || 1;
  const height = toNumber(object.height) || 1;
  return objectPoints(object)
    .map((point) => `${(point.x / 100) * width},${(point.y / 100) * height}`)
    .join(" ");
}

function objectRadius(object: SeatMapObject) {
  const shape = objectShape(object);
  if (shape === "RECTANGLE" || shape === "FREEFORM") return "18px";
  if (shape === "PILL" || shape === "CIRCLE") return "999px";
  return "28px";
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

function isWholeCircleInsidePolygon(
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

function getObjectStableId(object: SeatMapObject) {
  return String(
    object.id || object.localId || object.code || object.label || "map-object",
  );
}

function getObjectSectorId(object: SeatMapObject) {
  return object.venueSectorId || object.venueSectorLocalId || "";
}

function isStageMapObject(object?: SeatMapObject | null) {
  if (!object) return false;
  const text = normalizeText(
    [
      object.type,
      object.label,
      object.code,
      object.metadata?.kind,
      object.metadata?.objectType,
    ].join(" "),
  );
  return text.includes("STAGE") || text.includes("PALCO");
}

function isGeneralAdmissionLikeSector(
  sector?: VenueSector | null,
  object?: SeatMapObject | null,
) {
  const typeText = normalizeText(
    [
      sector?.type,
      sector?.occupancyMode,
      object?.metadata?.sectorKind,
      object?.metadata?.occupancyMode,
    ].join(" "),
  );
  const nameText = normalizeText(sector?.name);

  return (
    typeText.includes("PLATEIA") ||
    typeText.includes("GENERAL_ADMISSION") ||
    typeText.includes("OPEN_ADMISSION") ||
    typeText.includes("LIVRE") ||
    nameText === "PISTA" ||
    nameText.includes("PISTA") ||
    nameText.includes("PLATEIA")
  );
}

function sectorUsesReservedPlaces(
  sector?: VenueSector | null,
  object?: SeatMapObject | null,
) {
  if (!sector || !object || isStageMapObject(object)) return false;
  // Mesa/cadeira tem prioridade sobre "AREA" do objeto visual.
  // Assim setores como "Mesas Diamante" abrem o mapa grande mesmo quando
  // o bloco do mapa foi salvo como AREA/SECTOR no editor.
  if (isTableLikeSector(sector, object) || isSeatLikeSector(sector, object))
    return true;
  return false;
}

function getPhysicalTableNumber(placeId?: string | null) {
  const match = String(placeId || "").match(/:table:(\d+)/);
  return match?.[1] || "";
}

function getObjectMatchText(object?: SeatMapObject | null) {
  return normalizeText(
    [
      object?.label,
      object?.code,
      object?.type,
      object?.metadata?.name,
      object?.metadata?.sectorName,
      object?.metadata?.title,
    ].join(" "),
  );
}

function findSectorForMapObject(
  event: EventDetail,
  object?: SeatMapObject | null,
) {
  if (!object || isStageMapObject(object)) return null;

  const sectors = getSectors(event);
  const objectSectorId = getObjectSectorId(object);

  if (objectSectorId) {
    const exactSector = sectors.find((sector) => sector.id === objectSectorId);
    if (exactSector) return exactSector;
  }

  const objectText = getObjectMatchText(object);
  if (!objectText) return null;

  return (
    sectors.find((sector) => {
      const sectorName = normalizeText(sector.name);
      if (!sectorName) return false;
      return objectText.includes(sectorName) || sectorName.includes(objectText);
    }) || null
  );
}

function findMapObjectForSector(event: EventDetail, sectorId?: string | null) {
  if (!sectorId) return null;

  const layout = getDefaultLayout(event);
  const objects = getLayoutObjects(layout).filter(
    (object) => !isStageMapObject(object),
  );
  const sectors = getSectors(event);
  const sector = sectors.find((item) => item.id === sectorId) || null;

  const exactObject = objects.find(
    (object) => getObjectSectorId(object) === sectorId,
  );
  if (exactObject) return exactObject;

  if (!sector) return null;

  const sectorName = normalizeText(sector.name);
  return (
    objects.find((object) => {
      const objectText = getObjectMatchText(object);
      return Boolean(
        sectorName &&
          objectText &&
          (objectText.includes(sectorName) || sectorName.includes(objectText)),
      );
    }) || null
  );
}

function isSeatLikeSector(
  sector?: VenueSector | null,
  object?: SeatMapObject | null,
) {
  const text = normalizeText(
    [
      sector?.name,
      sector?.type,
      sector?.occupancyMode,
      object?.label,
      object?.code,
      object?.type,
      object?.metadata?.sectorKind,
      object?.metadata?.occupancyMode,
      object?.metadata?.kind,
    ].join(" "),
  );

  return (
    text.includes("SEAT") ||
    text.includes("CADEIRA") ||
    text.includes("RESERVED_SEATING") ||
    text.includes("NUMBERED")
  );
}

function isTableLikeSector(
  sector?: VenueSector | null,
  object?: SeatMapObject | null,
) {
  const text = normalizeText(
    [
      sector?.name,
      sector?.type,
      sector?.occupancyMode,
      object?.label,
      object?.code,
      object?.type,
      object?.metadata?.sectorKind,
      object?.metadata?.occupancyMode,
      object?.metadata?.kind,
    ].join(" "),
  );

  return text.includes("TABLE") || text.includes("MESA");
}

function getChairCountForObject(
  object?: SeatMapObject | null,
  sector?: VenueSector | null,
) {
  if (!object) return 0;
  return Math.max(
    0,
    metadataNumber(
      object,
      "chairCount",
      metadataNumber(
        object,
        "seatCount",
        toNumber(object.capacity) || toNumber(sector?.capacity),
      ),
    ),
  );
}

function getChairRowsForObject(object?: SeatMapObject | null) {
  if (!object) return 1;
  return Math.max(
    1,
    metadataNumber(object, "chairRows", metadataNumber(object, "seatRows", 1)),
  );
}

function getTableCountForObject(object?: SeatMapObject | null) {
  if (!object) return 0;
  return Math.max(
    0,
    metadataNumber(object, "tableCount", metadataNumber(object, "tables", 0)),
  );
}

function getChairsPerTableForObject(object?: SeatMapObject | null) {
  if (!object) return 1;
  return Math.max(
    1,
    metadataNumber(
      object,
      "chairsPerTable",
      metadataNumber(
        object,
        "seatsPerTable",
        metadataNumber(object, "chairPerTable", 1),
      ),
    ),
  );
}

function getSelectionCheckoutQuantity(selection: ReservedPlaceSelection) {
  if (selection.kind === "TABLE_FULL") return 1;
  return Math.max(0, Math.floor(selection.quantity || 0));
}

function getSelectionSeatQuantity(selection: ReservedPlaceSelection) {
  if (Array.isArray(selection.subTickets) && selection.subTickets.length > 0) {
    return selection.subTickets.reduce(
      (sum, item) => sum + Math.max(0, Math.floor(item.quantity || 0)),
      0,
    );
  }

  if (selection.kind === "TABLE_FULL") {
    return Math.max(
      0,
      Math.floor(selection.chairCount || selection.quantity || 0),
    );
  }

  return Math.max(0, Math.floor(selection.quantity || 0));
}

function getSelectionAssignedSubTicketQuantity(
  selection: ReservedPlaceSelection,
) {
  if (
    !Array.isArray(selection.subTickets) ||
    selection.subTickets.length === 0
  ) {
    return 0;
  }

  return selection.subTickets.reduce(
    (sum, item) => sum + Math.max(0, Math.floor(item.quantity || 0)),
    0,
  );
}

function getSelectedPlaceQuantity(
  selections: Record<string, ReservedPlaceSelection>,
  ticketTypeId: string,
) {
  return Object.values(selections).reduce((sum, selection) => {
    if (selection.ticketTypeId !== ticketTypeId) return sum;
    return sum + getSelectionCheckoutQuantity(selection);
  }, 0);
}

function getCpfLimitedSelectionQuantity(
  selectedItems: Record<string, number>,
  selections: Record<string, ReservedPlaceSelection>,
) {
  const reservedByTicket = new Map<string, number>();

  Object.values(selections).forEach((selection) => {
    reservedByTicket.set(
      selection.ticketTypeId,
      (reservedByTicket.get(selection.ticketTypeId) || 0) +
        getSelectionCheckoutQuantity(selection),
    );
  });

  const reservedQuantity = Array.from(reservedByTicket.values()).reduce(
    (sum, quantity) => sum + Math.max(0, Math.floor(quantity || 0)),
    0,
  );

  const simpleQuantity = Object.entries(selectedItems).reduce(
    (sum, [ticketTypeId, quantity]) => {
      const selectedQuantity = Math.max(0, Math.floor(quantity || 0));
      const reservedQuantityForTicket = reservedByTicket.get(ticketTypeId) || 0;

      return sum + Math.max(0, selectedQuantity - reservedQuantityForTicket);
    },
    0,
  );

  return reservedQuantity + simpleQuantity;
}

function getSelectionAmount(
  selection: ReservedPlaceSelection,
  ticketsById: Map<string, TicketTypeItem>,
) {
  // Mesa completa usa subingressos internos para formar o preço real.
  // Não confie no amount salvo na seleção, porque ele pode ter vindo de uma
  // versão anterior da tela e ficar desatualizado quando o usuário altera
  // a divisão entre Inteira, Meia e Social.
  if (Array.isArray(selection.subTickets) && selection.subTickets.length > 0) {
    return selection.subTickets.reduce((sum, item) => {
      const quantity = Math.max(0, Math.floor(item.quantity || 0));
      const unitAmount = Number.isFinite(item.unitAmount) ? item.unitAmount : 0;

      return sum + unitAmount * quantity;
    }, 0);
  }

  if (
    typeof selection.amount === "number" &&
    Number.isFinite(selection.amount)
  ) {
    return selection.amount;
  }

  const ticket = ticketsById.get(selection.ticketTypeId);
  const unitTotal = ticket
    ? toNumber(ticket.price) + toNumber(ticket.feeAmount)
    : 0;
  return unitTotal * getSelectionCheckoutQuantity(selection);
}

function summarizeSelectionKinds(selection: ReservedPlaceSelection) {
  if (
    !Array.isArray(selection.subTickets) ||
    selection.subTickets.length === 0
  ) {
    return "";
  }

  return selection.subTickets
    .filter((item) => item.quantity > 0)
    .map((item) => `${item.quantity} ${item.label.toLowerCase()}`)
    .join(" • ");
}

function buildTicketSummaries(tickets: TicketTypeItem[]): TicketSummary[] {
  return TICKET_KIND_OPTIONS.map((option) => {
    const kindTickets = sortTicketsBySalePriority(
      tickets.filter((ticket) => getTicketKind(ticket) === option.value),
    );
    const activeTickets = sortTicketsBySalePriority(
      kindTickets.filter((ticket) => isTicketOnSaleNow(ticket)),
    );
    const upcomingTickets = sortTicketsBySalePriority(
      kindTickets.filter((ticket) => isTicketUpcoming(ticket)),
    );
    const prices = activeTickets
      .map((ticket) => toNumber(ticket.price) + toNumber(ticket.feeAmount))
      .filter((price) => price > 0);
    return {
      kind: option.value,
      label: option.label,
      activeTickets,
      nextTicket: upcomingTickets[0] || null,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
    };
  });
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
      {detail ? (
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {detail}
        </p>
      ) : null}
    </div>
  );
}

function Badge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black ${className}`}
    >
      {children}
    </span>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-base font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SectionBlock({
  title,
  value,
}: {
  title: string;
  value?: string | null;
}) {
  const lines = textLines(value);
  if (lines.length === 0) return null;
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-5 space-y-3 text-sm font-semibold leading-7 text-slate-600">
        {lines.map((line, index) => (
          <p key={`${title}-${index}`}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function PublicMap({
  event,
  selectedSectorId,
  onSelectSector,
}: {
  event: EventDetail;
  selectedSectorId: string;
  onSelectSector: (sectorId: string) => void;
}) {
  const layout = getDefaultLayout(event);
  const objects = getLayoutObjects(layout);
  const width = getLayoutWidth(layout);
  const height = getLayoutHeight(layout);

  if (!layout || objects.length === 0) return null;

  function getObjectColor(object: SeatMapObject) {
    const sector = getSectors(event).find(
      (item) => item.id === getObjectSectorId(object),
    );
    return (
      sector?.color ||
      String(object.metadata?.sectorColor || "") ||
      (normalizeText(object.type) === "STAGE" ? "#020617" : "#2563eb")
    );
  }

  function renderMiniDots(object: SeatMapObject, sector?: VenueSector) {
    const isTable = isTableLikeSector(sector, object);
    const isSeat =
      isSeatLikeSector(sector, object) &&
      !isTable &&
      !isGeneralAdmissionLikeSector(sector, object);

    // Plateia, pista, camarote livre e qualquer setor sem assento marcado
    // ficam limpos no mapa público. Só mesas/cadeiras numeradas exibem pontos.
    if (!isTable && !isSeat) return null;

    const totalCount = isTable
      ? getTableCountForObject(object)
      : getChairCountForObject(object, sector);
    if (totalCount <= 0) return null;

    const previewCount = Math.min(totalCount, 420);
    const positions = getReservedPointPositions(
      previewCount,
      object,
      isTable ? "TABLE" : "SEAT",
    );
    const dotSize = isTable
      ? previewCount > 300
        ? 4
        : previewCount > 180
          ? 5
          : 7
      : previewCount > 350
        ? 4
        : previewCount > 180
          ? 5
          : 7;

    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]"
        style={
          objectShape(object) === "FREEFORM"
            ? { clipPath: `polygon(${cssPoints(object)})` }
            : undefined
        }
      >
        {positions.map((position) => (
          <span
            key={`mini-place-${object.id || object.code}-${position.index}`}
            className={
              isTable
                ? "absolute rounded-full bg-white/95 shadow-sm"
                : "absolute rounded-md bg-white/90 shadow-sm"
            }
            style={{
              left: `${position.left}%`,
              top: `${position.top}%`,
              width: dotSize,
              height: dotSize,
              transform: "translate(-50%, -50%)",
            }}
          >
            {isTable ? (
              <span className="absolute inset-[32%] rounded-full bg-slate-400/60" />
            ) : null}
          </span>
        ))}
      </div>
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-600">
            Mapa do evento
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Escolha pelo mapa
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            Clique no setor desejado. A compra agora usa somente o mapa como
            seleção de setor.
          </p>
        </div>
        <Badge className="border-slate-200 bg-slate-50 text-slate-600">
          {layout.name || "Mapa principal"}
        </Badge>
      </div>

      <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100 p-3">
        <div
          className="relative w-full"
          style={{ aspectRatio: `${width} / ${height}` }}
        >
          <div className="absolute inset-0 rounded-[1.25rem] bg-[linear-gradient(to_right,rgba(148,163,184,.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.24)_1px,transparent_1px)] bg-[length:32px_32px]" />
          <div className="absolute inset-0 rounded-[1.25rem] bg-gradient-to-b from-white/70 to-slate-200/70" />

          {objects.map((object) => {
            const objectWidth = toNumber(object.width) || 1;
            const objectHeight = toNumber(object.height) || 1;
            const objectX = toNumber(object.x);
            const objectY = toNumber(object.y);
            const mappedSector = findSectorForMapObject(event, object);
            const sectorId = mappedSector?.id || getObjectSectorId(object);
            const isStage = isStageMapObject(object);
            const isSelectable = Boolean(!isStage && sectorId);
            const isSelected = Boolean(
              isSelectable && selectedSectorId === sectorId,
            );
            const shape = objectShape(object);
            const color = getObjectColor(object);
            const sector =
              mappedSector ||
              getSectors(event).find((item) => item.id === sectorId);
            const baseStyle: CSSProperties = {
              left: `${(objectX / width) * 100}%`,
              top: `${(objectY / height) * 100}%`,
              width: `${(objectWidth / width) * 100}%`,
              height: `${(objectHeight / height) * 100}%`,
              transform: `rotate(${toNumber(object.rotation)}deg)`,
            };

            return (
              <button
                key={object.id || object.localId || object.code}
                type="button"
                disabled={!isSelectable}
                onClick={(eventClick) => {
                  eventClick.stopPropagation();
                  if (isSelectable) onSelectSector(sectorId);
                }}
                className={`absolute text-left transition ${isStage ? "pointer-events-none cursor-default" : !isSelectable ? "cursor-default" : "cursor-pointer hover:brightness-110"}`}
                style={baseStyle}
                title={object.label || sector?.name || object.code || "Setor"}
              >
                {shape === "FREEFORM" ? (
                  <svg
                    className="absolute inset-0 h-full w-full overflow-visible"
                    viewBox={`0 0 ${objectWidth} ${objectHeight}`}
                    preserveAspectRatio="none"
                  >
                    <polygon
                      points={svgPoints(object)}
                      fill={color}
                      stroke={isSelected ? "#facc15" : "#ffffff"}
                      strokeWidth={isSelected ? 8 : 4}
                      filter="drop-shadow(0px 10px 12px rgba(15,23,42,0.18))"
                    />
                  </svg>
                ) : (
                  <div
                    className="absolute inset-0 border-4 shadow-lg"
                    style={{
                      backgroundColor: color,
                      borderColor: isSelected ? "#facc15" : "#ffffff",
                      borderRadius: objectRadius(object),
                    }}
                  />
                )}

                {!isStage ? renderMiniDots(object, sector) : null}

                <div className="absolute inset-x-2 bottom-2 z-10 rounded-xl bg-slate-950/85 px-2 py-1 text-center text-[10px] font-black uppercase leading-tight text-white shadow">
                  {isStage
                    ? "Palco"
                    : object.label || sector?.name || object.code || "Setor"}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function getReservedPointPositions(
  count: number,
  object: SeatMapObject,
  mode: "TABLE" | "SEAT",
) {
  if (count <= 0) return [];

  const isFreeform = objectShape(object) === "FREEFORM";
  const polygon = objectPoints(object);
  const rows =
    mode === "TABLE"
      ? Math.max(1, Math.ceil(Math.sqrt(count)))
      : Math.max(1, getChairRowsForObject(object));
  const columns = Math.max(1, Math.ceil(count / rows));
  const paddingX = mode === "TABLE" ? 10 : 8;
  const paddingTop = mode === "TABLE" ? 12 : 10;
  const paddingBottom = 24;
  const usableWidth = 100 - paddingX * 2;
  const usableHeight = 100 - paddingTop - paddingBottom;
  const radiusPercent = mode === "TABLE" ? 2.8 : 1.3;

  const positions: Array<{ index: number; left: number; top: number }> = [];

  for (let index = 0; index < count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    let left = paddingX + ((column + 0.5) / columns) * usableWidth;
    let top = paddingTop + ((row + 0.5) / rows) * usableHeight;

    if (isFreeform) {
      let attempts = 0;
      while (
        !isWholeCircleInsidePolygon(
          left,
          top,
          radiusPercent,
          radiusPercent,
          polygon,
        ) &&
        attempts < 8
      ) {
        top += 2.5;
        attempts += 1;
      }
      if (
        !isWholeCircleInsidePolygon(
          left,
          top,
          radiusPercent,
          radiusPercent,
          polygon,
        )
      )
        continue;
    }

    positions.push({ index, left, top });
  }

  return positions;
}

type TableMixPayload = {
  sessionId: string;
  sectorId: string;
  objectId: string;
  tableNumber: number;
  chairsPerTable: number;
  ticketByKind: Partial<Record<TicketKind, TicketTypeItem>>;
  quantitiesByKind: Record<TicketKind, number>;
  reserveFullTable?: boolean;
};

function ReservedPlaceChooser({
  event,
  session,
  sector,
  object,
  ticket,
  selectedPlaces,
  publicPlaceReservations,
  maxPerPurchase,
  onTogglePlace,
  onSetTableMix,
  onClearTicketPlaces,
}: {
  event: EventDetail;
  session: EventSession | null;
  sector: VenueSector | null;
  object: SeatMapObject | null;
  ticket: TicketTypeItem | null;
  selectedPlaces: Record<string, ReservedPlaceSelection>;
  publicPlaceReservations: PublicPlaceReservation[];
  maxPerPurchase: number;
  onTogglePlace: (
    ticket: TicketTypeItem,
    place: Omit<ReservedPlaceSelection, "ticketTypeId">,
  ) => void;
  onSetTableMix: (payload: TableMixPayload) => void;
  onClearTicketPlaces: (ticket: TicketTypeItem) => void;
}) {
  const [focusedTableNumber, setFocusedTableNumber] = useState(1);

  if (!sector || !object || !ticket || !session) return null;

  const objectId = getObjectStableId(object);
  const isTable = isTableLikeSector(sector, object);
  const isSeat = isSeatLikeSector(sector, object) && !isTable;
  const selectedForTicket = Object.values(selectedPlaces).filter(
    (selection) => selection.ticketTypeId === ticket.id,
  );
  const selectedQuantityForTicket = selectedForTicket.reduce(
    (sum, selection) => sum + selection.quantity,
    0,
  );
  const sectorColor =
    sector.color || String(object.metadata?.sectorColor || "") || "#0ea5e9";
  const shape = objectShape(object);

  if (!isTable && !isSeat) return null;

  if (isTable) {
    const tableCount = getTableCountForObject(object);
    const chairsPerTable = getChairsPerTableForObject(object);
    const visibleTableCount = Math.min(
      tableCount,
      MAX_RENDERED_RESERVED_PLACES,
    );
    const focusedTable = Math.max(
      1,
      Math.min(focusedTableNumber || 1, Math.max(1, visibleTableCount)),
    );
    const tablePositions = getReservedPointPositions(
      visibleTableCount,
      object,
      "TABLE",
    );
    const tableDotSize =
      visibleTableCount > 900
        ? 9
        : visibleTableCount > 500
          ? 11
          : visibleTableCount > 220
            ? 14
            : 22;
    const showTableNumbers = tableDotSize >= 18;

    const ticketsForThisPlace = sortTicketsBySalePriority(
      getTickets(event).filter((item) => {
        if (isPassportTicket(item)) return false;
        if (!isTicketOnSaleNow(item)) return false;
        return (
          getTicketSessionId(item) === session.id &&
          getTicketSectorId(item) === sector.id
        );
      }),
    );

    const ticketById = new Map(
      getTickets(event).map((item) => [item.id, item] as const),
    );
    const ticketByKind = TICKET_KIND_OPTIONS.reduce<
      Partial<Record<TicketKind, TicketTypeItem>>
    >((accumulator, option) => {
      accumulator[option.value] =
        ticketsForThisPlace.find(
          (item) => getTicketKind(item) === option.value,
        ) || undefined;
      return accumulator;
    }, {});

    const getTableSelections = (tableNumber: number) =>
      Object.values(selectedPlaces).filter((selection) => {
        return (
          selection.sessionId === session.id &&
          selection.sectorId === sector.id &&
          selection.objectId === objectId &&
          getPhysicalTableNumber(selection.id) === String(tableNumber)
        );
      });

    const getExternalTableReservationState = (tableNumber: number) => {
      const physicalKey = `${session.id}:${sector.id}:${objectId}:table:${tableNumber}`;
      const active = publicPlaceReservations.filter((reservation) => {
        const status = String(reservation.status || "").toUpperCase();
        return (
          reservation.physicalKey === physicalKey &&
          reservation.eventSessionId === session.id &&
          reservation.venueSectorId === sector.id &&
          (status === "SOLD" || status === "HELD")
        );
      });

      const hasFullTable = active.some(
        (reservation) => String(reservation.kind || "").toUpperCase() === "TABLE_FULL",
      );
      const usedChairs = hasFullTable
        ? chairsPerTable
        : active.reduce(
            (sum, reservation) =>
              sum + Math.max(0, Math.floor(Number(reservation.quantity || 0))),
            0,
          );

      return {
        hasFullTable,
        usedChairs: Math.min(chairsPerTable, usedChairs),
        freeChairs: Math.max(0, chairsPerTable - usedChairs),
      };
    };

    const getKindCountsForTable = (tableNumber: number) => {
      const counts: Record<TicketKind, number> = {
        INTEIRA: 0,
        MEIA: 0,
        SOCIAL: 0,
      };

      getTableSelections(tableNumber).forEach((selection) => {
        if (
          Array.isArray(selection.subTickets) &&
          selection.subTickets.length > 0
        ) {
          selection.subTickets.forEach((subTicket) => {
            counts[subTicket.kind] += Math.max(
              0,
              Math.floor(subTicket.quantity || 0),
            );
          });
          return;
        }

        if (selection.kind !== "TABLE_CHAIR") return;
        const selectedTicket = ticketById.get(selection.ticketTypeId);
        const kind = selectedTicket ? getTicketKind(selectedTicket) : "INTEIRA";
        counts[kind] += selection.quantity;
      });

      return counts;
    };

    const focusedSelections = getTableSelections(focusedTable);
    const focusedExternalState = getExternalTableReservationState(focusedTable);
    const focusedFullPlaceId = `${session.id}:${sector.id}:${objectId}:table:${focusedTable}:full`;
    const focusedFullSelection = focusedSelections.find(
      (selection) => selection.kind === "TABLE_FULL",
    );
    const focusedChairSelections = focusedSelections.filter(
      (selection) => selection.kind === "TABLE_CHAIR",
    );
    const focusedChairCount = focusedSelections.reduce(
      (sum, selection) => sum + getSelectionSeatQuantity(selection),
      0,
    );
    const focusedKindCounts = getKindCountsForTable(focusedTable);
    const focusedAssignedSeatCount = Object.values(focusedKindCounts).reduce(
      (sum, quantity) => sum + quantity,
      0,
    );
    const focusedFullSelected = Boolean(focusedFullSelection);
    const focusedCanSellFull =
      !focusedFullSelection &&
      focusedChairCount <= 0 &&
      !focusedExternalState.hasFullTable &&
      focusedExternalState.usedChairs <= 0;
    const focusedFreeChairs = focusedExternalState.hasFullTable
      ? 0
      : focusedFullSelected
        ? Math.max(0, chairsPerTable - focusedAssignedSeatCount)
        : Math.max(0, chairsPerTable - focusedExternalState.usedChairs - focusedChairCount);

    const selectedUnitPrice =
      toNumber(ticket.price) + toNumber(ticket.feeAmount);

    function applyKindCount(kind: TicketKind, nextCount: number) {
      const ticketForKind = ticketByKind[kind];
      if (!ticketForKind) {
        alert("Não existe lote ativo para este tipo de ingresso nesta mesa.");
        return;
      }

      const nextQuantities: Record<TicketKind, number> = {
        ...focusedKindCounts,
        [kind]: Math.max(0, Math.floor(nextCount || 0)),
      };
      const total = Object.values(nextQuantities).reduce(
        (sum, quantity) => sum + quantity,
        0,
      );

      if (focusedExternalState.hasFullTable) {
        alert("Esta mesa já foi comprada inteira. Escolha outra mesa.");
        return;
      }

      if (focusedExternalState.usedChairs + total > chairsPerTable) {
        alert(
          `Esta mesa possui somente ${Math.max(0, chairsPerTable - focusedExternalState.usedChairs)} lugar(es) livre(s).`,
        );
        return;
      }

      if (
        !focusedFullSelection &&
        total > 0 &&
        total < chairsPerTable &&
        total > maxPerPurchase
      ) {
        alert(
          `Compra por cadeira respeita o limite do produtor: no máximo ${maxPerPurchase} ingresso(s) comuns por CPF.`,
        );
        return;
      }

      onSetTableMix({
        sessionId: session.id,
        sectorId: sector.id,
        objectId,
        tableNumber: focusedTable,
        chairsPerTable,
        ticketByKind,
        quantitiesByKind: nextQuantities,
      });
    }

    return (
      <div className="rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-4">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-black text-cyan-950">
              Escolha a localização da mesa
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-cyan-800">
              Clique na mesa dentro do desenho. Mesa ou cadeira já marcada fica
              cinza e só pode ser removida pelo resumo da compra.
            </p>
          </div>
          {selectedQuantityForTicket > 0 ? (
            <button
              type="button"
              onClick={() => onClearTicketPlaces(ticket)}
              className="rounded-xl bg-white px-3 py-2 text-xs font-black text-cyan-700 shadow-sm"
            >
              Limpar escolhas deste tipo
            </button>
          ) : null}
        </div>

        {tableCount > visibleTableCount ? (
          <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
            Mostrando as primeiras {visibleTableCount} mesas para manter a tela
            rápida. A reserva real por mesa será persistida no backend depois.
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-[1.5rem] border border-cyan-100 bg-white p-3 shadow-sm">
            <div
              className="relative mx-auto min-h-[500px] w-full max-w-none"
              style={{
                aspectRatio: `${Math.max(1, toNumber(object.width) || 360)} / ${Math.max(1, toNumber(object.height) || 220)}`,
              }}
            >
              <div className="absolute inset-0 rounded-[1.35rem] bg-[linear-gradient(to_right,rgba(148,163,184,.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.18)_1px,transparent_1px)] bg-[length:28px_28px]" />
              {shape === "FREEFORM" ? (
                <svg
                  className="absolute inset-0 h-full w-full overflow-visible"
                  viewBox={`0 0 ${Math.max(1, toNumber(object.width) || 360)} ${Math.max(1, toNumber(object.height) || 220)}`}
                  preserveAspectRatio="none"
                >
                  <polygon
                    points={svgPoints(object)}
                    fill={sectorColor}
                    stroke="#ffffff"
                    strokeWidth="5"
                    filter="drop-shadow(0px 14px 18px rgba(15,23,42,0.18))"
                  />
                </svg>
              ) : (
                <div
                  className="absolute inset-0 border-4 border-white shadow-xl"
                  style={{
                    backgroundColor: sectorColor,
                    borderRadius: objectRadius(object),
                  }}
                />
              )}

              <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl bg-slate-950/90 px-4 py-3 text-center text-white shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  Setor
                </p>
                <p className="text-sm font-black uppercase leading-tight">
                  {sector.name || object.label || "Setor"}
                </p>
              </div>

              {tablePositions.map((position) => {
                const tableNumber = position.index + 1;
                const tableSelections = getTableSelections(tableNumber);
                const externalState = getExternalTableReservationState(tableNumber);
                const fullSelection = tableSelections.find(
                  (selection) => selection.kind === "TABLE_FULL",
                );
                const isFocused = focusedTable === tableNumber;
                const localTableSeatCount = tableSelections.reduce(
                  (sum, selection) => sum + getSelectionSeatQuantity(selection),
                  0,
                );
                const tableSeatCount = externalState.usedChairs + localTableSeatCount;
                const hasAnySelection =
                  externalState.usedChairs > 0 || Boolean(fullSelection) || tableSeatCount > 0;
                const isFull =
                  externalState.hasFullTable || Boolean(fullSelection) || tableSeatCount >= chairsPerTable;
                const isUnavailable = isFull;

                return (
                  <button
                    key={`table-dot-${tableNumber}`}
                    type="button"
                    aria-label={`Mesa ${tableNumber}`}
                    disabled={isUnavailable}
                    onClick={() => setFocusedTableNumber(tableNumber)}
                    className={`absolute z-30 flex items-center justify-center rounded-full border shadow-md transition disabled:cursor-not-allowed ${
                      isUnavailable
                        ? isFocused
                          ? "scale-150 border-white bg-slate-400 text-white ring-4 ring-yellow-300/50"
                          : "border-white bg-slate-400 text-white opacity-95"
                        : hasAnySelection
                          ? isFocused
                            ? "scale-150 border-yellow-300 bg-yellow-300 text-slate-950 ring-4 ring-yellow-300/30"
                            : "border-white bg-amber-200 text-slate-950 hover:scale-125"
                          : isFocused
                            ? "scale-150 border-yellow-300 bg-yellow-300 text-slate-950 ring-4 ring-yellow-300/30"
                            : "border-white bg-white/95 text-slate-800 hover:scale-125"
                    }`}
                    style={{
                      left: `${position.left}%`,
                      top: `${position.top}%`,
                      width: tableDotSize,
                      height: tableDotSize,
                      transform: "translate(-50%, -50%)",
                    }}
                    title={
                      isFull
                        ? `Mesa ${tableNumber} indisponível`
                        : hasAnySelection
                          ? `Mesa ${tableNumber} parcialmente marcada`
                          : `Mesa ${tableNumber}`
                    }
                  >
                    {showTableNumbers ? (
                      <span className="text-[9px] font-black leading-none">
                        {tableNumber}
                      </span>
                    ) : (
                      <span className="sr-only">Mesa {tableNumber}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Mesa escolhida
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Mesa {focusedTable}
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {focusedFullSelection
                    ? "Mesa inteira já marcada."
                    : focusedChairCount > 0
                      ? `${focusedChairCount} cadeira(s) marcada(s).`
                      : `${chairsPerTable} cadeira(s) livres`}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-2 text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                  Livres
                </p>
                <p className="text-lg font-black text-slate-950">
                  {focusedFreeChairs}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-950">Mesa completa</p>
              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                Mesa completa conta como 1 ingresso principal. Primeiro reserve
                a mesa e depois distribua os {chairsPerTable} lugares entre
                Inteira, Meia e Social logo abaixo.
              </p>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                <div>
                  <p className="text-[11px] font-black text-slate-950">
                    {focusedAssignedSeatCount}/{chairsPerTable} lugar(es)
                    atribuídos
                  </p>
                  <p className="text-[10px] font-bold text-slate-500">
                    A mesa fica travada fisicamente quando é reservada; para
                    finalizar, distribua todos os lugares.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!focusedCanSellFull || focusedFullSelected}
                  onClick={() => {
                    onSetTableMix({
                      sessionId: session.id,
                      sectorId: sector.id,
                      objectId,
                      tableNumber: focusedTable,
                      chairsPerTable,
                      ticketByKind,
                      quantitiesByKind: focusedKindCounts,
                      reserveFullTable: true,
                    });
                  }}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {focusedFullSelected ? "Mesa reservada" : "Reservar mesa"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-black text-slate-950">
                Montar a mesa por tipo
              </p>
              <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                Exemplo: 3 inteiras, 3 meias e 2 sociais. Compra parcial
                respeita o limite do produtor; mesa completa conta como 1
                ingresso principal.
              </p>

              <div className="mt-3 space-y-2">
                {TICKET_KIND_OPTIONS.map((option) => {
                  const ticketForKind = ticketByKind[option.value];
                  const count = focusedKindCounts[option.value];
                  const totalOnTable = Object.values(focusedKindCounts).reduce(
                    (sum, quantity) => sum + quantity,
                    0,
                  );
                  const canIncrease =
                    Boolean(ticketForKind) && totalOnTable < chairsPerTable;

                  return (
                    <div
                      key={`table-mix-${option.value}`}
                      className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-950">
                          {option.label}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {ticketForKind
                            ? formatMoney(
                                toNumber(ticketForKind.price) +
                                  toNumber(ticketForKind.feeAmount),
                              )
                            : "Sem lote ativo"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          disabled={count <= 0}
                          onClick={() =>
                            applyKindCount(option.value, count - 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-sm font-black text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="min-w-8 text-center text-sm font-black text-slate-950">
                          {count}
                        </span>
                        <button
                          type="button"
                          disabled={!canIncrease}
                          onClick={() =>
                            applyKindCount(option.value, count + 1)
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {focusedChairCount > 0 || focusedFullSelection ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold leading-5 text-slate-600">
                Para remover uma mesa/cadeira, use o botão × no resumo da
                compra. Isso evita clique duplo e impede selecionar o mesmo
                lugar novamente por engano.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  const chairCount = getChairCountForObject(object, sector);
  const visibleChairCount = Math.min(chairCount, MAX_RENDERED_RESERVED_PLACES);
  const rows = getChairRowsForObject(object);
  const chairPositions = getReservedPointPositions(
    visibleChairCount,
    object,
    "SEAT",
  );

  return (
    <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-black text-sky-950">
            Escolha sua cadeira no desenho do setor
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-sky-800">
            Cadeira marcada fica cinza e não pode ser selecionada de novo. O
            limite geral é de {maxPerPurchase} ingresso(s).
          </p>
        </div>
        {selectedQuantityForTicket > 0 ? (
          <button
            type="button"
            onClick={() => onClearTicketPlaces(ticket)}
            className="rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-700 shadow-sm"
          >
            Limpar escolhas deste tipo
          </button>
        ) : null}
      </div>

      {chairCount > visibleChairCount ? (
        <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          Mostrando as primeiras {visibleChairCount} cadeiras para manter a tela
          rápida. A reserva real por cadeira será persistida no backend depois.
        </p>
      ) : null}

      <div className="mt-4 rounded-[1.5rem] border border-sky-100 bg-white p-3 shadow-sm">
        <div
          className="relative mx-auto w-full max-w-4xl"
          style={{
            aspectRatio: `${Math.max(1, toNumber(object.width) || 360)} / ${Math.max(1, toNumber(object.height) || 220)}`,
          }}
        >
          <div className="absolute inset-0 rounded-[1.35rem] bg-[linear-gradient(to_right,rgba(148,163,184,.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,.18)_1px,transparent_1px)] bg-[length:28px_28px]" />
          {shape === "FREEFORM" ? (
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox={`0 0 ${Math.max(1, toNumber(object.width) || 360)} ${Math.max(1, toNumber(object.height) || 220)}`}
              preserveAspectRatio="none"
            >
              <polygon
                points={svgPoints(object)}
                fill={sectorColor}
                stroke="#ffffff"
                strokeWidth="5"
                filter="drop-shadow(0px 14px 18px rgba(15,23,42,0.18))"
              />
            </svg>
          ) : (
            <div
              className="absolute inset-0 border-4 border-white shadow-xl"
              style={{
                backgroundColor: sectorColor,
                borderRadius: objectRadius(object),
              }}
            />
          )}

          <div className="absolute inset-x-4 bottom-4 z-20 rounded-2xl bg-slate-950/90 px-4 py-3 text-center text-white shadow-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
              Setor
            </p>
            <p className="text-sm font-black uppercase leading-tight">
              {sector.name || object.label || "Setor"}
            </p>
          </div>

          {chairPositions.map((position) => {
            const seatNumber = position.index + 1;
            const rowNumber =
              Math.floor(
                position.index /
                  Math.max(1, Math.ceil(visibleChairCount / rows)),
              ) + 1;
            const placeId = `${session.id}:${sector.id}:${objectId}:seat:${seatNumber}`;
            const selectionKey = `${ticket.id}:${placeId}`;
            const isSelected = Boolean(selectedPlaces[selectionKey]);
            const isUnavailableByAnotherTicket = Object.values(
              selectedPlaces,
            ).some(
              (selection) =>
                selection.id === placeId &&
                selection.ticketTypeId !== ticket.id,
            );
            const isUnavailable = isSelected || isUnavailableByAnotherTicket;

            return (
              <button
                key={placeId}
                type="button"
                disabled={isUnavailable}
                onClick={() =>
                  onTogglePlace(ticket, {
                    id: placeId,
                    sessionId: session.id,
                    sectorId: sector.id,
                    objectId,
                    kind: "SEAT",
                    label: `Fileira ${rowNumber} cadeira ${seatNumber}`,
                    quantity: 1,
                  })
                }
                className={`absolute z-30 flex items-center justify-center rounded-md border text-[9px] font-black shadow transition disabled:cursor-not-allowed ${
                  isUnavailable
                    ? "border-white bg-slate-400 text-white opacity-95"
                    : "border-white bg-white/95 text-slate-700 hover:scale-110 hover:bg-sky-50 hover:text-sky-700"
                }`}
                style={{
                  left: `${position.left}%`,
                  top: `${position.top}%`,
                  width: 24,
                  height: 24,
                  transform: "translate(-50%, -50%)",
                }}
                title={
                  isUnavailable
                    ? "Cadeira indisponível"
                    : `Fileira ${rowNumber} cadeira ${seatNumber}`
                }
              >
                {seatNumber}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function CustomerEventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = typeof params?.id === "string" ? params.id : "";

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [selectedTicketKind, setSelectedTicketKind] =
    useState<TicketKind>("INTEIRA");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>(
    {},
  );
  const [selectedPlaces, setSelectedPlaces] = useState<
    Record<string, ReservedPlaceSelection>
  >({});
  const [publicPlaceReservations, setPublicPlaceReservations] = useState<
    PublicPlaceReservation[]
  >([]);
  const [placeChooserOpen, setPlaceChooserOpen] = useState(false);

  useEffect(() => {
    async function loadEvent() {
      if (!eventId) {
        setError("Evento inválido.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            typeof data?.message === "string"
              ? data.message
              : "Erro ao carregar evento.",
          );
        }
        setEvent(data);
      } catch (err) {
        console.error("CUSTOMER EVENT DETAIL ERROR:", err);
        setError(
          err instanceof Error ? err.message : "Erro ao conectar com a API.",
        );
      } finally {
        setLoading(false);
      }
    }
    void loadEvent();
  }, [eventId]);

  useEffect(() => {
    async function loadPublicPlaceReservations() {
      if (!event?.id) {
        setPublicPlaceReservations([]);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/orders/public-place-reservations/${event.id}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            cache: "no-store",
          },
        );

        const data = await response.json().catch(() => []);
        setPublicPlaceReservations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("PUBLIC PLACE RESERVATIONS ERROR:", error);
        setPublicPlaceReservations([]);
      }
    }

    void loadPublicPlaceReservations();
  }, [event?.id]);

  const sessions = useMemo(() => getSessions(event), [event]);
  const sectors = useMemo(() => getSectors(event), [event]);
  const allTickets = useMemo(() => getTickets(event), [event]);
  const publicTickets = useMemo(
    () => allTickets.filter(isTicketVisibleToPublic),
    [allTickets],
  );
  const maxPerPurchase = useMemo(
    () => getMaximumPerPurchase(publicTickets),
    [publicTickets],
  );

  useEffect(() => {
    if (!selectedSessionId && sessions[0]?.id)
      setSelectedSessionId(sessions[0].id);
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (!selectedSectorId && sectors[0]?.id) setSelectedSectorId(sectors[0].id);
  }, [selectedSectorId, sectors]);

  const selectedSession = useMemo(
    () =>
      sessions.find((session) => session.id === selectedSessionId) ||
      sessions[0] ||
      null,
    [selectedSessionId, sessions],
  );
  const selectedSector = useMemo(
    () =>
      sectors.find((sector) => sector.id === selectedSectorId) ||
      sectors[0] ||
      null,
    [selectedSectorId, sectors],
  );
  const selectedMapObject = useMemo(
    () => (event ? findMapObjectForSector(event, selectedSectorId) : null),
    [event, selectedSectorId],
  );
  const selectedSectorUsesPlaces = Boolean(
    selectedSector &&
      selectedMapObject &&
      sectorUsesReservedPlaces(selectedSector, selectedMapObject),
  );

  const ticketsForSelectedSessionAndSector = useMemo(() => {
    return publicTickets.filter((ticket) => {
      if (isPassportTicket(ticket)) return false;
      return (
        getTicketSessionId(ticket) === selectedSessionId &&
        getTicketSectorId(ticket) === selectedSectorId
      );
    });
  }, [publicTickets, selectedSessionId, selectedSectorId]);

  const ticketSummaries = useMemo(
    () => buildTicketSummaries(ticketsForSelectedSessionAndSector),
    [ticketsForSelectedSessionAndSector],
  );
  const selectedKindSummary = useMemo(
    () =>
      ticketSummaries.find((summary) => summary.kind === selectedTicketKind) ||
      ticketSummaries[0],
    [selectedTicketKind, ticketSummaries],
  );
  const activeTicketsForSelectedKind = selectedKindSummary?.activeTickets || [];
  const currentTicketForPlaceSelection =
    activeTicketsForSelectedKind[0] || null;

  const passportTickets = useMemo(
    () =>
      sortTicketsBySalePriority(
        publicTickets.filter(
          (ticket) => isPassportTicket(ticket) && isTicketOnSaleNow(ticket),
        ),
      ),
    [publicTickets],
  );

  const galleryImages = useMemo(() => {
    if (!event) return [];
    const gallery = Array.isArray(event.media?.gallery)
      ? event.media?.gallery
      : [];
    const images = [
      event.media?.bannerImageUrl,
      event.media?.coverImageUrl,
      event.media?.thumbnailUrl,
      event.media?.mobileBannerUrl,
      ...gallery,
    ]
      .map((image) => normalizeUrl(image))
      .filter(Boolean);
    return Array.from(new Set(images));
  }, [event]);

  const minimumPrice = useMemo(() => {
    const prices = publicTickets
      .filter((ticket) => isTicketOnSaleNow(ticket))
      .map((ticket) => toNumber(ticket.price) + toNumber(ticket.feeAmount))
      .filter((price) => price > 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  }, [publicTickets]);

  const selectedItemsDetailed = useMemo(() => {
    const ticketsById = new Map(
      allTickets.map((ticket) => [ticket.id, ticket] as const),
    );

    return allTickets
      .filter((ticket) => (selectedItems[ticket.id] || 0) > 0)
      .map((ticket) => {
        const reservedSelections = Object.values(selectedPlaces).filter(
          (selection) => selection.ticketTypeId === ticket.id,
        );
        const unitTotal = toNumber(ticket.price) + toNumber(ticket.feeAmount);
        const reservedQuantity = reservedSelections.reduce(
          (sum, selection) => sum + getSelectionCheckoutQuantity(selection),
          0,
        );
        const simpleQuantity = Math.max(
          0,
          (selectedItems[ticket.id] || 0) - reservedQuantity,
        );
        const quantity = simpleQuantity + reservedQuantity;
        const reservedTotal = reservedSelections.reduce(
          (sum, selection) => sum + getSelectionAmount(selection, ticketsById),
          0,
        );
        const session = sessions.find(
          (item) => item.id === getTicketSessionId(ticket),
        );
        const sector = sectors.find(
          (item) => item.id === getTicketSectorId(ticket),
        );
        return {
          ticket,
          quantity,
          unitTotal,
          total: unitTotal * simpleQuantity + reservedTotal,
          session,
          sector,
          kind: getTicketKind(ticket),
          reservedSelections,
        };
      });
  }, [allTickets, selectedItems, selectedPlaces, sessions, sectors]);

  const totalSelectedTickets = selectedItemsDetailed.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const totalSelectedAmount = selectedItemsDetailed.reduce(
    (sum, item) => sum + item.total,
    0,
  );

  function handleMapSectorSelect(sectorId: string) {
    setSelectedSectorId(sectorId);

    const sector = sectors.find((item) => item.id === sectorId) || null;
    const mapObject = event ? findMapObjectForSector(event, sectorId) : null;

    if (sectorUsesReservedPlaces(sector, mapObject)) {
      setPlaceChooserOpen(true);
    } else {
      setPlaceChooserOpen(false);
    }
  }

  function sanitizeTicketQuantity(
    ticketType: TicketTypeItem,
    quantity: number,
    current: Record<string, number>,
  ) {
    const maximumByRule =
      toNumber(ticketType.maxPerOrder) > 0
        ? toNumber(ticketType.maxPerOrder)
        : maxPerPurchase;
    const maximumByStock = Math.max(0, toNumber(ticketType.quantity));
    const selectedInOtherTickets = Object.entries(current).reduce(
      (sum, [ticketId, selectedQuantity]) =>
        ticketId === ticketType.id ? sum : sum + selectedQuantity,
      0,
    );
    const remainingGlobalSlots = Math.max(
      0,
      maxPerPurchase - selectedInOtherTickets,
    );
    const maximum = Math.min(
      maximumByRule,
      maximumByStock,
      remainingGlobalSlots,
    );
    return Math.max(0, Math.min(quantity, maximum));
  }

  function setExactSelectedQuantity(
    ticketType: TicketTypeItem,
    quantity: number,
  ) {
    const sessionId = getTicketSessionId(ticketType);
    const hasTableInSameSession = Object.values(selectedPlaces).some(
      (selection) =>
        selection.sessionId === sessionId && selection.kind === "TABLE_FULL",
    );
    const reservedQuantityForThisTicket = getSelectedPlaceQuantity(
      selectedPlaces,
      ticketType.id,
    );

    if (quantity > reservedQuantityForThisTicket && hasTableInSameSession) {
      alert(
        "Você já escolheu uma mesa nesta data. Ao comprar uma mesa, não é possível adicionar outro ingresso na mesma data.",
      );
      return;
    }

    setSelectedItems((current) => {
      const nextValue = sanitizeTicketQuantity(ticketType, quantity, current);
      const next = { ...current };
      if (nextValue <= 0) {
        delete next[ticketType.id];
        return next;
      }
      next[ticketType.id] = nextValue;
      return next;
    });
  }

  function setSelectedQuantityFromReservedPlaces(
    ticketType: TicketTypeItem,
    quantity: number,
  ) {
    setSelectedItems((current) => {
      const maximumByStock =
        Math.max(0, toNumber(ticketType.quantity)) || Number.MAX_SAFE_INTEGER;
      const nextValue = Math.max(0, Math.min(quantity, maximumByStock));
      const next = { ...current };

      if (nextValue <= 0) {
        delete next[ticketType.id];
        return next;
      }

      next[ticketType.id] = nextValue;
      return next;
    });
  }

  function updateSelectedQuantity(
    ticketType: TicketTypeItem,
    quantity: number,
  ) {
    setExactSelectedQuantity(ticketType, quantity);
  }

  function setTableMixForFocusedTable(payload: TableMixPayload) {
    const requestedSeats = TICKET_KIND_OPTIONS.reduce(
      (sum, option) =>
        sum +
        Math.max(0, Math.floor(payload.quantitiesByKind[option.value] || 0)),
      0,
    );

    if (requestedSeats > payload.chairsPerTable) {
      alert(`Esta mesa possui somente ${payload.chairsPerTable} lugar(es).`);
      return;
    }

    const basePhysicalKey = `${payload.sessionId}:${payload.sectorId}:${payload.objectId}:table:${payload.tableNumber}`;
    const activeExternalReservations = publicPlaceReservations.filter((reservation) => {
      const status = String(reservation.status || "").toUpperCase();
      return reservation.physicalKey === basePhysicalKey && (status === "SOLD" || status === "HELD");
    });
    const hasExternalFullTable = activeExternalReservations.some(
      (reservation) => String(reservation.kind || "").toUpperCase() === "TABLE_FULL",
    );
    const externalUsedChairs = hasExternalFullTable
      ? payload.chairsPerTable
      : activeExternalReservations.reduce(
          (sum, reservation) => sum + Math.max(0, Math.floor(Number(reservation.quantity || 0))),
          0,
        );

    if (hasExternalFullTable) {
      alert("Esta mesa já foi comprada inteira. Escolha outra mesa.");
      return;
    }

    if (externalUsedChairs + requestedSeats > payload.chairsPerTable) {
      alert(
        `Esta mesa tem apenas ${Math.max(0, payload.chairsPerTable - externalUsedChairs)} lugar(es) livre(s).`,
      );
      return;
    }

    const alreadyFullTableSelected = Object.values(selectedPlaces).some(
      (selection) =>
        selection.sessionId === payload.sessionId &&
        selection.sectorId === payload.sectorId &&
        selection.objectId === payload.objectId &&
        selection.kind === "TABLE_FULL" &&
        getPhysicalTableNumber(selection.id) === String(payload.tableNumber),
    );

    if (
      !payload.reserveFullTable &&
      !alreadyFullTableSelected &&
      requestedSeats > 0 &&
      requestedSeats < payload.chairsPerTable &&
      requestedSeats > maxPerPurchase
    ) {
      alert(
        `Compra por cadeira respeita o limite do produtor: no máximo ${maxPerPurchase} ingresso(s) comuns por CPF.`,
      );
      return;
    }

    setSelectedPlaces((current) => {
      const currentTableSelections = Object.values(current).filter(
        (selection) =>
          selection.sessionId === payload.sessionId &&
          selection.sectorId === payload.sectorId &&
          selection.objectId === payload.objectId &&
          getPhysicalTableNumber(selection.id) === String(payload.tableNumber),
      );
      const removedTicketTypeIds = new Set(
        currentTableSelections.map((selection) => selection.ticketTypeId),
      );

      const next = Object.fromEntries(
        Object.entries(current).filter(([, selection]) => {
          const sameTable =
            selection.sessionId === payload.sessionId &&
            selection.sectorId === payload.sectorId &&
            selection.objectId === payload.objectId &&
            getPhysicalTableNumber(selection.id) ===
              String(payload.tableNumber);

          return !sameTable;
        }),
      );

      const shouldReserveFullTable =
        Boolean(payload.reserveFullTable) ||
        currentTableSelections.some(
          (selection) => selection.kind === "TABLE_FULL",
        );

      if (requestedSeats <= 0 && !shouldReserveFullTable) {
        setSelectedItems((currentItems) => {
          const nextItems = { ...currentItems };
          removedTicketTypeIds.forEach((ticketTypeId) => {
            const quantityForTicket = getSelectedPlaceQuantity(
              next,
              ticketTypeId,
            );
            if (quantityForTicket <= 0) {
              delete nextItems[ticketTypeId];
            } else {
              nextItems[ticketTypeId] = quantityForTicket;
            }
          });
          return nextItems;
        });

        return next;
      }

      const subTickets = TICKET_KIND_OPTIONS.flatMap((option) => {
        const quantity = Math.max(
          0,
          Math.floor(payload.quantitiesByKind[option.value] || 0),
        );
        const ticketForKind = payload.ticketByKind[option.value];

        if (!ticketForKind || quantity <= 0) return [];

        return [
          {
            ticketTypeId: ticketForKind.id,
            kind: option.value,
            label: option.label,
            quantity,
            unitAmount:
              toNumber(ticketForKind.price) + toNumber(ticketForKind.feeAmount),
          },
        ];
      });

      const fallbackKindOption = TICKET_KIND_OPTIONS.find(
        (option) => payload.ticketByKind[option.value],
      );
      const fallbackTicket = fallbackKindOption
        ? payload.ticketByKind[fallbackKindOption.value]
        : undefined;
      const representative =
        subTickets[0] ||
        (fallbackTicket && fallbackKindOption
          ? {
              ticketTypeId: fallbackTicket.id,
              kind: fallbackKindOption.value,
              label: fallbackKindOption.label,
              quantity: 0,
              unitAmount:
                toNumber(fallbackTicket.price) +
                toNumber(fallbackTicket.feeAmount),
            }
          : null);

      if (!representative) return next;

      const isCompleteTable =
        shouldReserveFullTable || requestedSeats === payload.chairsPerTable;
      const nextCpfLimitCount = isCompleteTable ? 1 : requestedSeats;
      const previousCpfLimitCountForThisTable = currentTableSelections.reduce(
        (sum, selection) => sum + getSelectionCheckoutQuantity(selection),
        0,
      );
      const currentCpfLimitCount = Math.max(
        0,
        getCpfLimitedSelectionQuantity(selectedItems, current) -
          previousCpfLimitCountForThisTable,
      );

      if (currentCpfLimitCount + nextCpfLimitCount > maxPerPurchase) {
        alert(
          `O limite do produtor é de ${maxPerPurchase} ingresso(s) por CPF no evento inteiro. Mesa completa conta como 1 ingresso; cadeira avulsa conta como 1 cada. Você ainda pode selecionar ${Math.max(
            0,
            maxPerPurchase - currentCpfLimitCount,
          )} ingresso(s).`,
        );
        return current;
      }

      const otherSelectionSameSession = Object.values(next).some(
        (selection) => selection.sessionId === payload.sessionId,
      );

      if (isCompleteTable && otherSelectionSameSession) {
        alert(
          "Você já tem uma escolha de lugar nesta data. Ao comprar mesa em uma data, não é possível comprar outro ingresso nessa mesma data.",
        );
        return current;
      }

      const activeTicketIdsForThisTable = new Set(removedTicketTypeIds);
      const otherSimpleTicketSameSession = Object.entries(selectedItems).some(
        ([ticketTypeId, quantity]) => {
          if (quantity <= 0) return false;
          if (activeTicketIdsForThisTable.has(ticketTypeId)) return false;
          const selectedTicket = allTickets.find(
            (item) => item.id === ticketTypeId,
          );
          return selectedTicket
            ? getTicketSessionId(selectedTicket) === payload.sessionId
            : false;
        },
      );

      if (isCompleteTable && otherSimpleTicketSameSession) {
        alert(
          "Você já selecionou ingresso comum nesta data. Para comprar uma mesa, remova os outros ingressos dessa data primeiro.",
        );
        return current;
      }

      const amount = subTickets.reduce(
        (sum, item) => sum + item.unitAmount * item.quantity,
        0,
      );
      const basePlaceId = `${payload.sessionId}:${payload.sectorId}:${payload.objectId}:table:${payload.tableNumber}`;
      const affectedTicketTypeIds = new Set<string>(removedTicketTypeIds);

      if (isCompleteTable) {
        const selectionKey = `${representative.ticketTypeId}:${basePlaceId}:full`;
        affectedTicketTypeIds.add(representative.ticketTypeId);

        next[selectionKey] = {
          id: `${basePlaceId}:full`,
          ticketTypeId: representative.ticketTypeId,
          sessionId: payload.sessionId,
          sectorId: payload.sectorId,
          objectId: payload.objectId,
          kind: "TABLE_FULL",
          label: `Mesa ${payload.tableNumber}`,
          quantity: 1,
          amount,
          chairCount: payload.chairsPerTable,
          subTickets,
        };
      } else {
        subTickets.forEach((subTicket) => {
          affectedTicketTypeIds.add(subTicket.ticketTypeId);
          const selectionKey = `${subTicket.ticketTypeId}:${basePlaceId}:chairmix:${subTicket.kind}`;

          next[selectionKey] = {
            id: `${basePlaceId}:chairmix:${subTicket.kind}`,
            ticketTypeId: subTicket.ticketTypeId,
            sessionId: payload.sessionId,
            sectorId: payload.sectorId,
            objectId: payload.objectId,
            kind: "TABLE_CHAIR",
            label: `Mesa ${payload.tableNumber} - ${subTicket.label}`,
            quantity: subTicket.quantity,
            amount: subTicket.unitAmount * subTicket.quantity,
            chairCount: subTicket.quantity,
            subTickets: [subTicket],
          };
        });
      }

      setSelectedItems((currentItems) => {
        const nextItems = { ...currentItems };

        affectedTicketTypeIds.forEach((ticketTypeId) => {
          const quantityForTicket = getSelectedPlaceQuantity(
            next,
            ticketTypeId,
          );

          if (quantityForTicket <= 0) {
            delete nextItems[ticketTypeId];
            return;
          }

          nextItems[ticketTypeId] = quantityForTicket;
        });

        return nextItems;
      });

      return next;
    });
  }

  function toggleReservedPlace(
    ticketType: TicketTypeItem,
    place: Omit<ReservedPlaceSelection, "ticketTypeId">,
  ) {
    const selectionKey = `${ticketType.id}:${place.id}`;
    setSelectedPlaces((current) => {
      const next = { ...current };
      const isAlreadySelected = Boolean(next[selectionKey]);

      if (isAlreadySelected) {
        delete next[selectionKey];
      } else {
        const tableNumber = getPhysicalTableNumber(place.id);
        const samePhysicalTableSelections = Object.values(next).filter(
          (selection) => {
            if (!tableNumber) return false;
            return (
              selection.sessionId === place.sessionId &&
              selection.sectorId === place.sectorId &&
              selection.objectId === place.objectId &&
              getPhysicalTableNumber(selection.id) === tableNumber
            );
          },
        );

        if (place.kind === "TABLE_FULL") {
          const hasChairAlreadySelected = samePhysicalTableSelections.some(
            (selection) => selection.kind === "TABLE_CHAIR",
          );

          if (hasChairAlreadySelected) {
            alert(
              "Esta mesa já tem cadeira selecionada/vendida. Venda a mesa inteira somente quando todas as cadeiras estiverem livres.",
            );
            return current;
          }
        }

        if (place.kind === "TABLE_CHAIR") {
          const hasFullTableAlreadySelected = samePhysicalTableSelections.some(
            (selection) => selection.kind === "TABLE_FULL",
          );

          if (hasFullTableAlreadySelected) {
            alert("Esta mesa já foi selecionada como mesa completa.");
            return current;
          }
        }

        if (place.kind === "TABLE_FULL") {
          const otherSelectionSameSession = Object.values(next).some(
            (selection) => selection.sessionId === place.sessionId,
          );

          if (otherSelectionSameSession) {
            alert(
              "Você já tem uma escolha de lugar nesta data. Ao comprar mesa em uma data, não é possível comprar outro ingresso nessa mesma data.",
            );
            return current;
          }

          const otherSimpleTicketSameSession = Object.entries(
            selectedItems,
          ).some(([ticketTypeId, quantity]) => {
            if (quantity <= 0) return false;
            const selectedTicket = allTickets.find(
              (item) => item.id === ticketTypeId,
            );
            return selectedTicket
              ? getTicketSessionId(selectedTicket) === place.sessionId
              : false;
          });

          if (otherSimpleTicketSameSession) {
            alert(
              "Você já selecionou ingresso comum nesta data. Para comprar uma mesa, remova os outros ingressos dessa data primeiro.",
            );
            return current;
          }
        }

        const currentCpfLimitCount = getCpfLimitedSelectionQuantity(
          selectedItems,
          next,
        );
        const nextCpfLimitCount = getSelectionCheckoutQuantity({
          ...place,
          ticketTypeId: ticketType.id,
        });

        if (currentCpfLimitCount + nextCpfLimitCount > maxPerPurchase) {
          alert(
            `O limite do produtor é de ${maxPerPurchase} ingresso(s) por CPF no evento inteiro. Mesa completa conta como 1 ingresso; cadeira avulsa conta como 1 cada.`,
          );
          return current;
        }

        next[selectionKey] = { ...place, ticketTypeId: ticketType.id };
      }

      const quantityForTicket = getSelectedPlaceQuantity(next, ticketType.id);
      setSelectedQuantityFromReservedPlaces(ticketType, quantityForTicket);
      return next;
    });
  }

  function clearReservedPlacesForTicket(ticketType: TicketTypeItem) {
    setSelectedPlaces((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(
          ([, selection]) => selection.ticketTypeId !== ticketType.id,
        ),
      );
      setExactSelectedQuantity(ticketType, 0);
      return next;
    });
  }

  function removeSelectedTicketType(ticketTypeId: string) {
    setSelectedItems((current) => {
      const next = { ...current };
      delete next[ticketTypeId];
      return next;
    });

    setSelectedPlaces((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([, selection]) => selection.ticketTypeId !== ticketTypeId,
        ),
      ),
    );
  }

  function handleContinueCheckout() {
    if (!event?.id) {
      alert("Evento inválido.");
      return;
    }

    const items: SelectedItem[] = Object.entries(selectedItems)
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
      .filter((item) => item.quantity > 0);

    if (items.length === 0) {
      alert("Selecione pelo menos um ingresso.");
      return;
    }

    const allocations = Object.values(selectedPlaces).filter((selection) =>
      items.some((item) => item.ticketTypeId === selection.ticketTypeId),
    );
    const incompleteTables = allocations.filter(
      (selection) =>
        selection.kind === "TABLE_FULL" &&
        typeof selection.chairCount === "number" &&
        getSelectionAssignedSubTicketQuantity(selection) !==
          selection.chairCount,
    );

    if (incompleteTables.length > 0) {
      alert(
        "Complete todos os lugares da mesa antes de continuar. Exemplo: se a mesa tem 8 cadeiras, distribua 8 subingressos entre Inteira, Meia e Social.",
      );
      return;
    }

    const tableSessions = new Set(
      allocations
        .filter((selection) => selection.kind === "TABLE_FULL")
        .map((selection) => selection.sessionId),
    );

    const ticketIdsWithReservedPlaces = new Set(
      allocations.map((selection) => selection.ticketTypeId),
    );

    const hasCommonTicketInTableSession = items.some((item) => {
      if (ticketIdsWithReservedPlaces.has(item.ticketTypeId)) return false;
      const selectedTicket = allTickets.find(
        (ticket) => ticket.id === item.ticketTypeId,
      );
      return selectedTicket
        ? tableSessions.has(getTicketSessionId(selectedTicket))
        : false;
    });

    if (hasCommonTicketInTableSession) {
      alert(
        "Quando uma mesa é comprada para uma data, não é permitido comprar outro ingresso nessa mesma data.",
      );
      return;
    }

    const cpfLimitedTotalQuantity = getCpfLimitedSelectionQuantity(
      Object.fromEntries(
        items.map((item) => [item.ticketTypeId, item.quantity] as const),
      ),
      Object.fromEntries(
        allocations.map((selection) => [selection.id, selection] as const),
      ),
    );

    if (cpfLimitedTotalQuantity > maxPerPurchase) {
      alert(
        `Cada CPF pode ter no máximo ${maxPerPurchase} ingresso(s) comuns neste evento. Mesa completa conta como 1 ingresso no carrinho.`,
      );
      return;
    }

    const encodedItems = encodeURIComponent(JSON.stringify(items));
    const encodedAllocations = encodeURIComponent(JSON.stringify(allocations));

    try {
      localStorage.setItem(
        "checkoutPlaceSelections",
        JSON.stringify(allocations),
      );
    } catch {
      // Mantém o checkout funcionando mesmo se o navegador bloquear localStorage.
    }

    window.location.href = `/checkout?eventId=${event.id}&items=${encodedItems}&places=${encodedAllocations}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-black text-slate-600">
            Carregando evento...
          </p>
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-950">
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-black text-slate-950">
            Evento não encontrado
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {error || "Não foi possível carregar este evento."}
          </p>
          <Link
            href="/events"
            className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
          >
            Ver eventos
          </Link>
        </div>
      </main>
    );
  }

  const coverImage = getCoverImage(event);
  const organizerName = getOrganizerName(event);
  const eventDate =
    selectedSession?.startsAt || event.startDate || event.eventDate;
  const eventSummary =
    event.content?.summary ||
    event.shortDescription ||
    event.description ||
    "Confira os detalhes do evento, escolha seus ingressos e finalize sua compra.";
  const eventDescription =
    event.content?.fullDescription || event.description || "";
  const locationLabel = getLocationLabel(event.location);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-7 lg:pb-12">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-[13px] text-slate-500">
          <Link href="/" className="font-black text-sky-700 hover:text-sky-900">
            Página inicial
          </Link>
          <span>/</span>
          <Link
            href="/events"
            className="font-black text-sky-700 hover:text-sky-900"
          >
            Eventos
          </Link>
          <span>/</span>
          <span className="font-semibold text-slate-700">
            {event.name || "Detalhes"}
          </span>
        </nav>

        <section className="overflow-hidden rounded-[2.25rem] bg-white shadow-sm">
          <div className="relative h-[300px] bg-slate-950 md:h-[430px]">
            {coverImage ? (
              <img
                src={coverImage}
                alt={event.name || "Evento"}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.5),transparent_34%),linear-gradient(135deg,#020617,#0f172a,#075985)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white md:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/20 bg-white text-slate-950">
                  {event.highlightTag || categoryLabel(event.category)}
                </Badge>
                <Badge className={getStatusClass(event.status)}>
                  {getStatusLabel(event.status)}
                </Badge>
                {event.policy?.ageRating ? (
                  <Badge className="border-white/20 bg-white/15 text-white backdrop-blur">
                    {event.policy.ageRating}
                  </Badge>
                ) : null}
              </div>
              <h1 className="mt-4 max-w-5xl text-4xl font-black leading-tight md:text-6xl">
                {event.name || "Evento sem nome"}
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-white/85 md:text-base">
                {eventSummary}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <InfoCard
            label="Data selecionada"
            value={formatDateOnly(eventDate)}
            detail={formatTimeOnly(eventDate)}
          />
          <InfoCard
            label="Local"
            value={locationLabel}
            detail={getFullAddress(event.location)}
          />
          <InfoCard
            label="Ingressos"
            value={
              minimumPrice === null
                ? "Consultar valores"
                : `A partir de ${formatMoney(minimumPrice)}`
            }
            detail={`${publicTickets.length} lote(s) público(s)`}
          />
        </section>

        <section className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-600">
                Comprar ingresso
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Escolha a data
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                Depois escolha o setor diretamente no mapa. Se trocar de data,
                os ingressos já selecionados continuam no carrinho.
              </p>
              <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
                {sessions.map((session) => {
                  const active = session.id === selectedSessionId;
                  const sessionTickets = publicTickets.filter(
                    (ticket) =>
                      !isPassportTicket(ticket) &&
                      getTicketSessionId(ticket) === session.id,
                  );
                  const hasTickets = sessionTickets.some((ticket) =>
                    isTicketOnSaleNow(ticket),
                  );
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`min-w-[150px] rounded-2xl border p-4 text-left transition ${active ? "border-sky-500 bg-sky-50 ring-4 ring-sky-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <p className="text-xl font-black text-slate-950">
                        {formatShortDate(session.startsAt)}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {formatTimeOnly(session.startsAt) ||
                          session.name ||
                          "Horário a definir"}
                      </p>
                      <p
                        className={`mt-3 text-[10px] font-black uppercase tracking-[0.14em] ${hasTickets ? "text-emerald-600" : "text-slate-400"}`}
                      >
                        {hasTickets ? "Com vendas" : "Sem lote ativo"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            <PublicMap
              event={event}
              selectedSectorId={selectedSectorId}
              onSelectSector={handleMapSectorSelect}
            />

            {hasText(eventDescription) ? (
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">
                  Sobre o evento
                </h2>
                <div className="mt-5 space-y-3 text-sm font-semibold leading-7 text-slate-600">
                  {textLines(eventDescription).map((line, index) => (
                    <p key={`description-${index}`}>{line}</p>
                  ))}
                </div>
              </section>
            ) : null}

            <SectionBlock title="Atrações" value={event.content?.attractions} />
            <SectionBlock title="Programação" value={event.content?.schedule} />
            <SectionBlock
              title="Informações importantes"
              value={event.content?.importantInfo}
            />
            <SectionBlock
              title="Como comprar"
              value={event.content?.purchaseInstructions}
            />

            {galleryImages.length > 1 ? (
              <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black text-slate-950">
                  Fotos do evento
                </h2>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {galleryImages.slice(0, 6).map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="overflow-hidden rounded-[1.25rem] border border-slate-100 bg-slate-50"
                    >
                      <img
                        src={image}
                        alt={`Foto ${index + 1}`}
                        className="h-[220px] w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Local</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard
                  label="Nome do local"
                  value={event.location?.venueName || "Não informado"}
                />
                <InfoCard
                  label="Cidade / estado"
                  value={
                    [event.location?.city, event.location?.state]
                      .filter(Boolean)
                      .join(" - ") || "Não informado"
                  }
                />
                <div className="md:col-span-2">
                  <InfoCard
                    label="Endereço"
                    value={getFullAddress(event.location)}
                  />
                </div>
              </div>
              {event.location?.mapUrl ? (
                <a
                  href={event.location.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-5 inline-flex rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-700 hover:bg-sky-100"
                >
                  Abrir mapa
                </a>
              ) : null}
            </section>

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Organizador
              </h2>
              <div className="mt-5 flex items-center gap-4">
                {event.organizer?.logoUrl ? (
                  <img
                    src={event.organizer.logoUrl}
                    alt={organizerName}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 text-xl font-black text-sky-700">
                    {organizerName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-lg font-black text-slate-950">
                    {organizerName}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {[event.organizer?.city, event.organizer?.state]
                      .filter(Boolean)
                      .join(" - ") || "Produtor do evento"}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Ingressos
                </p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">
                  {selectedSector?.name || "Selecione um setor"}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  {selectedSession
                    ? `${formatDateOnly(selectedSession.startsAt)} ${formatTimeOnly(selectedSession.startsAt)}`
                    : "Escolha uma data"}
                </p>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {ticketSummaries.map((summary) => {
                    const active = summary.kind === selectedTicketKind;
                    const hasActive = summary.activeTickets.length > 0;
                    return (
                      <button
                        key={summary.kind}
                        type="button"
                        onClick={() => setSelectedTicketKind(summary.kind)}
                        className={`rounded-2xl border p-3 text-left transition ${active ? "border-sky-500 bg-sky-50 ring-4 ring-sky-100" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                      >
                        <p className="text-xs font-black text-slate-950">
                          {summary.label}
                        </p>
                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                          {hasActive
                            ? `${summary.activeTickets.length} lote(s)`
                            : "Indisp."}
                        </p>
                        <p className="mt-2 text-xs font-black text-sky-700">
                          {summary.minPrice === null
                            ? "-"
                            : formatMoney(summary.minPrice)}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {activeTicketsForSelectedKind.length === 0 ? (
                    <EmptyState
                      title="Nenhum lote ativo"
                      description={
                        selectedKindSummary?.nextTicket
                          ? `Próximo lote previsto para ${formatDateTime(selectedKindSummary.nextTicket.salesStartAt)}.`
                          : "Este tipo de ingresso ainda não está disponível para este setor e data."
                      }
                    />
                  ) : (
                    activeTicketsForSelectedKind.map((ticket) => {
                      const selectedQuantity = selectedItems[ticket.id] || 0;
                      const availableQuantity = Math.max(
                        0,
                        toNumber(ticket.quantity),
                      );
                      const unitTotal =
                        toNumber(ticket.price) + toNumber(ticket.feeAmount);
                      return (
                        <div
                          key={ticket.id}
                          className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-slate-950">
                                {ticket.name || selectedKindSummary?.label}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                {ticket.lotLabel || "Lote atual"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-base font-black text-slate-950">
                                {formatMoney(unitTotal)}
                              </p>
                              {toNumber(ticket.feeAmount) > 0 ? (
                                <p className="text-[10px] font-semibold text-slate-400">
                                  inclui taxa
                                </p>
                              ) : null}
                            </div>
                          </div>

                          {ticket.description || ticket.benefitDescription ? (
                            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                              {ticket.description || ticket.benefitDescription}
                            </p>
                          ) : null}

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                                Disponível
                              </p>
                              <p className="text-sm font-black text-slate-800">
                                {formatInteger(availableQuantity)}
                              </p>
                            </div>
                            {selectedSectorUsesPlaces ? (
                              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-right">
                                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-sky-500">
                                  Escolhidos no mapa
                                </p>
                                <p className="text-sm font-black text-sky-950">
                                  {selectedQuantity}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 p-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSelectedQuantity(
                                      ticket,
                                      selectedQuantity - 1,
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg font-black text-slate-700 hover:bg-slate-200"
                                >
                                  -
                                </button>
                                <span className="min-w-8 text-center text-sm font-black text-slate-950">
                                  {selectedQuantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateSelectedQuantity(
                                      ticket,
                                      selectedQuantity + 1,
                                    )
                                  }
                                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-lg font-black text-white hover:bg-sky-700"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {passportTickets.length > 0 ? (
                  <div className="mt-4 rounded-[1.25rem] border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-sm font-black text-indigo-950">
                      Passaporte
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-indigo-800">
                      Ingressos válidos para mais de uma data do evento.
                    </p>
                    <div className="mt-3 space-y-2">
                      {passportTickets.slice(0, 3).map((ticket) => {
                        const selectedQuantity = selectedItems[ticket.id] || 0;
                        return (
                          <div
                            key={ticket.id}
                            className="rounded-2xl bg-white p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black text-slate-950">
                                  {ticket.name || "Passaporte"}
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {ticket.lotLabel || "Lote atual"}
                                </p>
                              </div>
                              <p className="text-sm font-black text-slate-950">
                                {formatMoney(ticket.price)}
                              </p>
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedQuantity(
                                    ticket,
                                    selectedQuantity - 1,
                                  )
                                }
                                className="h-8 w-8 rounded-xl bg-slate-100 text-sm font-black text-slate-700"
                              >
                                -
                              </button>
                              <span className="flex h-8 min-w-8 items-center justify-center text-sm font-black">
                                {selectedQuantity}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateSelectedQuantity(
                                    ticket,
                                    selectedQuantity + 1,
                                  )
                                }
                                className="h-8 w-8 rounded-xl bg-indigo-700 text-sm font-black text-white"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                      Selecionados
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-950">
                      {totalSelectedTickets} ingresso(s) selecionado(s)
                    </p>
                    {totalSelectedTickets > maxPerPurchase ? (
                      <p className="mt-1 text-[11px] font-bold leading-5 text-cyan-700">
                        Mesa completa conta como 1 ingresso no carrinho.
                      </p>
                    ) : (
                      <p className="mt-1 text-[11px] font-bold leading-5 text-slate-500">
                        Limite comum: {maxPerPurchase} por CPF.
                      </p>
                    )}
                  </div>
                  <p className="text-xl font-black text-slate-950">
                    {formatMoney(totalSelectedAmount)}
                  </p>
                </div>

                {selectedItemsDetailed.length > 0 ? (
                  <div className="mt-4 max-h-44 space-y-2 overflow-y-auto rounded-2xl bg-white p-3">
                    {selectedItemsDetailed.map((item) => (
                      <div
                        key={item.ticket.id}
                        className="relative rounded-xl bg-slate-50 p-3 pr-12"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            removeSelectedTicketType(item.ticket.id)
                          }
                          aria-label="Remover seleção"
                          title="Remover seleção"
                          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-white text-sm font-black text-rose-600 shadow-sm transition hover:bg-rose-50"
                        >
                          ×
                        </button>
                        <p className="text-xs font-black text-slate-950">
                          {formatShortDate(item.session?.startsAt)} •{" "}
                          {item.sector?.name || "Setor"} •{" "}
                          {item.reservedSelections?.[0]?.kind === "TABLE_FULL"
                            ? item.reservedSelections[0].label
                            : TICKET_KIND_OPTIONS.find(
                                (option) => option.value === item.kind,
                              )?.label}
                        </p>
                        {item.reservedSelections?.[0]?.kind === "TABLE_FULL" ? (
                          <p className="mt-1 text-[11px] font-bold text-cyan-700">
                            Mesa = 1 ingresso •{" "}
                            {summarizeSelectionKinds(
                              item.reservedSelections[0],
                            )}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] font-bold text-slate-500">
                          {item.quantity} ingresso(s) •{" "}
                          {formatMoney(item.total)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleContinueCheckout}
                  disabled={totalSelectedTickets <= 0}
                  className="mt-4 w-full rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continuar compra
                </button>
                <p className="mt-3 text-center text-xs font-semibold leading-5 text-slate-500">
                  A API já valida o limite por CPF. A reserva real de
                  mesa/cadeira deve ser persistida no próximo ajuste do backend.
                </p>
              </div>
            </div>
          </aside>
        </section>
      </div>

      {placeChooserOpen && selectedSectorUsesPlaces ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-sm">
          <div className="flex max-h-[94vh] w-full max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-2xl">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-950 p-5 text-white md:flex-row md:items-center">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
                  Mapa grande do setor
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  {selectedSector?.name || "Setor"}
                </h2>
                <p className="mt-1 text-sm font-semibold text-white/70">
                  {selectedSession
                    ? `${formatDateOnly(selectedSession.startsAt)} ${formatTimeOnly(selectedSession.startsAt)}`
                    : "Escolha a data"}{" "}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPlaceChooserOpen(false)}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>

            <div className="overflow-y-auto bg-slate-50 p-4 md:p-6">
              <ReservedPlaceChooser
                event={event}
                session={selectedSession}
                sector={selectedSector}
                object={selectedMapObject}
                ticket={currentTicketForPlaceSelection}
                selectedPlaces={selectedPlaces}
                publicPlaceReservations={publicPlaceReservations}
                maxPerPurchase={maxPerPurchase}
                onTogglePlace={toggleReservedPlace}
                onSetTableMix={setTableMixForFocusedTable}
                onClearTicketPlaces={clearReservedPlacesForTicket}
              />
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
