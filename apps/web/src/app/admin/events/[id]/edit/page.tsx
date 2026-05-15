"use client";

import Link from "next/link";
import EventMapBuilder from "@/components/admin/event-map/EventMapBuilder";
import { useParams, useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type Category =
  | "FESTAS_SHOWS"
  | "TEATROS_ESPETACULOS"
  | "STAND_UP_COMEDY"
  | "CONGRESSOS"
  | "GASTRONOMIA"
  | "ESPORTES"
  | "PASSEIOS_TOURS"
  | "INFANTIL";

type OccupancyMode = "GENERAL_ADMISSION" | "RESERVED_SEATING" | "RESERVED_TABLE" | "MIXED";
type SectorKind = "OPEN_ADMISSION" | "PLATEIA" | "NUMBERED_SEATS" | "TABLES";
type TicketKind = "INTEIRA" | "MEIA" | "SOCIAL";
type MapObjectType = "AREA" | "TABLE" | "SEAT" | "STAGE" | "AISLE" | "BOOTH" | "BLOCKED_SPACE";
type StepId = "type" | "basic" | "sessions" | "media" | "sectors" | "map" | "tickets" | "location" | "review";

type Organizer = {
  id: string;
  tradeName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
};

type OccupancyPreset = {
  key: string;
  label: string;
  description: string;
  mode: OccupancyMode;
  sectorKinds: SectorKind[];
  defaultKind: SectorKind;
  multiple: boolean;
  needsMap: boolean;
  allowSeatMap: boolean;
  allowTableMap: boolean;
};

type EventDetails = {
  id: string;
  organizerId?: string | null;
  organizer?: Organizer | null;
  name?: string | null;
  slug?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  eventDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  capacity?: number | null;
  status?: string | null;
  category?: Category | string | null;
  visibility?: string | null;
  timezone?: string | null;
  occupancyMode?: OccupancyMode | string | null;
  allowSeatMap?: boolean | null;
  allowTableMap?: boolean | null;
  content?: {
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
  } | null;
  location?: {
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
    latitude?: string | number | null;
    longitude?: string | number | null;
  } | null;
  media?: {
    coverImageUrl?: string | null;
    bannerImageUrl?: string | null;
    thumbnailUrl?: string | null;
    mobileBannerUrl?: string | null;
    sectorMapImageUrl?: string | null;
    gallery?: string[] | null;
  } | null;
  policy?: {
    ageRating?: string | null;
    refundPolicy?: string | null;
    halfEntryPolicy?: string | null;
    transferPolicy?: string | null;
    termsNotes?: string | null;
    entryRules?: string | null;
    documentRules?: string | null;
  } | null;
  sessions?: ApiSession[] | null;
  sectors?: ApiSector[] | null;
  venueLayouts?: ApiVenueLayout[] | null;
  ticketTypes?: ApiTicketType[] | null;
};

type ApiSession = {
  id?: string;
  name?: string | null;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  capacity?: number | null;
  status?: string | null;
};

type ApiSector = {
  id?: string;
  name?: string | null;
  description?: string | null;
  type?: string | null;
  occupancyMode?: string | null;
  capacity?: number | null;
  color?: string | null;
  gateName?: string | null;
};

type ApiVenueLayout = {
  id?: string;
  name?: string | null;
  width?: number | null;
  height?: number | null;
  occupancyMode?: string | null;
  mapObjects?: ApiMapObject[] | null;
  objects?: ApiMapObject[] | null;
};

type ApiMapObject = {
  id?: string;
  venueSectorId?: string | null;
  venueSectorLocalId?: string | null;
  code?: string | null;
  label?: string | null;
  type?: string | null;
  row?: string | null;
  number?: string | null;
  capacity?: number | string | null;
  x?: number | string | null;
  y?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  rotation?: number | string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

type ApiTicketType = {
  id?: string;
  eventSessionId?: string | null;
  venueSectorId?: string | null;
  name?: string | null;
  lotLabel?: string | null;
  description?: string | null;
  price?: string | number | null;
  quantity?: number | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  maxPerOrder?: number | null;
  isHidden?: boolean | null;
  occupancyMode?: string | null;
};

type SessionItem = {
  localId: string;
  name: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  description: string;
};

type SectorItem = {
  localId: string;
  name: string;
  kind: SectorKind;
  type: string;
  mode: OccupancyMode;
  capacity: string;
  color: string;
  gateName: string;
  description: string;
  chairRows: string;
  chairsPerRow: string;
  tableCount: string;
  seatsPerTable: string;
  passportEnabled: boolean;
  passportCapacity: string;
};

type MapObject = {
  localId: string;
  venueSectorLocalId: string;
  code: string;
  label: string;
  type: MapObjectType;
  capacity: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: string;
  metadata?: Record<string, unknown>;
};

type TicketItem = {
  localId: string;
  eventSessionLocalId: string;
  venueSectorLocalId: string;
  occupancyMode: OccupancyMode;
  ticketKind: TicketKind;
  name: string;
  lotLabel: string;
  description: string;
  price: string;
  quantity: string;
  salesStartAt: string;
  salesEndAt: string;
  maxPerOrder: string;
  isHidden: boolean;
};

type TicketAutomationConfig = {
  lotCount: string;
  lotQuantity: string;
  firstPrice: string;
  priceStep: string;
  intervalDays: string;
  maxPerOrder: string;
  salesStartAt: string;
};

type DragState = {
  objectId: string;
  offsetX: number;
  offsetY: number;
};

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/v1";
const MAP_W = 1280;
const MAP_H = 900;
const TIMEZONE = "America/Sao_Paulo";

const COLORS = [
  "#2563eb",
  "#0284c7",
  "#0891b2",
  "#0f766e",
  "#16a34a",
  "#059669",
  "#65a30d",
  "#ca8a04",
  "#ea580c",
  "#dc2626",
  "#db2777",
  "#9333ea",
  "#7c3aed",
  "#4f46e5",
  "#475569",
];

const CATEGORIES: Array<{ value: Category; label: string; description: string }> = [
  { value: "FESTAS_SHOWS", label: "Festas e shows", description: "Shows, festas, festivais e eventos por setores." },
  { value: "TEATROS_ESPETACULOS", label: "Teatros e espetáculos", description: "Eventos com cadeiras numeradas." },
  { value: "STAND_UP_COMEDY", label: "Stand-up comedy", description: "Cadeiras numeradas ou mesas." },
  { value: "CONGRESSOS", label: "Congressos e palestras", description: "Auditórios, salas, cadeiras ou mesas." },
  { value: "GASTRONOMIA", label: "Gastronomia, bar e restaurantes", description: "Mesas e ingressos de evento aberto." },
  { value: "ESPORTES", label: "Esportes", description: "Ingresso de evento aberto." },
  { value: "PASSEIOS_TOURS", label: "Passeios e tours", description: "Ingresso de evento aberto." },
  { value: "INFANTIL", label: "Infantil", description: "Evento aberto, plateia ou cadeiras." },
];

const PRESETS: Record<string, OccupancyPreset> = {
  OPEN: {
    key: "OPEN",
    label: "Ingressos evento aberto",
    description: "Área única para todos, sem setores separados.",
    mode: "GENERAL_ADMISSION",
    sectorKinds: ["OPEN_ADMISSION"],
    defaultKind: "OPEN_ADMISSION",
    multiple: false,
    needsMap: false,
    allowSeatMap: false,
    allowTableMap: false,
  },
  PLATEIA: {
    key: "PLATEIA",
    label: "Somente plateia",
    description: "Vários setores livres de plateia, pista ou camarote.",
    mode: "GENERAL_ADMISSION",
    sectorKinds: ["PLATEIA"],
    defaultKind: "PLATEIA",
    multiple: true,
    needsMap: false,
    allowSeatMap: false,
    allowTableMap: false,
  },
  CHAIRS: {
    key: "CHAIRS",
    label: "Somente cadeiras numeradas",
    description: "Vários setores com cadeiras numeradas.",
    mode: "RESERVED_SEATING",
    sectorKinds: ["NUMBERED_SEATS"],
    defaultKind: "NUMBERED_SEATS",
    multiple: true,
    needsMap: true,
    allowSeatMap: true,
    allowTableMap: false,
  },
  TABLES: {
    key: "TABLES",
    label: "Somente mesas",
    description: "Vários setores com mesas marcadas.",
    mode: "RESERVED_TABLE",
    sectorKinds: ["TABLES"],
    defaultKind: "TABLES",
    multiple: true,
    needsMap: true,
    allowSeatMap: false,
    allowTableMap: true,
  },
  CHAIRS_PLATEIA: {
    key: "CHAIRS_PLATEIA",
    label: "Cadeiras numeradas e plateia",
    description: "Setores mistos entre plateia e cadeiras.",
    mode: "MIXED",
    sectorKinds: ["PLATEIA", "NUMBERED_SEATS"],
    defaultKind: "PLATEIA",
    multiple: true,
    needsMap: true,
    allowSeatMap: true,
    allowTableMap: false,
  },
  TABLES_PLATEIA: {
    key: "TABLES_PLATEIA",
    label: "Mesas e plateia",
    description: "Setores mistos entre plateia e mesas.",
    mode: "MIXED",
    sectorKinds: ["PLATEIA", "TABLES"],
    defaultKind: "PLATEIA",
    multiple: true,
    needsMap: true,
    allowSeatMap: false,
    allowTableMap: true,
  },
  TABLES_OPEN: {
    key: "TABLES_OPEN",
    label: "Mesas e ingressos evento aberto",
    description: "Área aberta mais setores de mesas.",
    mode: "MIXED",
    sectorKinds: ["OPEN_ADMISSION", "TABLES"],
    defaultKind: "OPEN_ADMISSION",
    multiple: true,
    needsMap: true,
    allowSeatMap: false,
    allowTableMap: true,
  },
};

const CATEGORY_PRESETS: Record<Category, string[]> = {
  FESTAS_SHOWS: ["PLATEIA", "TABLES", "CHAIRS", "CHAIRS_PLATEIA", "TABLES_PLATEIA"],
  TEATROS_ESPETACULOS: ["CHAIRS"],
  STAND_UP_COMEDY: ["CHAIRS", "TABLES"],
  CONGRESSOS: ["CHAIRS", "TABLES"],
  GASTRONOMIA: ["TABLES_OPEN", "TABLES"],
  ESPORTES: ["OPEN"],
  PASSEIOS_TOURS: ["OPEN"],
  INFANTIL: ["OPEN", "CHAIRS", "PLATEIA", "CHAIRS_PLATEIA"],
};

const KIND_LABEL: Record<SectorKind, string> = {
  OPEN_ADMISSION: "Livre / evento aberto",
  PLATEIA: "Plateia",
  NUMBERED_SEATS: "Cadeiras numeradas",
  TABLES: "Mesas",
};

const KIND_TYPE: Record<SectorKind, string> = {
  OPEN_ADMISSION: "OPEN_ADMISSION",
  PLATEIA: "PLATEIA",
  NUMBERED_SEATS: "NUMBERED_SEATS",
  TABLES: "TABLES",
};

const KIND_MODE: Record<SectorKind, OccupancyMode> = {
  OPEN_ADMISSION: "GENERAL_ADMISSION",
  PLATEIA: "GENERAL_ADMISSION",
  NUMBERED_SEATS: "RESERVED_SEATING",
  TABLES: "RESERVED_TABLE",
};

const TICKET_KIND_OPTIONS: Array<{ label: string; value: TicketKind }> = [
  { label: "Inteira", value: "INTEIRA" },
  { label: "Meia", value: "MEIA" },
  { label: "Social", value: "SOCIAL" },
];

const TICKET_KIND_ORDER: Record<TicketKind, number> = {
  INTEIRA: 1,
  MEIA: 2,
  SOCIAL: 3,
};

const LOTS = Array.from({ length: 20 }, (_, index) => `${index + 1}º Lote`);

const OBJECT_LABELS: Record<MapObjectType, string> = {
  AREA: "Área",
  TABLE: "Mesa",
  SEAT: "Assento",
  STAGE: "Palco",
  AISLE: "Corredor",
  BOOTH: "Camarote",
  BLOCKED_SPACE: "Bloqueio",
};

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function textOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function onlyMoney(value: string) {
  const clean = value.replace(/[^\d,]/g, "");
  const parts = clean.split(",");
  return parts.length <= 1 ? clean : `${parts[0]},${parts.slice(1).join("").slice(0, 2)}`;
}

function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function positiveIntOrZero(value: string | number | undefined | null) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sectorCapacityFromParts(sector: Pick<SectorItem, "kind" | "capacity" | "chairRows" | "chairsPerRow" | "tableCount" | "seatsPerTable">) {
  if (sector.kind === "TABLES") {
    return positiveIntOrZero(sector.tableCount) * positiveIntOrZero(sector.seatsPerTable);
  }

  if (sector.kind === "NUMBERED_SEATS") {
    return positiveIntOrZero(sector.chairRows) * positiveIntOrZero(sector.chairsPerRow);
  }

  return positiveIntOrZero(sector.capacity);
}

function sectorWithCalculatedCapacity(sector: SectorItem) {
  return {
    ...sector,
    capacity: String(sectorCapacityFromParts(sector)),
  };
}

function intOrUndefined(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function moneyNumber(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function moneyApi(value: string) {
  return moneyNumber(value).toFixed(2);
}

function moneyInput(value: unknown) {
  const numeric = toNumber(value);
  return numeric > 0 ? numeric.toFixed(2).replace(".", ",") : "";
}

function formatMoney(value: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(moneyNumber(value));
}

function moneyInputFromNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(2).replace(".", ",");
}

function addMoneyValue(value: string, amount: number) {
  const base = moneyNumber(value);
  if (!Number.isFinite(base) || base <= 0) return "";
  return moneyInputFromNumber(base + amount);
}

function ticketGroupKey(sessionId: string, sectorId: string) {
  return `${sessionId || "sem-data"}::${sectorId || "sem-setor"}`;
}

function shiftInputDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, value.length === 10 ? 10 : 16);
}

function suggestTicketSaleEnd(startAt: string, limitAt: string, intervalDays: number) {
  if (!startAt) return "";
  const suggested = shiftInputDays(startAt, Math.max(1, intervalDays) - 1);
  const limitDay = inputDateDay(limitAt);
  if (limitDay && suggested > limitDay) return limitDay;
  return suggested;
}

function inputDayAsDate(value: string) {
  const day = inputDateDay(value);
  if (!day) return null;
  const date = new Date(`${day}T00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetweenInputs(startAt: string, limitAt: string) {
  const start = inputDayAsDate(startAt);
  const end = inputDayAsDate(limitAt);

  if (!start || !end) return 1;

  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

function toTicketKindLabel(kind: TicketKind) {
  return TICKET_KIND_OPTIONS.find((item) => item.value === kind)?.label || "Inteira";
}

function ticketKindPriceFactor(_kind: TicketKind) {
  return 1;
}

function toTicketKindDescription(kind: TicketKind) {
  if (kind === "MEIA") return "Meia-entrada conforme política do evento.";
  if (kind === "SOCIAL") return "Ingresso social conforme política do evento.";
  return "Ingresso de valor cheio.";
}

function toInputDayFromDateTime(value: string) {
  return inputDateDay(value) || inputDateToday();
}

function toSafeLotCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(20, parsed)) : 1;
}

function toSafeIntervalDays(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(365, parsed)) : 20;
}

function toSafeQuantity(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Math.max(1, fallback);
}

function toSafeMaxPerOrder(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? String(parsed) : "";
}

function distributeQuantity(total: number, requestedSlots: number) {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeRequestedSlots = Math.max(1, Math.floor(requestedSlots));

  if (safeTotal <= 0) return [0];

  const slots = Math.max(1, Math.min(safeRequestedSlots, safeTotal));
  const base = Math.floor(safeTotal / slots);
  const remainder = safeTotal % slots;

  return Array.from({ length: slots }, (_, index) => base + (index < remainder ? 1 : 0));
}

function quantityPreviewLabel(total: number, lotCount: number) {
  const quantities = distributeQuantity(total, lotCount);
  const preview = quantities.length > 5
    ? `${quantities.slice(0, 5).join(" / ")}...`
    : quantities.join(" / ");

  return preview || "0";
}

function clampInputDayToLimit(value: string, limitAt: string) {
  if (!value) return "";
  const limitDay = inputDateDay(limitAt);

  if (limitDay && value > limitDay) return limitDay;

  return value;
}

function defaultSalesStartDay(limitAt: string) {
  return clampInputDayToLimit(inputDateToday(), limitAt);
}

function toTicketSaleLimit(session: SessionItem, generalEnd: string) {
  return session.endsAt || session.startsAt || generalEnd;
}

function toClampedSaleStart(value: string, limitAt: string) {
  return clampInputDayToLimit(value || inputDateToday(), limitAt);
}

function toLotStart(baseStart: string, index: number, intervalDays: number, limitAt: string) {
  return clampInputDayToLimit(shiftInputDays(baseStart, index * intervalDays), limitAt);
}

function capacityLotTarget(capacity: number) {
  const value = Math.max(0, positiveIntOrZero(capacity));

  if (value <= 0) return 1;
  if (value <= 300) return 1;
  if (value <= 900) return 2;
  if (value <= 2500) return 3;
  if (value <= 6000) return 4;
  if (value <= 12000) return 5;
  if (value <= 25000) return 6;
  if (value <= 50000) return 8;

  return 10;
}

function timeLotTarget(daysAvailable: number) {
  const days = Math.max(1, positiveIntOrZero(daysAvailable));

  if (days <= 2) return 1;
  if (days <= 5) return 2;
  if (days <= 10) return 3;
  if (days <= 20) return 4;
  if (days <= 40) return 5;
  if (days <= 70) return 6;
  if (days <= 120) return 8;

  return 10;
}

function toAutomaticLotCount(capacity: number, startAt?: string, limitAt?: string) {
  const value = Math.max(0, positiveIntOrZero(capacity));

  if (value <= 0) return 1;

  const byCapacity = capacityLotTarget(value);
  const byTime = startAt && limitAt ? timeLotTarget(daysBetweenInputs(startAt, limitAt)) : byCapacity;

  return Math.max(1, Math.min(20, byCapacity, byTime, value));
}

function toAutomaticLotIntervalDays(startAt: string, limitAt: string, lotCount: number) {
  const daysAvailable = daysBetweenInputs(startAt, limitAt);
  const safeLotCount = Math.max(1, positiveIntOrZero(lotCount));

  return Math.max(1, Math.ceil(daysAvailable / safeLotCount));
}

function toAutomaticLotEnd(baseStart: string, index: number, intervalDays: number, limitAt: string, lotCount: number) {
  if (index >= lotCount - 1) return inputDateDay(limitAt) || limitAt;

  const nextStart = toLotStart(baseStart, index + 1, intervalDays, limitAt);
  return clampInputDayToLimit(shiftInputDays(nextStart, -1), limitAt);
}

function toGeneratedTicketQuantities(sectorLimit: number, lotCount: number, kindCount = 1) {
  return distributeQuantity(sectorLimit, lotCount * Math.max(1, kindCount));
}

function normalizeTicketKinds(kinds: Array<TicketKind | undefined | null>) {
  return Array.from(
    new Set(
      kinds.filter((kind): kind is TicketKind =>
        kind === "INTEIRA" || kind === "MEIA" || kind === "SOCIAL",
      ),
    ),
  ).sort((a, b) => TICKET_KIND_ORDER[a] - TICKET_KIND_ORDER[b]);
}

function distributeGroupCapacityAcrossLots(
  groupLimit: number,
  lotCount: number,
  kindCount: number,
) {
  const safeGroupLimit = Math.max(0, positiveIntOrZero(groupLimit));
  const safeLotCount = Math.max(1, positiveIntOrZero(lotCount));
  const safeKindCount = Math.max(1, positiveIntOrZero(kindCount));

  return distributeQuantity(safeGroupLimit, safeLotCount * safeKindCount);
}

function ticketGroupCapacityLimit(session: SessionItem, sector: SectorItem, generalCapacity: number) {
  const sessionLimit = positiveIntOrZero(session.capacity) || generalCapacity || 0;
  const sectorLimit = sectorCapacityFromParts(sector) || sessionLimit || generalCapacity || 0;

  if (sessionLimit <= 0 && sectorLimit <= 0) return 0;
  if (sessionLimit <= 0) return sectorLimit;
  if (sectorLimit <= 0) return sessionLimit;

  return Math.min(sessionLimit, sectorLimit);
}

function ticketGroupCapacityHelper(session: SessionItem, sector: SectorItem, generalCapacity: number) {
  const limit = ticketGroupCapacityLimit(session, sector, generalCapacity);

  return limit > 0 ? limit : 1;
}

function toInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function inputDateToday() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

function inputDateDay(value: string) {
  return value ? value.slice(0, 10) : "";
}


function localDateToInput(value: Date) {
  const copy = new Date(value.getTime());
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 16);
}

function addInputDays(value: string, days: number) {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + days);
  return localDateToInput(date);
}

function inputTime(value: string, fallback = "23:59") {
  return value && value.includes("T") ? value.slice(11, 16) : fallback;
}

function combineInputDayAndTime(day: string, time: string) {
  return day ? `${day}T${time || "23:59"}` : "";
}

function inputDateTimeValue(value: string) {
  if (!value) return Number.NaN;
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  return date.getTime();
}

function isInputAfterLimit(value: string, limit: string) {
  const valueTime = inputDateTimeValue(value);
  const limitTime = inputDateTimeValue(limit);

  if (!Number.isFinite(valueTime) || !Number.isFinite(limitTime)) return false;

  return valueTime > limitTime;
}

function limitByGeneralEnd(value: string, generalEnd: string) {
  if (!value) return "";
  if (!generalEnd) return value;
  return isInputAfterLimit(value, generalEnd) ? generalEnd : value;
}

function defaultSessionEndFromStart(sessionStart: string, generalEnd: string) {
  if (!sessionStart) return "";
  const nextDay = inputDateDay(addInputDays(sessionStart, 1));
  const suggestedEnd = combineInputDayAndTime(nextDay, inputTime(generalEnd, "23:59"));
  return limitByGeneralEnd(suggestedEnd, generalEnd);
}

function nextSessionStartFromLast(items: SessionItem[], generalStart: string) {
  const lastSession = [...items].reverse().find((item) => item.startsAt);
  const baseStart = lastSession?.startsAt || generalStart;
  return baseStart ? addInputDays(baseStart, 1) : generalStart;
}

function sessionNameFromDate(value: string) {
  if (!value) return "";
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

function splitCapacity(totalValue: string, count: number) {
  const total = Math.max(0, Math.floor(toNumber(totalValue)));
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function redistributeSessionCapacities(items: SessionItem[], totalValue: string) {
  const capacities = splitCapacity(totalValue, items.length);
  return items.map((item, index) => ({ ...item, capacity: String(capacities[index] || 0) }));
}

function buildSessionForIndex(index: number, generalStart: string, generalEnd: string, capacityValue = "") {
  const rawStartsAt = index === 0 ? generalStart : addInputDays(generalStart, index);
  const startsAt = limitByGeneralEnd(rawStartsAt, generalEnd);

  return {
    ...newSession(index),
    name: sessionNameFromDate(startsAt) || `Data ${index + 1}`,
    startsAt,
    endsAt: defaultSessionEndFromStart(startsAt, generalEnd),
    capacity: capacityValue,
  };
}

function isoEventStartOrUndefined(value: string) {
  if (!value) return undefined;
  const normalized = value.length === 10 ? `${value}T00:00` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isoEventEndOrUndefined(value: string) {
  if (!value) return undefined;
  const normalized = value.length === 10 ? `${value}T23:59` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function datePreview(value: string) {
  if (!value) return "A definir";
  const date = new Date(value.length === 10 ? `${value}T00:00` : value);
  if (Number.isNaN(date.getTime())) return "A definir";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function lotNumber(label: string) {
  const parsed = Number.parseInt(label.replace(/\D/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseGallery(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function appendImageUrls(current: string, urls: string[]) {
  const merged = [...parseGallery(current), ...urls].map((item) => item.trim()).filter(Boolean);
  return Array.from(new Set(merged)).join("\n");
}

function getApiOrigin() {
  try {
    const url = new URL(API_BASE_URL);
    if (url.hostname === "localhost") url.hostname = "127.0.0.1";
    return url.origin;
  } catch {
    return "";
  }
}

function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.hostname === "localhost") url.hostname = "127.0.0.1";
      return url.toString();
    } catch {
      return undefined;
    }
  }

  const origin = getApiOrigin();
  if (!origin) return undefined;
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `${origin}/${trimmed}`;
  return undefined;
}

function normalizeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^(www\.|google\.|maps\.app\.goo\.gl|goo\.gl|waze\.com|openstreetmap\.org|bing\.com)/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function isMapUrl(value: string) {
  const normalized = normalizeExternalUrl(value);
  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return host.includes("google.") || host.includes("maps.app.goo.gl") || host.includes("waze.com") || host.includes("openstreetmap.org") || host.includes("bing.com");
  } catch {
    return false;
  }
}

function normalizeCategory(value?: string | null): Category {
  const normalized = String(value || "").toUpperCase();
  const found = CATEGORIES.find((item) => item.value === normalized);
  return found?.value || "FESTAS_SHOWS";
}

function normalizeOccupancy(value?: string | null): OccupancyMode {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "RESERVED_SEATING" || normalized === "RESERVED_TABLE" || normalized === "MIXED" || normalized === "GENERAL_ADMISSION") return normalized;
  return "GENERAL_ADMISSION";
}

function normalizeKind(type?: string | null, mode?: string | null): SectorKind {
  const normalized = String(type || "").toUpperCase();
  if (normalized === "NUMBERED_SEATS") return "NUMBERED_SEATS";
  if (normalized === "TABLES") return "TABLES";
  if (normalized === "PLATEIA") return "PLATEIA";
  if (normalized === "OPEN_ADMISSION") return "OPEN_ADMISSION";
  const occupancy = normalizeOccupancy(mode);
  if (occupancy === "RESERVED_SEATING") return "NUMBERED_SEATS";
  if (occupancy === "RESERVED_TABLE") return "TABLES";
  return "PLATEIA";
}

function presetFromEvent(event: EventDetails) {
  const mode = normalizeOccupancy(String(event.occupancyMode || ""));
  const sectors = Array.isArray(event.sectors) ? event.sectors : [];
  const hasTables = sectors.some((sector) => normalizeKind(sector.type, sector.occupancyMode) === "TABLES");
  const hasChairs = sectors.some((sector) => normalizeKind(sector.type, sector.occupancyMode) === "NUMBERED_SEATS");
  const hasOpen = sectors.some((sector) => normalizeKind(sector.type, sector.occupancyMode) === "OPEN_ADMISSION");
  const hasPlateia = sectors.some((sector) => normalizeKind(sector.type, sector.occupancyMode) === "PLATEIA");

  if (hasTables && hasOpen) return "TABLES_OPEN";
  if (hasTables && hasPlateia) return "TABLES_PLATEIA";
  if (hasChairs && hasPlateia) return "CHAIRS_PLATEIA";
  if (hasTables || mode === "RESERVED_TABLE") return "TABLES";
  if (hasChairs || mode === "RESERVED_SEATING") return "CHAIRS";
  if (hasOpen && sectors.length <= 1) return "OPEN";
  return "PLATEIA";
}

function newSession(index = 0): SessionItem {
  return { localId: uid("session"), name: index === 0 ? "Data principal" : `Data ${index + 1}`, startsAt: "", endsAt: "", capacity: "", description: "" };
}

function newSector(preset: OccupancyPreset, index = 0, forceKind?: SectorKind): SectorItem {
  const kind = forceKind || preset.defaultKind;
  const chairRows = kind === "NUMBERED_SEATS" ? "10" : "";
  const chairsPerRow = kind === "NUMBERED_SEATS" ? "10" : "";
  const tableCount = kind === "TABLES" ? "20" : "";
  const seatsPerTable = kind === "TABLES" ? "4" : "";
  const capacity =
    kind === "NUMBERED_SEATS"
      ? String(positiveIntOrZero(chairRows) * positiveIntOrZero(chairsPerRow))
      : kind === "TABLES"
        ? String(positiveIntOrZero(tableCount) * positiveIntOrZero(seatsPerTable))
        : "100";

  return {
    localId: uid("sector"),
    name: index === 0 ? KIND_LABEL[kind] : `${KIND_LABEL[kind]} ${index + 1}`,
    kind,
    type: KIND_TYPE[kind],
    mode: KIND_MODE[kind],
    capacity,
    color: COLORS[index % COLORS.length],
    gateName: "",
    description: "",
    chairRows,
    chairsPerRow,
    tableCount,
    seatsPerTable,
    passportEnabled: false,
    passportCapacity: "",
  };
}

function newTicket(index = 0, sessionId = "", sectorId = "", mode: OccupancyMode = "GENERAL_ADMISSION"): TicketItem {
  return {
    localId: uid("ticket"),
    eventSessionLocalId: sessionId,
    venueSectorLocalId: sectorId,
    occupancyMode: mode,
    ticketKind: "INTEIRA",
    name: "Inteira",
    lotLabel: `${Math.max(1, index + 1)}º Lote`,
    description: "",
    price: "",
    quantity: "100",
    salesStartAt: inputDateToday(),
    salesEndAt: "",
    maxPerOrder: "",
    isHidden: false,
  };
}

function newMapObject(type: MapObjectType, sectorId: string, index: number): MapObject {
  const label = type === "STAGE" ? "Palco" : type === "TABLE" ? `Mesa ${index}` : type === "SEAT" ? `Assento ${index}` : type === "AISLE" ? "Corredor" : type === "BOOTH" ? `Camarote ${index}` : type === "BLOCKED_SPACE" ? "Bloqueio" : `Área ${index}`;
  return {
    localId: uid("map"),
    venueSectorLocalId: sectorId,
    code: `${type}-${index}`,
    label,
    type,
    capacity: type === "TABLE" ? "4" : type === "SEAT" ? "1" : type === "STAGE" || type === "AISLE" || type === "BLOCKED_SPACE" ? "1" : "100",
    x: 80 + (index % 8) * 70,
    y: 110 + (index % 5) * 70,
    width: type === "SEAT" ? 44 : type === "TABLE" ? 90 : type === "STAGE" ? 260 : type === "AISLE" ? 680 : 220,
    height: type === "SEAT" ? 44 : type === "TABLE" ? 76 : type === "STAGE" ? 80 : type === "AISLE" ? 54 : 130,
    rotation: 0,
    status: "AVAILABLE",
    metadata: { shape: type === "SEAT" || type === "TABLE" ? "CIRCLE" : "ROUNDED" },
  };
}

function inputClass(error = false) {
  return `h-[52px] w-full rounded-2xl border bg-white px-4 text-sm font-semibold outline-none transition ${error ? "border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100" : "border-slate-300 focus:ring-4 focus:ring-sky-100"}`;
}

function textareaClass(error = false) {
  return `min-h-[120px] w-full rounded-2xl border bg-white p-4 text-sm font-semibold outline-none transition ${error ? "border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100" : "border-slate-300 focus:ring-4 focus:ring-sky-100"}`;
}

function Field({ label, value, onChange, type = "text", placeholder, required, error, helper, disabled, onlyNumbers, money }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean; error?: boolean; helper?: string; disabled?: boolean; onlyNumbers?: boolean; money?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">{label}{required ? <span className="text-rose-600"> *</span> : null}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        inputMode={onlyNumbers || money ? "numeric" : undefined}
        onChange={(event) => {
          const next = event.target.value;
          if (onlyNumbers) onChange(onlyDigits(next));
          else if (money) onChange(onlyMoney(next));
          else onChange(next);
        }}
        placeholder={placeholder}
        className={`${inputClass(error)} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
      />
      {helper ? <p className={`mt-2 text-xs font-semibold ${error ? "text-rose-600" : "text-slate-500"}`}>{helper}</p> : null}
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, disabled, helper }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; disabled?: boolean; helper?: string }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${textareaClass()} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
      />
      {helper ? <p className="mt-2 text-xs font-semibold text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Select({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (value: string) => void; options: Array<{ label: string; value: string; disabled?: boolean }>; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
      <select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={`${inputClass()} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}>
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </div>
  );
}

function StepShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function MediaField({ label, value, kind, onChange }: { label: string; value: string; kind: string; onChange: (value: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const url = normalizeUrl(value) || value;

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("A imagem precisa ter no máximo 5 MB.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    const body = new FormData();
    body.append("file", file);
    body.append("kind", kind);

    setUploading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/uploads/event-image`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof result?.message === "string" ? result.message : "Erro ao enviar imagem.");
      onChange(normalizeUrl(String(result?.url || result?.path || "")) || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-4">
      <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
      <div className="grid gap-4 md:grid-cols-[220px_1fr]">
        <div className="h-36 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {url ? <img src={url} alt={label} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs font-black uppercase tracking-[0.18em] text-slate-300">Sem imagem</div>}
        </div>
        <div>
          <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Cole a URL ou envie arquivo" className={inputClass()} />
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-sky-700">
              {uploading ? "Enviando..." : "Enviar imagem"}
              <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" disabled={uploading} onChange={(event) => event.target.files?.[0] && void upload(event.target.files[0])} />
            </label>
            {value ? <button type="button" onClick={() => onChange("")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700">Remover</button> : null}
          </div>
          {error ? <p className="mt-2 text-xs font-black text-rose-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function MultiImageField({ label, value, kind, onChange, helper }: { label: string; value: string; kind: string; onChange: (value: string) => void; helper?: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const images = parseGallery(value).map((item) => normalizeUrl(item) || item).filter(Boolean);

  async function upload(files: FileList | null) {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return;

    const invalidFile = selectedFiles.find((file) => !file.type.startsWith("image/"));
    if (invalidFile) {
      setError("Envie apenas imagens JPG, PNG ou WEBP.");
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > 5 * 1024 * 1024);
    if (oversizedFile) {
      setError("Cada imagem precisa ter no máximo 5 MB.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const body = new FormData();
        body.append("file", file);
        body.append("kind", kind);

        const response = await fetch(`${API_BASE_URL}/uploads/event-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        });

        const result = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(typeof result?.message === "string" ? result.message : "Erro ao enviar imagem.");
        }

        const uploadedUrl = normalizeUrl(String(result?.url || result?.path || ""));
        if (uploadedUrl) uploadedUrls.push(uploadedUrl);
      }

      onChange(appendImageUrls(value, uploadedUrls));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar imagens.");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(indexToRemove: number) {
    const next = parseGallery(value).filter((_, index) => index !== indexToRemove);
    onChange(next.join("\n"));
  }

  return (
    <div className="rounded-[1.7rem] border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <label className="block text-sm font-black text-slate-700">{label}</label>
          {helper ? <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{helper}</p> : null}
        </div>
        <label className="w-fit cursor-pointer rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-sky-700">
          {uploading ? "Enviando..." : "Escolher imagens"}
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            disabled={uploading}
            onChange={(event) => void upload(event.target.files)}
          />
        </label>
      </div>

      {images.length > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="h-32 bg-slate-100">
                <img src={url} alt={`${label} ${index + 1}`} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <p className="truncate text-xs font-bold text-slate-500">Imagem {index + 1}</p>
                <button type="button" onClick={() => removeImage(index)} className="text-xs font-black text-rose-600 hover:text-rose-700">
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-4 flex min-h-28 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-xs font-black uppercase tracking-[0.18em] text-slate-300">
          Nenhuma imagem adicionada
        </div>
      )}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="URLs das imagens, uma por linha"
        className="min-h-[92px] w-full rounded-2xl border border-slate-300 bg-white p-4 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-sky-100"
      />
      {error ? <p className="mt-2 text-xs font-black text-rose-600">{error}</p> : null}
    </div>
  );
}


export default function EditEventPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = String(params.id || "");
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [category, setCategory] = useState<Category>("FESTAS_SHOWS");
  const [presetKey, setPresetKey] = useState("PLATEIA");
  const preset = PRESETS[presetKey] || PRESETS.PLATEIA;

  const [organizerId, setOrganizerId] = useState("");
  const [eventName, setEventName] = useState("");
  const [slug, setSlug] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mobileBannerUrl, setMobileBannerUrl] = useState("");
  const [sectorMapImageUrl, setSectorMapImageUrl] = useState("");
  const [sectorPhotosText, setSectorPhotosText] = useState("");
  const [galleryText, setGalleryText] = useState("");

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [producerDescription, setProducerDescription] = useState("");
  const [ageRating, setAgeRating] = useState("");
  const [refundEnabled, setRefundEnabled] = useState(false);
  const [refundPolicy, setRefundPolicy] = useState("");
  const [transferEnabled, setTransferEnabled] = useState(false);
  const [transferPolicy, setTransferPolicy] = useState("");
  const [halfEntryPolicy, setHalfEntryPolicy] = useState("");
  const [entryRules, setEntryRules] = useState("");
  const [documentRules, setDocumentRules] = useState("");
  const [termsNotes, setTermsNotes] = useState("");

  const [sessions, setSessions] = useState<SessionItem[]>([newSession(0)]);
  const [sectors, setSectors] = useState<SectorItem[]>([newSector(PRESETS.PLATEIA, 0)]);
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [selectedMapObjectId, setSelectedMapObjectId] = useState("");
  const [dragState, setDragState] = useState<DragState | null>(null);

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketBuilderStep, setTicketBuilderStep] = useState<"CREATE" | "REVIEW">("CREATE");
  const [ticketMaxPerOrder, setTicketMaxPerOrder] = useState("4");
  const [expandedTicketSessionId, setExpandedTicketSessionId] = useState("");
  const [expandedTicketSectorKey, setExpandedTicketSectorKey] = useState("");
  const [ticketAutomationConfigs, setTicketAutomationConfigs] = useState<Record<string, TicketAutomationConfig>>({});

  useEffect(() => {
    const lockedMaxPerOrder = toSafeMaxPerOrder(ticketMaxPerOrder);

    setTickets((current) =>
      current.map((ticket) => ({
        ...ticket,
        maxPerOrder: lockedMaxPerOrder,
      })),
    );
  }, [ticketMaxPerOrder]);

  const [venueName, setVenueName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [reference, setReference] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [cepMessage, setCepMessage] = useState("");

  const generalCapacity = toNumber(capacity);
  const sessionCapacities = sessions.map((item) => toNumber(item.capacity)).filter((value) => value > 0);
  const sectorDateLimit = sessionCapacities.length > 0 ? Math.min(...sessionCapacities) : generalCapacity;
  const sectorTotal = sectors.reduce((sum, item) => sum + sectorCapacityFromParts(item), 0);
  const sessionTotal = sessions.reduce((sum, item) => sum + toNumber(item.capacity), 0);
  const ticketTotal = tickets.reduce((sum, item) => sum + toNumber(item.quantity), 0);
  const ticketRevenuePreview = tickets.reduce((sum, item) => sum + moneyNumber(item.price) * toNumber(item.quantity), 0);
  const ticketGroupTotals = useMemo(() => {
    const totals = new Map<string, number>();
    tickets.forEach((ticket) => {
      const key = ticketGroupKey(ticket.eventSessionLocalId, ticket.venueSectorLocalId);
      totals.set(key, (totals.get(key) || 0) + toNumber(ticket.quantity));
    });
    return totals;
  }, [tickets]);
  const ticketCountByGroup = useMemo(() => {
    const totals = new Map<string, number>();
    tickets.forEach((ticket) => {
      const key = ticketGroupKey(ticket.eventSessionLocalId, ticket.venueSectorLocalId);
      totals.set(key, (totals.get(key) || 0) + 1);
    });
    return totals;
  }, [tickets]);
  const selectedMapObject = mapObjects.find((object) => object.localId === selectedMapObjectId) || null;
  const isOnline = venueName.trim().toLowerCase() === "online";

  const steps: Array<{ id: StepId; title: string; description: string }> = [
    { id: "type", title: "Tipo de evento", description: "Travado após criação." },
    { id: "basic", title: "Dados principais", description: "Nome e capacidade." },
    { id: "sessions", title: "Datas", description: "Datas e capacidades." },
    { id: "media", title: "Imagens e políticas", description: "Mídias e regras." },
    { id: "sectors", title: "Setores / áreas", description: "Setores." },
    { id: "map", title: "Mapa", description: "Editor visual." },
    { id: "tickets", title: "Ingressos / lotes", description: "Automático: lotes por data, setor e tempo de venda." },
    { id: "location", title: "Local e acesso", description: "Endereço." },
    { id: "review", title: "Revisão", description: "Salvar." },
  ];

  const sessionError = useMemo(() => {
    if (sessions.length === 0) return "Cadastre pelo menos uma data.";
    if (sessions.some((item) => !item.startsAt)) return "Toda data precisa de início.";
    if (sessions.some((item) => toNumber(item.capacity) <= 0)) return "Toda data precisa de capacidade.";
    if (sessions.some((item) => toNumber(item.capacity) > generalCapacity)) return "A capacidade de uma data não pode ultrapassar a capacidade geral.";
    if (sessionTotal > generalCapacity) return "A soma das capacidades das datas não pode ultrapassar a capacidade geral.";
    return "";
  }, [sessions, generalCapacity, sessionTotal]);

  const sectorError = useMemo(() => {
    if (sectors.length === 0) return "Cadastre pelo menos um setor.";
    if (sectors.some((item) => !item.name.trim())) return "Todo setor precisa de nome.";
    if (sectors.some((item) => sectorCapacityFromParts(item) <= 0)) return "A capacidade de cada setor é obrigatória.";
    if (sectors.some((item) => sectorCapacityFromParts(item) > sectorDateLimit)) return "Nenhum setor pode ultrapassar a capacidade disponível por data.";
    if (sectorTotal > sectorDateLimit) return "A soma dos setores não pode ultrapassar a capacidade disponível por data.";
    if (new Set(sectors.map((item) => item.color)).size !== sectors.length) return "Cada setor precisa ter uma cor diferente.";
    return "";
  }, [sectors, sectorDateLimit, sectorTotal]);

  const ticketError = useMemo(() => {
    if (tickets.length === 0) return "Crie pelo menos um lote.";
    if (tickets.some((item) => !item.eventSessionLocalId)) return "Todo lote precisa estar vinculado a uma data.";
    if (tickets.some((item) => !item.venueSectorLocalId)) return "Todo lote precisa estar vinculado a um setor.";
    if (tickets.some((item) => !item.name.trim())) return "Todo lote precisa ter nome.";
    if (tickets.some((item) => !item.price.trim())) return "Todo lote precisa ter preço.";
    if (tickets.some((item) => toNumber(item.quantity) <= 0)) return "Todo lote precisa ter quantidade.";
    if (ticketTotal > generalCapacity) return "A soma dos ingressos não pode ultrapassar a capacidade geral.";

    for (const session of sessions) {
      for (const sector of sectors) {
        const groupTotal = tickets
          .filter((item) => item.eventSessionLocalId === session.localId && item.venueSectorLocalId === sector.localId)
          .reduce((sum, item) => sum + toNumber(item.quantity), 0);
        const groupLimit = ticketGroupCapacityLimit(session, sector, generalCapacity);
        if (groupLimit > 0 && groupTotal > groupLimit) {
          return `Ingressos de ${sector.name} em ${session.name || datePreview(session.startsAt)} passam da capacidade reservada para este setor nesta data.`;
        }
      }
    }

    return "";
  }, [tickets, ticketTotal, generalCapacity, sessions, sectors]);

  const mediaError = "";

  const completion: Record<StepId, boolean> = {
    type: Boolean(category && presetKey),
    basic: Boolean(organizerId && eventName.trim() && generalCapacity > 0),
    sessions: !sessionError,
    media: !mediaError,
    sectors: !sectorError,
    map: preset.needsMap ? mapObjects.length > 0 : true,
    tickets: tickets.some((item) => item.name.trim() && item.price.trim() && toNumber(item.quantity) > 0) && !ticketError,
    location: isOnline ? Boolean(venueName.trim()) : Boolean(venueName.trim() && city.trim() && state.trim()),
    review: false,
  };

  const requiredErrors = {
    basic: submitAttempted && !completion.basic,
    sessions: submitAttempted && !completion.sessions,
    media: submitAttempted && !completion.media,
    sectors: submitAttempted && !completion.sectors,
    map: submitAttempted && !completion.map,
    tickets: submitAttempted && !completion.tickets,
    location: submitAttempted && !completion.location,
  };

  function applyEventToForm(event: EventDetails | null) {
    if (!event) return;

    const nextCategory = normalizeCategory(String(event.category || ""));
    const nextPresetKey = presetFromEvent(event);
    const nextPreset = PRESETS[nextPresetKey] || PRESETS.PLATEIA;
    const apiSessions = Array.isArray(event.sessions) ? event.sessions : [];
    const apiSectors = Array.isArray(event.sectors) ? event.sectors : [];
    const apiTickets = Array.isArray(event.ticketTypes) ? event.ticketTypes : [];
    const apiLayouts = Array.isArray(event.venueLayouts) ? event.venueLayouts : [];
    const firstLayout = apiLayouts[0];
    const apiObjects = Array.isArray(firstLayout?.mapObjects) ? firstLayout?.mapObjects : Array.isArray(firstLayout?.objects) ? firstLayout?.objects : [];

    setCategory(nextCategory);
    setPresetKey(nextPresetKey);
    setOrganizerId(event.organizerId || event.organizer?.id || "");
    setEventName(event.name || "");
    setSlug(event.slug || "");
    setCapacity(String(event.capacity || "100"));
    setShortDescription(event.shortDescription || "");
    setDescription(event.description || "");
    setStartDate(toInputDate(event.startDate || event.eventDate));
    setEndDate(toInputDate(event.endDate));

    setCoverImageUrl(event.media?.coverImageUrl || "");
    setBannerImageUrl(event.media?.bannerImageUrl || "");
    setThumbnailUrl(event.media?.thumbnailUrl || "");
    setMobileBannerUrl(event.media?.mobileBannerUrl || "");
    setSectorMapImageUrl(event.media?.sectorMapImageUrl || "");
    setSectorPhotosText(event.media?.sectorMapImageUrl || "");
    setGalleryText(Array.isArray(event.media?.gallery) ? event.media?.gallery.join("\n") : "");

    setHeadline(event.content?.headline || "");
    setSummary(event.content?.summary || "");
    setFullDescription(event.content?.fullDescription || "");
    setProducerDescription(event.content?.producerDescription || "");
    setAgeRating(event.policy?.ageRating || "");
    setRefundEnabled(Boolean(event.policy?.refundPolicy));
    setRefundPolicy(event.policy?.refundPolicy || "");
    setTransferEnabled(Boolean(event.policy?.transferPolicy));
    setTransferPolicy(event.policy?.transferPolicy || "");
    setHalfEntryPolicy(event.policy?.halfEntryPolicy || "");
    setEntryRules(event.policy?.entryRules || "");
    setDocumentRules(event.policy?.documentRules || "");
    setTermsNotes(event.policy?.termsNotes || "");

    const generalStartInput = toInputDate(event.startDate || event.eventDate);
    const generalEndInput = toInputDate(event.endDate);
    const sessionCount = Math.max(1, apiSessions.length || 1);
    const distributedCapacities = splitCapacity(String(event.capacity || "100"), sessionCount);
    const nextSessions = Array.from({ length: sessionCount }, (_, index) => {
      const apiSession = apiSessions[index];
      const startsAt = index === 0 ? generalStartInput : toInputDate(apiSession?.startsAt) || addInputDays(generalStartInput, index);
      return {
        localId: apiSession?.id || uid("session"),
        name: sessionNameFromDate(startsAt) || apiSession?.name || `Data ${index + 1}`,
        startsAt,
        endsAt: toInputDate(apiSession?.endsAt) || defaultSessionEndFromStart(startsAt, generalEndInput),
        capacity: String(distributedCapacities[index] || 0),
        description: apiSession?.description || "",
      } satisfies SessionItem;
    });

    const nextSectors = apiSectors.length > 0 ? apiSectors.map((sector, index) => {
      const kind = normalizeKind(sector.type, sector.occupancyMode);
      const capacityString = String(sector.capacity || "");
      const loadedCapacity = toNumber(capacityString) || 100;
      const chairRows = kind === "NUMBERED_SEATS" ? "10" : "";
      const chairsPerRow = kind === "NUMBERED_SEATS" ? String(Math.ceil(loadedCapacity / Math.max(1, positiveIntOrZero(chairRows)))) : "";
      const seatsPerTable = kind === "TABLES" ? "4" : "";
      const tableCount = kind === "TABLES" ? String(Math.ceil(loadedCapacity / Math.max(1, positiveIntOrZero(seatsPerTable)))) : "";
      return sectorWithCalculatedCapacity({
        localId: sector.id || uid("sector"),
        name: sector.name || KIND_LABEL[kind],
        kind,
        type: sector.type || KIND_TYPE[kind],
        mode: normalizeOccupancy(sector.occupancyMode),
        capacity: capacityString,
        color: sector.color || COLORS[index % COLORS.length],
        gateName: sector.gateName || "",
        description: sector.description || "",
        chairRows,
        chairsPerRow,
        tableCount,
        seatsPerTable,
        passportEnabled: false,
        passportCapacity: "",
      } satisfies SectorItem);
    }) : [newSector(nextPreset, 0)];

    setSessions(nextSessions);
    setSectors(nextSectors);

    setMapObjects((apiObjects || []).map((object, index) => ({
      localId: object.id || uid("map"),
      venueSectorLocalId: object.venueSectorId || object.venueSectorLocalId || nextSectors[0]?.localId || "",
      code: object.code || `OBJ-${index + 1}`,
      label: object.label || object.code || `Objeto ${index + 1}`,
      type: normalizeMapObjectType(object.type),
      capacity: String(object.capacity || "1"),
      x: toNumber(object.x),
      y: toNumber(object.y),
      width: toNumber(object.width) || 200,
      height: toNumber(object.height) || 100,
      rotation: toNumber(object.rotation),
      status: object.status || "AVAILABLE",
      metadata: object.metadata || undefined,
    })));

    setTickets(apiTickets.length > 0 ? apiTickets.map((ticket, index) => {
      const parsed = parseTicketName(ticket.name || "");
      return {
        localId: ticket.id || uid("ticket"),
        eventSessionLocalId: ticket.eventSessionId || nextSessions[0]?.localId || "",
        venueSectorLocalId: ticket.venueSectorId || nextSectors[0]?.localId || "",
        occupancyMode: normalizeOccupancy(ticket.occupancyMode),
        ticketKind: parsed.kind,
        name: parsed.name,
        lotLabel: ticket.lotLabel || parsed.lotLabel || "1º Lote",
        description: ticket.description || "",
        price: moneyInput(ticket.price),
        quantity: String(ticket.quantity || ""),
        salesStartAt: inputDateDay(toInputDate(ticket.salesStartAt)) || inputDateToday(),
        salesEndAt: inputDateDay(toInputDate(ticket.salesEndAt)),
        maxPerOrder: String(ticket.maxPerOrder || ""),
        isHidden: Boolean(ticket.isHidden),
      } satisfies TicketItem;
    }) : [newTicket(0, nextSessions[0]?.localId || "", nextSectors[0]?.localId || "", nextPreset.mode)]);

    setVenueName(event.location?.venueName || "");
    setZipCode(event.location?.zipCode || "");
    setAddressLine1(event.location?.addressLine1 || "");
    setAddressLine2(event.location?.addressLine2 || "");
    setNeighborhood(event.location?.neighborhood || "");
    setCity(event.location?.city || "");
    setState(event.location?.state || "");
    setReference(event.location?.reference || "");
    setMapUrl(event.location?.mapUrl || "");
    setInstructions(event.location?.instructions || "");
    setLatitude(String(event.location?.latitude || ""));
    setLongitude(String(event.location?.longitude || ""));
  }

  function normalizeMapObjectType(value?: string | null): MapObjectType {
    const normalized = String(value || "").toUpperCase();
    if (normalized === "TABLE" || normalized === "SEAT" || normalized === "STAGE" || normalized === "AISLE" || normalized === "BOOTH" || normalized === "BLOCKED_SPACE") return normalized;
    return "AREA";
  }

  function parseTicketName(value: string): { kind: TicketKind; name: string; lotLabel: string } {
    const kind = value.toLowerCase().includes("meia") ? "MEIA" : value.toLowerCase().includes("social") ? "SOCIAL" : "INTEIRA";
    const lotMatch = value.match(/(\d+º\s*lote)/i)?.[1] || "1º Lote";
    return { kind, lotLabel: lotMatch, name: value.replace(/inteira|meia|social|\d+º\s*lote|[-•]/gi, " ").replace(/\s+/g, " ").trim() || TICKET_KIND_OPTIONS.find((item) => item.value === kind)?.label || "Inteira" };
  }

  async function loadEvent() {
    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setLoading(true);
    setError("");

    try {
      const [eventResponse, organizersResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/events/${eventId}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch(`${API_BASE_URL}/organizers`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }).catch(() => null),
      ]);

      const eventResult = await eventResponse.json().catch(() => null);
      if (!eventResponse.ok) throw new Error(typeof eventResult?.message === "string" ? eventResult.message : "Erro ao carregar evento.");

      const organizerResult = organizersResponse ? await organizersResponse.json().catch(() => null) : [];
      setOrganizers(Array.isArray(organizerResult) ? organizerResult : []);
      applyEventToForm(eventResult as EventDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com a API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvent();
  }, [eventId]);

  function changeCategory(next: Category) {
    const firstPresetKey = CATEGORY_PRESETS[next][0];
    const nextPreset = PRESETS[firstPresetKey];
    setCategory(next);
    setPresetKey(firstPresetKey);
    setSectors([newSector(nextPreset, 0)]);
    setMapObjects([]);
    setSelectedMapObjectId("");
    setTickets((current) => current.map((item) => ({ ...item, venueSectorLocalId: "", occupancyMode: nextPreset.mode })));
  }

  function changePreset(nextKey: string) {
    const nextPreset = PRESETS[nextKey] || PRESETS.PLATEIA;
    setPresetKey(nextKey);
    setSectors([newSector(nextPreset, 0)]);
    setMapObjects([]);
    setSelectedMapObjectId("");
    setTickets((current) => current.map((item) => ({ ...item, venueSectorLocalId: "", occupancyMode: nextPreset.mode })));
  }

  function handleCapacityChange(value: string) {
    setCapacity(value);
    setSessions((current) => redistributeSessionCapacities(current, value));
  }

  function resetSessionTimeline() {
    setSessions((current) => {
      const count = Math.max(1, current.length);
      const baseSessions = Array.from({ length: count }, (_, index) => {
        const previous = current[index];
        const automatic = buildSessionForIndex(index, startDate, endDate);
        return { ...automatic, localId: previous?.localId || automatic.localId, description: previous?.description || "" };
      });
      return redistributeSessionCapacities(baseSessions, capacity);
    });
  }

  function redistributeCurrentSessions() {
    setSessions((current) => redistributeSessionCapacities(current, capacity));
  }

  function addSession() {
    setSessions((current) => {
      const startsAt = nextSessionStartFromLast(current, startDate);

      if (endDate && isInputAfterLimit(startsAt, endDate)) {
        alert("Não é possível adicionar uma data depois da data final geral.");
        return current;
      }

      const nextSession: SessionItem = {
        ...newSession(current.length),
        name: sessionNameFromDate(startsAt) || `Data ${current.length + 1}`,
        startsAt,
        endsAt: defaultSessionEndFromStart(startsAt, endDate),
      };

      return redistributeSessionCapacities([...current, nextSession], capacity);
    });
  }

  function updateSession(localId: string, patch: Partial<SessionItem>) {
    setSessions((current) => current.map((item) => {
      if (item.localId !== localId) return item;

      let safePatch = { ...patch };

      if (patch.startsAt !== undefined && endDate && isInputAfterLimit(patch.startsAt, endDate)) {
        alert("O início da data não pode passar da data final geral.");
        safePatch.startsAt = item.startsAt;
      }

      if (patch.endsAt !== undefined && endDate && isInputAfterLimit(patch.endsAt, endDate)) {
        alert("O fim da data não pode passar da data final geral.");
        safePatch.endsAt = endDate;
      }

      const next = { ...item, ...safePatch };

      if (safePatch.startsAt !== undefined) {
        next.name = sessionNameFromDate(safePatch.startsAt) || next.name;
        next.endsAt = defaultSessionEndFromStart(safePatch.startsAt, endDate) || next.endsAt;
      }

      if (next.endsAt && endDate && isInputAfterLimit(next.endsAt, endDate)) {
        next.endsAt = endDate;
      }

      return next;
    }));
  }

  function removeSession(localId: string) {
    if (sessions.length <= 1) {
      alert("Mantenha pelo menos uma data.");
      return;
    }
    const fallback = sessions.find((item) => item.localId !== localId);
    setSessions((current) => redistributeSessionCapacities(current.filter((item) => item.localId !== localId), capacity));
    setTickets((current) => current.map((item) => (item.eventSessionLocalId === localId ? { ...item, eventSessionLocalId: fallback?.localId || "" } : item)));
  }

  function addSector(kind?: SectorKind) {
    setSectors((current) => [...current, newSector(preset, current.length, kind)]);
  }

  function updateSector(localId: string, patch: Partial<SectorItem>) {
    let nextName = "";
    let nextCapacity = "";

    setSectors((current) => current.map((item) => {
      if (item.localId !== localId) return item;

      const next = { ...item, ...patch };

      if (patch.kind) {
        next.type = KIND_TYPE[patch.kind];
        next.mode = KIND_MODE[patch.kind];

        if (patch.kind === "TABLES") {
          next.tableCount = next.tableCount || "20";
          next.seatsPerTable = next.seatsPerTable || "4";
          next.chairRows = "";
          next.chairsPerRow = "";
        }

        if (patch.kind === "NUMBERED_SEATS") {
          next.chairRows = next.chairRows || "10";
          next.chairsPerRow = next.chairsPerRow || "10";
          next.tableCount = "";
          next.seatsPerTable = "";
        }

        if (patch.kind === "PLATEIA" || patch.kind === "OPEN_ADMISSION") {
          next.tableCount = "";
          next.seatsPerTable = "";
          next.chairRows = "";
          next.chairsPerRow = "";
          next.capacity = next.capacity || "100";
        }
      }

      if (next.kind === "PLATEIA" || next.kind === "OPEN_ADMISSION") {
        const manualCapacity = positiveIntOrZero(next.capacity);
        if (sectorDateLimit > 0 && manualCapacity > sectorDateLimit) {
          next.capacity = String(sectorDateLimit);
        }
      }

      const calculated = sectorWithCalculatedCapacity(next);
      nextName = calculated.name;
      nextCapacity = calculated.capacity;
      return calculated;
    }));

    setMapObjects((current) => current.map((object) => (
      object.venueSectorLocalId === localId
        ? { ...object, label: nextName || object.label, capacity: nextCapacity || object.capacity }
        : object
    )));
  }

  function removeSector(localId: string) {
    if (sectors.length <= 1) {
      alert("Mantenha pelo menos um setor.");
      return;
    }
    const fallback = sectors.find((item) => item.localId !== localId);
    setSectors((current) => current.filter((item) => item.localId !== localId));
    setMapObjects((current) => current.filter((item) => item.venueSectorLocalId !== localId));
    setTickets((current) => current.map((item) => item.venueSectorLocalId === localId ? { ...item, venueSectorLocalId: fallback?.localId || "" } : item));
  }

  function addMapObject(type: MapObjectType) {
    const sectorId = sectors[0]?.localId || "";
    const next = newMapObject(type, sectorId, mapObjects.length + 1);
    setMapObjects((current) => [...current, next]);
    setSelectedMapObjectId(next.localId);
  }

  function updateMapObject(localId: string, patch: Partial<MapObject>) {
    setMapObjects((current) => current.map((object) => object.localId === localId ? { ...object, ...patch } : object));
  }

  function removeMapObject(localId: string) {
    setMapObjects((current) => current.filter((object) => object.localId !== localId));
    if (selectedMapObjectId === localId) setSelectedMapObjectId("");
  }

  function mapPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * MAP_W,
      y: ((event.clientY - rect.top) / rect.height) * MAP_H,
    };
  }

  function startDrag(event: ReactPointerEvent<HTMLDivElement>, object: MapObject) {
    event.preventDefault();
    event.stopPropagation();
    const point = mapPoint(event);
    setSelectedMapObjectId(object.localId);
    setDragState({ objectId: object.localId, offsetX: point.x - object.x, offsetY: point.y - object.y });
  }

  function moveDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragState) return;
    const object = mapObjects.find((item) => item.localId === dragState.objectId);
    if (!object) return;
    const point = mapPoint(event);
    updateMapObject(object.localId, {
      x: Math.round(Math.max(0, Math.min(MAP_W - object.width, point.x - dragState.offsetX))),
      y: Math.round(Math.max(0, Math.min(MAP_H - object.height, point.y - dragState.offsetY))),
    });
  }

  function defaultTicketConfig(session: SessionItem, sector: SectorItem): TicketAutomationConfig {
    const groupCapacity = ticketGroupCapacityHelper(session, sector, generalCapacity);
    const saleLimit = toTicketSaleLimit(session, endDate);
    const salesStartAt = defaultSalesStartDay(saleLimit);
    const lotCount = String(toAutomaticLotCount(groupCapacity, salesStartAt, saleLimit));
    const lotQuantity = quantityPreviewLabel(groupCapacity, toSafeLotCount(lotCount));
    const intervalDays = String(toAutomaticLotIntervalDays(salesStartAt, saleLimit, toSafeLotCount(lotCount)));

    return {
      lotCount,
      lotQuantity,
      firstPrice: "100,00",
      priceStep: "20,00",
      intervalDays,
      maxPerOrder: ticketMaxPerOrder || "4",
      salesStartAt,
    };
  }

  function getTicketConfig(session: SessionItem, sector: SectorItem) {
    const key = ticketGroupKey(session.localId, sector.localId);
    const groupCapacity = ticketGroupCapacityHelper(session, sector, generalCapacity);
    const saleLimit = toTicketSaleLimit(session, endDate);
    const base = {
      ...defaultTicketConfig(session, sector),
      ...(ticketAutomationConfigs[key] || {}),
    };
    const salesStartAt = toClampedSaleStart(base.salesStartAt, saleLimit);
    const lotCount = String(toAutomaticLotCount(groupCapacity, salesStartAt, saleLimit));
    const intervalDays = String(toAutomaticLotIntervalDays(salesStartAt, saleLimit, toSafeLotCount(lotCount)));

    return {
      ...base,
      lotCount,
      lotQuantity: quantityPreviewLabel(groupCapacity, toSafeLotCount(lotCount)),
      intervalDays,
      maxPerOrder: ticketMaxPerOrder || "4",
      salesStartAt,
    };
  }

  function updateTicketConfig(session: SessionItem, sector: SectorItem, patch: Partial<TicketAutomationConfig>) {
    const key = ticketGroupKey(session.localId, sector.localId);
    const {
      intervalDays: _intervalDays,
      maxPerOrder: _maxPerOrder,
      lotQuantity: _lotQuantity,
      lotCount: _lotCount,
      ...editablePatch
    } = patch;

    setTicketAutomationConfigs((current) => {
      const groupCapacity = ticketGroupCapacityHelper(session, sector, generalCapacity);
      const saleLimit = toTicketSaleLimit(session, endDate);
      const base = {
        ...defaultTicketConfig(session, sector),
        ...current[key],
        ...editablePatch,
      };
      const salesStartAt = toClampedSaleStart(base.salesStartAt, saleLimit);
      const lotCount = String(toAutomaticLotCount(groupCapacity, salesStartAt, saleLimit));
      const intervalDays = String(toAutomaticLotIntervalDays(salesStartAt, saleLimit, toSafeLotCount(lotCount)));

      return {
        ...current,
        [key]: {
          ...base,
          lotCount,
          lotQuantity: quantityPreviewLabel(groupCapacity, toSafeLotCount(lotCount)),
          intervalDays,
          maxPerOrder: ticketMaxPerOrder || "4",
          salesStartAt,
        },
      };
    });
  }

  function addTicket() {
    const sessionId = sessions[0]?.localId || "";
    const sectorId = sectors[0]?.localId || "";
    const sector = sectors[0];
    setTickets((current) => [...current, newTicket(current.length, sessionId, sectorId, sector?.mode || preset.mode)]);
    setTicketBuilderStep("REVIEW");
  }

  function groupExistingKinds(session: SessionItem, sector: SectorItem) {
    const kindSet = new Set<TicketKind>();

    tickets.forEach((ticket) => {
      if (ticket.eventSessionLocalId !== session.localId) return;
      if (ticket.venueSectorLocalId !== sector.localId) return;
      kindSet.add(ticket.ticketKind || "INTEIRA");
    });

    return normalizeTicketKinds(Array.from(kindSet));
  }

  function ticketKindConfigKey(sessionId: string, sectorId: string, kind: TicketKind) {
    return `${ticketGroupKey(sessionId, sectorId)}::${kind}`;
  }

  function existingTicketsForKind(session: SessionItem, sector: SectorItem, kind: TicketKind) {
    return tickets
      .filter(
        (ticket) =>
          ticket.eventSessionLocalId === session.localId &&
          ticket.venueSectorLocalId === sector.localId &&
          ticket.ticketKind === kind,
      )
      .slice()
      .sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel));
  }

  function inferKindPriceConfigFromTickets(
    session: SessionItem,
    sector: SectorItem,
    kind: TicketKind,
    fallback: TicketAutomationConfig,
  ) {
    const kindTickets = existingTicketsForKind(session, sector, kind);
    const firstPrice = kindTickets[0]?.price || fallback.firstPrice;
    const firstPriceNumber = moneyNumber(firstPrice);
    const secondPriceNumber = kindTickets[1] ? moneyNumber(kindTickets[1].price) : undefined;
    const inferredStep =
      secondPriceNumber !== undefined
        ? Math.max(0, secondPriceNumber - firstPriceNumber)
        : moneyNumber(fallback.priceStep);

    return {
      firstPrice: moneyInputFromNumber(firstPriceNumber),
      priceStep: moneyInputFromNumber(inferredStep),
    };
  }

  function getTicketConfigForKind(
    session: SessionItem,
    sector: SectorItem,
    kind: TicketKind,
    fallback: TicketAutomationConfig,
    requestedKinds: TicketKind[],
  ) {
    const groupKey = ticketGroupKey(session.localId, sector.localId);
    const kindKey = ticketKindConfigKey(session.localId, sector.localId, kind);
    const savedKindConfig = ticketAutomationConfigs[kindKey];

    if (savedKindConfig?.firstPrice || savedKindConfig?.priceStep) {
      return {
        firstPrice: savedKindConfig.firstPrice || fallback.firstPrice,
        priceStep: savedKindConfig.priceStep || fallback.priceStep,
      };
    }

    const groupConfig = ticketAutomationConfigs[groupKey];

    if (requestedKinds.includes(kind)) {
      return {
        firstPrice: groupConfig?.firstPrice || fallback.firstPrice,
        priceStep: groupConfig?.priceStep || fallback.priceStep,
      };
    }

    return inferKindPriceConfigFromTickets(session, sector, kind, fallback);
  }

  function saveRequestedKindConfigs(
    session: SessionItem,
    sector: SectorItem,
    requestedKinds: TicketKind[],
  ) {
    const base = getTicketConfig(session, sector);

    setTicketAutomationConfigs((current) => {
      const next = { ...current };

      requestedKinds.forEach((kind) => {
        next[ticketKindConfigKey(session.localId, sector.localId, kind)] = {
          ...base,
          firstPrice: base.firstPrice,
          priceStep: base.priceStep,
        };
      });

      return next;
    });
  }

  function buildGeneratedTicketsForGroup(session: SessionItem, sector: SectorItem, kinds: TicketKind[], requestedKindsForCurrentPrice: TicketKind[] = []) {
    const cleanKinds = normalizeTicketKinds(kinds);
    const priceSourceKinds = normalizeTicketKinds(requestedKindsForCurrentPrice);
    const config = getTicketConfig(session, sector);
    const groupLimit = ticketGroupCapacityHelper(session, sector, generalCapacity);
    const sessionLimit = toTicketSaleLimit(session, endDate);
    const baseStart = toClampedSaleStart(config.salesStartAt || inputDateToday(), sessionLimit);
    const lotCount = toAutomaticLotCount(groupLimit, baseStart, sessionLimit);
    const intervalDays = toAutomaticLotIntervalDays(baseStart, sessionLimit, lotCount);
    const quantities = distributeGroupCapacityAcrossLots(groupLimit, lotCount, cleanKinds.length);
    const generated: TicketItem[] = [];

    if (groupLimit <= 0 || cleanKinds.length === 0) return generated;

    cleanKinds.forEach((kind, kindIndex) => {
      const kindConfig = getTicketConfigForKind(session, sector, kind, config, priceSourceKinds);
      const firstPrice = moneyNumber(kindConfig.firstPrice);
      const priceStep = moneyNumber(kindConfig.priceStep);

      for (let index = 0; index < lotCount; index += 1) {
        const quantityIndex = index * cleanKinds.length + kindIndex;
        const quantity = quantities[quantityIndex] || 0;

        if (quantity <= 0) continue;

        const lotLabel = `${index + 1}º Lote`;
        const lotStart = toLotStart(baseStart, index, intervalDays, sessionLimit);
        const lotEnd = toAutomaticLotEnd(baseStart, index, intervalDays, sessionLimit, lotCount);
        const price = moneyInputFromNumber(firstPrice + priceStep * index);

        generated.push({
          ...newTicket(kindIndex * lotCount + index, session.localId, sector.localId, sector.mode || preset.mode),
          ticketKind: kind,
          name: toTicketKindLabel(kind),
          lotLabel,
          description: toTicketKindDescription(kind),
          price,
          quantity: String(quantity),
          salesStartAt: lotStart,
          salesEndAt: lotEnd,
          maxPerOrder: toSafeMaxPerOrder(ticketMaxPerOrder || config.maxPerOrder),
          isHidden: false,
        });
      }
    });

    const generatedTotal = generated.reduce((sum, item) => sum + toNumber(item.quantity), 0);

    if (generatedTotal > groupLimit) {
      let overflow = generatedTotal - groupLimit;

      for (let index = generated.length - 1; index >= 0 && overflow > 0; index -= 1) {
        const currentQuantity = toNumber(generated[index].quantity);
        const remove = Math.min(currentQuantity, overflow);
        const nextQuantity = currentQuantity - remove;
        overflow -= remove;
        generated[index].quantity = String(nextQuantity);
      }

      return generated.filter((item) => toNumber(item.quantity) > 0);
    }

    return generated;
  }

  function generateTicketsForGroup(
    session: SessionItem,
    sector: SectorItem,
    kindsInput: TicketKind[] | TicketKind = ["INTEIRA"],
    options: { replaceGroup?: boolean } = {},
  ) {
    const requestedKinds = normalizeTicketKinds(Array.isArray(kindsInput) ? kindsInput : [kindsInput]);
    const activeKinds = options.replaceGroup
      ? requestedKinds
      : normalizeTicketKinds([...groupExistingKinds(session, sector), ...requestedKinds]);
    const generated = buildGeneratedTicketsForGroup(session, sector, activeKinds, requestedKinds);

    saveRequestedKindConfigs(session, sector, requestedKinds);

    setTickets((current) => [
      ...current.filter((item) => !(item.eventSessionLocalId === session.localId && item.venueSectorLocalId === sector.localId)),
      ...generated,
    ]);
    setExpandedTicketSessionId(session.localId);
    setExpandedTicketSectorKey(ticketGroupKey(session.localId, sector.localId));
    setTicketBuilderStep("CREATE");
  }

  function generateTicketsForAllGroups(
    kindsInput: TicketKind[] | TicketKind = ["INTEIRA"],
    options: { replaceGroup?: boolean } = {},
  ) {
    const requestedKinds = normalizeTicketKinds(Array.isArray(kindsInput) ? kindsInput : [kindsInput]);
    const groupKeysToRegenerate = new Set<string>();
    const generated: TicketItem[] = [];

    sessions.forEach((session) => {
      sectors.forEach((sector) => {
        const activeKinds = options.replaceGroup
          ? requestedKinds
          : normalizeTicketKinds([...groupExistingKinds(session, sector), ...requestedKinds]);

        groupKeysToRegenerate.add(ticketGroupKey(session.localId, sector.localId));
        generated.push(...buildGeneratedTicketsForGroup(session, sector, activeKinds, requestedKinds));
      });
    });

    setTicketAutomationConfigs((current) => {
      const next = { ...current };

      sessions.forEach((session) => {
        sectors.forEach((sector) => {
          const base = getTicketConfig(session, sector);

          requestedKinds.forEach((kind) => {
            next[ticketKindConfigKey(session.localId, sector.localId, kind)] = {
              ...base,
              firstPrice: base.firstPrice,
              priceStep: base.priceStep,
            };
          });
        });
      });

      return next;
    });

    setTickets((current) => [
      ...current.filter((item) => !groupKeysToRegenerate.has(ticketGroupKey(item.eventSessionLocalId, item.venueSectorLocalId))),
      ...generated,
    ]);
    setTicketBuilderStep("CREATE");
  }

  function updateTicket(localId: string, patch: Partial<TicketItem>) {
    setTickets((current) => current.map((item) => {
      if (item.localId !== localId) return item;
      const next = { ...item, ...patch };
      if (patch.price !== undefined) next.price = onlyMoney(patch.price);
      if (patch.quantity !== undefined) next.quantity = onlyDigits(patch.quantity);
      if (patch.maxPerOrder !== undefined) next.maxPerOrder = onlyDigits(patch.maxPerOrder);
      if (patch.venueSectorLocalId !== undefined) {
        const sector = sectors.find((sectorItem) => sectorItem.localId === patch.venueSectorLocalId);
        next.occupancyMode = sector?.mode || preset.mode;
      }
      if (patch.ticketKind !== undefined && (!patch.name || next.name === item.name)) {
        next.name = toTicketKindLabel(patch.ticketKind);
        next.description = next.description || toTicketKindDescription(patch.ticketKind);
      }
      return next;
    }));
  }

  function duplicateTicket(ticket: TicketItem) {
    setTickets((current) => [
      ...current,
      {
        ...ticket,
        localId: uid("ticket"),
        lotLabel: LOTS[Math.min(LOTS.length - 1, lotNumber(ticket.lotLabel))] || ticket.lotLabel,
      },
    ]);
  }

  function removeTicket(localId: string) {
    setTickets((current) => current.filter((item) => item.localId !== localId));
  }

  async function lookupCep(cepValue: string) {
    const cep = onlyDigits(cepValue);
    if (cep.length !== 8) return;
    setCepMessage("Consultando CEP...");

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = (await response.json()) as ViaCepResponse;
      if (!response.ok || data.erro) {
        setCepMessage("CEP não encontrado.");
        return;
      }
      setZipCode(data.cep || cep);
      setAddressLine1(data.logradouro || addressLine1);
      setNeighborhood(data.bairro || neighborhood);
      setCity(data.localidade || city);
      setState(data.uf || state);
      setAddressLine2(addressLine2 || data.complemento || "");
      setCepMessage("Endereço atualizado pelo CEP.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP agora.");
    }
  }

  function firstIncompleteStep() {
    const index = steps.findIndex((item) => item.id !== "review" && !completion[item.id]);
    return index === -1 ? steps.length - 1 : index;
  }

  function goToStep(index: number) {
    setStepIndex(index);
  }

  function nextStep() {
    setSubmitAttempted(true);
    const current = steps[stepIndex];
    if (!completion[current.id]) {
      alert(current.id === "sessions" ? sessionError : current.id === "sectors" ? sectorError : current.id === "tickets" ? ticketError : current.id === "map" ? "Gere ou ajuste o mapa para continuar." : "Revise os campos obrigatórios desta etapa.");
      return;
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function previousStep() {
    setStepIndex((value) => Math.max(value - 1, 0));
  }

  function buildPayload() {
    const mediaPayload = {
      coverImageUrl: normalizeUrl(coverImageUrl),
      bannerImageUrl: normalizeUrl(bannerImageUrl),
      thumbnailUrl: normalizeUrl(thumbnailUrl),
      mobileBannerUrl: normalizeUrl(mobileBannerUrl),
      sectorMapImageUrl: normalizeUrl(parseGallery(sectorPhotosText)[0] || sectorMapImageUrl),
      gallery: Array.from(new Set([...parseGallery(galleryText), ...parseGallery(sectorPhotosText)].map((url) => normalizeUrl(url)).filter(Boolean))),
    };

    return {
      organizerId,
      name: eventName.trim(),
      slug: textOrUndefined(slug),
      description: textOrUndefined(description),
      shortDescription: textOrUndefined(shortDescription),
      category,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      timezone: TIMEZONE,
      eventDate: isoEventStartOrUndefined(startDate) || new Date().toISOString(),
      startDate: isoEventStartOrUndefined(startDate),
      endDate: isoEventEndOrUndefined(endDate),
      capacity: intOrUndefined(capacity) || 1,
      occupancyMode: preset.mode,
      allowSeatMap: preset.allowSeatMap,
      allowTableMap: preset.allowTableMap,
      content: {
        headline: textOrUndefined(headline),
        summary: textOrUndefined(summary),
        fullDescription: textOrUndefined(fullDescription),
        attractions: textOrUndefined(summary),
        producerDescription: textOrUndefined(producerDescription),
      },
      location: {
        mode: isOnline ? "ONLINE" : "PRESENTIAL",
        venueName: textOrUndefined(venueName) || "Local a definir",
        addressLine1: textOrUndefined(addressLine1),
        addressLine2: textOrUndefined(addressLine2),
        neighborhood: textOrUndefined(neighborhood),
        city: textOrUndefined(city) || "A definir",
        state: textOrUndefined(state) || "SP",
        zipCode: textOrUndefined(zipCode),
        reference: textOrUndefined(reference),
        mapUrl: textOrUndefined(normalizeExternalUrl(mapUrl)),
        instructions: textOrUndefined(instructions),
        latitude: textOrUndefined(latitude),
        longitude: textOrUndefined(longitude),
      },
      media: mediaPayload,
      policy: {
        ageRating: textOrUndefined(ageRating),
        refundPolicy: refundEnabled ? textOrUndefined(refundPolicy) : undefined,
        halfEntryPolicy: textOrUndefined(halfEntryPolicy),
        transferPolicy: transferEnabled ? textOrUndefined(transferPolicy) : undefined,
        entryRules: textOrUndefined(entryRules),
        documentRules: textOrUndefined(documentRules),
        termsNotes: textOrUndefined(termsNotes),
      },
      sessions: sessions.map((session, index) => ({
        localId: session.localId,
        name: session.name || `Data ${index + 1}`,
        description: textOrUndefined(session.description),
        startsAt: isoEventStartOrUndefined(session.startsAt),
        endsAt: isoEventEndOrUndefined(session.endsAt),
        capacity: intOrUndefined(session.capacity),
        status: "ACTIVE",
        displayOrder: index,
      })),
      sectors: sectors.map((sector, index) => ({
        localId: sector.localId,
        name: sector.name,
        description: textOrUndefined(sector.description),
        type: sector.type,
        occupancyMode: sector.mode,
        capacity: intOrUndefined(sector.capacity),
        displayOrder: index,
        color: textOrUndefined(sector.color),
        gateName: textOrUndefined(sector.gateName),
      })),
      venueLayouts: mapObjects.length > 0 ? [{
        localId: "layout-main",
        name: "Mapa do evento",
        occupancyMode: preset.mode,
        width: MAP_W,
        height: MAP_H,
        isDefault: true,
        status: "ACTIVE",
        objects: mapObjects.map((object) => ({
          localId: object.localId,
          code: object.code,
          label: object.label,
          type: object.type === "SEAT" ? "SEAT" : object.type,
          capacity: intOrUndefined(object.capacity),
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
          rotation: object.rotation,
          status: object.status,
          venueSectorLocalId: textOrUndefined(object.venueSectorLocalId),
          metadata: object.metadata,
        })),
      }] : [],
      ticketTypes: tickets.map((ticket, index) => ({
        eventSessionLocalId: textOrUndefined(ticket.eventSessionLocalId),
        venueSectorLocalId: textOrUndefined(ticket.venueSectorLocalId),
        occupancyMode: sectors.find((sector) => sector.localId === ticket.venueSectorLocalId)?.mode || ticket.occupancyMode,
        name: `${TICKET_KIND_OPTIONS.find((item) => item.value === ticket.ticketKind)?.label || "Inteira"} - ${ticket.name} - ${ticket.lotLabel}`,
        lotLabel: textOrUndefined(ticket.lotLabel),
        description: textOrUndefined(ticket.description),
        price: moneyApi(ticket.price),
        quantity: intOrUndefined(ticket.quantity),
        salesStartAt: ticket.salesStartAt ? new Date(`${ticket.salesStartAt}T00:00`).toISOString() : undefined,
        salesEndAt: ticket.salesEndAt ? new Date(`${ticket.salesEndAt}T23:59`).toISOString() : undefined,
        maxPerOrder: intOrUndefined(ticketMaxPerOrder || ticket.maxPerOrder),
        displayOrder: index,
        isHidden: ticket.isHidden,
        status: "ACTIVE",
      })),
    };
  }

  async function handleSubmit(eventSubmit?: FormEvent) {
    eventSubmit?.preventDefault();
    setSubmitAttempted(true);

    const incomplete = firstIncompleteStep();
    if (incomplete !== steps.length - 1) {
      setStepIndex(incomplete);
      alert("Conclua as etapas obrigatórias antes de salvar.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setSaving(true);
    setError("");
    setSavedMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/events/${eventId}/full`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildPayload()),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof result?.message === "string" ? result.message : "Erro ao salvar evento.");
      }

      let updatedEvent =
        result && typeof result === "object" && "id" in result
          ? (result as EventDetails)
          : null;

      if (!updatedEvent) {
        const refreshResponse = await fetch(`${API_BASE_URL}/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const refreshResult = await refreshResponse.json().catch(() => null);

        if (!refreshResponse.ok || !refreshResult) {
          throw new Error("Evento salvo, mas não consegui recarregar os dados atualizados.");
        }

        updatedEvent = refreshResult as EventDetails;
      }

      applyEventToForm(updatedEvent);
      setSavedMessage("Evento salvo com sucesso.");
      setStepIndex(steps.length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao conectar com a API.");
    } finally {
      setSaving(false);
    }
  }

  const activeStep = steps[stepIndex];

  if (loading) {
    return <main className="mx-auto max-w-6xl px-4 py-8"><div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">Carregando evento para edição...</div></main>;
  }

  if (error && !eventName) {
    return <main className="mx-auto max-w-6xl px-4 py-8"><div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-8 text-rose-700 shadow-sm"><p className="text-xl font-black">Erro ao carregar evento</p><p className="mt-2 text-sm">{error}</p></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-950">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <section className="rounded-[2.2rem] bg-slate-950 p-6 text-white shadow-sm md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.34em] text-sky-300">Editar evento</p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">{eventName || "Evento"}</h1>
              <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">Tela clonada da criação em modo edição: mesmas etapas, mesmo mapa, mesmos setores e lotes, salvando no evento existente.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={`/admin/events/${eventId}`} className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/15">Voltar ao evento</Link>
              <Link href={`/events/${eventId}`} target="_blank" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Página pública</Link>
            </div>
          </div>
        </section>

        {savedMessage ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-black text-emerald-700">{savedMessage}</div> : null}
        {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-black text-rose-700">{error}</div> : null}

        <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[310px_1fr]">
          <aside className="h-fit rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-6">
            <div className="grid gap-2">
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const done = completion[step.id];
                return (
                  <button key={step.id} type="button" onClick={() => goToStep(index)} className={`rounded-2xl border p-4 text-left transition ${active ? "border-sky-400 bg-sky-50 ring-4 ring-sky-100" : done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${active ? "bg-sky-600 text-white" : done ? "bg-[#ff6900] text-white" : "bg-slate-100 text-slate-500"}`}>{index + 1}</span>
                      <div>
                        <p className="text-sm font-black text-slate-950">{step.title}</p>
                        <p className="text-xs font-semibold text-slate-500">{step.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-6">
            {activeStep.id === "type" ? (
              <StepShell
                eyebrow="Etapa 1"
                title="Tipo de evento"
                description="Categoria e modelo de ocupação foram definidos na criação do evento e ficam travados na edição para não reiniciar setores, mapa, assentos e ingressos."
              >
                <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-sm font-bold leading-6 text-amber-900">
                  Para mudar categoria ou modelo de ocupação depois do evento criado, o ideal é usar uma ação administrativa separada, com aviso de impacto. Isso evita apagar mapa, setores, assentos, mesas e lotes sem querer.
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {CATEGORIES.map((item) => {
                    const selected = category === item.value;

                    return (
                      <div
                        key={item.value}
                        className={`rounded-[1.6rem] border p-5 text-left transition ${
                          selected
                            ? "border-sky-500 bg-sky-50 ring-4 ring-sky-100"
                            : "border-slate-200 bg-slate-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black text-slate-950">{item.label}</p>
                            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>
                          </div>
                          {selected ? (
                            <span className="rounded-full bg-sky-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">
                              Atual
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {CATEGORY_PRESETS[category].map((key) => {
                    const item = PRESETS[key];
                    const selected = presetKey === key;

                    return (
                      <div
                        key={key}
                        className={`rounded-[1.6rem] border p-5 text-left transition ${
                          selected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-slate-200 bg-slate-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-black">{item.label}</p>
                            <p
                              className={`mt-2 text-sm font-semibold leading-6 ${
                                selected ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {item.description}
                            </p>
                          </div>
                          {selected ? (
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
                              Atual
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </StepShell>
            ) : null}

            {activeStep.id === "basic" ? (
              <StepShell eyebrow="Etapa 2" title="Dados principais" description="Identidade e capacidade geral do evento. Organizador e início geral ficam travados após a criação.">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Select label="Organizador" value={organizerId} onChange={setOrganizerId} disabled options={[{ label: "Selecione", value: "" }, ...organizers.map((organizer) => ({ label: organizer.tradeName || organizer.legalName || organizer.id, value: organizer.id }))]} />
                    <p className="mt-2 text-xs font-black text-slate-400">Organizador travado após a criação do evento.</p>
                  </div>
                  <Field label="Capacidade geral" value={capacity} onChange={handleCapacityChange} onlyNumbers required error={requiredErrors.basic && toNumber(capacity) <= 0} />
                  <div className="md:col-span-2"><Field label="Nome do evento" value={eventName} onChange={setEventName} required error={requiredErrors.basic && !eventName.trim()} /></div>
                  <Field label="Slug" value={slug} onChange={setSlug} placeholder="nome-do-evento" />
                  <Field label="Resumo curto" value={shortDescription} onChange={setShortDescription} />
                  <div className="md:col-span-2"><TextArea label="Descrição" value={description} onChange={setDescription} /></div>
                  <Field label="Início geral" type="datetime-local" value={startDate} onChange={setStartDate} disabled helper="Início geral travado após a criação do evento." />
                  <Field label="Fim geral" type="datetime-local" value={endDate} onChange={setEndDate} />
                </div>
              </StepShell>
            ) : null}

            {activeStep.id === "sessions" ? (
              <StepShell eyebrow="Etapa 3" title="Datas" description="Capacidade dividida automaticamente entre as datas. Os nomes, horários e capacidades continuam editáveis.">
                <div className="mb-4 grid gap-3 md:grid-cols-3"><MiniStat label="Capacidade geral" value={generalCapacity} /><MiniStat label="Capacidade datas" value={sessionTotal} /><MiniStat label="Datas" value={sessions.length} /></div>
                {sessionError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{sessionError}</div> : null}
                <div className="mb-5 flex flex-wrap gap-2 rounded-3xl border border-sky-100 bg-sky-50 p-4">
                  <button type="button" onClick={addSession} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">Adicionar data</button>
                  <button type="button" onClick={redistributeCurrentSessions} className="rounded-2xl border border-sky-200 bg-white px-5 py-3 text-sm font-black text-sky-700 hover:bg-sky-100">Redistribuir capacidade</button>
                  <button type="button" onClick={resetSessionTimeline} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-100">Recriar datas pelo início geral</button>
                  <p className="w-full text-xs font-bold leading-5 text-sky-800">A primeira data começa no início geral. Ao adicionar, a próxima data usa o dia seguinte da última data existente. A data final geral é o limite: o sistema não deixa passar dela. Você ainda pode editar nome, horários e capacidade.</p>
                </div>
                <div className="grid gap-4">
                  {sessions.map((session, index) => (
                    <div key={session.localId} className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black text-slate-950">Data {index + 1}</p><button type="button" onClick={() => removeSession(session.localId)} className="text-xs font-black text-rose-600">Remover</button></div>
                      <div className="grid gap-4 md:grid-cols-2"><Field label="Nome" value={session.name} onChange={(value) => updateSession(session.localId, { name: value })} /><Field label="Capacidade" value={session.capacity} onChange={(value) => updateSession(session.localId, { capacity: value })} onlyNumbers /><Field label="Início" type="datetime-local" value={session.startsAt} onChange={(value) => updateSession(session.localId, { startsAt: value })} /><Field label="Fim" type="datetime-local" value={session.endsAt} onChange={(value) => updateSession(session.localId, { endsAt: value })} /><div className="md:col-span-2"><TextArea label="Descrição da data" value={session.description} onChange={(value) => updateSession(session.localId, { description: value })} /></div></div>
                    </div>
                  ))}
                </div>
              </StepShell>
            ) : null}

            {activeStep.id === "media" ? (
              <StepShell eyebrow="Etapa 4" title="Imagens e políticas" description="Mídias e textos públicos, mantendo o fluxo da criação.">
                <div className="grid gap-4"><MediaField label="Capa" kind="cover" value={coverImageUrl} onChange={setCoverImageUrl} /><MediaField label="Banner" kind="banner" value={bannerImageUrl} onChange={setBannerImageUrl} /><MediaField label="Miniatura" kind="thumbnail" value={thumbnailUrl} onChange={setThumbnailUrl} /><MediaField label="Banner mobile" kind="mobile-banner" value={mobileBannerUrl} onChange={setMobileBannerUrl} /><MultiImageField label="Fotos dos setores" kind="sector-map" value={sectorPhotosText} onChange={setSectorPhotosText} helper="Substitui o antigo campo Mapa de setores. Aqui pode enviar várias fotos dos setores do evento." /></div>
                <div className="mt-8 grid gap-4 md:grid-cols-2"><Field label="Chamada" value={headline} onChange={setHeadline} /><Field label="Resumo" value={summary} onChange={setSummary} /><div className="md:col-span-2"><TextArea label="Descrição completa" value={fullDescription} onChange={setFullDescription} /></div><div className="md:col-span-2"><TextArea label="Descrição do produtor" value={producerDescription} onChange={setProducerDescription} disabled helper="Informação travada na edição para manter os dados do organizador/produtor consistentes." /></div><div className="md:col-span-2"><MultiImageField label="Galeria" kind="gallery" value={galleryText} onChange={setGalleryText} helper="Pode escolher várias imagens do computador ou colar URLs, uma por linha." /></div></div>
              </StepShell>
            ) : null}

            {activeStep.id === "sectors" ? (
              <StepShell eyebrow="Etapa 5" title="Setores / áreas" description="Setores ficam separados do mapa, como você pediu. Aqui define nome, cor, tipo e capacidade.">
                <div className="mb-4 grid gap-3 md:grid-cols-4"><MiniStat label="Capacidade geral" value={generalCapacity} /><MiniStat label="Capacidade por data" value={sectorDateLimit} /><MiniStat label="Capacidade setores" value={sectorTotal} /><MiniStat label="Setores" value={sectors.length} /></div>
                {sectorError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{sectorError}</div> : null}
                <div className="grid gap-4">
                  {sectors.map((sector, index) => (
                    <div key={sector.localId} className="rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between"><p className="text-lg font-black text-slate-950">Setor {index + 1}</p><button type="button" onClick={() => removeSector(sector.localId)} className="text-xs font-black text-rose-600">Remover</button></div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div><label className="mb-2 block text-sm font-black text-slate-700">Cor</label><input type="color" value={sector.color} onChange={(event) => updateSector(sector.localId, { color: event.target.value })} className="h-[52px] w-full rounded-2xl border border-slate-300 bg-white p-2" /></div>
                        <Field label="Nome" value={sector.name} onChange={(value) => updateSector(sector.localId, { name: value })} />
                        <Select label="Tipo" value={sector.kind} onChange={(value) => updateSector(sector.localId, { kind: value as SectorKind })} options={preset.sectorKinds.map((kind) => ({ label: KIND_LABEL[kind], value: kind }))} />
                        {sector.kind === "TABLES" ? (
                          <>
                            <Field label="Quantidade de mesas" value={sector.tableCount} onChange={(value) => updateSector(sector.localId, { tableCount: value })} onlyNumbers />
                            <Field label="Cadeiras por mesa" value={sector.seatsPerTable} onChange={(value) => updateSector(sector.localId, { seatsPerTable: value })} onlyNumbers />
                            <Field label="Capacidade calculada" value={sector.capacity} onChange={() => undefined} disabled helper="Mesas x cadeiras por mesa." />
                          </>
                        ) : null}
                        {sector.kind === "NUMBERED_SEATS" ? (
                          <>
                            <Field label="Quantidade de fileiras" value={sector.chairRows} onChange={(value) => updateSector(sector.localId, { chairRows: value })} onlyNumbers />
                            <Field label="Lugares por fileira" value={sector.chairsPerRow} onChange={(value) => updateSector(sector.localId, { chairsPerRow: value })} onlyNumbers />
                            <Field label="Capacidade calculada" value={sector.capacity} onChange={() => undefined} disabled helper="Fileiras x lugares por fileira." />
                          </>
                        ) : null}
                        {(sector.kind === "PLATEIA" || sector.kind === "OPEN_ADMISSION") ? (
                          <Field label="Capacidade do setor" value={sector.capacity} onChange={(value) => updateSector(sector.localId, { capacity: value })} onlyNumbers helper={`Limite por data: ${sectorDateLimit}`} />
                        ) : null}
                        <Field label="Portão" value={sector.gateName} onChange={(value) => updateSector(sector.localId, { gateName: value })} />
                        <div className="md:col-span-3"><Field label="Descrição" value={sector.description} onChange={(value) => updateSector(sector.localId, { description: value })} /></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">{preset.sectorKinds.map((kind) => <button key={kind} type="button" onClick={() => addSector(kind)} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">Adicionar {KIND_LABEL[kind]}</button>)}</div>
              </StepShell>
            ) : null}

            {activeStep.id === "map" ? (
              <StepShell
                eyebrow="Etapa 6"
                title="Mapa"
                description="Editor visual profissional: escolha um setor, desenhe com caneta, crie palco real, corredores e áreas bloqueadas."
              >
                <EventMapBuilder
                  sectors={sectors.map((sector) => ({
                    localId: sector.localId,
                    name: sector.name,
                    color: sector.color,
                    kind: sector.kind,
                    capacity: sector.capacity,
                    allowMultipleSpaces: false,
                  }))}
                  value={mapObjects as any}
                  onChange={(nextObjects) => setMapObjects(nextObjects as MapObject[])}
                  width={MAP_W}
                  height={MAP_H}
                />

                <div className="mt-5 rounded-3xl border border-sky-100 bg-sky-50 p-5 text-sm font-bold leading-6 text-sky-900">
                  <p className="font-black">Próximos objetos operacionais</p>
                  <p className="mt-1">
                    Depois que setores, palco e corredores estiverem redondos, vamos adicionar
                    bares, banheiros, entradas, saídas, emergência, credenciamento e outros pontos
                    operacionais do evento.
                  </p>
                </div>
              </StepShell>
            ) : null}

            {activeStep.id === "tickets" ? (
              <StepShell eyebrow="Etapa 7" title="Ingressos / lotes" description="Sistema automático e protegido: capacidade geral → datas → setores → tipos → lotes. A máquina decide lotes e quantidades sem permitir excedente.">
                <div className="mb-5 grid gap-3 md:grid-cols-4">
                  <MiniStat label="Capacidade geral" value={generalCapacity} />
                  <MiniStat label="Ingressos criados" value={ticketTotal} />
                  <MiniStat label="Lotes automáticos" value={tickets.length} />
                  <MiniStat label="Receita prevista" value={formatMoney(String(ticketRevenuePreview).replace(".", ","))} />
                </div>

                {ticketError ? <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{ticketError}</div> : null}

                <div className="mb-6 overflow-hidden rounded-[2rem] border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-sm">
                  <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">Gerador automático protegido</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">O sistema monta os lotes sozinho</h3>
                      <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
                        Para evitar venda acima da capacidade, a tela não deixa editar quantidade, data, setor ou máximo por pedido nos lotes. A divisão é feita automaticamente por data + setor + tipos ativos. Quando você adiciona Inteira, Meia ou Social, o sistema recalcula todos os lotes daquele setor/data para que a soma nunca passe do disponível. Você só informa o preço inicial e o aumento entre lotes.
                      </p>
                      <div className="mt-4 grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">1</p>
                          <p className="mt-1 text-sm font-black text-slate-900">Capacidade geral</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">2</p>
                          <p className="mt-1 text-sm font-black text-slate-900">Divide nas datas</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">3</p>
                          <p className="mt-1 text-sm font-black text-slate-900">Reserva por setor</p>
                        </div>
                        <div className="rounded-2xl border border-white bg-white/80 p-3 shadow-sm">
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">4</p>
                          <p className="mt-1 text-sm font-black text-slate-900">Define lotes e viradas</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-black text-slate-950">Criar tudo agora</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Adiciona/recalcula o tipo escolhido e redistribui a capacidade de cada data/setor. Use Recriar inteira + meia para deixar somente esses dois tipos.</p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => generateTicketsForAllGroups(["INTEIRA"])} className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-sky-700">+ Inteira</button>
                        <button type="button" onClick={() => generateTicketsForAllGroups(["MEIA"])} className="rounded-2xl border border-slate-300 px-4 py-3 text-xs font-black text-slate-700 hover:bg-slate-50">+ Meia</button>
                        <button type="button" onClick={() => generateTicketsForAllGroups(["SOCIAL"])} className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 hover:bg-emerald-100">+ Social</button>
                        <button type="button" onClick={() => generateTicketsForAllGroups(["INTEIRA", "MEIA"], { replaceGroup: true })} className="rounded-2xl bg-sky-600 px-4 py-3 text-xs font-black text-white hover:bg-sky-700">Recriar inteira + meia</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-5 flex gap-2 rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
                  <button type="button" onClick={() => setTicketBuilderStep("CREATE")} className={`rounded-2xl px-4 py-3 text-xs font-black ${ticketBuilderStep === "CREATE" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Gerador por data/setor</button>
                  <button type="button" onClick={() => setTicketBuilderStep("REVIEW")} className={`rounded-2xl px-4 py-3 text-xs font-black ${ticketBuilderStep === "REVIEW" ? "bg-sky-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>Resumo dos lotes</button>
                </div>

                {ticketBuilderStep === "CREATE" ? (
                  <div className="grid gap-5">
                    {sessions.map((session, sessionIndex) => {
                      const sessionOpen = expandedTicketSessionId === session.localId || (!expandedTicketSessionId && sessionIndex === 0);
                      const sessionTickets = tickets.filter((ticket) => ticket.eventSessionLocalId === session.localId);
                      const sessionTicketTotal = sessionTickets.reduce((sum, item) => sum + toNumber(item.quantity), 0);

                      return (
                        <div key={session.localId} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                          <button type="button" onClick={() => setExpandedTicketSessionId(sessionOpen ? "" : session.localId)} className="flex w-full flex-col justify-between gap-3 bg-slate-950 px-5 py-4 text-left text-white md:flex-row md:items-center">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">Data {sessionIndex + 1}</p>
                              <p className="mt-1 text-xl font-black">{session.name || datePreview(session.startsAt)}</p>
                              <p className="mt-1 text-xs font-semibold text-slate-300">{datePreview(session.startsAt)} • capacidade desta data {session.capacity || "0"}</p>
                            </div>
                            <div className="flex gap-2">
                              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">{sessionTickets.length} lote(s)</span>
                              <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">{sessionTicketTotal} ingresso(s)</span>
                            </div>
                          </button>

                          {sessionOpen ? (
                            <div className="grid gap-4 p-5">
                              {sectors.map((sector) => {
                                const groupKey = ticketGroupKey(session.localId, sector.localId);
                                const groupOpen = expandedTicketSectorKey === groupKey || (!expandedTicketSectorKey && sessionIndex === 0 && sectors[0]?.localId === sector.localId);
                                const groupTickets = tickets.filter((ticket) => ticket.eventSessionLocalId === session.localId && ticket.venueSectorLocalId === sector.localId);
                                const groupQuantity = ticketGroupTotals.get(groupKey) || 0;
                                const sectorLimit = sectorCapacityFromParts(sector);
                                const groupLimit = ticketGroupCapacityHelper(session, sector, generalCapacity);
                                const config = getTicketConfig(session, sector);
                                const saleLimit = toTicketSaleLimit(session, endDate);
                                const automaticLotCount = toAutomaticLotCount(groupLimit, config.salesStartAt, saleLimit);
                                const automaticInterval = toAutomaticLotIntervalDays(config.salesStartAt, saleLimit, automaticLotCount);
                                const automaticLotPreview = quantityPreviewLabel(groupLimit, automaticLotCount);

                                return (
                                  <div key={groupKey} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                      <button type="button" onClick={() => setExpandedTicketSectorKey(groupOpen ? "" : groupKey)} className="flex flex-1 items-start gap-3 text-left">
                                        <span className="mt-1 h-4 w-4 rounded-full shadow-sm" style={{ backgroundColor: sector.color }} />
                                        <div>
                                          <p className="text-lg font-black text-slate-950">{sector.name}</p>
                                          <p className="mt-1 text-xs font-semibold text-slate-500">{KIND_LABEL[sector.kind]} • reservado nesta data {groupLimit} • setor base {sectorLimit} • {groupQuantity} ingresso(s) criados</p>
                                        </div>
                                      </button>
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => generateTicketsForGroup(session, sector, ["INTEIRA"])} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">+ Inteira</button>
                                        <button type="button" onClick={() => generateTicketsForGroup(session, sector, ["MEIA"])} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">+ Meia</button>
                                        <button type="button" onClick={() => generateTicketsForGroup(session, sector, ["SOCIAL"])} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">+ Social</button>
                                        <button type="button" onClick={() => generateTicketsForGroup(session, sector, ["INTEIRA", "MEIA"], { replaceGroup: true })} className="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">Inteira + Meia</button>
                                      </div>
                                    </div>

                                    {groupOpen ? (
                                      <div className="mt-4 grid gap-4">
                                        <div className="grid gap-3 md:grid-cols-2">
                                          <Field label="Valor do 1º lote" value={config.firstPrice} onChange={(value) => updateTicketConfig(session, sector, { firstPrice: onlyMoney(value) })} money helper="Valor real do tipo gerado. A máquina cria quantidade e viradas automaticamente." />
                                          <Field label="Quanto sobe cada lote" value={config.priceStep} onChange={(value) => updateTicketConfig(session, sector, { priceStep: onlyMoney(value) })} money helper="A cada virada de lote, o preço aumenta este valor." />
                                        </div>

                                        <div className="grid gap-3 md:grid-cols-4">
                                          <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Lotes automáticos</p>
                                            <p className="mt-1 text-2xl font-black text-slate-950">{automaticLotCount}</p>
                                          </div>
                                          <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Quantidade por lote</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">{automaticLotPreview}</p>
                                          </div>
                                          <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Virada automática</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">a cada {automaticInterval} dia(s)</p>
                                          </div>
                                          <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Período de venda</p>
                                            <p className="mt-1 text-sm font-black text-slate-950">{datePreview(config.salesStartAt)} → {datePreview(saleLimit)}</p>
                                          </div>
                                        </div>

                                        {groupTickets.length > 0 ? (
                                          <div className="overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white">
                                            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                              <span>Lote</span>
                                              <span>Tipo</span>
                                              <span>Preço</span>
                                              <span>Qtd.</span>
                                            </div>
                                            {groupTickets
                                              .slice()
                                              .sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel) || a.ticketKind.localeCompare(b.ticketKind))
                                              .map((ticket) => (
                                                <div key={ticket.localId} className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700 last:border-b-0">
                                                  <span>{ticket.lotLabel}</span>
                                                  <span>{toTicketKindLabel(ticket.ticketKind)}</span>
                                                  <span>{formatMoney(ticket.price)}</span>
                                                  <span>{ticket.quantity}</span>
                                                </div>
                                              ))}
                                          </div>
                                        ) : (
                                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">Nenhum lote criado para esta data e setor. Informe os valores e clique em um dos botões do setor.</div>
                                        )}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {tickets.length === 0 ? (
                      <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                        <p className="text-lg font-black text-slate-900">Nenhum lote criado ainda.</p>
                        <p className="mt-2 text-sm font-semibold text-slate-500">Volte para o gerador e crie os lotes automaticamente.</p>
                        <button type="button" onClick={() => setTicketBuilderStep("CREATE")} className="mt-4 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">Criar lotes</button>
                      </div>
                    ) : (
                      sessions.map((session) => {
                        const sessionTickets = tickets.filter((ticket) => ticket.eventSessionLocalId === session.localId);

                        if (sessionTickets.length === 0) return null;

                        return (
                          <div key={`review-${session.localId}`} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                            <div className="bg-slate-950 px-5 py-4 text-white">
                              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Resumo</p>
                              <p className="mt-1 text-lg font-black">{session.name || datePreview(session.startsAt)}</p>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {sectors.map((sector) => {
                                const groupTickets = sessionTickets.filter((ticket) => ticket.venueSectorLocalId === sector.localId);

                                if (groupTickets.length === 0) return null;

                                return (
                                  <div key={`review-${session.localId}-${sector.localId}`} className="p-4">
                                    <p className="text-sm font-black text-slate-950">{sector.name}</p>
                                    <div className="mt-3 grid gap-2 md:grid-cols-3">
                                      {groupTickets
                                        .slice()
                                        .sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel) || a.ticketKind.localeCompare(b.ticketKind))
                                        .map((ticket) => (
                                          <div key={ticket.localId} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                            <p className="text-xs font-black text-slate-900">{toTicketKindLabel(ticket.ticketKind)} • {ticket.lotLabel}</p>
                                            <p className="mt-1 text-xs font-semibold text-slate-500">{ticket.quantity} ingresso(s) • {formatMoney(ticket.price)}</p>
                                            <p className="mt-1 text-[11px] font-semibold text-slate-400">{datePreview(ticket.salesStartAt)} até {datePreview(ticket.salesEndAt)}</p>
                                          </div>
                                        ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </StepShell>
            ) : null}

            {activeStep.id === "location" ? (
              <StepShell eyebrow="Etapa 8" title="Local e acesso" description="Endereço, CEP, mapa, latitude e longitude.">
                <div className="grid gap-4 md:grid-cols-2"><Field label="Nome do local" value={venueName} onChange={setVenueName} required error={requiredErrors.location && !venueName.trim()} /><Field label="CEP" value={zipCode} onChange={(value) => setZipCode(onlyDigits(value).slice(0, 8))} helper={cepMessage || "Ao sair do campo, buscamos no ViaCEP."} /><Field label="Cidade" value={city} onChange={setCity} /><Field label="Estado" value={state} onChange={(value) => setState(value.toUpperCase().slice(0, 2))} /><div className="md:col-span-2"><Field label="Endereço" value={addressLine1} onChange={setAddressLine1} /></div><Field label="Complemento" value={addressLine2} onChange={setAddressLine2} /><Field label="Bairro" value={neighborhood} onChange={setNeighborhood} /><div className="md:col-span-2"><Field label="Referência" value={reference} onChange={setReference} /></div><div className="md:col-span-2"><Field label="Link do mapa" value={mapUrl} onChange={setMapUrl} helper={mapUrl && !isMapUrl(mapUrl) ? "Cole um link válido do Google Maps, Waze ou OpenStreetMap." : undefined} /></div><Field label="Latitude" value={latitude} onChange={setLatitude} /><Field label="Longitude" value={longitude} onChange={setLongitude} /><div className="md:col-span-2"><TextArea label="Instruções de acesso" value={instructions} onChange={setInstructions} /></div></div>
              </StepShell>
            ) : null}

            {activeStep.id === "review" ? (
              <StepShell eyebrow="Etapa 9" title="Revisão" description="Confira o resumo e salve as alterações do evento inteiro.">
                <div className="grid gap-3 md:grid-cols-4"><MiniStat label="Capacidade" value={generalCapacity} /><MiniStat label="Datas" value={sessions.length} /><MiniStat label="Setores" value={sectors.length} /><MiniStat label="Lotes" value={tickets.length} /></div>
                <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5"><p className="text-xl font-black text-slate-950">{eventName}</p><p className="mt-2 text-sm font-semibold text-slate-500">{CATEGORIES.find((item) => item.value === category)?.label} • {preset.label}</p><p className="mt-2 text-sm font-semibold text-slate-500">{datePreview(startDate)} até {datePreview(endDate)}</p><p className="mt-2 text-sm font-semibold text-slate-500">{venueName}, {city} - {state}</p></div>
                <button type="submit" disabled={saving} className="mt-6 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Salvando alterações..." : "Salvar alterações do evento"}</button>
              </StepShell>
            ) : null}

            <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
              <button type="button" onClick={previousStep} disabled={stepIndex === 0} className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Voltar</button>
              <div className="text-center text-xs font-black uppercase tracking-[0.18em] text-slate-400">{activeStep.title}</div>
              {stepIndex < steps.length - 1 ? <button type="button" onClick={nextStep} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">Continuar</button> : <button type="submit" disabled={saving} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-60">{saving ? "Salvando..." : "Salvar"}</button>}
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
