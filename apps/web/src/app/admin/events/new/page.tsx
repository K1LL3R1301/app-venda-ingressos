"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
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

type OccupancyMode =
  | "GENERAL_ADMISSION"
  | "RESERVED_SEATING"
  | "RESERVED_TABLE"
  | "MIXED";

type SectorKind = "OPEN_ADMISSION" | "PLATEIA" | "NUMBERED_SEATS" | "TABLES";
type TicketKind = "INTEIRA" | "MEIA" | "SOCIAL";
type MapShape = "ROUNDED" | "RECTANGLE" | "PILL" | "CIRCLE" | "FREEFORM";
type ResizeDir = "nw" | "ne" | "sw" | "se";

type Organizer = {
  id: string;
  tradeName?: string;
  legalName?: string;
  email?: string;
  phone?: string;
  document?: string;
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

type MapPoint = { x: number; y: number };

type MapObject = {
  localId: string;
  venueSectorLocalId: string;
  code: string;
  label: string;
  type: "AREA" | "TABLE" | "STAGE";
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

type Interaction = {
  type: "move" | "resize" | "point";
  objectId: string;
  dir?: ResizeDir;
  pointIndex?: number;
  clientX: number;
  clientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startPointX?: number;
  startPointY?: number;
};

type StepId =
  | "type"
  | "basic"
  | "sessions"
  | "media"
  | "sectors"
  | "map"
  | "tickets"
  | "location"
  | "review";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

const MAP_W = 1280;
const MAP_H = 900;
const MAP_MIN = 54;
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

const SHAPES: Array<{ label: string; value: MapShape }> = [
  { label: "Retângulo", value: "RECTANGLE" },
  { label: "Arredondado", value: "ROUNDED" },
  { label: "Pílula", value: "PILL" },
  { label: "Círculo", value: "CIRCLE" },
  { label: "Quebrado", value: "FREEFORM" },
];

const LOTS = Array.from({ length: 20 }, (_, i) => `${i + 1}º Lote`);

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function onlyMoney(value: string) {
  const clean = value.replace(/[^\d,]/g, "");
  const parts = clean.split(",");
  return parts.length <= 1 ? clean : `${parts[0]},${parts.slice(1).join("").slice(0, 2)}`;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function positiveInt(value: string | undefined, fallback = 1) {
  const parsed = Number.parseInt(value || "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function positiveIntOrZero(value: string | undefined) {
  const parsed = Number.parseInt(value || "", 10);

  if (Number.isNaN(parsed) || parsed < 1) {
    return 0;
  }

  return parsed;
}

function cappedPassportReserve(sector: Pick<SectorItem, "capacity" | "passportEnabled" | "passportCapacity"> | undefined) {
  if (!sector?.passportEnabled) return 0;

  const sectorCapacity = positiveIntOrZero(sector.capacity);
  const requested = positiveIntOrZero(sector.passportCapacity);

  if (sectorCapacity <= 0 || requested <= 0) return 0;

  return Math.min(requested, sectorCapacity);
}

function moneyNumber(value: string) {
  const parsed = Number(value.replace(/\./g, "").replace(",", "."));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function moneyApi(value: string) {
  return moneyNumber(value).toFixed(2);
}

function intOrUndefined(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function textOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed || undefined;
}

function isoOrUndefined(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function getApiOrigin() {
  try {
    const url = new URL(API_BASE_URL);

    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
    }

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

      if (url.hostname === "localhost") {
        url.hostname = "127.0.0.1";
      }

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

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function urlOrUndefined(value: string | undefined) {
  const normalized = normalizeUrl(value);

  return isHttpUrl(normalized) ? normalized : undefined;
}

function normalizeExternalUrl(value: string | undefined) {
  if (!value) return "";

  const trimmed = value.trim();

  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (
    /^(www\.|google\.|maps\.app\.goo\.gl|goo\.gl|waze\.com|openstreetmap\.org|bing\.com)/i.test(
      trimmed,
    )
  ) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function isMapUrl(value: string) {
  const normalized = normalizeExternalUrl(value);

  try {
    const host = new URL(normalized).hostname.toLowerCase();
    return (
      host.includes("google.") ||
      host.includes("maps.app.goo.gl") ||
      host.includes("goo.gl") ||
      host.includes("waze.com") ||
      host.includes("openstreetmap.org") ||
      host.includes("bing.com")
    );
  } catch {
    return false;
  }
}

function inputDateNow() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function inputDateToday() {
  return inputDateNow().slice(0, 10);
}

function eventDayStart(value: string) {
  const day = inputDateDay(value);
  return day ? `${day}T00:00` : "";
}

function eventDayEnd(value: string) {
  const day = inputDateDay(value);
  return day ? `${day}T23:59` : "";
}

function isoEventStartOrUndefined(value: string) {
  if (!value) return undefined;
  const normalized = value.length === 10 ? eventDayStart(value) : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isoEventEndOrUndefined(value: string) {
  if (!value) return undefined;
  const normalized = value.length === 10 ? eventDayEnd(value) : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isoSalesStartOrUndefined(value: string) {
  const day = inputDateDay(value);
  return day ? new Date(`${day}T00:00`).toISOString() : undefined;
}

function isoSalesEndOrUndefined(value: string) {
  const day = inputDateDay(value);
  return day ? new Date(`${day}T23:59`).toISOString() : undefined;
}

function shiftInputDate(value: string, diffMs: number) {
  if (!value) return value;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  const next = new Date(date.getTime() + diffMs);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, isDateOnly ? 10 : 16);
}

function formatSessionName(value: string) {
  if (!value) return "Data sem início";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data sem início";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
}

function daysUntilEventLabel(value: string) {
  const day = inputDateDay(value);

  if (!day) return "Sem data";

  const today = new Date(`${inputDateToday()}T00:00`);
  const eventDay = new Date(`${day}T00:00`);

  if (Number.isNaN(eventDay.getTime())) return "Sem data";

  const diffDays = Math.ceil((eventDay.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Falta 1 dia";
  if (diffDays > 1) return `Faltam ${diffDays} dias`;
  if (diffDays === -1) return "Foi ontem";

  return `Passou há ${Math.abs(diffDays)} dias`;
}

function inputDateDay(value: string) {
  return value ? value.slice(0, 10) : "";
}

function sameInputDay(a: string, b: string) {
  return Boolean(inputDateDay(a) && inputDateDay(a) === inputDateDay(b));
}

function isDateTimeBetween(value: string, start: string, end: string) {
  if (!value || !start || !end) return true;
  const day = inputDateDay(value);
  const startDay = inputDateDay(start);
  const endDay = inputDateDay(end);
  if (!day || !startDay || !endDay) return true;
  return day >= startDay && day <= endDay;
}

function shiftInputDays(value: string, days: number) {
  return shiftInputDate(value, days * 24 * 60 * 60 * 1000);
}

function suggestLotEnd(startAt: string, limitAt: string, days = 30) {
  if (!startAt) return "";

  const suggested = shiftInputDays(startAt, days);

  if (limitAt && suggested > limitAt) {
    return limitAt;
  }

  return suggested;
}

function mergeDateAndTime(dateSource: string, timeSource: string, fallback = "23:59") {
  const day = dateSource.slice(0, 10);
  const time = timeSource.includes("T") ? timeSource.slice(11, 16) : fallback;
  return day ? `${day}T${time}` : timeSource;
}

function lotNumber(label: string) {
  const parsed = Number.parseInt(label.replace(/\D/g, ""), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseGallery(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
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

function newSession(index = 0): SessionItem {
  return {
    localId: id("session"),
    name: index === 0 ? "Data sem início" : `Data ${index + 1}`,
    startsAt: "",
    endsAt: "",
    capacity: "",
    description: "",
  };
}

function newSector(category: Category, preset: OccupancyPreset, index = 0, forceKind?: SectorKind): SectorItem {
  const kind = forceKind || preset.defaultKind;
  const name = index === 0 ? KIND_LABEL[kind] : `${KIND_LABEL[kind]} ${index + 1}`;
  const chairRows = kind === "NUMBERED_SEATS" ? "10" : "";
  const chairsPerRow = kind === "NUMBERED_SEATS" ? "10" : "";
  const tableCount = kind === "TABLES" ? "20" : "";
  const seatsPerTable = kind === "TABLES" ? "4" : "";
  const capacity =
    kind === "NUMBERED_SEATS"
      ? String(positiveInt(chairRows) * positiveInt(chairsPerRow))
      : kind === "TABLES"
        ? String(positiveInt(tableCount) * positiveInt(seatsPerTable))
        : "";

  return {
    localId: id("sector"),
    name,
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
    localId: id("ticket"),
    eventSessionLocalId: sessionId,
    venueSectorLocalId: sectorId,
    occupancyMode: mode,
    ticketKind: "INTEIRA",
    name: "Inteira",
    lotLabel: "1º Lote",
    description: "",
    price: "",
    quantity: "100",
    salesStartAt: "",
    salesEndAt: "",
    maxPerOrder: "",
    isHidden: false,
  };
}

function datePreview(value: string) {
  if (!value) return "A definir";
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00` : value);
  if (Number.isNaN(date.getTime())) return "A definir";
  if (isDateOnly) {
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fieldClass(error = false) {
  return `h-[52px] w-full rounded-2xl border bg-white px-4 text-sm outline-none transition ${
    error ? "border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100" : "border-slate-300 focus:ring-4 focus:ring-sky-100"
  }`;
}

function textareaClass(error = false) {
  return `min-h-[120px] w-full rounded-2xl border bg-white p-4 text-sm outline-none transition ${
    error ? "border-rose-400 bg-rose-50 focus:ring-4 focus:ring-rose-100" : "border-slate-300 focus:ring-4 focus:ring-sky-100"
  }`;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  helper,
  disabled,
  onlyNumbers,
  money,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helper?: string;
  disabled?: boolean;
  onlyNumbers?: boolean;
  money?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>
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
        className={`${fieldClass(error)} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
      />
      {helper ? <p className={`mt-2 text-xs font-semibold ${error ? "text-rose-600" : "text-slate-500"}`}>{helper}</p> : null}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
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
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">{label}</label>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${fieldClass()} ${disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
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

function MediaField({
  label,
  value,
  kind,
  required,
  error,
  onChange,
}: {
  label: string;
  value: string;
  kind: string;
  required?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const url = normalizeUrl(value) || value;
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);

  async function upload(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      alert("Envie apenas imagem ou vídeo.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      alert("Sua sessão expirou. Faça login novamente.");
      window.location.href = "/login";
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("kind", kind);
    setUploading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/uploads/event-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          alert("Sua sessão expirou. Faça login novamente.");
          window.location.href = "/login";
          return;
        }
        alert(typeof result?.message === "string" ? result.message : "Erro ao enviar arquivo.");
        return;
      }
      const uploaded = result?.url || result?.publicUrl || result?.path || result?.fileUrl;
      if (!uploaded) {
        alert("Upload concluído, mas a API não retornou URL.");
        return;
      }
      onChange(normalizeUrl(uploaded) || uploaded);
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com a API de upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={`rounded-[1.75rem] border p-5 ${error ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"}`}>
      <div className="flex justify-between gap-3">
        <label className="text-sm font-black text-slate-900">
          {label}
          {required ? <span className="text-rose-600"> *</span> : null}
        </label>
        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${value ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {value ? "Enviado" : "Pendente"}
        </span>
      </div>
      <input
        type="file"
        accept="image/*,video/*"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 text-sm file:mr-4 file:h-[48px] file:border-0 file:bg-slate-950 file:px-5 file:text-sm file:font-black file:text-white"
      />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ou cole uma URL" className={`${fieldClass(error)} mt-3`} />
      {uploading ? <p className="mt-2 text-xs font-black text-sky-600">Enviando...</p> : null}
      {value ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {isVideo ? <video src={url} className="h-40 w-full object-cover" controls /> : <img src={url} alt={label} className="h-40 w-full object-cover" />}
          <button type="button" onClick={() => onChange("")} className="w-full px-4 py-3 text-xs font-black text-rose-600 hover:bg-rose-50">
            Remover arquivo
          </button>
        </div>
      ) : null}
    </div>
  );
}


function GalleryUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const items = parseGallery(value);

  function isVideo(url: string) {
    return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  }

  function removeItem(itemToRemove: string) {
    onChange(items.filter((item) => item !== itemToRemove).join("\n"));
  }

  async function uploadOne(file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      throw new Error("A galeria aceita apenas imagem ou vídeo.");
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      throw new Error("Sua sessão expirou. Faça login novamente.");
    }

    const data = new FormData();
    data.append("file", file);
    data.append("kind", "gallery");

    const response = await fetch(`${API_BASE_URL}/uploads/event-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(typeof result?.message === "string" ? result.message : "Erro ao enviar arquivo da galeria.");
    }

    const uploaded = result?.url || result?.publicUrl || result?.path || result?.fileUrl;
    if (!uploaded) throw new Error("Upload concluído, mas a API não retornou URL.");

    return normalizeUrl(uploaded) || uploaded;
  }

  async function uploadMany(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const uploadedUrl = await uploadOne(file);
        if (uploadedUrl) uploadedUrls.push(uploadedUrl);
      }
      onChange([...items, ...uploadedUrls].join("\n"));
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Erro ao enviar galeria.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        <div>
          <label className="block text-sm font-black text-slate-900">Galeria</label>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            Escolha vários arquivos de imagem ou vídeo. Cada arquivo entra como um item da galeria.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {items.length} arquivo(s)
        </span>
      </div>

      <input
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={uploading}
        onChange={(event) => void uploadMany(event.target.files)}
        className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 text-sm file:mr-4 file:h-[48px] file:border-0 file:bg-slate-950 file:px-5 file:text-sm file:font-black file:text-white hover:file:bg-sky-700"
      />

      {uploading ? <p className="mt-3 text-xs font-black text-sky-600">Enviando arquivos da galeria...</p> : null}

      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ou cole uma URL por linha." className={`${textareaClass()} mt-4`} />

      {items.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {items.map((item) => {
            const url = normalizeUrl(item) || item;
            return (
              <div key={item} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {isVideo(url) ? <video src={url} className="h-28 w-full object-cover" controls /> : <img src={url} alt="Arquivo da galeria" className="h-28 w-full object-cover" />}
                <button type="button" onClick={() => removeItem(item)} className="w-full bg-white px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50">
                  Remover
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function clampTicketsForCapacity(
  sourceTickets: TicketItem[],
  sessions: SessionItem[],
  sectors: SectorItem[],
  eventCapacityValue: string,
  isOpenOnly: boolean,
) {
  const eventCapacity = Math.max(0, toNumber(eventCapacityValue));
  const fallbackSession = sessions[0]?.localId || "default-session";
  const fallbackSector = isOpenOnly ? "" : sectors[0]?.localId || "default-sector";
  const sessionCapacityById = new Map(
    sessions.map((session) => [
      session.localId,
      positiveIntOrZero(session.capacity) || eventCapacity,
    ]),
  );
  const sectorCapacityById = new Map(
    sectors.map((sector) => [
      isOpenOnly ? "" : sector.localId,
      positiveIntOrZero(sector.capacity) || eventCapacity,
    ]),
  );
  const groupUsed = new Map<string, number>();
  const sessionUsed = new Map<string, number>();
  const sanitized: TicketItem[] = [];

  const ordered = [...sourceTickets]
    .filter((ticket) => ticket.name.trim() && ticket.price.trim() && toNumber(ticket.quantity) > 0)
    .sort((a, b) => {
      const sessionCompare = String(a.eventSessionLocalId || "").localeCompare(String(b.eventSessionLocalId || ""));
      if (sessionCompare !== 0) return sessionCompare;
      const sectorCompare = String(a.venueSectorLocalId || "").localeCompare(String(b.venueSectorLocalId || ""));
      if (sectorCompare !== 0) return sectorCompare;
      const lotCompare = lotNumber(a.lotLabel) - lotNumber(b.lotLabel);
      if (lotCompare !== 0) return lotCompare;
      return TICKET_KIND_OPTIONS.findIndex((item) => item.value === a.ticketKind) - TICKET_KIND_OPTIONS.findIndex((item) => item.value === b.ticketKind);
    });

  for (const ticket of ordered) {
    const sectorKey = isOpenOnly ? "" : ticket.venueSectorLocalId || fallbackSector;
    const sectorLimit = sectorCapacityById.get(sectorKey) || eventCapacity;
    const sessionKeys = ticket.eventSessionLocalId
      ? [ticket.eventSessionLocalId]
      : sessions.map((session) => session.localId).filter(Boolean);
    const effectiveSessionKeys = sessionKeys.length ? sessionKeys : [fallbackSession];

    const possibleQuantity = effectiveSessionKeys.reduce((min, sessionKey) => {
      const sessionLimit = sessionCapacityById.get(sessionKey) || eventCapacity;
      const groupLimit = Math.max(0, Math.min(sessionLimit, sectorLimit));
      const groupKey = `${sessionKey}::${sectorKey}`;
      const groupRemaining = groupLimit - (groupUsed.get(groupKey) || 0);
      const sessionRemaining = sessionLimit - (sessionUsed.get(sessionKey) || 0);
      return Math.min(min, groupRemaining, sessionRemaining);
    }, toNumber(ticket.quantity));

    const nextQuantity = Math.max(0, Math.min(toNumber(ticket.quantity), possibleQuantity));

    if (nextQuantity <= 0) continue;

    for (const sessionKey of effectiveSessionKeys) {
      const groupKey = `${sessionKey}::${sectorKey}`;
      groupUsed.set(groupKey, (groupUsed.get(groupKey) || 0) + nextQuantity);
      sessionUsed.set(sessionKey, (sessionUsed.get(sessionKey) || 0) + nextQuantity);
    }

    sanitized.push({
      ...ticket,
      quantity: String(Math.floor(nextQuantity)),
      eventSessionLocalId: ticket.eventSessionLocalId || effectiveSessionKeys[0] || fallbackSession,
      venueSectorLocalId: sectorKey,
    });
  }

  return sanitized;
}
export default function NewEventPage() {
  // v60b-admin-create-event-guard
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem("user");
      const storedUser = rawUser ? JSON.parse(rawUser) : null;
      const role = String(storedUser?.role || "").toUpperCase();

      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        window.location.replace("/support/admin-request");
      }
    } catch {
      window.location.replace("/support/admin-request");
    }
  }, []);

  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

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
  const [sectors, setSectors] = useState<SectorItem[]>([newSector("FESTAS_SHOWS", PRESETS.PLATEIA, 0)]);
  const [mapObjects, setMapObjects] = useState<MapObject[]>([]);
  const [selectedMapObjectId, setSelectedMapObjectId] = useState("");
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [tableSaleMode, setTableSaleMode] = useState<"WHOLE_TABLE" | "BY_SEAT">("WHOLE_TABLE");
  const [tableCount, setTableCount] = useState("20");
  const [seatsPerTable, setSeatsPerTable] = useState("4");

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [ticketBuilderStep, setTicketBuilderStep] = useState<"CREATE" | "PASSPORT" | "REVIEW">("CREATE");
  const [ticketMaxPerOrder, setTicketMaxPerOrder] = useState("");
  const [ticketLotIntervalDays, setTicketLotIntervalDays] = useState("20");
  const [expandedTicketSessionId, setExpandedTicketSessionId] = useState("");
  const [expandedTicketSectorKey, setExpandedTicketSectorKey] = useState("");
  const [ticketAutomationConfigs, setTicketAutomationConfigs] = useState<Record<string, TicketAutomationConfig>>({});
  const [mode, setMode] = useState("PRESENTIAL");
  const [venueName, setVenueName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [reference, setReference] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [resolvingMapUrl, setResolvingMapUrl] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [instructions, setInstructions] = useState("");

  const selectedOrganizer = useMemo(() => organizers.find((item) => item.id === organizerId) || null, [organizers, organizerId]);
  const generalCapacity = toNumber(capacity);
  const sectorTotal = useMemo(() => sectors.reduce((sum, item) => sum + toNumber(item.capacity), 0), [sectors]);
  const sessionTotal = useMemo(() => sessions.reduce((sum, item) => sum + toNumber(item.capacity), 0), [sessions]);
  const gallery = useMemo(() => parseGallery(galleryText), [galleryText]);
  const isOnline = mode === "ONLINE";
  const isOpenOnly = presetKey === "OPEN";
  const today = inputDateNow();

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("token");
      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/organizers`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (!response.ok) {
          alert(typeof result?.message === "string" ? result.message : "Erro ao carregar produtoras.");
          return;
        }
        const list = Array.isArray(result) ? result : [];
        setOrganizers(list);
        if (list[0]) {
          setOrganizerId(list[0].id);
          setProducerDescription([list[0].tradeName || list[0].legalName, list[0].email, list[0].phone, list[0].document].filter(Boolean).join(" • "));
        }
      } catch (error) {
        console.error(error);
        alert("Erro ao conectar com a API.");
      } finally {
        setLoadingOrganizers(false);
      }
    }

    void load();
  }, []);

  const mediaError = useMemo(() => {
    const cover = urlOrUndefined(coverImageUrl);
    const banner = urlOrUndefined(bannerImageUrl);
    const thumb = urlOrUndefined(thumbnailUrl);
    const mobile = urlOrUndefined(mobileBannerUrl);
    if (!cover) return "A capa é obrigatória.";
    if (!banner) return "O banner é obrigatório.";
    if (!thumb) return "A thumbnail é obrigatória.";
    if (!mobile) return "O banner mobile é obrigatório.";
    if (!isHttpUrl(cover)) return "A capa precisa ser uma URL válida.";
    if (!isHttpUrl(banner)) return "O banner precisa ser uma URL válida.";
    if (!isHttpUrl(thumb)) return "A thumbnail precisa ser uma URL válida.";
    if (!isHttpUrl(mobile)) return "O banner mobile precisa ser uma URL válida.";
    return "";
  }, [coverImageUrl, bannerImageUrl, thumbnailUrl, mobileBannerUrl]);

  const sessionError = useMemo(() => {
    if (!startDate) return "O início geral é obrigatório.";
    if (!endDate) return "O fim geral é obrigatório.";
    if (endDate < startDate) return "O fim geral não pode ser antes do início geral.";
    if (sessions.some((item) => !item.startsAt || !item.endsAt || toNumber(item.capacity) <= 0)) return "Todas as datas precisam ter início, fim e capacidade.";
    if (sessions.some((item) => item.endsAt < item.startsAt)) return "Nenhuma data pode terminar antes do início.";
    if (sessions.some((item) => !isDateTimeBetween(item.startsAt, startDate, endDate) || !isDateTimeBetween(item.endsAt, startDate, endDate))) return "Todas as datas devem ficar entre o início geral e o fim geral.";
    const days = sessions.map((item) => inputDateDay(item.startsAt)).filter(Boolean);
    if (new Set(days).size !== days.length) return "Não pode existir duas datas no mesmo dia.";
    if (sessions.some((item) => toNumber(item.capacity) > generalCapacity)) return "A capacidade de uma data não pode ultrapassar a capacidade geral.";
    if (sessionTotal > generalCapacity) return "A soma das capacidades das datas não pode ultrapassar a capacidade geral.";
    if (sessions.some((item, index) => index > 0 && item.startsAt < sessions[index - 1].startsAt)) return "A data 2 e as próximas não podem começar antes da data anterior.";
    return "";
  }, [startDate, endDate, sessions, generalCapacity, sessionTotal]);

  const sectorError = useMemo(() => {
    if (sectors.some((item) => toNumber(item.capacity) <= 0)) return "A capacidade de cada setor é obrigatória.";
    if (sectors.some((item) => toNumber(item.capacity) > generalCapacity)) return "Nenhum setor pode ultrapassar a capacidade geral.";
    if (sectors.some((item) => item.passportEnabled && toNumber(item.passportCapacity) <= 0)) return "Todo setor marcado para passaporte precisa informar a quantidade reservada.";
    if (sectors.some((item) => item.passportEnabled && toNumber(item.passportCapacity) > toNumber(item.capacity))) return "A reserva de passaporte não pode ultrapassar a capacidade do setor.";
    if (sectorTotal > generalCapacity) return "A soma dos setores não pode ultrapassar a capacidade geral.";
    if (new Set(sectors.map((item) => item.color)).size !== sectors.length) return "Cada setor precisa ter uma cor diferente.";
    return "";
  }, [sectors, generalCapacity, sectorTotal]);

  const ticketError = useMemo(() => {
    if (tickets.length === 0) {
      return "Crie pelo menos um lote para cada data e setor.";
    }

    const normalizedSectorIds = sectors.map((sector) => (isOpenOnly ? "" : sector.localId));

    for (const session of sessions) {
      for (const sectorId of normalizedSectorIds) {
        const hasRequiredLot = tickets.some((ticket) => {
          return (
            ticket.eventSessionLocalId === session.localId &&
            ticket.venueSectorLocalId === sectorId &&
            ticket.name.trim() &&
            ticket.price.trim() &&
            toNumber(ticket.quantity) > 0
          );
        });

        if (!hasRequiredLot) {
          return "Todos os setores definidos precisam ter pelo menos um lote em cada data. O passaporte é opcional e não substitui o lote da data.";
        }
      }
    }

    for (const ticket of tickets) {
      if (!ticket.name.trim()) return "Todo lote precisa ter nome.";
      if (!ticket.price.trim()) return "Todo lote precisa ter preço.";
      if (moneyNumber(ticket.price) < 0) return "O preço do lote não pode ser negativo.";
      if (toNumber(ticket.quantity) <= 0) return "Todo lote precisa ter quantidade maior que zero.";
      if (!ticket.salesStartAt) return "Todo lote precisa ter início das vendas.";
      if (!ticket.salesEndAt) return "Todo lote precisa ter fim das vendas.";
      const todayDay = inputDateToday();
      if (inputDateDay(ticket.salesStartAt) < todayDay) return "O início das vendas não pode ser antes de hoje.";
      if (inputDateDay(ticket.salesEndAt) < inputDateDay(ticket.salesStartAt)) return "O fim das vendas precisa ser igual ou depois do início.";

      const session = sessions.find((item) => item.localId === ticket.eventSessionLocalId);
      const isPassport = !ticket.eventSessionLocalId;

      if (!isPassport && session?.startsAt && inputDateDay(ticket.salesEndAt) > inputDateDay(session.startsAt)) {
        return "O fim das vendas do lote não pode passar do dia da sessão.";
      }

      if (isPassport) {
        const firstSessionStart = sessions
          .map((item) => item.startsAt)
          .filter(Boolean)
          .sort()[0];

        if (firstSessionStart && inputDateDay(ticket.salesEndAt) > inputDateDay(firstSessionStart)) {
          return "O fim das vendas do passaporte não pode passar do dia da primeira sessão.";
        }
      }

      const currentLot = lotNumber(ticket.lotLabel);

      if (currentLot > 1) {
        const previousLots = tickets.filter((other) => {
          return (
            other.localId !== ticket.localId &&
            other.venueSectorLocalId === ticket.venueSectorLocalId &&
            other.eventSessionLocalId === ticket.eventSessionLocalId &&
            other.ticketKind === ticket.ticketKind &&
            lotNumber(other.lotLabel) < currentLot
          );
        });

        if (previousLots.length === 0) {
          return "Não pode existir lote posterior sem lote anterior do mesmo setor, data e tipo.";
        }

        const maxPreviousPrice = previousLots.reduce((max, item) => Math.max(max, moneyNumber(item.price)), 0);

        if (maxPreviousPrice > 0 && moneyNumber(ticket.price) < maxPreviousPrice) {
          return "Lote posterior não pode ser mais barato que lote anterior do mesmo setor, data e tipo.";
        }
      }
    }

    for (const session of sessions) {
      for (const sector of sectors) {
        const sectorId = isOpenOnly ? "" : sector.localId;
        const sessionCapacity = positiveIntOrZero(session.capacity || capacity);
        const sectorCapacity = positiveIntOrZero(sector.capacity || capacity);
        const totalAvailable = Math.min(sessionCapacity, sectorCapacity);
        const totalCreated = tickets
          .filter((ticket) => {
            return (
              ticket.venueSectorLocalId === sectorId &&
              (ticket.eventSessionLocalId === session.localId || ticket.eventSessionLocalId === "")
            );
          })
          .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);

        if (totalCreated > totalAvailable) {
          return "A soma dos lotes da data, incluindo passaporte, não pode ultrapassar a capacidade disponível do setor.";
        }
      }
    }

    return "";
  }, [tickets, today, sessions, sectors, capacity, generalCapacity, isOpenOnly]);

  const steps: Array<{ id: StepId; title: string; description: string }> = [
    { id: "type", title: "Tipo de evento", description: "Categoria e ocupação." },
    { id: "basic", title: "Dados principais", description: "Nome e capacidade." },
    { id: "sessions", title: "Datas", description: "Datas e capacidades." },
    { id: "media", title: "Imagens e políticas", description: "Mídias e regras." },
    { id: "sectors", title: "Setores / áreas", description: "Setores." },
    { id: "map", title: "Mapa", description: "Editor visual." },
    { id: "tickets", title: "Ingressos / lotes", description: "Preços e vendas." },
    { id: "location", title: "Local e acesso", description: "Endereço." },
    { id: "review", title: "Revisão", description: "Salvar." },
  ];

  const completion: Record<StepId, boolean> = {
    type: Boolean(category && presetKey),
    basic: Boolean(organizerId && eventName.trim() && generalCapacity > 0),
    sessions: !sessionError,
    media: !mediaError,
    sectors: !sectorError,
    map: mapObjects.length > 0,
    tickets: tickets.some((item) => item.name.trim() && item.price.trim() && toNumber(item.quantity) > 0) && !ticketError,
    location: isOnline ? Boolean(venueName.trim()) : Boolean(venueName.trim() && zipCode.trim() && reference.trim() && isMapUrl(mapUrl) && latitude.trim() && longitude.trim()),
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

  function firstIncompleteStep() {
    const index = steps.findIndex((item) => item.id !== "review" && !completion[item.id]);
    return index === -1 ? steps.length - 1 : index;
  }

  function goToStep(index: number) {
    for (let i = 0; i < index; i += 1) {
      if (!completion[steps[i].id]) {
        alert("Conclua as etapas anteriores para liberar esta etapa.");
        return;
      }
    }
    setStepIndex(index);
  }

  function nextStep() {
    setSubmitAttempted(true);
    const current = steps[stepIndex];
    if (!completion[current.id]) {
      alert(
        current.id === "sessions"
          ? sessionError
          : current.id === "media"
            ? mediaError
            : current.id === "sectors"
              ? sectorError
              : current.id === "tickets"
                ? ticketError || "Cadastre pelo menos um ingresso válido."
                : current.id === "map"
                  ? "Gere o mapa para continuar."
                  : "Revise os campos obrigatórios desta etapa.",
      );
      return;
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function previousStep() {
    setStepIndex((value) => Math.max(value - 1, 0));
  }

  function splitCapacityByIndex(totalCapacity: number, count: number, index: number) {
    if (count <= 0) return 0;

    const safeTotal = Math.max(totalCapacity, 0);
    const base = Math.floor(safeTotal / count);
    const remainder = safeTotal % count;

    return base + (index < remainder ? 1 : 0);
  }

  function rebalanceSessionCapacities(items: SessionItem[], totalValue = capacity) {
    const total = toNumber(totalValue);

    return items.map((item, index) => ({
      ...item,
      capacity: String(splitCapacityByIndex(total, items.length, index)),
    }));
  }

  function setEventCapacity(value: string) {
    const nextValue = onlyDigits(value);
    setCapacity(nextValue);
    setSessions((current) => rebalanceSessionCapacities(current, nextValue));
  }

  function clampSessionInsideGeneral(session: SessionItem, fallbackIndex = 0): SessionItem {
    let startsAt = session.startsAt || startDate;
    let endsAt = session.endsAt || endDate || startsAt;

    if (startDate && startsAt < startDate) startsAt = startDate;
    if (endDate && startsAt > endDate) startsAt = endDate;
    if (startDate && endsAt < startDate) endsAt = startDate;
    if (endDate && endsAt > endDate) endsAt = endDate;
    if (startsAt && endsAt && endsAt < startsAt) endsAt = startsAt;

    return {
      ...session,
      startsAt,
      endsAt,
      name: session.name?.trim() || (startsAt ? formatSessionName(startsAt) : `Data ${fallbackIndex + 1}`),
      capacity: onlyDigits(session.capacity || capacity),
    };
  }

  function setGeneralStart(value: string) {
    const old = startDate;
    const hasOld = Boolean(old);
    const diff = hasOld ? new Date(value).getTime() - new Date(old).getTime() : 0;
    setStartDate(value);
    setEndDate((current) => (current ? (hasOld ? shiftInputDate(current, diff) : current) : value));
    setSessions((current) =>
      rebalanceSessionCapacities(
        current.map((item, index) => {
          const startsAt = item.startsAt ? (hasOld ? shiftInputDate(item.startsAt, diff) : item.startsAt) : shiftInputDays(value, index);
          const endsAt = item.endsAt ? (hasOld ? shiftInputDate(item.endsAt, diff) : item.endsAt) : shiftInputDays(value, index);
          return clampSessionInsideGeneral({ ...item, startsAt, endsAt, name: startsAt ? formatSessionName(startsAt) : `Data ${index + 1}` }, index);
        }),
      ),
    );
  }

  function setGeneralEnd(value: string) {
    const old = endDate;
    const hasOld = Boolean(old);
    const diff = hasOld ? new Date(value).getTime() - new Date(old).getTime() : 0;
    setEndDate(value);
    setSessions((current) =>
      current.map((item, index) =>
        clampSessionInsideGeneral({ ...item, endsAt: item.endsAt ? (hasOld ? shiftInputDate(item.endsAt, diff) : item.endsAt) : value }, index),
      ),
    );
  }

  function changeCategory(next: Category) {
    const firstPresetKey = CATEGORY_PRESETS[next][0];
    const nextPreset = PRESETS[firstPresetKey];
    setCategory(next);
    setPresetKey(firstPresetKey);
    setSectors([newSector(next, nextPreset, 0)]);
    setMapObjects([]);
    setSelectedMapObjectId("");
    setTickets((current) => current.map((item) => ({ ...item, venueSectorLocalId: "", occupancyMode: nextPreset.mode })));
  }

  function changePreset(nextKey: string) {
    const nextPreset = PRESETS[nextKey];
    setPresetKey(nextKey);
    setSectors([newSector(category, nextPreset, 0)]);
    setMapObjects([]);
    setSelectedMapObjectId("");
    setTickets((current) => current.map((item) => ({ ...item, venueSectorLocalId: "", occupancyMode: nextPreset.mode })));
  }

  function addSession() {
    setSessions((current) => {
      const usedDays = new Set(current.map((item) => inputDateDay(item.startsAt)).filter(Boolean));
      let startsAt = startDate || inputDateToday();

      for (let i = 0; i < 365 && usedDays.has(inputDateDay(startsAt)); i += 1) {
        startsAt = shiftInputDays(startsAt, 1);
      }

      if (endDate && startsAt > endDate) {
        alert("Não há outro dia disponível dentro do início/fim geral.");
        return current;
      }

      const endsAt = endDate && sameInputDay(startsAt, endDate) ? endDate : startsAt;

      return rebalanceSessionCapacities([
        ...current,
        clampSessionInsideGeneral({ ...newSession(current.length), startsAt, endsAt, name: formatSessionName(startsAt) }, current.length),
      ]);
    });
  }

  function updateSession(localId: string, patch: Partial<SessionItem>) {
    setSessions((current) =>
      current.map((item, index) => {
        if (item.localId !== localId) return item;
        const next = clampSessionInsideGeneral({ ...item, ...patch }, index);
        if (patch.startsAt) next.name = formatSessionName(patch.startsAt);
        if (patch.name !== undefined) next.name = patch.name;
        if (patch.capacity !== undefined) next.capacity = onlyDigits(patch.capacity);
        return next;
      }),
    );
  }

  function removeSession(localId: string) {
    setSessions((current) =>
      current.length <= 1 ? current : rebalanceSessionCapacities(current.filter((item) => item.localId !== localId)),
    );
    setTickets((current) => current.map((item) => (item.eventSessionLocalId === localId ? { ...item, eventSessionLocalId: "" } : item)));
  }

  function addSector() {
    if (!preset.multiple) {
      alert("Este tipo de evento usa área única.");
      return;
    }
    const color = COLORS.find((item) => !sectors.some((sector) => sector.color === item)) || COLORS[sectors.length % COLORS.length];
    setSectors((current) => [...current, { ...newSector(category, preset, current.length, preset.defaultKind), color }]);
    setMapObjects([]);
  }

  function updateSector(localId: string, patch: Partial<SectorItem>) {
    const shouldResetMap =
      patch.kind !== undefined ||
      patch.chairRows !== undefined ||
      patch.chairsPerRow !== undefined ||
      patch.tableCount !== undefined ||
      patch.seatsPerTable !== undefined;

    setSectors((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;

        const next: SectorItem = { ...item, ...patch };

        if (patch.kind) {
          next.type = KIND_TYPE[patch.kind];
          next.mode = KIND_MODE[patch.kind];

          if (patch.kind === "NUMBERED_SEATS") {
            next.chairRows = next.chairRows || "10";
            next.chairsPerRow = next.chairsPerRow || "10";
            next.tableCount = "";
            next.seatsPerTable = "";
          }

          if (patch.kind === "TABLES") {
            next.tableCount = next.tableCount || "20";
            next.seatsPerTable = next.seatsPerTable || "4";
            next.chairRows = "";
            next.chairsPerRow = "";
          }

          if (patch.kind === "PLATEIA" || patch.kind === "OPEN_ADMISSION") {
            next.chairRows = "";
            next.chairsPerRow = "";
            next.tableCount = "";
            next.seatsPerTable = "";
          }
        }

        if (patch.capacity !== undefined) next.capacity = onlyDigits(patch.capacity);
        if (patch.chairRows !== undefined) next.chairRows = onlyDigits(patch.chairRows);
        if (patch.chairsPerRow !== undefined) next.chairsPerRow = onlyDigits(patch.chairsPerRow);
        if (patch.tableCount !== undefined) next.tableCount = onlyDigits(patch.tableCount);
        if (patch.seatsPerTable !== undefined) next.seatsPerTable = onlyDigits(patch.seatsPerTable);

        if (next.kind === "NUMBERED_SEATS") {
          next.capacity = String(positiveInt(next.chairRows) * positiveInt(next.chairsPerRow));
        }

        if (next.kind === "TABLES") {
          next.capacity = String(positiveInt(next.tableCount) * positiveInt(next.seatsPerTable));
        }

        return next;
      }),
    );

    if (shouldResetMap) {
      setMapObjects([]);
      setSelectedMapObjectId("");
      return;
    }

    setMapObjects((current) =>
      current.map((item) =>
        item.venueSectorLocalId === localId
          ? { ...item, label: patch.name || item.label, capacity: patch.capacity || item.capacity }
          : item,
      ),
    );
  }

  function removeSector(localId: string) {
    setSectors((current) => (current.length <= 1 ? current : current.filter((item) => item.localId !== localId)));
    setMapObjects((current) => current.filter((item) => item.venueSectorLocalId !== localId));
    setTickets((current) => current.map((item) => (item.venueSectorLocalId === localId ? { ...item, venueSectorLocalId: "" } : item)));
  }

  function ticketLotOptions(ticket: TicketItem) {
    return LOTS.map((lot) => {
      const used = tickets.some((other) => {
        return (
          other.localId !== ticket.localId &&
          other.venueSectorLocalId === ticket.venueSectorLocalId &&
          other.eventSessionLocalId === ticket.eventSessionLocalId &&
          other.ticketKind === ticket.ticketKind &&
          other.lotLabel === lot
        );
      });
      return { label: used ? `${lot} indisponível` : lot, value: lot, disabled: used };
    });
  }

  function hasFirstLot(ticket: TicketItem) {
    return tickets.some((other) => {
      return (
        other.localId !== ticket.localId &&
        other.venueSectorLocalId === ticket.venueSectorLocalId &&
        other.eventSessionLocalId === ticket.eventSessionLocalId &&
        other.ticketKind === ticket.ticketKind &&
        other.lotLabel === "1º Lote"
      );
    });
  }

  function previousLotEnd(ticket: TicketItem, lotLabel: string) {
    const number = lotNumber(lotLabel);
    if (number <= 1) return "";
    const previous = tickets.find((other) => {
      return (
        other.localId !== ticket.localId &&
        other.venueSectorLocalId === ticket.venueSectorLocalId &&
        other.eventSessionLocalId === ticket.eventSessionLocalId &&
        other.ticketKind === ticket.ticketKind &&
        lotNumber(other.lotLabel) === number - 1
      );
    });
    return previous?.salesEndAt || "";
  }

  function ticketKindLabel(ticketKind: TicketKind) {
    return TICKET_KIND_OPTIONS.find((option) => option.value === ticketKind)?.label || "Inteira";
  }

  function ticketSectorName(sectorId: string) {
    if (isOpenOnly || !sectorId) return "Área única";

    return sectors.find((sector) => sector.localId === sectorId)?.name || "Setor";
  }

  function automaticTicketName(ticket: Pick<TicketItem, "lotLabel" | "venueSectorLocalId" | "ticketKind" | "eventSessionLocalId">) {
    const kindLabel = ticketKindLabel(ticket.ticketKind);
    const sectorName = ticketSectorName(ticket.venueSectorLocalId);
    const typeLabel = ticket.eventSessionLocalId ? kindLabel : `Passaporte ${kindLabel}`;

    return `${ticket.lotLabel} • ${sectorName} • ${typeLabel}`;
  }

  function findPreviousTicketLot(list: TicketItem[], ticket: TicketItem) {
    const previousNumber = lotNumber(ticket.lotLabel) - 1;

    if (previousNumber < 1) return undefined;

    return list.find((other) => {
      return (
        other.localId !== ticket.localId &&
        other.venueSectorLocalId === ticket.venueSectorLocalId &&
        other.eventSessionLocalId === ticket.eventSessionLocalId &&
        other.ticketKind === ticket.ticketKind &&
        lotNumber(other.lotLabel) === previousNumber
      );
    });
  }

  function maxPreviousTicketPrice(list: TicketItem[], ticket: TicketItem) {
    const currentLot = lotNumber(ticket.lotLabel);

    if (currentLot <= 1) return 0;

    return list
      .filter((other) => {
        return (
          other.localId !== ticket.localId &&
          other.venueSectorLocalId === ticket.venueSectorLocalId &&
          other.eventSessionLocalId === ticket.eventSessionLocalId &&
          other.ticketKind === ticket.ticketKind &&
          lotNumber(other.lotLabel) < currentLot
        );
      })
      .reduce((max, item) => Math.max(max, moneyNumber(item.price)), 0);
  }

  function addTicket() {
    const sessionId = sessions[0]?.localId || "";
    const sectorId = isOpenOnly ? "" : sectors[0]?.localId || "";
    const sector = sectors.find((item) => item.localId === sectorId);
    const session = sessions.find((item) => item.localId === sessionId);
    setTickets((current) => [
      ...current,
      {
        ...newTicket(current.length, sessionId, sectorId, sector?.mode || preset.mode),
        salesStartAt: inputDateToday(),
        salesEndAt: suggestLotEnd(inputDateToday(), inputDateDay(session?.startsAt || endDate)),
      },
    ]);
  }

  function updateTicket(localId: string, patch: Partial<TicketItem>) {
    setTickets((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;

        let next: TicketItem = { ...item, ...patch };

        if (patch.price !== undefined) next.price = onlyMoney(patch.price);
        if (patch.quantity !== undefined) next.quantity = onlyDigits(patch.quantity);
        if (patch.maxPerOrder !== undefined) next.maxPerOrder = onlyDigits(patch.maxPerOrder);

        if (patch.venueSectorLocalId !== undefined) {
          const sector = sectors.find((sectorItem) => sectorItem.localId === patch.venueSectorLocalId);
          next.occupancyMode = sector?.mode || preset.mode;
        }

        if (patch.lotLabel || patch.venueSectorLocalId !== undefined || patch.ticketKind || patch.eventSessionLocalId !== undefined) {
          next.name = automaticTicketName(next);
        }

        const nextSession = sessions.find((sessionItem) => sessionItem.localId === next.eventSessionLocalId);

        if (patch.eventSessionLocalId !== undefined && nextSession?.startsAt && inputDateDay(next.salesEndAt) > inputDateDay(nextSession.startsAt)) {
          next.salesEndAt = inputDateDay(nextSession.startsAt);
        }

        if (patch.eventSessionLocalId !== undefined && nextSession?.startsAt && inputDateDay(next.salesStartAt) > inputDateDay(nextSession.startsAt)) {
          next.salesStartAt = inputDateToday();
        }

        const previousLot = findPreviousTicketLot(current, next);

        if (previousLot && (patch.lotLabel || patch.venueSectorLocalId !== undefined || patch.eventSessionLocalId !== undefined || patch.ticketKind)) {
          if (previousLot.salesEndAt) {
            next.salesStartAt = previousLot.salesEndAt;
          }

          if (patch.price === undefined && previousLot.price) {
            next.price = addMoneyValue(previousLot.price, 100);
          }

          if (patch.quantity === undefined && previousLot.quantity) {
            next.quantity = previousLot.quantity;
          }
        }

        if (patch.price !== undefined && lotNumber(next.lotLabel) > 1) {
          const minimumPrice = maxPreviousTicketPrice(current, next);

          if (minimumPrice > 0 && moneyNumber(next.price) < minimumPrice) {
            next.price = moneyInputFromNumber(minimumPrice);
          }
        }

        if (lotNumber(next.lotLabel) > 1) {
          const firstLotExists = current.some((other) =>
            other.localId !== next.localId &&
            other.venueSectorLocalId === next.venueSectorLocalId &&
            other.eventSessionLocalId === next.eventSessionLocalId &&
            other.ticketKind === next.ticketKind &&
            other.lotLabel === "1º Lote",
          );

          if (firstLotExists) next.isHidden = true;
        }

        return next;
      }),
    );
  }

  function removeTicket(localId: string) {
    setTickets((current) => (current.length <= 1 ? current : current.filter((item) => item.localId !== localId)));
  }

  function defaultPolygon(): MapPoint[] {
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

  function pointGuard(value: unknown): value is MapPoint {
    if (typeof value !== "object" || value === null) return false;
    const point = value as Record<string, unknown>;
    return typeof point.x === "number" && typeof point.y === "number";
  }

  function objectShape(object: MapObject): MapShape {
    return String(object.metadata?.shape || "ROUNDED") as MapShape;
  }

  function objectPoints(object: MapObject): MapPoint[] {
    const raw = object.metadata?.polygonPoints;
    return Array.isArray(raw) && raw.every(pointGuard) ? raw : defaultPolygon();
  }

  function svgPoints(object: MapObject) {
    return objectPoints(object)
      .map((point) => `${(point.x / 100) * object.width},${(point.y / 100) * object.height}`)
      .join(" ");
  }

  function cssPoints(object: MapObject) {
    return objectPoints(object).map((point) => `${point.x}% ${point.y}%`).join(", ");
  }

  function smoothSvgPath(object: MapObject) {
    const points = objectPoints(object).map((point) => ({
      x: (point.x / 100) * object.width,
      y: (point.y / 100) * object.height,
    }));

    if (points.length < 3) return svgPoints(object);

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

  function shouldSmoothObject(object: MapObject) {
    return objectShape(object) === "FREEFORM" && object.metadata?.smoothPolygon !== false;
  }

  function radius(object: MapObject) {
    const shape = objectShape(object);
    if (shape === "CIRCLE" || shape === "PILL") return "9999px";
    if (shape === "RECTANGLE") return "0.75rem";
    return "2rem";
  }

  function generateMap() {
    function sectorChairRows(sector: SectorItem) {
      return positiveInt(sector.chairRows || "10", 1);
    }

    function sectorChairsPerRow(sector: SectorItem) {
      return positiveInt(sector.chairsPerRow || "10", 1);
    }

    function sectorTableCount(sector: SectorItem) {
      return positiveInt(sector.tableCount || tableCount || "20", 1);
    }

    function sectorSeatsPerTableValue(sector: SectorItem) {
      return positiveInt(sector.seatsPerTable || seatsPerTable || "4", 1);
    }

    function sectorMapCapacity(sector: SectorItem) {
      if (sector.kind === "NUMBERED_SEATS") {
        return sectorChairRows(sector) * sectorChairsPerRow(sector);
      }

      if (sector.kind === "TABLES") {
        return sectorTableCount(sector) * sectorSeatsPerTableValue(sector);
      }

      return positiveInt(sector.capacity, 1);
    }

    const stage: MapObject = {
      localId: id("stage"),
      venueSectorLocalId: "",
      code: "PALCO",
      label: "PALCO",
      type: "STAGE",
      capacity: "",
      x: Math.round(MAP_W / 2 - 180),
      y: 40,
      width: 360,
      height: 90,
      rotation: 0,
      status: "AVAILABLE",
      metadata: { sectorColor: "#111827", shape: "ROUNDED", fixed: true },
    };

    const templates = [
      { x: 120, y: 190, width: 330, height: 160 },
      { x: 500, y: 190, width: 330, height: 160 },
      { x: 880, y: 190, width: 230, height: 160 },
      { x: 120, y: 420, width: 250, height: 280 },
      { x: 430, y: 410, width: 360, height: 210 },
      { x: 850, y: 420, width: 250, height: 280 },
      { x: 410, y: 690, width: 420, height: 120 },
      { x: 80, y: 710, width: 260, height: 100 },
      { x: 880, y: 710, width: 260, height: 100 },
    ];

    const objects = sectors.map<MapObject>((sector, index) => {
      const template = templates[index % templates.length];
      const chairRows = sector.kind === "NUMBERED_SEATS" ? sectorChairRows(sector) : undefined;
      const chairsPerRow = sector.kind === "NUMBERED_SEATS" ? sectorChairsPerRow(sector) : undefined;
      const chairCount = chairRows && chairsPerRow ? chairRows * chairsPerRow : undefined;
      const sectorTables = sector.kind === "TABLES" ? sectorTableCount(sector) : undefined;
      const sectorSeatsPerTable = sector.kind === "TABLES" ? sectorSeatsPerTableValue(sector) : undefined;
      const totalTableSeats = sectorTables && sectorSeatsPerTable ? sectorTables * sectorSeatsPerTable : undefined;
      const capacity = sectorMapCapacity(sector);

      return {
        localId: id("area"),
        venueSectorLocalId: sector.localId,
        code: `S${index + 1}`,
        label: sector.name || `Setor ${index + 1}`,
        type: sector.kind === "TABLES" ? "TABLE" : "AREA",
        capacity: String(capacity),
        x: template.x,
        y: template.y,
        width: template.width,
        height: template.height,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          sectorKind: sector.kind,
          sectorName: sector.name,
          sectorColor: sector.color,
          occupancyMode: sector.mode,
          capacity,
          shape: "ROUNDED",
          polygonPoints: defaultPolygon(),
          chairRows,
          chairsPerRow,
          chairCount,
          tableSaleMode: sector.kind === "TABLES" ? tableSaleMode : undefined,
          tableCount: sectorTables,
          seatsPerTable: sectorSeatsPerTable,
          totalTableSeats,
        },
      };
    });

    setSelectedMapObjectId("");
    setInteraction(null);
    setMapObjects([stage, ...objects]);
  }

  function startMove(event: ReactPointerEvent<HTMLDivElement>, object: MapObject) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedMapObjectId(object.localId);
    setInteraction({
      type: "move",
      objectId: object.localId,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: object.x,
      startY: object.y,
      startWidth: object.width,
      startHeight: object.height,
    });
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, object: MapObject, dir: ResizeDir) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedMapObjectId(object.localId);
    setInteraction({
      type: "resize",
      objectId: object.localId,
      dir,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: object.x,
      startY: object.y,
      startWidth: object.width,
      startHeight: object.height,
    });
  }

  function startPoint(event: ReactPointerEvent<HTMLButtonElement>, object: MapObject, pointIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const point = objectPoints(object)[pointIndex];
    setSelectedMapObjectId(object.localId);
    setInteraction({
      type: "point",
      objectId: object.localId,
      pointIndex,
      clientX: event.clientX,
      clientY: event.clientY,
      startX: object.x,
      startY: object.y,
      startWidth: object.width,
      startHeight: object.height,
      startPointX: point.x,
      startPointY: point.y,
    });
  }

  type MapRect = {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  const MAP_GRID_SIZE = 40;
  const MAP_STRONG_GRID_SIZE = 120;
  const MAP_SNAP_DISTANCE = 22;
  const MAP_OBJECT_GAP = 0;

  function clampMapRect(rect: MapRect): MapRect {
    const width = Math.min(Math.max(rect.width, MAP_MIN), MAP_W);
    const height = Math.min(Math.max(rect.height, MAP_MIN), MAP_H);

    return {
      x: Math.min(Math.max(rect.x, 0), MAP_W - width),
      y: Math.min(Math.max(rect.y, 0), MAP_H - height),
      width,
      height,
    };
  }

  function rectsOverlap(first: MapRect, second: MapRect) {
    return !(
      first.x + first.width <= second.x ||
      first.x >= second.x + second.width ||
      first.y + first.height <= second.y ||
      first.y >= second.y + second.height
    );
  }

  function mapObjectRect(object: MapObject): MapRect {
    return {
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
    };
  }

  function snapValue(value: number, target: number, distance = MAP_SNAP_DISTANCE) {
    return Math.abs(value - target) <= distance ? target : value;
  }

  function snapToGrid(rect: MapRect): MapRect {
    let nextX = rect.x;
    let nextY = rect.y;

    const xLines = [
      Math.round(rect.x / MAP_GRID_SIZE) * MAP_GRID_SIZE,
      Math.round((rect.x + rect.width) / MAP_GRID_SIZE) * MAP_GRID_SIZE - rect.width,
      Math.round((rect.x + rect.width / 2) / MAP_GRID_SIZE) * MAP_GRID_SIZE - rect.width / 2,
      Math.round(rect.x / MAP_STRONG_GRID_SIZE) * MAP_STRONG_GRID_SIZE,
      Math.round((rect.x + rect.width) / MAP_STRONG_GRID_SIZE) * MAP_STRONG_GRID_SIZE - rect.width,
      Math.round((rect.x + rect.width / 2) / MAP_STRONG_GRID_SIZE) * MAP_STRONG_GRID_SIZE - rect.width / 2,
    ];

    const yLines = [
      Math.round(rect.y / MAP_GRID_SIZE) * MAP_GRID_SIZE,
      Math.round((rect.y + rect.height) / MAP_GRID_SIZE) * MAP_GRID_SIZE - rect.height,
      Math.round((rect.y + rect.height / 2) / MAP_GRID_SIZE) * MAP_GRID_SIZE - rect.height / 2,
      Math.round(rect.y / MAP_STRONG_GRID_SIZE) * MAP_STRONG_GRID_SIZE,
      Math.round((rect.y + rect.height) / MAP_STRONG_GRID_SIZE) * MAP_STRONG_GRID_SIZE - rect.height,
      Math.round((rect.y + rect.height / 2) / MAP_STRONG_GRID_SIZE) * MAP_STRONG_GRID_SIZE - rect.height / 2,
    ];

    for (const line of xLines) {
      nextX = snapValue(nextX, line);
    }

    for (const line of yLines) {
      nextY = snapValue(nextY, line);
    }

    return clampMapRect({
      ...rect,
      x: Math.round(nextX),
      y: Math.round(nextY),
    });
  }

  function snapSizeToGrid(rect: MapRect, dir?: ResizeDir): MapRect {
    const snappedWidth = Math.max(MAP_MIN, Math.round(rect.width / MAP_GRID_SIZE) * MAP_GRID_SIZE);
    const snappedHeight = Math.max(MAP_MIN, Math.round(rect.height / MAP_GRID_SIZE) * MAP_GRID_SIZE);
    let nextX = rect.x;
    let nextY = rect.y;

    if (dir?.includes("w")) {
      nextX = rect.x + rect.width - snappedWidth;
    }

    if (dir?.includes("n")) {
      nextY = rect.y + rect.height - snappedHeight;
    }

    return clampMapRect({
      x: nextX,
      y: nextY,
      width: snappedWidth,
      height: snappedHeight,
    });
  }

  function snapToObjects(rect: MapRect, objectId: string, objects: MapObject[]) {
    let nextRect = { ...rect };

    for (const object of objects) {
      if (object.localId === objectId) continue;

      const other = mapObjectRect(object);
      const verticalIntersects =
        nextRect.y < other.y + other.height + MAP_SNAP_DISTANCE &&
        nextRect.y + nextRect.height > other.y - MAP_SNAP_DISTANCE;
      const horizontalIntersects =
        nextRect.x < other.x + other.width + MAP_SNAP_DISTANCE &&
        nextRect.x + nextRect.width > other.x - MAP_SNAP_DISTANCE;

      if (verticalIntersects) {
        nextRect.x = snapValue(nextRect.x, other.x);
        nextRect.x = snapValue(nextRect.x, other.x + other.width + MAP_OBJECT_GAP);
        nextRect.x = snapValue(nextRect.x, other.x - nextRect.width - MAP_OBJECT_GAP);
        nextRect.x = snapValue(nextRect.x + nextRect.width, other.x - MAP_OBJECT_GAP) - nextRect.width;
        nextRect.x = snapValue(nextRect.x + nextRect.width, other.x + other.width) - nextRect.width;
      }

      if (horizontalIntersects) {
        nextRect.y = snapValue(nextRect.y, other.y);
        nextRect.y = snapValue(nextRect.y, other.y + other.height + MAP_OBJECT_GAP);
        nextRect.y = snapValue(nextRect.y, other.y - nextRect.height - MAP_OBJECT_GAP);
        nextRect.y = snapValue(nextRect.y + nextRect.height, other.y - MAP_OBJECT_GAP) - nextRect.height;
        nextRect.y = snapValue(nextRect.y + nextRect.height, other.y + other.height) - nextRect.height;
      }
    }

    return clampMapRect({
      ...nextRect,
      x: Math.round(nextRect.x),
      y: Math.round(nextRect.y),
    });
  }

  function resolveCollision(proposed: MapRect, previous: MapRect, objectId: string, objects: MapObject[]) {
    let nextRect = { ...proposed };

    for (const object of objects) {
      if (object.localId === objectId) continue;

      const other = mapObjectRect(object);
      if (!rectsOverlap(nextRect, other)) continue;

      const cameFromLeft = previous.x + previous.width <= other.x;
      const cameFromRight = previous.x >= other.x + other.width;
      const cameFromTop = previous.y + previous.height <= other.y;
      const cameFromBottom = previous.y >= other.y + other.height;

      if (cameFromLeft) {
        nextRect.x = other.x - nextRect.width - MAP_OBJECT_GAP;
        continue;
      }

      if (cameFromRight) {
        nextRect.x = other.x + other.width + MAP_OBJECT_GAP;
        continue;
      }

      if (cameFromTop) {
        nextRect.y = other.y - nextRect.height - MAP_OBJECT_GAP;
        continue;
      }

      if (cameFromBottom) {
        nextRect.y = other.y + other.height + MAP_OBJECT_GAP;
        continue;
      }

      const pushLeft = Math.abs(nextRect.x + nextRect.width - other.x);
      const pushRight = Math.abs(other.x + other.width - nextRect.x);
      const pushUp = Math.abs(nextRect.y + nextRect.height - other.y);
      const pushDown = Math.abs(other.y + other.height - nextRect.y);
      const smallestPush = Math.min(pushLeft, pushRight, pushUp, pushDown);

      if (smallestPush === pushLeft) {
        nextRect.x = other.x - nextRect.width - MAP_OBJECT_GAP;
      } else if (smallestPush === pushRight) {
        nextRect.x = other.x + other.width + MAP_OBJECT_GAP;
      } else if (smallestPush === pushUp) {
        nextRect.y = other.y - nextRect.height - MAP_OBJECT_GAP;
      } else {
        nextRect.y = other.y + other.height + MAP_OBJECT_GAP;
      }
    }

    return clampMapRect({
      ...nextRect,
      x: Math.round(nextRect.x),
      y: Math.round(nextRect.y),
    });
  }

  function hasCollision(rect: MapRect, objectId: string, objects: MapObject[]) {
    return objects.some((object) => {
      if (object.localId === objectId) return false;
      return rectsOverlap(rect, mapObjectRect(object));
    });
  }

  function dragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interaction) return;

    const dx = event.clientX - interaction.clientX;
    const dy = event.clientY - interaction.clientY;

    setMapObjects((current) =>
      current.map((object) => {
        if (object.localId !== interaction.objectId) return object;

        if (object.type === "STAGE") {
          return object;
        }

        if (interaction.type === "move") {
          const previousRect: MapRect = {
            x: interaction.startX,
            y: interaction.startY,
            width: object.width,
            height: object.height,
          };

          let proposedRect: MapRect = {
            x: interaction.startX + dx,
            y: interaction.startY + dy,
            width: object.width,
            height: object.height,
          };

          proposedRect = clampMapRect(proposedRect);
          proposedRect = snapToGrid(proposedRect);
          proposedRect = snapToObjects(proposedRect, object.localId, current);
          proposedRect = resolveCollision(proposedRect, previousRect, object.localId, current);

          return {
            ...object,
            x: proposedRect.x,
            y: proposedRect.y,
          };
        }

        if (interaction.type === "point") {
          const points = objectPoints(object);
          const index = interaction.pointIndex || 0;
          const nextX = Math.min(
            Math.max((interaction.startPointX || 0) + (dx / interaction.startWidth) * 100, 0),
            100,
          );
          const nextY = Math.min(
            Math.max((interaction.startPointY || 0) + (dy / interaction.startHeight) * 100, 0),
            100,
          );

          return {
            ...object,
            metadata: {
              ...object.metadata,
              shape: "FREEFORM",
              polygonPoints: points.map((point, i) => (i === index ? { x: nextX, y: nextY } : point)),
            },
          };
        }

        let x = interaction.startX;
        let y = interaction.startY;
        let width = interaction.startWidth;
        let height = interaction.startHeight;

        if (interaction.dir?.includes("e")) width = interaction.startWidth + dx;
        if (interaction.dir?.includes("s")) height = interaction.startHeight + dy;
        if (interaction.dir?.includes("w")) {
          x = interaction.startX + dx;
          width = interaction.startWidth - dx;
        }
        if (interaction.dir?.includes("n")) {
          y = interaction.startY + dy;
          height = interaction.startHeight - dy;
        }

        if (width < MAP_MIN) {
          if (interaction.dir?.includes("w")) x = interaction.startX + interaction.startWidth - MAP_MIN;
          width = MAP_MIN;
        }

        if (height < MAP_MIN) {
          if (interaction.dir?.includes("n")) y = interaction.startY + interaction.startHeight - MAP_MIN;
          height = MAP_MIN;
        }

        let proposedRect = clampMapRect({ x, y, width, height });
        proposedRect = snapSizeToGrid(proposedRect, interaction.dir);
        proposedRect = snapToGrid(proposedRect);
        proposedRect = snapToObjects(proposedRect, object.localId, current);

        if (hasCollision(proposedRect, object.localId, current)) {
          return object;
        }

        return {
          ...object,
          x: proposedRect.x,
          y: proposedRect.y,
          width: proposedRect.width,
          height: proposedRect.height,
        };
      }),
    );
  }

  function setShape(objectId: string, shape: MapShape) {
    setMapObjects((current) =>
      current.map((object) => {
        if (object.localId !== objectId) return object;

        if (shape === "CIRCLE") {
          const size = Math.min(object.width, object.height);
          return { ...object, width: size, height: size, metadata: { ...object.metadata, shape } };
        }

        if (shape === "FREEFORM") {
          return {
            ...object,
            metadata: {
              ...object.metadata,
              shape,
              smoothPolygon: true,
              polygonPoints: objectPoints(object),
            },
          };
        }

        return { ...object, metadata: { ...object.metadata, shape } };
      }),
    );
  }

  function pointDistanceToSegment(point: MapPoint, start: MapPoint, end: MapPoint) {
    const segmentX = end.x - start.x;
    const segmentY = end.y - start.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSquared === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }

    const rawT =
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) /
      segmentLengthSquared;
    const t = Math.max(0, Math.min(1, rawT));
    const projectionX = start.x + t * segmentX;
    const projectionY = start.y + t * segmentY;

    return Math.hypot(point.x - projectionX, point.y - projectionY);
  }

  function insertPointNear(points: MapPoint[], point: MapPoint) {
    if (points.length < 2) return [...points, point];

    let insertAfterIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    points.forEach((currentPoint, index) => {
      const nextPoint = points[(index + 1) % points.length];
      const distance = pointDistanceToSegment(point, currentPoint, nextPoint);

      if (distance < bestDistance) {
        bestDistance = distance;
        insertAfterIndex = index;
      }
    });

    return [
      ...points.slice(0, insertAfterIndex + 1),
      point,
      ...points.slice(insertAfterIndex + 1),
    ];
  }

  function addPoint() {
    if (!selectedMapObjectId) return;

    setMapObjects((current) =>
      current.map((object) => {
        if (object.localId !== selectedMapObjectId) return object;

        const points = objectPoints(object);
        let insertAfterIndex = 0;
        let biggestLength = -1;

        points.forEach((point, index) => {
          const next = points[(index + 1) % points.length];
          const length = Math.hypot(next.x - point.x, next.y - point.y);

          if (length > biggestLength) {
            biggestLength = length;
            insertAfterIndex = index;
          }
        });

        const start = points[insertAfterIndex];
        const endPoint = points[(insertAfterIndex + 1) % points.length];
        const newPoint = {
          x: Math.round(((start.x + endPoint.x) / 2) * 10) / 10,
          y: Math.round(((start.y + endPoint.y) / 2) * 10) / 10,
        };

        return {
          ...object,
          metadata: {
            ...object.metadata,
            shape: "FREEFORM",
            smoothPolygon: true,
            polygonPoints: [
              ...points.slice(0, insertAfterIndex + 1),
              newPoint,
              ...points.slice(insertAfterIndex + 1),
            ],
          },
        };
      }),
    );
  }

  function addPointAtPosition(object: MapObject, clientX: number, clientY: number) {
    const element = document.querySelector(`[data-map-object-id="${object.localId}"]`);

    if (!(element instanceof HTMLElement)) return;

    const rect = element.getBoundingClientRect();
    const x = Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100);
    const y = Math.min(Math.max(((clientY - rect.top) / rect.height) * 100, 0), 100);
    const nextPoint = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };

    setSelectedMapObjectId(object.localId);
    setMapObjects((current) =>
      current.map((item) =>
        item.localId === object.localId
          ? {
              ...item,
              metadata: {
                ...item.metadata,
                shape: "FREEFORM",
                smoothPolygon: true,
                polygonPoints: insertPointNear(objectPoints(item), nextPoint),
              },
            }
          : item,
      ),
    );
  }

  function toggleSmoothPolygon() {
    if (!selectedMapObjectId) return;

    setMapObjects((current) =>
      current.map((object) =>
        object.localId === selectedMapObjectId
          ? {
              ...object,
              metadata: {
                ...object.metadata,
                shape: "FREEFORM",
                smoothPolygon: !shouldSmoothObject(object),
              },
            }
          : object,
      ),
    );
  }

  function removePoint() {
    if (!selectedMapObjectId) return;
    setMapObjects((current) =>
      current.map((object) => {
        if (object.localId !== selectedMapObjectId) return object;
        const points = objectPoints(object);
        if (points.length <= 3) {
          alert("Um setor quebrado precisa ter pelo menos 3 pontos.");
          return object;
        }
        return { ...object, metadata: { ...object.metadata, shape: "FREEFORM", polygonPoints: points.slice(0, -1) } };
      }),
    );
  }

  function resetPolygon() {
    if (!selectedMapObjectId) return;
    setMapObjects((current) =>
      current.map((object) =>
        object.localId === selectedMapObjectId
          ? { ...object, metadata: { ...object.metadata, shape: "FREEFORM", smoothPolygon: true, polygonPoints: defaultPolygon() } }
          : object,
      ),
    );
  }

  function cepChange(value: string) {
    const cep = onlyDigits(value).slice(0, 8);
    setZipCode(cep);
    if (cep.length !== 8) return;
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.erro) {
          alert("CEP não encontrado.");
          return;
        }
        setAddressLine1(data.logradouro || "");
        setNeighborhood(data.bairro || "");
        setCity(data.localidade || "");
        setStateName(data.uf || "");
      })
      .catch(() => alert("Não foi possível buscar o CEP agora."));
  }

  function extractCoordinatesFromMapUrl(value: string) {
    const decoded = decodeURIComponent(normalizeExternalUrl(value));
    const patterns = [
      /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /[?&](?:q|query|center|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
      /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
      /\/(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:\?|\/|$)/,
    ];

    for (const pattern of patterns) {
      const match = decoded.match(pattern);
      if (match?.[1] && match?.[2]) {
        return { latitude: match[1], longitude: match[2] };
      }
    }

    return null;
  }

  function extractPlaceNameFromMapUrl(value: string) {
    const normalized = decodeURIComponent(normalizeExternalUrl(value));
    const match = normalized.match(/\/maps\/place\/([^/@?]+)/);
    if (!match?.[1]) return "";

    return match[1]
      .replace(/\+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function applyMapUrlData(value: string) {
    const normalized = normalizeExternalUrl(value);
    setMapUrl(normalized);

    const coordinates = extractCoordinatesFromMapUrl(normalized);
    if (coordinates) {
      setLatitude(coordinates.latitude);
      setLongitude(coordinates.longitude);
    } else {
      setLatitude("");
      setLongitude("");
    }

    const placeName = extractPlaceNameFromMapUrl(normalized);
    if (placeName && !venueName.trim()) {
      setVenueName(placeName);
    }
  }

  function mapUrlChange(value: string) {
    applyMapUrlData(value);
  }

  async function resolveMapUrl() {
    const normalized = normalizeExternalUrl(mapUrl);

    if (!normalized) {
      alert("Cole primeiro o link do Google Maps.");
      return;
    }

    setResolvingMapUrl(true);

    try {
      const response = await fetch(`/api/maps/resolve?url=${encodeURIComponent(normalized)}`, {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(typeof result?.message === "string" ? result.message : "Não foi possível resolver este link.");
      }

      const resolvedUrl = String(result?.resolvedUrl || result?.url || normalized);
      applyMapUrlData(resolvedUrl);

      if (result?.latitude && result?.longitude) {
        setLatitude(String(result.latitude));
        setLongitude(String(result.longitude));
      }

      if (result?.placeName && !venueName.trim()) {
        setVenueName(String(result.placeName));
      }

      if (result?.address && !addressLine1.trim()) {
        setAddressLine1(String(result.address));
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Não foi possível resolver o link encurtado. Confira a rota /api/maps/resolve do Next.",
      );
    } finally {
      setResolvingMapUrl(false);
    }
  }

  function payload() {
    const mediaPayload = Object.fromEntries(
      Object.entries({
        coverImageUrl: urlOrUndefined(coverImageUrl),
        bannerImageUrl: urlOrUndefined(bannerImageUrl),
        thumbnailUrl: urlOrUndefined(thumbnailUrl),
        mobileBannerUrl: urlOrUndefined(mobileBannerUrl),
        sectorMapImageUrl: urlOrUndefined(sectorMapImageUrl),
        gallery: gallery.map((item) => urlOrUndefined(item)).filter((item): item is string => Boolean(item)),
      }).filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== undefined && value !== "";
      }),
    );

    return {
      organizerId,
      name: eventName.trim(),
      description: textOrUndefined(description),
      shortDescription: textOrUndefined(shortDescription),
      slug: textOrUndefined(slug),
      category,
      occupancyMode: preset.mode,
      status: "PUBLISHED",
      visibility: "PUBLIC",
      timezone: TIMEZONE,
      eventDate: isoEventStartOrUndefined(startDate),
      startDate: isoEventStartOrUndefined(startDate),
      endDate: isoEventEndOrUndefined(endDate),
      capacity: intOrUndefined(capacity),
      featured: false,
      allowSeatMap: preset.allowSeatMap,
      allowTableMap: preset.allowTableMap,
      multiSession: sessions.length > 1,
      content: {
        headline: textOrUndefined(headline),
        summary: textOrUndefined(summary),
        fullDescription: textOrUndefined(fullDescription),
        producerDescription: textOrUndefined(producerDescription),
      },
      location: {
        mode,
        venueName: textOrUndefined(venueName),
        addressLine1: textOrUndefined(addressLine1),
        addressLine2: textOrUndefined(addressLine2),
        neighborhood: textOrUndefined(neighborhood),
        city: textOrUndefined(city),
        state: textOrUndefined(stateName),
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
      venueLayouts:
        mapObjects.length > 0
          ? [
              {
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
                  type: object.type,
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
              },
            ]
          : [],
      ticketTypes: clampTicketsForCapacity(tickets, sessions, sectors, capacity, isOpenOnly).map((ticket, index) => {
        const sector = sectors.find((item) => item.localId === ticket.venueSectorLocalId);
        const autoHidden = lotNumber(ticket.lotLabel) > 1 && tickets.some((other) =>
          other.localId !== ticket.localId &&
          other.eventSessionLocalId === ticket.eventSessionLocalId &&
          other.venueSectorLocalId === ticket.venueSectorLocalId &&
          other.ticketKind === ticket.ticketKind &&
          other.lotLabel === "1º Lote",
        );
        return {
          eventSessionLocalId: textOrUndefined(ticket.eventSessionLocalId),
          venueSectorLocalId: textOrUndefined(ticket.venueSectorLocalId),
          occupancyMode: sector?.mode || ticket.occupancyMode,
          name: `${TICKET_KIND_OPTIONS.find((item) => item.value === ticket.ticketKind)?.label || "Inteira"} - ${ticket.name} - ${ticket.lotLabel}`,
          lotLabel: textOrUndefined(ticket.lotLabel),
          description: textOrUndefined(ticket.description),
          price: moneyApi(ticket.price),
          quantity: intOrUndefined(ticket.quantity),
          salesStartAt: isoSalesStartOrUndefined(ticket.salesStartAt),
          salesEndAt: isoSalesEndOrUndefined(ticket.salesEndAt),
          minPerOrder: 1,
          maxPerOrder: intOrUndefined(ticketMaxPerOrder),
          displayOrder: index,
          feeAmount: undefined,
          feeDescription: undefined,
          benefitDescription: undefined,
          isHidden: ticket.isHidden || autoHidden,
          status: "ACTIVE",
        };
      }),
    };
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    const first = firstIncompleteStep();
    if (first !== steps.length - 1) {
      setStepIndex(first);
      alert("Revise as etapas obrigatórias antes de salvar.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload()),
      });
      const result = await response.json();
      if (!response.ok) {
        alert(typeof result?.message === "string" ? result.message : Array.isArray(result?.message) ? result.message.join("\n") : "Erro ao criar evento.");
        return;
      }
      const eventId = result?.id || result?.event?.id;
      alert("Evento criado com sucesso!");
      window.location.href = eventId ? `/admin/events/${eventId}` : "/admin/events";
    } catch (error) {
      console.error(error);
      alert("Erro ao conectar com a API.");
    } finally {
      setSaving(false);
    }
  }

  function renderTypeStep() {
    return (
      <StepShell eyebrow="Etapa 1" title="Tipo de evento" description="Escolha categoria e tipo de ocupação permitido.">
        <div className="grid gap-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {CATEGORIES.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => changeCategory(item.value)}
                className={`rounded-3xl border p-5 text-left ${category === item.value ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl font-black ${category === item.value ? "bg-sky-600 text-white" : "bg-slate-100"}`}>
                  {category === item.value ? "✓" : "•"}
                </div>
                <p className="font-black text-slate-950">{item.label}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{item.description}</p>
              </button>
            ))}
          </div>
          <div className="rounded-[2rem] bg-slate-950 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Tipos personalizados</p>
            <h3 className="mt-2 text-2xl font-black">Ocupações disponíveis</h3>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {CATEGORY_PRESETS[category].map((key) => {
                const item = PRESETS[key];
                return (
                  <button
                    type="button"
                    key={item.key}
                    onClick={() => changePreset(item.key)}
                    className={`rounded-3xl border p-5 text-left ${presetKey === item.key ? "border-sky-300 bg-sky-500" : "border-white/10 bg-white/5 hover:bg-white/10"}`}
                  >
                    <p className="text-lg font-black">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-200">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderBasicStep() {
    return (
      <StepShell eyebrow="Etapa 2" title="Dados principais" description="Produtora, nome, status publicado e capacidade.">
        <div className="grid gap-5 md:grid-cols-2">
          <Select
            label="Produtora"
            value={organizerId}
            onChange={setOrganizerId}
            options={[{ label: loadingOrganizers ? "Carregando..." : "Selecione", value: "" }, ...organizers.map((item) => ({ label: item.tradeName || item.legalName || item.email || "Produtora sem nome", value: item.id }))]}
          />
          <Field label="Nome do evento" value={eventName} onChange={setEventName} required error={submitAttempted && !eventName.trim()} />
          <Field label="Slug público" value={slug} onChange={setSlug} placeholder="meu-evento" />
          <Field label="Capacidade geral" value={capacity} onChange={setEventCapacity} onlyNumbers required error={submitAttempted && generalCapacity <= 0} helper="Capacidade total somada de todas as datas. A etapa Datas divide automaticamente esse total entre os dias." />
          <Select label="Status inicial" value="PUBLISHED" onChange={() => undefined} disabled options={[{ label: "Publicado", value: "PUBLISHED" }]} />
          <Select label="Visibilidade" value="PUBLIC" onChange={() => undefined} disabled options={[{ label: "Público", value: "PUBLIC" }]} />
          <Field label="Fuso horário" value="Brasil - Horário de Brasília" onChange={() => undefined} disabled helper={`Salvo como ${TIMEZONE}`} />
          <div className="md:col-span-2">
            <TextArea label="Descrição curta" value={shortDescription} onChange={setShortDescription} />
          </div>
          <div className="md:col-span-2">
            <TextArea label="Descrição interna" value={description} onChange={setDescription} />
          </div>
        </div>
      </StepShell>
    );
  }

  function renderSessionsStep() {
    return (
      <StepShell eyebrow="Etapa 3" title="Datas" description="Datas obrigatórias, com soma menor ou igual à capacidade geral.">
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Início geral" value={startDate} onChange={setGeneralStart} type="datetime-local" required error={requiredErrors.sessions && !startDate} helper="Data e horário do início geral do evento." />
            <Field label="Fim geral" value={endDate} onChange={setGeneralEnd} type="datetime-local" required error={requiredErrors.sessions && !endDate} helper="Data e horário final geral do evento." />
          </div>
          <div className={`rounded-3xl border p-5 ${sessionError ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
            <div className="grid gap-4 md:grid-cols-3">
              <MiniStat label="Capacidade geral" value={capacity} />
              <MiniStat label="Soma das datas" value={sessionTotal} />
              <MiniStat label="Disponível" value={Math.max(generalCapacity - sessionTotal, 0)} />
            </div>
            {sessionError ? <p className="mt-4 text-sm font-black text-rose-700">{sessionError}</p> : null}
          </div>
          {sessions.map((session, index) => (
            <div key={session.localId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="mb-5 flex justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Data {index + 1}</p>
                  <h3 className="text-lg font-black">{session.name}</h3>
                </div>
                {sessions.length > 1 ? <button type="button" onClick={() => removeSession(session.localId)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600">Remover</button> : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Nome da data" value={session.name} onChange={(value) => updateSession(session.localId, { name: value })} />
                <Field label="Capacidade da data" value={session.capacity} onChange={(value) => updateSession(session.localId, { capacity: value })} onlyNumbers required helper="Calculada automaticamente pela capacidade geral ÷ número de datas. Pode editar, mas a soma das datas não pode ultrapassar o total." />
                <Field label="Início da sessão" value={session.startsAt} onChange={(value) => updateSession(session.localId, { startsAt: value, endsAt: value })} type="datetime-local" required helper="Data e horário de abertura desta sessão." />
                <Field label="Fim da sessão" value={session.endsAt} onChange={(value) => updateSession(session.localId, { endsAt: value })} type="datetime-local" required helper="Data e horário final desta sessão." />
                <div className="md:col-span-2">
                  <TextArea label="Descrição" value={session.description} onChange={(value) => updateSession(session.localId, { description: value })} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSession} className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700">
            + Adicionar outra data
          </button>
        </div>
      </StepShell>
    );
  }

  function renderMediaStep() {
    return (
      <StepShell eyebrow="Etapa 4" title="Imagens e políticas" description="Imagens obrigatórias, conteúdo e regras do evento.">
        <div className="grid gap-8">
          {mediaError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{mediaError}</div> : null}
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-2xl font-black">Imagens e vídeos</h3>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <MediaField label="Capa" kind="cover" value={coverImageUrl} onChange={setCoverImageUrl} required error={requiredErrors.media && !urlOrUndefined(coverImageUrl)} />
              <MediaField label="Banner" kind="banner" value={bannerImageUrl} onChange={setBannerImageUrl} required error={requiredErrors.media && !urlOrUndefined(bannerImageUrl)} />
              <MediaField label="Thumbnail" kind="thumbnail" value={thumbnailUrl} onChange={setThumbnailUrl} required error={requiredErrors.media && !urlOrUndefined(thumbnailUrl)} />
              <MediaField label="Banner mobile" kind="mobile-banner" value={mobileBannerUrl} onChange={setMobileBannerUrl} required error={requiredErrors.media && !urlOrUndefined(mobileBannerUrl)} />
              <MediaField label="Imagem do mapa/setor" kind="sector-map" value={sectorMapImageUrl} onChange={setSectorMapImageUrl} />
            </div>
            <div className="mt-5">
              <GalleryUploadField value={galleryText} onChange={setGalleryText} />
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <h3 className="text-2xl font-black">Conteúdo público</h3>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Chamada principal" value={headline} onChange={setHeadline} />
              <Field label="Resumo" value={summary} onChange={setSummary} />
              <div className="md:col-span-2">
                <TextArea label="Descrição completa" value={fullDescription} onChange={setFullDescription} />
              </div>
              <div className="md:col-span-2">
                <TextArea label="Sobre a produtora" value={producerDescription} onChange={() => undefined} disabled />
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">Políticas e regras</p>
              <h3 className="mt-2 text-2xl font-black">Regras visíveis para o comprador</h3>
              <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                Use esta área para explicar reembolso, transferência, meia-entrada, documentos e regras de entrada. O produtor pode deixar reembolso e transferência desligados quando não quiser oferecer essas opções no evento.
              </p>
            </div>

            <div className="grid gap-5 p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <Field label="Classificação indicativa" value={ageRating} onChange={setAgeRating} placeholder="Ex: Livre, 16 anos, 18 anos" />
                  <div className="mt-5 grid gap-3">
                    <label className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-black transition ${refundEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-700"}`}>
                      <input className="mt-1" type="checkbox" checked={refundEnabled} onChange={(event) => setRefundEnabled(event.target.checked)} />
                      <span>
                        Permitir reembolso neste evento
                        <small className="mt-1 block text-xs font-semibold text-slate-500">A política precisa respeitar as regras gerais da plataforma.</small>
                      </span>
                    </label>
                    <label className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-black transition ${transferEnabled ? "border-sky-200 bg-sky-50 text-sky-900" : "border-slate-200 bg-white text-slate-700"}`}>
                      <input className="mt-1" type="checkbox" checked={transferEnabled} onChange={(event) => setTransferEnabled(event.target.checked)} />
                      <span>
                        Permitir transferência neste evento
                        <small className="mt-1 block text-xs font-semibold text-slate-500">Quando ativo, o comprador poderá transferir o ingresso conforme as regras definidas.</small>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-sm font-black text-amber-950">Resumo operacional</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniStat label="Reembolso" value={refundEnabled ? "Ativo" : "Desligado"} />
                    <MiniStat label="Transferência" value={transferEnabled ? "Ativa" : "Desligada"} />
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-6 text-amber-900">
                    Campos vazios não bloqueiam a criação, mas deixam a página pública menos clara. Recomendado preencher meia-entrada, entrada e documentos.
                  </p>
                </div>
              </div>

              {(refundEnabled || transferEnabled) ? (
                <div className="grid gap-5 md:grid-cols-2">
                  {refundEnabled ? <TextArea label="Política de reembolso" value={refundPolicy} onChange={setRefundPolicy} /> : null}
                  {transferEnabled ? <TextArea label="Política de transferência" value={transferPolicy} onChange={setTransferPolicy} /> : null}
                </div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-2">
                <TextArea label="Política de meia-entrada" value={halfEntryPolicy} onChange={setHalfEntryPolicy} />
                <TextArea label="Documentos obrigatórios" value={documentRules} onChange={setDocumentRules} />
                <TextArea label="Regras de entrada" value={entryRules} onChange={setEntryRules} />
                <TextArea label="Termos e observações" value={termsNotes} onChange={setTermsNotes} />
              </div>
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderSectorsStep() {
    function calculatedStructuredCapacity(firstValue: string, secondValue: string) {
      const first = positiveIntOrZero(firstValue);
      const second = positiveIntOrZero(secondValue);

      if (first <= 0 || second <= 0) return 0;

      return first * second;
    }

    function sectorCapacity(sector: SectorItem) {
      if (sector.kind === "NUMBERED_SEATS") {
        return calculatedStructuredCapacity(sector.chairRows, sector.chairsPerRow);
      }

      if (sector.kind === "TABLES") {
        return calculatedStructuredCapacity(sector.tableCount, sector.seatsPerTable);
      }

      return toNumber(sector.capacity);
    }

    function changeSectorKind(localId: string, kind: SectorKind) {
      updateSector(localId, { kind });
    }

    function passportReserveForSectorForm(sector: SectorItem) {
      return cappedPassportReserve({
        capacity: String(sectorCapacity(sector)),
        passportEnabled: sector.passportEnabled,
        passportCapacity: sector.passportCapacity,
      });
    }

    function updatePassportCapacity(sector: SectorItem, value: string) {
      const cleanValue = onlyDigits(value);
      const maxAllowed = sectorCapacity(sector);
      const nextValue = cleanValue && maxAllowed > 0 ? String(Math.min(toNumber(cleanValue), maxAllowed)) : cleanValue;

      updateSector(sector.localId, { passportCapacity: nextValue });
    }

    function updateChairRows(sector: SectorItem, value: string) {
      const chairRows = onlyDigits(value);
      const nextCapacity = calculatedStructuredCapacity(chairRows, sector.chairsPerRow);
      const patch: Partial<SectorItem> = {
        chairRows,
        capacity: nextCapacity > 0 ? String(nextCapacity) : "",
      };

      if (sector.passportEnabled && toNumber(sector.passportCapacity) > nextCapacity) {
        patch.passportCapacity = nextCapacity > 0 ? String(nextCapacity) : "";
      }

      updateSector(sector.localId, patch);
    }

    function updateChairsPerRow(sector: SectorItem, value: string) {
      const chairsPerRow = onlyDigits(value);
      const nextCapacity = calculatedStructuredCapacity(sector.chairRows, chairsPerRow);
      const patch: Partial<SectorItem> = {
        chairsPerRow,
        capacity: nextCapacity > 0 ? String(nextCapacity) : "",
      };

      if (sector.passportEnabled && toNumber(sector.passportCapacity) > nextCapacity) {
        patch.passportCapacity = nextCapacity > 0 ? String(nextCapacity) : "";
      }

      updateSector(sector.localId, patch);
    }

    function updateTableCount(sector: SectorItem, value: string) {
      const tableCount = onlyDigits(value);
      const nextCapacity = calculatedStructuredCapacity(tableCount, sector.seatsPerTable);
      const patch: Partial<SectorItem> = {
        tableCount,
        capacity: nextCapacity > 0 ? String(nextCapacity) : "",
      };

      if (sector.passportEnabled && toNumber(sector.passportCapacity) > nextCapacity) {
        patch.passportCapacity = nextCapacity > 0 ? String(nextCapacity) : "";
      }

      updateSector(sector.localId, patch);
    }

    function updateSeatsPerTable(sector: SectorItem, value: string) {
      const seatsPerTable = onlyDigits(value);
      const nextCapacity = calculatedStructuredCapacity(sector.tableCount, seatsPerTable);
      const patch: Partial<SectorItem> = {
        seatsPerTable,
        capacity: nextCapacity > 0 ? String(nextCapacity) : "",
      };

      if (sector.passportEnabled && toNumber(sector.passportCapacity) > nextCapacity) {
        patch.passportCapacity = nextCapacity > 0 ? String(nextCapacity) : "";
      }

      updateSector(sector.localId, patch);
    }

    function renderStructuredFields(sector: SectorItem) {
      if (sector.kind === "NUMBERED_SEATS") {
        const chairRows = sector.chairRows;
        const chairsPerRow = sector.chairsPerRow;
        const total = calculatedStructuredCapacity(chairRows, chairsPerRow);

        return (
          <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5 md:col-span-2">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Configuração das cadeiras</p>
                <h4 className="mt-1 text-lg font-black text-slate-950">Fileiras e cadeiras por fileira</h4>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-sky-900">
                  A capacidade será calculada automaticamente por fileiras x cadeiras por fileira.
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Capacidade automática</p>
                <p className="mt-1 text-xl font-black text-slate-950">{total > 0 ? `${total} cadeiras` : "Preencha os campos"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Quantidade de fileiras" value={chairRows} onChange={(value) => updateChairRows(sector, value)} onlyNumbers required />
              <Field label="Cadeiras por fileira" value={chairsPerRow} onChange={(value) => updateChairsPerRow(sector, value)} onlyNumbers required />
              <Field label="Total de cadeiras" value={total > 0 ? String(total) : ""} onChange={() => undefined} disabled />
            </div>
          </div>
        );
      }

      if (sector.kind === "TABLES") {
        const tableCountValue = sector.tableCount;
        const seatsPerTableValue = sector.seatsPerTable;
        const total = calculatedStructuredCapacity(tableCountValue, seatsPerTableValue);

        return (
          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 md:col-span-2">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Configuração das mesas</p>
                <h4 className="mt-1 text-lg font-black text-slate-950">Mesas e cadeiras por mesa</h4>
                <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-amber-900">
                  A capacidade será calculada automaticamente por mesas x cadeiras por mesa.
                </p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Capacidade automática</p>
                <p className="mt-1 text-xl font-black text-slate-950">{total > 0 ? `${total} lugares` : "Preencha os campos"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Quantidade de mesas" value={tableCountValue} onChange={(value) => updateTableCount(sector, value)} onlyNumbers required />
              <Field label="Cadeiras por mesa" value={seatsPerTableValue} onChange={(value) => updateSeatsPerTable(sector, value)} onlyNumbers required />
              <Field label="Capacidade total" value={total > 0 ? String(total) : ""} onChange={() => undefined} disabled />
            </div>
          </div>
        );
      }

      return null;
    }

    return (
      <StepShell eyebrow="Etapa 5" title={isOpenOnly ? "Área única do evento" : "Setores / áreas"} description="Configure os setores permitidos.">
        <div className={`mb-6 rounded-3xl border p-5 ${sectorError ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat label="Capacidade geral" value={capacity} />
            <MiniStat label="Soma dos setores" value={sectorTotal} />
            <MiniStat label="Disponível" value={Math.max(generalCapacity - sectorTotal, 0)} />
          </div>
          {sectorError ? <p className="mt-4 text-sm font-black text-rose-700">{sectorError}</p> : null}
        </div>
        <div className="space-y-4">
          {sectors.map((sector, index) => {
            const usedColors = sectors.filter((item) => item.localId !== sector.localId).map((item) => item.color);
            const isStructured = sector.kind === "NUMBERED_SEATS" || sector.kind === "TABLES";
            const structuredCapacity = sectorCapacity(sector);

            return (
              <div key={sector.localId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-5 flex justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Setor {index + 1}</p>
                    <h3 className="text-lg font-black">{sector.name}</h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-sky-700">{KIND_LABEL[sector.kind]}</p>
                  </div>
                  {sectors.length > 1 ? <button type="button" onClick={() => removeSector(sector.localId)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600">Remover</button> : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome" value={sector.name} onChange={(value) => updateSector(sector.localId, { name: value })} />
                  <Select
                    label="Tipo do setor"
                    value={sector.kind}
                    onChange={(value) => changeSectorKind(sector.localId, value as SectorKind)}
                    disabled={preset.sectorKinds.length === 1}
                    options={preset.sectorKinds.map((kind) => ({ label: KIND_LABEL[kind], value: kind }))}
                  />
                  {isStructured ? (
                    <Field label="Capacidade" value={String(structuredCapacity)} onChange={() => undefined} disabled helper={sector.kind === "NUMBERED_SEATS" ? "Calculada por fileiras x cadeiras por fileira." : "Calculada por mesas x cadeiras por mesa."} />
                  ) : (
                    <Field label="Capacidade" value={sector.capacity} onChange={(value) => updateSector(sector.localId, { capacity: value })} onlyNumbers />
                  )}
                  <div>
                    <label className="mb-2 block text-sm font-black text-slate-700">Cor do setor</label>
                    <div className="grid grid-cols-5 gap-2">
                      {COLORS.map((color) => {
                        const disabled = color !== sector.color && usedColors.includes(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            disabled={disabled}
                            onClick={() => updateSector(sector.localId, { color })}
                            className={`h-11 rounded-2xl border ${sector.color === color ? "ring-4 ring-slate-200" : ""} ${disabled ? "opacity-25" : ""}`}
                            style={{ backgroundColor: color }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  {renderStructuredFields(sector)}
                  <div className="md:col-span-2 rounded-3xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">Passaporte</p>
                        <h4 className="mt-1 text-lg font-black text-slate-950">Reservar ingressos deste setor para passaporte</h4>
                        <p className="mt-1 text-sm font-semibold leading-6 text-amber-900">
                          Marque somente se este setor puder vender passaporte. A quantidade reservada sai da venda normal de Inteira, Meia e Social.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateSector(sector.localId, {
                            passportEnabled: !sector.passportEnabled,
                            passportCapacity: sector.passportEnabled ? "" : sector.passportCapacity,
                          })
                        }
                        className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                          sector.passportEnabled
                            ? "bg-amber-600 text-white hover:bg-amber-700"
                            : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-100"
                        }`}
                      >
                        {sector.passportEnabled ? "Passaporte marcado" : "Marcar passaporte"}
                      </button>
                    </div>

                    {sector.passportEnabled ? (
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <Field
                          label="Ingressos reservados"
                          value={sector.passportCapacity}
                          onChange={(value) => updatePassportCapacity(sector, value)}
                          onlyNumbers
                          placeholder="Ex: 500"
                          helper={`Máximo deste setor: ${sectorCapacity(sector) || 0}. Reservado agora: ${passportReserveForSectorForm(sector)}.`}
                        />
                        <MiniStat label="Venda normal" value={Math.max(sectorCapacity(sector) - passportReserveForSectorForm(sector), 0)} />
                        <MiniStat label="Passaporte" value={passportReserveForSectorForm(sector)} />
                      </div>
                    ) : null}
                  </div>
                  <Field label="Portão de acesso" value={sector.gateName} onChange={(value) => updateSector(sector.localId, { gateName: value })} />
                  <div className="md:col-span-2">
                    <TextArea label="Descrição" value={sector.description} onChange={(value) => updateSector(sector.localId, { description: value })} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {preset.multiple ? (
          <button type="button" onClick={addSector} className="mt-5 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700">
            + Adicionar setor ou área
          </button>
        ) : null}
      </StepShell>
    );
  }

  function getMetadataNumber(object: MapObject, key: string, fallback = 0) {
    const value = object.metadata?.[key];

    if (typeof value === "number") return value;

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10);
      return Number.isNaN(parsed) ? fallback : parsed;
    }

    return fallback;
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

  function isWholeDotInsidePolygon(
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

  function mapCapacityLabel(object: MapObject) {
    const sectorKind = String(object.metadata?.sectorKind || "");

    if (sectorKind === "NUMBERED_SEATS") {
      const chairRows = getMetadataNumber(object, "chairRows", 0);
      const chairsPerRow = getMetadataNumber(object, "chairsPerRow", 0);
      const chairCount = getMetadataNumber(
        object,
        "chairCount",
        chairRows * chairsPerRow || toNumber(object.capacity),
      );

      return chairRows > 0 && chairsPerRow > 0
        ? `${chairCount} cadeiras • ${chairRows}x${chairsPerRow}`
        : `${chairCount} cadeiras`;
    }

    if (sectorKind === "TABLES") {
      const tableCount = getMetadataNumber(object, "tableCount", 0);
      const seats = getMetadataNumber(object, "seatsPerTable", 0);

      if (tableCount > 0 && seats > 0) {
        return `${tableCount} mesas • ${seats} lugares`;
      }

      return `${object.capacity || 0} lugares`;
    }

    return `${object.capacity || 0} pessoas`;
  }

  function renderMapGuides() {
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

  function renderSeatIcon(size: number, innerSize: number, left: number, top: number, key: string) {
    return (
      <span
        key={key}
        className="absolute flex items-center justify-center"
        style={{
          left: left - size / 2,
          top: top - size / 2,
          width: size,
          height: size,
        }}
      >
        <span
          className="relative block rounded-[35%] bg-white/95 shadow"
          style={{ width: size, height: size }}
        >
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

  function renderTableIcon(size: number, innerSize: number, left: number, top: number, key: string) {
    return (
      <span
        key={key}
        className="absolute flex items-center justify-center"
        style={{
          left: left - size / 2,
          top: top - size / 2,
          width: size,
          height: size,
        }}
      >
        <span
          className="relative block rounded-full bg-white/95 shadow"
          style={{ width: size, height: size }}
        >
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

  function renderInternalSeatPreview(object: MapObject) {
    const rows = getMetadataNumber(object, "chairRows", 0);
    const columns = getMetadataNumber(object, "chairsPerRow", 0);
    const chairCount = getMetadataNumber(object, "chairCount", rows * columns);

    if (rows <= 0 || columns <= 0 || chairCount <= 0) return null;

    const isFree = objectShape(object) === "FREEFORM";
    const polygon = objectPoints(object);
    const labelHeight = 42;
    const inset = 14;
    const gridX = inset;
    const gridY = inset;
    const gridW = Math.max(40, object.width - inset * 2);
    const gridH = Math.max(30, object.height - inset * 2 - labelHeight);
    const cellW = gridW / columns;
    const cellH = gridH / rows;
    const iconSize = Math.max(3, Math.min(18, Math.floor(Math.min(cellW, cellH) * 0.72)));
    const innerSize = Math.max(1, Math.floor(iconSize * 0.42));
    const radiusXPercent = ((iconSize / 2) / object.width) * 100;
    const radiusYPercent = ((iconSize / 2) / object.height) * 100;
    const maxPreview = Math.min(chairCount, rows * columns, 2500);

    const chairs = Array.from({ length: maxPreview })
      .map((_, chairIndex) => {
        const row = Math.floor(chairIndex / columns);
        const column = chairIndex % columns;
        const left = gridX + column * cellW + cellW / 2;
        const top = gridY + row * cellH + cellH / 2;
        const centerX = (left / object.width) * 100;
        const centerY = (top / object.height) * 100;

        if (left - iconSize / 2 < inset || left + iconSize / 2 > object.width - inset) return null;
        if (top - iconSize / 2 < inset || top + iconSize / 2 > object.height - inset - labelHeight) return null;

        if (isFree && !isWholeDotInsidePolygon(centerX, centerY, radiusXPercent, radiusYPercent, polygon)) {
          return null;
        }

        return { chairIndex, left, top };
      })
      .filter((chair): chair is { chairIndex: number; left: number; top: number } => Boolean(chair));

    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-3 overflow-hidden rounded-2xl bg-black/5"
          style={isFree ? { clipPath: `polygon(${cssPoints(object)})` } : undefined}
        >
          {chairs.map((chair) =>
            renderSeatIcon(
              iconSize,
              innerSize,
              chair.left,
              chair.top,
              `chair-${object.localId}-${chair.chairIndex}`,
            ),
          )}
        </div>
      </div>
    );
  }

  function renderInternalTablePreview(object: MapObject) {
    const tableCount = getMetadataNumber(object, "tableCount", 0);

    if (tableCount <= 0) return null;

    const isFree = objectShape(object) === "FREEFORM";
    const polygon = objectPoints(object);
    const labelHeight = 42;
    const inset = 14;
    const gridX = inset;
    const gridY = inset;
    const gridW = Math.max(40, object.width - inset * 2);
    const gridH = Math.max(30, object.height - inset * 2 - labelHeight);
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
    const radiusXPercent = ((iconSize / 2) / object.width) * 100;
    const radiusYPercent = ((iconSize / 2) / object.height) * 100;
    const maxPreview = Math.min(tableCount, rows * columns, 2500);

    const tables = Array.from({ length: maxPreview })
      .map((_, tableIndex) => {
        const row = Math.floor(tableIndex / columns);
        const column = tableIndex % columns;
        const left = gridX + column * cellW + cellW / 2;
        const top = gridY + row * cellH + cellH / 2;
        const centerX = (left / object.width) * 100;
        const centerY = (top / object.height) * 100;

        if (left - iconSize / 2 < inset || left + iconSize / 2 > object.width - inset) return null;
        if (top - iconSize / 2 < inset || top + iconSize / 2 > object.height - inset - labelHeight) return null;

        if (isFree && !isWholeDotInsidePolygon(centerX, centerY, radiusXPercent, radiusYPercent, polygon)) {
          return null;
        }

        return { tableIndex, left, top };
      })
      .filter((table): table is { tableIndex: number; left: number; top: number } => Boolean(table));

    return (
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
        <div
          className="absolute inset-3 overflow-hidden rounded-2xl bg-black/5"
          style={isFree ? { clipPath: `polygon(${cssPoints(object)})` } : undefined}
        >
          {tables.map((table) =>
            renderTableIcon(
              iconSize,
              innerSize,
              table.left,
              table.top,
              `table-${object.localId}-${table.tableIndex}`,
            ),
          )}
        </div>
      </div>
    );
  }

  function renderInternalObjectPreview(object: MapObject) {
    const sectorKind = String(object.metadata?.sectorKind || "");

    if (sectorKind === "NUMBERED_SEATS") {
      return renderInternalSeatPreview(object);
    }

    if (sectorKind === "TABLES") {
      return renderInternalTablePreview(object);
    }

    return null;
  }

  function renderMapStep() {
    const selected = mapObjects.find((item) => item.localId === selectedMapObjectId) || null;
    const selectedIsFreeform = selected ? objectShape(selected) === "FREEFORM" : false;

    return (
      <StepShell
        eyebrow="Etapa 6"
        title="Mapa do evento"
        description="Use a maior área possível para montar o mapa. Arraste blocos, redimensione, use guias e crie pontos no formato quebrado."
      >
        <div className="grid gap-4">
          {requiredErrors.map ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
              Gere o mapa para continuar.
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-2 shadow-sm md:p-3">
            <div className="mb-3 flex flex-col justify-between gap-3 xl:flex-row xl:items-center">
              <div>
                <h3 className="text-lg font-black text-slate-950">Área de criação do mapa</h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {selected
                    ? `Selecionado: ${selected.label}. Dê duplo clique dentro do bloco para criar um ponto no lugar exato.`
                    : "Clique em Gerar mapa em blocos para começar. Depois selecione um setor para editar formato e pontos."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={generateMap}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
                >
                  Gerar mapa em blocos
                </button>

                {mapObjects.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMapObjects([]);
                      setSelectedMapObjectId("");
                      setInteraction(null);
                    }}
                    className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-600 hover:bg-rose-50"
                  >
                    Limpar mapa
                  </button>
                ) : null}
              </div>
            </div>

            {selected ? (
              <div className="mb-3 rounded-3xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-col justify-between gap-3 2xl:flex-row 2xl:items-center">
                  <div className="flex flex-wrap gap-2">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape.value}
                        type="button"
                        onClick={() => setShape(selected.localId, shape.value)}
                        className={`rounded-2xl px-4 py-2 text-xs font-black ${
                          objectShape(selected) === shape.value
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>

                  {selectedIsFreeform ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={addPoint} className="rounded-2xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700">
                        + Ponto no maior lado
                      </button>
                      <button type="button" onClick={removePoint} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                        Remover último ponto
                      </button>
                      <button type="button" onClick={toggleSmoothPolygon} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">
                        {shouldSmoothObject(selected) ? "Deixar pontudo" : "Arredondar pontos"}
                      </button>
                      <button type="button" onClick={resetPolygon} className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50">
                        Resetar formato
                      </button>
                    </div>
                  ) : null}
                </div>

                {selectedIsFreeform ? (
                  <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                    Dica: dê duplo clique no lugar exato onde quer um ponto novo. Depois arraste a bolinha azul para criar recortes, curvas suaves e setores irregulares.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="h-[78vh] min-h-[720px] max-h-[900px] max-w-full overflow-auto rounded-3xl bg-slate-100 p-2 md:p-3">
              {mapObjects.length === 0 ? (
                <div className="flex h-[700px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
                  <div>
                    <p className="text-lg font-black text-slate-950">Nenhum bloco criado ainda</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Clique em “Gerar mapa em blocos”.</p>
                  </div>
                </div>
              ) : (
                <div
                  className="relative mx-auto touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50 to-slate-200 shadow-inner"
                  style={{ width: MAP_W, height: MAP_H }}
                  onPointerMove={dragMove}
                  onPointerUp={() => setInteraction(null)}
                  onPointerLeave={() => setInteraction(null)}
                  onPointerCancel={() => setInteraction(null)}
                  onPointerDown={() => setSelectedMapObjectId("")}
                >
                  {renderMapGuides()}
                  <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
                    Guia 40px • forte 120px • duplo clique cria ponto
                  </div>
                  <div className="absolute rounded-t-[2rem] bg-white/70 shadow-inner" style={{ left: MAP_W / 2 - 45, top: 150, width: 90, height: 680 }} />

                  {mapObjects.map((object) => {
                    const sector = sectors.find((item) => item.localId === object.venueSectorLocalId);
                    const bg = sector?.color || String(object.metadata?.sectorColor || "#111827");
                    const isSelected = selectedMapObjectId === object.localId;
                    const isFree = objectShape(object) === "FREEFORM";
                    const isStage = object.type === "STAGE";
                    const points = objectPoints(object);
                    const sectorKindLabel = isStage ? "Palco" : sector ? KIND_LABEL[sector.kind] : "Setor";

                    return (
                      <div
                        key={object.localId}
                        data-map-object-id={object.localId}
                        onPointerDown={(event) => startMove(event, object)}
                        onDoubleClick={(event) => {
                          if (!isStage) {
                            event.preventDefault();
                            event.stopPropagation();
                            addPointAtPosition(object, event.clientX, event.clientY);
                          }
                        }}
                        className={`absolute cursor-move select-none ${isSelected ? "z-20" : "z-10"}`}
                        style={{
                          left: object.x,
                          top: object.y,
                          width: object.width,
                          height: object.height,
                          transform: `rotate(${object.rotation}deg)`,
                          outline: isSelected ? "3px solid rgba(56, 189, 248, 0.65)" : undefined,
                          outlineOffset: 4,
                        }}
                      >
                        {isFree ? (
                          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
                            {shouldSmoothObject(object) ? (
                              <path d={smoothSvgPath(object)} fill={bg} stroke={isSelected ? "#38bdf8" : "#ffffff"} strokeWidth="5" filter="drop-shadow(0px 12px 12px rgba(15,23,42,0.25))" />
                            ) : (
                              <polygon points={svgPoints(object)} fill={bg} stroke={isSelected ? "#38bdf8" : "#ffffff"} strokeWidth="5" filter="drop-shadow(0px 12px 12px rgba(15,23,42,0.25))" />
                            )}
                          </svg>
                        ) : (
                          <div className={`absolute inset-0 border-4 shadow-xl ${isStage ? "border-slate-950 bg-slate-950" : "border-white"}`} style={{ backgroundColor: bg, borderRadius: radius(object) }} />
                        )}

                        {!isStage ? renderInternalObjectPreview(object) : null}

                        {isStage ? (
                          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white">
                            <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">Palco</span>
                            <strong className="mt-2 px-3 text-2xl font-black uppercase leading-none">{object.label}</strong>
                          </div>
                        ) : (
                          <div
                            className="pointer-events-none absolute inset-x-3 bottom-3 z-10 rounded-2xl bg-slate-950/80 px-2 py-1.5 text-center text-white shadow-lg backdrop-blur-sm"
                            style={isFree ? { clipPath: `polygon(${cssPoints(object)})` } : undefined}
                          >
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/70">{sectorKindLabel}</p>
                            <p className="mt-0.5 truncate text-xs font-black uppercase leading-tight">{object.label}</p>
                            <p className="mt-0.5 truncate text-[9px] font-black text-white/80">{mapCapacityLabel(object)}</p>
                          </div>
                        )}

                        {isSelected && isFree
                          ? points.map((point, index) => (
                              <button
                                key={index}
                                type="button"
                                aria-label={`Mover ponto ${index + 1}`}
                                onPointerDown={(event) => startPoint(event, object, index)}
                                className="absolute z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-sky-500 shadow"
                                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                              />
                            ))
                          : null}

                        {isSelected ? (
                          <>
                            <button type="button" aria-label="Redimensionar canto superior esquerdo" onPointerDown={(event) => startResize(event, object, "nw")} className="absolute -left-3 -top-3 z-30 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                            <button type="button" aria-label="Redimensionar canto superior direito" onPointerDown={(event) => startResize(event, object, "ne")} className="absolute -right-3 -top-3 z-30 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                            <button type="button" aria-label="Redimensionar canto inferior esquerdo" onPointerDown={(event) => startResize(event, object, "sw")} className="absolute -bottom-3 -left-3 z-30 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                            <button type="button" aria-label="Redimensionar canto inferior direito" onPointerDown={(event) => startResize(event, object, "se")} className="absolute -bottom-3 -right-3 z-30 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderTicketsStep() {
    function sectorTicketId(sector: SectorItem) {
      return isOpenOnly ? "" : sector.localId;
    }

    function isPassportTicket(ticket: TicketItem) {
      return !ticket.eventSessionLocalId;
    }

    function ticketGroupId(ticket: TicketItem) {
      return `${ticket.eventSessionLocalId || "passport"}::${ticket.venueSectorLocalId || "open"}::${ticket.ticketKind}`;
    }

    function sameTicketGroup(a: TicketItem, b: TicketItem) {
      return ticketGroupId(a) === ticketGroupId(b);
    }

    function groupTickets(list: TicketItem[]) {
      const groups = new Map<string, TicketItem[]>();

      list.forEach((ticket) => {
        const key = ticketGroupId(ticket);
        const current = groups.get(key) || [];
        current.push(ticket);
        groups.set(key, current);
      });

      return Array.from(groups.values()).map((group) =>
        group.sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel)),
      );
    }

    function normalizeTicketList(list: TicketItem[]) {
      const byLot = new Map<string, TicketItem>();

      list.forEach((ticket) => {
        const key = `${ticketGroupId(ticket)}::${lotNumber(ticket.lotLabel) || ticket.lotLabel}`;
        byLot.set(key, ticket);
      });

      return Array.from(byLot.values());
    }

    function sessionLabel(sessionId: string) {
      if (!sessionId) return "Passaporte";
      return sessions.find((session) => session.localId === sessionId)?.name || "Data";
    }

    function sectorLabel(sectorId: string) {
      if (isOpenOnly || !sectorId) return "Área única";
      return sectors.find((sector) => sector.localId === sectorId)?.name || "Setor";
    }

    function selectedSectorForTicket(sectorId: string) {
      return isOpenOnly ? sectors[0] : sectors.find((item) => item.localId === sectorId);
    }

    function sectorPassportReserve(sectorId: string) {
      return cappedPassportReserve(selectedSectorForTicket(sectorId));
    }

    function sectorCapacityForSession(sessionId: string, sectorId: string) {
      const session = sessions.find((item) => item.localId === sessionId);
      const sessionCapacity = positiveIntOrZero(session?.capacity || capacity);

      if (sessionCapacity <= 0) return 0;

      if (isOpenOnly) {
        return sessionCapacity;
      }

      const sector = selectedSectorForTicket(sectorId);
      const sectorTotalCapacity = positiveIntOrZero(sector?.capacity);
      const eventCapacity = Math.max(positiveIntOrZero(capacity), 1);

      if (!sector || sectorTotalCapacity <= 0) return 0;

      const realSectors = sectors.filter((item) => positiveIntOrZero(item.capacity) > 0);
      const totalSectorCapacity = realSectors.reduce((sum, item) => sum + positiveIntOrZero(item.capacity), 0);
      const targetTotalForDate = Math.min(
        sessionCapacity,
        Math.round((Math.min(totalSectorCapacity, eventCapacity) / eventCapacity) * sessionCapacity),
      );

      if (targetTotalForDate <= 0) return 0;

      const rawAllocations = realSectors.map((item, index) => {
        const raw = (positiveIntOrZero(item.capacity) / eventCapacity) * sessionCapacity;
        const base = Math.floor(raw);

        return {
          localId: item.localId,
          index,
          base,
          rest: raw - base,
        };
      });
      const baseTotal = rawAllocations.reduce((sum, item) => sum + item.base, 0);
      const missing = Math.max(targetTotalForDate - baseTotal, 0);
      const winners = new Set(
        [...rawAllocations]
          .sort((a, b) => b.rest - a.rest || a.index - b.index)
          .slice(0, missing)
          .map((item) => item.localId),
      );
      const allocation = rawAllocations.find((item) => item.localId === sectorId);

      if (!allocation) return 0;

      return allocation.base + (winners.has(sectorId) ? 1 : 0);
    }

    function sessionSectorPhysicalCapacity(sessionId: string, sectorId: string) {
      return sectorCapacityForSession(sessionId, sectorId);
    }

    function passportReserveForSessionSector(sessionId: string, sectorId: string) {
      return Math.min(sectorPassportReserve(sectorId), sessionSectorPhysicalCapacity(sessionId, sectorId));
    }

    function normalAvailableForSessionSector(sessionId: string, sectorId: string) {
      return Math.max(sessionSectorPhysicalCapacity(sessionId, sectorId) - passportReserveForSessionSector(sessionId, sectorId), 0);
    }

    function passportAvailableForSector(sectorId: string) {
      const reserve = sectorPassportReserve(sectorId);

      if (reserve <= 0) return 0;

      const values = sessions.map((session) => passportReserveForSessionSector(session.localId, sectorId));
      const physicalLimit = values.length ? Math.min(...values) : reserve;

      return Math.min(reserve, physicalLimit);
    }

    function availableForSessionSector(sessionId: string, sectorId: string) {
      if (!sessionId) {
        return passportAvailableForSector(sectorId);
      }

      return normalAvailableForSessionSector(sessionId, sectorId);
    }

    function passportCreatedForSessionSector(sessionId: string, sectorId: string, exceptTicketId = "") {
      return tickets
        .filter((ticket) =>
          ticket.localId !== exceptTicketId &&
          ticket.eventSessionLocalId === "" &&
          ticket.venueSectorLocalId === sectorId,
        )
        .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);
    }

    function kindCapacityForSessionSector(sessionId: string, sectorId: string, ticketKind: TicketKind, exceptTicketId = "") {
      const sellableForDate = availableForSessionSector(sessionId, sectorId);
      const kindIndex = Math.max(0, TICKET_KIND_OPTIONS.findIndex((option) => option.value === ticketKind));

      return splitCapacityByIndex(sellableForDate, TICKET_KIND_OPTIONS.length, kindIndex);
    }

    function createdForSessionSectorKind(sessionId: string, sectorId: string, ticketKind: TicketKind, exceptTicketId = "") {
      return tickets
        .filter((ticket) =>
          ticket.localId !== exceptTicketId &&
          ticket.eventSessionLocalId === sessionId &&
          ticket.venueSectorLocalId === sectorId &&
          ticket.ticketKind === ticketKind,
        )
        .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);
    }

    function remainingForSessionSectorKind(sessionId: string, sectorId: string, ticketKind: TicketKind, exceptTicketId = "") {
      const capacityForKind = kindCapacityForSessionSector(sessionId, sectorId, ticketKind, exceptTicketId);
      const createdForKind = createdForSessionSectorKind(sessionId, sectorId, ticketKind, exceptTicketId);

      return Math.max(capacityForKind - createdForKind, 0);
    }

    function createdForSessionSector(sessionId: string, sectorId: string, exceptTicketId = "") {
      if (!sessionId) {
        return tickets
          .filter((ticket) =>
            ticket.localId !== exceptTicketId &&
            ticket.eventSessionLocalId === "" &&
            ticket.venueSectorLocalId === sectorId,
          )
          .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);
      }

      return tickets
        .filter((ticket) =>
          ticket.localId !== exceptTicketId &&
          ticket.venueSectorLocalId === sectorId &&
          ticket.eventSessionLocalId === sessionId,
        )
        .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);
    }

    function remainingForSessionSector(sessionId: string, sectorId: string, exceptTicketId = "") {
      if (!sessionId) {
        return Math.max(passportAvailableForSector(sectorId) - passportCreatedForSessionSector("", sectorId, exceptTicketId), 0);
      }

      return Math.max(
        availableForSessionSector(sessionId, sectorId) - createdForSessionSector(sessionId, sectorId, exceptTicketId),
        0,
      );
    }

    function groupLimit(ticket: TicketItem) {
      return tickets.find((item) => sameTicketGroup(item, ticket) && lotNumber(item.lotLabel) === 1)?.maxPerOrder || ticket.maxPerOrder;
    }

    function updateGroupMax(ticket: TicketItem, value: string) {
      const nextValue = onlyDigits(value);
      setTickets((current) =>
        current.map((item) => (sameTicketGroup(item, ticket) ? { ...item, maxPerOrder: nextValue } : item)),
      );
    }

    function lotLimitDate(sessionId: string) {
      if (!sessionId) {
        return sessions
          .map((item) => inputDateDay(item.startsAt))
          .filter(Boolean)
          .sort()[0] || inputDateDay(endDate);
      }

      return inputDateDay(sessions.find((item) => item.localId === sessionId)?.startsAt || endDate);
    }

    function daysUntilInputDate(value: string) {
      const day = inputDateDay(value);

      if (!day) return 0;

      const todayDate = new Date(`${inputDateToday()}T00:00:00`);
      const targetDate = new Date(`${day}T00:00:00`);
      const diff = Math.ceil((targetDate.getTime() - todayDate.getTime()) / 86400000);

      return Math.max(diff, 0);
    }

    function recommendedLotInterval() {
      const firstSessionStart = sessions
        .map((session) => session.startsAt)
        .filter(Boolean)
        .sort()[0] || startDate;
      const daysUntilFirstEvent = daysUntilInputDate(firstSessionStart);
      const firstSessionId = sessions[0]?.localId || "";
      const lotCounts = visibleSectors.flatMap((sector) =>
        TICKET_KIND_OPTIONS.map((option) => {
          const sectorId = sectorTicketId(sector);
          const config = getAutomationConfig(firstSessionId, sectorId, option.value);
          return positiveInt(config.lotCount, 3);
        }),
      );
      const lotCountBase = Math.max(1, Math.max(...lotCounts, 3));
      const recommended = Math.max(1, Math.floor(daysUntilFirstEvent / lotCountBase));

      return {
        daysUntilFirstEvent,
        lotCountBase,
        recommended,
      };
    }

    function ticketKindBadge(kind: TicketKind) {
      if (kind === "INTEIRA") return "Inteira";
      if (kind === "MEIA") return "Meia";
      return "Social";
    }

    function automationKey(sessionId: string, sectorId: string, ticketKind: TicketKind) {
      return `${sessionId || "passport"}::${sectorId || "open"}::${ticketKind}`;
    }

    function defaultAutomationConfig(sessionId: string, sectorId: string, ticketKind: TicketKind): TicketAutomationConfig {
      const existingGroup = tickets
        .filter((ticket) =>
          ticket.eventSessionLocalId === sessionId &&
          ticket.venueSectorLocalId === sectorId &&
          ticket.ticketKind === ticketKind,
        )
        .sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel));
      const first = existingGroup[0];
      const limit = lotLimitDate(sessionId);
      const defaultStart = inputDateDay(first?.salesStartAt || inputDateToday());
      const available = Math.max(kindCapacityForSessionSector(sessionId, sectorId, ticketKind), 1);

      return {
        lotCount: existingGroup.length > 0 ? String(existingGroup.length) : "3",
        lotQuantity: String(Math.ceil(available / Math.max(3, 1))),
        firstPrice: first?.price || (ticketKind === "INTEIRA" ? "100" : ticketKind === "MEIA" ? "50" : "70"),
        priceStep: "200",
        intervalDays: ticketLotIntervalDays || "20",
        maxPerOrder: "",
        salesStartAt: defaultStart && limit && defaultStart > limit ? inputDateToday() : defaultStart,
      };
    }

    function getAutomationConfig(sessionId: string, sectorId: string, ticketKind: TicketKind) {
      const key = automationKey(sessionId, sectorId, ticketKind);
      const directConfig = ticketAutomationConfigs[key];

      if (directConfig) return directConfig;

      const firstSessionId = sessions[0]?.localId || "";

      if (sessionId && firstSessionId && sessionId !== firstSessionId) {
        const firstKey = automationKey(firstSessionId, sectorId, ticketKind);
        const firstConfig = ticketAutomationConfigs[firstKey] || defaultAutomationConfig(firstSessionId, sectorId, ticketKind);

        return {
          ...firstConfig,
          salesStartAt: inputDateDay(firstConfig.salesStartAt || inputDateToday()),
        };
      }

      return defaultAutomationConfig(sessionId, sectorId, ticketKind);
    }

    function updateAutomationConfig(sessionId: string, sectorId: string, ticketKind: TicketKind, patch: Partial<TicketAutomationConfig>) {
      const key = automationKey(sessionId, sectorId, ticketKind);
      const current = getAutomationConfig(sessionId, sectorId, ticketKind);
      const nextConfig = {
        ...current,
        ...patch,
      };
      const firstSessionId = sessions[0]?.localId || "";
      const isFirstSession = Boolean(sessionId && firstSessionId && sessionId === firstSessionId);
      const targetSessions = isFirstSession ? sessions.map((session) => session.localId) : [sessionId];
      const shouldReplicateLotCount = patch.lotCount !== undefined;
      const shouldReplicatePriceStep = patch.priceStep !== undefined;
      const shouldReplicateFirstDateConfig = isFirstSession && (
        patch.firstPrice !== undefined ||
        patch.salesStartAt !== undefined ||
        patch.lotCount !== undefined ||
        patch.priceStep !== undefined
      );

      if (shouldReplicateLotCount || shouldReplicatePriceStep || shouldReplicateFirstDateConfig) {
        setTicketAutomationConfigs((configs) => {
          const nextConfigs = {
            ...configs,
            [key]: nextConfig,
          };

          targetSessions.forEach((targetSessionId) => {
            if (shouldReplicateLotCount || shouldReplicatePriceStep) {
              TICKET_KIND_OPTIONS.forEach((option) => {
                const targetKey = automationKey(targetSessionId, sectorId, option.value);
                const base =
                  nextConfigs[targetKey] ||
                  configs[targetKey] ||
                  getAutomationConfig(targetSessionId, sectorId, option.value);

                nextConfigs[targetKey] = {
                  ...base,
                  ...(shouldReplicateLotCount
                    ? { lotCount: onlyDigits(patch.lotCount || "") }
                    : {}),
                  ...(shouldReplicatePriceStep
                    ? { priceStep: onlyMoney(patch.priceStep || "") || "0" }
                    : {}),
                };
              });
            }

            if (shouldReplicateFirstDateConfig) {
              const targetKey = automationKey(targetSessionId, sectorId, ticketKind);
              const base =
                nextConfigs[targetKey] ||
                configs[targetKey] ||
                getAutomationConfig(targetSessionId, sectorId, ticketKind);

              nextConfigs[targetKey] = {
                ...base,
                ...(patch.firstPrice !== undefined
                  ? { firstPrice: onlyMoney(patch.firstPrice || "") }
                  : {}),
                ...(patch.salesStartAt !== undefined
                  ? { salesStartAt: inputDateDay(patch.salesStartAt || inputDateToday()) }
                  : {}),
                ...(patch.lotCount !== undefined
                  ? { lotCount: onlyDigits(patch.lotCount || "") }
                  : {}),
                ...(patch.priceStep !== undefined
                  ? { priceStep: onlyMoney(patch.priceStep || "") || "0" }
                  : {}),
              };
            }
          });

          return nextConfigs;
        });

        return;
      }

      setTicketAutomationConfigs((configs) => ({
        ...configs,
        [key]: nextConfig,
      }));
    }

    function buildLotsFromConfig(
      sessionId: string,
      sectorId: string,
      ticketKind: TicketKind,
      config: TicketAutomationConfig,
      showAlerts = true,
    ) {
      const passport = !sessionId;
      const sector = isOpenOnly ? sectors[0] : sectors.find((item) => item.localId === sectorId);
      const session = sessions.find((item) => item.localId === sessionId);

      if (!sector && !isOpenOnly) {
        if (showAlerts) alert("Escolha um setor para gerar os lotes.");
        return null;
      }

      if (!passport && !session) {
        if (showAlerts) alert("Escolha uma data para gerar os lotes.");
        return null;
      }

      const lotCount = Math.max(1, Math.min(20, positiveInt(config.lotCount, 1)));
      const priceStep = Math.max(0, moneyNumber(config.priceStep));
      const firstPrice = Math.max(0, moneyNumber(config.firstPrice));
      const intervalDays = Math.max(1, positiveInt(ticketLotIntervalDays || config.intervalDays, 1));
      const maxPerOrder = onlyDigits(ticketMaxPerOrder);
      const limitAt = lotLimitDate(sessionId);
      const firstStartAt = inputDateDay(config.salesStartAt || inputDateToday());
      const available = passport
        ? remainingForSessionSector(sessionId, sectorId)
        : kindCapacityForSessionSector(sessionId, sectorId, ticketKind);

      if (available <= 0) {
        if (showAlerts) alert("Não há disponibilidade para gerar lotes neste setor/data.");
        return null;
      }

      if (limitAt && firstStartAt > limitAt) {
        if (showAlerts) alert("O início das vendas precisa ser até o dia da sessão.");
        return null;
      }

      const generated: TicketItem[] = [];
      let remaining = available;
      let startAt = firstStartAt;

      for (let index = 0; index < lotCount; index += 1) {
        if (remaining <= 0) break;
        if (limitAt && startAt > limitAt) break;

        const salesEndAt = suggestLotEnd(startAt, limitAt, intervalDays);

        if (!salesEndAt || salesEndAt < startAt) break;

        const remainingLots = lotCount - index;
        const quantity = Math.ceil(remaining / remainingLots);
        const lotLabel = `${index + 1}º Lote`;
        const price = moneyInputFromNumber(firstPrice + priceStep * index) || config.firstPrice || "0";
        const draft: TicketItem = {
          ...newTicket(index, sessionId, sectorId, sector?.mode || preset.mode),
          ticketKind,
          lotLabel,
          price,
          quantity: String(quantity),
          salesStartAt: startAt,
          salesEndAt,
          maxPerOrder,
          isHidden: index > 0,
        };

        generated.push({
          ...draft,
          name: automaticTicketName(draft),
        });

        remaining -= quantity;
        startAt = salesEndAt;
      }

      if (generated.length === 0) {
        if (showAlerts) alert("Não foi possível gerar lotes com essas regras. Verifique a data inicial e o intervalo.");
        return null;
      }

      return generated;
    }

    function createLotsFromConfig(sessionId: string, sectorId: string, ticketKind: TicketKind, config: TicketAutomationConfig) {
      const firstSessionId = sessions[0]?.localId || "";
      const shouldGenerateAllSessions = Boolean(sessionId && firstSessionId && sessionId === firstSessionId);

      if (shouldGenerateAllSessions) {
        const generatedByTarget: Array<{ sessionId: string; ticketKind: TicketKind; generated: TicketItem[] }> = [];

        sessions.forEach((session) => {
          TICKET_KIND_OPTIONS.forEach((option) => {
            const key = automationKey(session.localId, sectorId, option.value);
            const hasCustomConfig = session.localId !== firstSessionId && Boolean(ticketAutomationConfigs[key]);
            const baseKindConfig = option.value === ticketKind
              ? config
              : getAutomationConfig(firstSessionId, sectorId, option.value);
            const sessionConfig = hasCustomConfig
              ? getAutomationConfig(session.localId, sectorId, option.value)
              : {
                  ...baseKindConfig,
                  lotCount: config.lotCount,
                  priceStep: config.priceStep,
                  salesStartAt: inputDateDay(baseKindConfig.salesStartAt || config.salesStartAt || inputDateToday()),
                };
            const generated = buildLotsFromConfig(session.localId, sectorId, option.value, sessionConfig, session.localId === firstSessionId && option.value === ticketKind);

            if (generated) {
              generatedByTarget.push({ sessionId: session.localId, ticketKind: option.value, generated });
            }
          });
        });

        if (generatedByTarget.length === 0) return;

        const generatedTickets = generatedByTarget.flatMap((item) => item.generated);
        const targetKeys = new Set(generatedByTarget.map((item) => `${item.sessionId}::${sectorId}::${item.ticketKind}`));

        setTickets((current) => normalizeTicketList([
          ...current.filter((ticket) =>
            !targetKeys.has(`${ticket.eventSessionLocalId}::${ticket.venueSectorLocalId}::${ticket.ticketKind}`),
          ),
          ...generatedTickets,
        ]));
        setTicketBuilderStep("REVIEW");
        return;
      }

      const generated = buildLotsFromConfig(sessionId, sectorId, ticketKind, config);

      if (!generated) return;

      setTickets((current) => normalizeTicketList([
        ...current.filter((ticket) =>
          !(ticket.eventSessionLocalId === sessionId &&
            ticket.venueSectorLocalId === sectorId &&
            ticket.ticketKind === ticketKind),
        ),
        ...generated,
      ]));
      setTicketBuilderStep("REVIEW");
    }

    function applyFirstDateToAllDatesAndGenerate() {
      const firstSessionId = sessions[0]?.localId || "";

      if (!firstSessionId) {
        alert("Cadastre pelo menos uma data antes de gerar os lotes.");
        return;
      }

      const generatedTickets: TicketItem[] = [];
      const nextConfigs: Record<string, TicketAutomationConfig> = {};

      visibleSectors.forEach((sector) => {
        const sectorId = sectorTicketId(sector);

        TICKET_KIND_OPTIONS.forEach((option) => {
          const firstConfig = getAutomationConfig(firstSessionId, sectorId, option.value);

          sessions.forEach((session) => {
            const sessionConfig: TicketAutomationConfig = {
              ...firstConfig,
              salesStartAt: inputDateDay(firstConfig.salesStartAt || inputDateToday()),
            };
            const generated = buildLotsFromConfig(session.localId, sectorId, option.value, sessionConfig, false);
            const targetKey = automationKey(session.localId, sectorId, option.value);

            nextConfigs[targetKey] = sessionConfig;

            if (generated) {
              generatedTickets.push(...generated);
            }
          });
        });
      });

      if (generatedTickets.length === 0) {
        alert("Não foi possível gerar os lotes. Verifique data de início das vendas, virada de lote e disponibilidade dos setores.");
        return;
      }

      setTicketAutomationConfigs((configs) => ({
        ...configs,
        ...nextConfigs,
      }));
      setTickets((current) => normalizeTicketList([
        ...current.filter((ticket) => isPassportTicket(ticket)),
        ...generatedTickets,
      ]));
      setTicketBuilderStep("REVIEW");
    }

    function addLotFor(sessionId: string, sectorId: string, ticketKind: TicketKind) {
      const config = getAutomationConfig(sessionId, sectorId, ticketKind);
      const existingGroup = tickets.filter((ticket) =>
        ticket.eventSessionLocalId === sessionId &&
        ticket.venueSectorLocalId === sectorId &&
        ticket.ticketKind === ticketKind,
      );
      const nextLotCount = Math.min(20, Math.max(existingGroup.length + 1, positiveInt(config.lotCount, 1)));

      createLotsFromConfig(sessionId, sectorId, ticketKind, {
        ...config,
        lotCount: String(nextLotCount),
      });
    }

    const groups = groupTickets(tickets);
    const validTickets = tickets.filter((item) => item.name.trim() && item.price.trim() && toNumber(item.quantity) > 0);
    const visibleSectors = isOpenOnly ? [{ ...sectors[0], localId: "", name: "Área única", mode: preset.mode } as SectorItem] : sectors;
    const passportTickets = tickets.filter(isPassportTicket);
    const normalTickets = tickets.filter((ticket) => !isPassportTicket(ticket));
    const totalDistributed = tickets.reduce((sum, item) => sum + toNumber(item.quantity), 0);
    const missingRequired: Array<{ session: SessionItem; sector: SectorItem; sectorId: string }> = [];

    sessions.forEach((session) => {
      visibleSectors.forEach((sector) => {
        const sectorId = sectorTicketId(sector);
        const hasLot = normalTickets.some((ticket) =>
          ticket.eventSessionLocalId === session.localId &&
          ticket.venueSectorLocalId === sectorId &&
          ticket.name.trim() &&
          ticket.price.trim() &&
          toNumber(ticket.quantity) > 0,
        );

        if (!hasLot) {
          missingRequired.push({ session, sector, sectorId });
        }
      });
    });

    const ticketWizardSteps: Array<{ id: "CREATE" | "PASSPORT" | "REVIEW"; title: string; description: string }> = [
      { id: "CREATE", title: "Automatizar", description: "Regras por data/setor" },
      { id: "PASSPORT", title: "Passaporte", description: "Opcional" },
      { id: "REVIEW", title: "Verificação", description: "Resumo final" },
    ];

    function renderAutomationFields(sessionId: string, sectorId: string, ticketKind: TicketKind, passport = false) {
      const config = getAutomationConfig(sessionId, sectorId, ticketKind);
      const available = passport
        ? remainingForSessionSector(sessionId, sectorId)
        : kindCapacityForSessionSector(sessionId, sectorId, ticketKind);
      const lotCount = Math.max(1, Math.min(20, positiveInt(config.lotCount, 1)));
      const plannedQuantity = available;
      const baseLotQuantity = Math.ceil(available / lotCount);
      const leftover = 0;
      const lastPrice = moneyInputFromNumber(moneyNumber(config.firstPrice) + moneyNumber(config.priceStep) * Math.max(lotCount - 1, 0));

      return (
        <div className={`rounded-[2rem] border p-4 ${passport ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
          <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
            <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.18em] ${passport ? "text-amber-600" : "text-sky-600"}`}>
                {passport ? "Gerador de passaporte" : "Gerador automático"}
              </p>
              <h4 className="mt-1 text-lg font-black text-slate-950">{ticketKindBadge(ticketKind)}</h4>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Gera lotes sequenciais. O próximo lote fica oculto e só deve abrir quando o anterior esgotar ou chegar na data configurada.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat label="Tipo" value={available} />
              <MiniStat label="Planejado" value={plannedQuantity} />
              <MiniStat label="Sobra" value={leftover} />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Field
              label="Quantidade calculada"
              value={String(baseLotQuantity)}
              onChange={() => undefined}
              disabled
              helper="Capacidade do tipo ÷ número de lotes."
            />
            <Field
              label="Número de lotes"
              value={config.lotCount}
              onChange={(value) => updateAutomationConfig(sessionId, sectorId, ticketKind, { lotCount: value })}
              onlyNumbers
              helper="Até 20"
            />
            <Field
              label="Preço inicial"
              value={config.firstPrice}
              onChange={(value) => updateAutomationConfig(sessionId, sectorId, ticketKind, { firstPrice: value })}
              money
              helper="Ex: 250,00"
            />
            <Field
              label="Aumentar por lote"
              value={config.priceStep}
              onChange={(value) => updateAutomationConfig(sessionId, sectorId, ticketKind, { priceStep: value })}
              money
              helper="Ex: 200,00"
            />
            <Field
              label="Virada em dias"
              value={ticketLotIntervalDays || "1"}
              onChange={() => undefined}
              disabled
              helper="Padrão definido para o evento inteiro."
            />
            <Field
              label="Máx. por pedido do evento"
              value={ticketMaxPerOrder || ""}
              onChange={() => undefined}
              disabled
              helper="Único para todos os ingressos."
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <Field
              label="Dia de início das vendas"
              value={inputDateDay(config.salesStartAt)}
              onChange={(value) => updateAutomationConfig(sessionId, sectorId, ticketKind, { salesStartAt: value })}
              type="date"
              helper={passport ? "Até o dia da primeira sessão." : "Sem horário, limitado ao dia desta sessão."}
            />
            <button
              type="button"
              onClick={() => createLotsFromConfig(sessionId, sectorId, ticketKind, config)}
              className={`h-[52px] rounded-2xl px-5 text-sm font-black text-white transition ${passport ? "bg-amber-600 hover:bg-amber-700" : "bg-slate-950 hover:bg-sky-700"}`}
            >
              {sessionId && sessions[0]?.localId === sessionId ? "Gerar/Regerar todos os dias" : "Gerar/Regerar esta data"}
            </button>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="grid grid-cols-4 bg-slate-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              <span>Lote</span>
              <span>Quantidade</span>
              <span>Preço</span>
              <span>Virada</span>
            </div>
            {Array.from({ length: Math.min(lotCount, 20) }).map((_, index) => {
              const previousQuantity = Array.from({ length: index }).reduce<number>((sum, _item, previousIndex) => {
                const previousRemaining = Math.max(available - sum, 0);
                const previousRemainingLots = Math.max(lotCount - previousIndex, 1);
                return sum + Math.ceil(previousRemaining / previousRemainingLots);
              }, 0);
              const remainingBefore = Math.max(available - previousQuantity, 0);
              const remainingLots = Math.max(lotCount - index, 1);
              const qty = Math.min(remainingBefore, Math.ceil(remainingBefore / remainingLots));
              const price = moneyInputFromNumber(moneyNumber(config.firstPrice) + moneyNumber(config.priceStep) * index) || "0";
              return (
                <div key={index} className="grid grid-cols-4 gap-2 border-t border-slate-200 px-4 py-2 text-xs font-bold text-slate-700">
                  <span>{index + 1}º Lote</span>
                  <span>{qty}</span>
                  <span>{formatMoney(price)}</span>
                  <span>{index === 0 ? `${ticketLotIntervalDays || 20} dias` : "+" + (ticketLotIntervalDays || 20) + " dias"}</span>
                </div>
              );
            })}
            {lastPrice ? (
              <div className="border-t border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-500">
                Último lote previsto: {formatMoney(lastPrice)}. Quantidade limitada automaticamente pela disponibilidade.
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    function renderCreateStep() {
      const requiredGroupCount = sessions.length * visibleSectors.length;
      const completedRequiredGroups = Math.max(requiredGroupCount - missingRequired.length, 0);
      const activeSessionId =
        expandedTicketSessionId && sessions.some((session) => session.localId === expandedTicketSessionId)
          ? expandedTicketSessionId
          : sessions[0]?.localId || "";
      const firstVisibleSectorId = sectorTicketId(visibleSectors[0]);
      const recommendedInterval = recommendedLotInterval();

      function sectorKey(sessionId: string, sectorId: string) {
        return `${sessionId}::${sectorId || "open"}`;
      }

      function openSession(sessionId: string) {
        const nextSessionId = activeSessionId === sessionId ? "" : sessionId;
        setExpandedTicketSessionId(nextSessionId);

        if (nextSessionId) {
          setExpandedTicketSectorKey(sectorKey(nextSessionId, firstVisibleSectorId));
        }
      }

      function toggleSector(sessionId: string, sectorId: string) {
        const key = sectorKey(sessionId, sectorId);
        setExpandedTicketSectorKey(expandedTicketSectorKey === key ? "" : key);
      }

      function hasKind(sessionId: string, sectorId: string, ticketKind: TicketKind) {
        return normalTickets.some((ticket) =>
          ticket.eventSessionLocalId === sessionId &&
          ticket.venueSectorLocalId === sectorId &&
          ticket.ticketKind === ticketKind &&
          ticket.name.trim() &&
          ticket.price.trim() &&
          toNumber(ticket.quantity) > 0,
        );
      }

      function sectorIsComplete(sessionId: string, sectorId: string) {
        return normalTickets.some((ticket) =>
          ticket.eventSessionLocalId === sessionId &&
          ticket.venueSectorLocalId === sectorId &&
          ticket.name.trim() &&
          ticket.price.trim() &&
          toNumber(ticket.quantity) > 0,
        );
      }

      function sessionIsComplete(sessionId: string) {
        return visibleSectors.every((sector) => sectorIsComplete(sessionId, sectorTicketId(sector)));
      }

      return (
        <div className="grid gap-5">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="bg-slate-950 p-6 text-white">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">Ingressos automáticos</p>
                <h3 className="mt-2 text-2xl font-black">Crie lotes por dia e setor, sem garimpo manual</h3>
                <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">
                  Abra uma data para ver os setores. O sistema divide a capacidade total em datas, depois distribui os setores dentro da capacidade da data, depois divide cada setor entre Inteira, Meia e Social, e por fim divide cada tipo em lotes.
                </p>
              </div>

              <div className="grid gap-3 bg-slate-50 p-5 sm:grid-cols-2">
                <MiniStat label="Datas x setores" value={requiredGroupCount} />
                <MiniStat label="Concluídos" value={completedRequiredGroups} />
                <MiniStat label="Faltando" value={missingRequired.length} />
                <Field
                  label="Máximo por pedido"
                  value={ticketMaxPerOrder}
                  onChange={setTicketMaxPerOrder}
                  onlyNumbers
                  helper="Único para todo o evento."
                />
                <Field
                  label="Virada de lote"
                  value={ticketLotIntervalDays}
                  onChange={(value) => setTicketLotIntervalDays(onlyDigits(value) || "1")}
                  onlyNumbers
                  helper={`Recomendado: ${recommendedInterval.recommended} dia(s), considerando ${recommendedInterval.daysUntilFirstEvent} dia(s) até o evento e ${recommendedInterval.lotCountBase} lote(s).`}
                />
                <button
                  type="button"
                  onClick={() => setTicketLotIntervalDays(String(recommendedInterval.recommended))}
                  className="rounded-2xl border border-sky-200 bg-white px-4 py-3 text-sm font-black text-sky-700 transition hover:bg-sky-50"
                >
                  Usar virada recomendada
                </button>
                <button
                  type="button"
                  onClick={applyFirstDateToAllDatesAndGenerate}
                  className="rounded-2xl bg-sky-600 px-4 py-3 text-sm font-black text-white transition hover:bg-sky-700"
                >
                  Aplicar 1ª data em todas
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Navegação rápida</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Escolha a data</h3>
              </div>
              <p className="text-sm font-semibold leading-6 text-slate-500">
                Fechado mostra só os dias. Aberto mostra apenas os setores. Os tipos de ingresso aparecem só dentro do setor escolhido.
              </p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {sessions.map((session, index) => {
                const complete = sessionIsComplete(session.localId);
                const active = activeSessionId === session.localId;
                const day = inputDateDay(session.startsAt).slice(8, 10) || String(index + 1).padStart(2, "0");
                const month = session.startsAt
                  ? new Date(session.startsAt).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
                  : "data";

                return (
                  <button
                    key={session.localId}
                    type="button"
                    onClick={() => openSession(session.localId)}
                    className={`min-w-[92px] rounded-[1.6rem] border px-4 py-3 text-center transition ${
                      active
                        ? "border-sky-500 bg-sky-50 shadow-sm ring-4 ring-sky-100"
                        : complete
                          ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Dia</span>
                    <span className="mt-1 block text-2xl font-black text-slate-950">{day}</span>
                    <span className="mt-0.5 block text-xs font-black uppercase text-slate-500">{month}</span>
                    <span className="mt-1 block text-[10px] font-black text-sky-700">{daysUntilEventLabel(session.startsAt)}</span>
                    <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase ${complete ? "bg-[#ff6900] text-white" : "bg-slate-200 text-slate-600"}`}>
                      {complete ? "ok" : "pendente"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4">
            {sessions.map((session, sessionIndex) => {
              const sessionOpen = activeSessionId === session.localId;
              const complete = sessionIsComplete(session.localId);
              const sessionSectorCount = visibleSectors.length;
              const sessionCompletedSectors = visibleSectors.filter((sector) =>
                sectorIsComplete(session.localId, sectorTicketId(sector)),
              ).length;

              return (
                <div
                  key={session.localId}
                  className={`overflow-hidden rounded-[2rem] border bg-white shadow-sm ${
                    sessionOpen ? "border-sky-200" : complete ? "border-emerald-200" : "border-slate-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => openSession(session.localId)}
                    className={`flex w-full flex-col gap-4 p-5 text-left transition lg:flex-row lg:items-center lg:justify-between ${
                      sessionOpen ? "bg-slate-950 text-white" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-black uppercase tracking-[0.2em] ${sessionOpen ? "text-sky-300" : "text-sky-600"}`}>
                        Data {sessionIndex + 1}
                      </p>
                      <h3 className="mt-1 text-2xl font-black">{session.name || formatSessionName(session.startsAt)}</h3>
                      <p className={`mt-1 text-sm font-semibold ${sessionOpen ? "text-slate-300" : "text-slate-500"}`}>
                        {datePreview(session.startsAt)} • {daysUntilEventLabel(session.startsAt)} • Capacidade: {session.capacity || capacity}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {visibleSectors.map((sector) => {
                        const sectorId = sectorTicketId(sector);
                        const done = sectorIsComplete(session.localId, sectorId);

                        return (
                          <span
                            key={`${session.localId}-badge-${sectorId || "open"}`}
                            className={`rounded-full px-3 py-2 text-xs font-black ${
                              done
                                ? "bg-[#ff6900] text-white"
                                : sessionOpen
                                  ? "bg-white/10 text-white"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sector.name || "Área única"}
                          </span>
                        );
                      })}
                      <span className={`rounded-full px-3 py-2 text-xs font-black ${sessionOpen ? "bg-sky-500 text-white" : "bg-slate-950 text-white"}`}>
                        {sessionCompletedSectors}/{sessionSectorCount} setores
                      </span>
                    </div>
                  </button>

                  {sessionOpen ? (
                    <div className="grid gap-4 bg-slate-50 p-5">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Setores desta data</p>
                        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
                          {visibleSectors.map((sector) => {
                            const sectorId = sectorTicketId(sector);
                            const key = sectorKey(session.localId, sectorId);
                            const active = expandedTicketSectorKey === key;
                            const done = sectorIsComplete(session.localId, sectorId);
                            const available = availableForSessionSector(session.localId, sectorId);

                            return (
                              <button
                                key={`${session.localId}-sector-tab-${sectorId || "open"}`}
                                type="button"
                                onClick={() => toggleSector(session.localId, sectorId)}
                                className={`min-w-[170px] rounded-[1.6rem] border px-4 py-3 text-left transition ${
                                  active
                                    ? "border-sky-500 bg-sky-50 ring-4 ring-sky-100"
                                    : done
                                      ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                                      : "border-slate-200 bg-white hover:bg-slate-50"
                                }`}
                              >
                                <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Setor</span>
                                <span className="mt-1 block truncate text-lg font-black text-slate-950">{sector.name || "Área única"}</span>
                                <span className="mt-1 block text-xs font-semibold text-slate-500">{available} disponíveis</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {visibleSectors.map((sector) => {
                        const sectorId = sectorTicketId(sector);
                        const key = sectorKey(session.localId, sectorId);
                        const sectorOpen = expandedTicketSectorKey === key;
                        const available = availableForSessionSector(session.localId, sectorId);
                        const distributed = createdForSessionSector(session.localId, sectorId);
                        const free = remainingForSessionSector(session.localId, sectorId);
                        const kindStatus = TICKET_KIND_OPTIONS.map((option) => ({
                          ...option,
                          done: hasKind(session.localId, sectorId, option.value),
                        }));

                        return (
                          <div
                            key={`${session.localId}-${sectorId || "open"}`}
                            className={`overflow-hidden rounded-[2rem] border bg-white ${
                              sectorOpen ? "border-sky-200 shadow-sm" : "border-slate-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => toggleSector(session.localId, sectorId)}
                              className="flex w-full flex-col justify-between gap-4 p-5 text-left hover:bg-slate-50 xl:flex-row xl:items-center"
                            >
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Setor</p>
                                <h4 className="mt-1 text-xl font-black text-slate-950">{sector.name || "Área única"}</h4>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {kindStatus.map((option) => (
                                    <span
                                      key={option.value}
                                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                                        option.done ? "bg-[#ff6900] text-white" : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {option.label} {option.done ? "✓" : ""}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              <div className="grid gap-2 sm:grid-cols-3">
                                <MiniStat label="Setor nesta data" value={sessionSectorPhysicalCapacity(session.localId, sectorId)} />
                                <MiniStat label="Vendido normal" value={distributed} />
                                <MiniStat label="Livre normal" value={free} />
                              </div>
                            </button>

                            {sectorOpen ? (
                              <div className="border-t border-slate-200 bg-slate-50 p-5">
                                <div className="mb-4 rounded-3xl border border-sky-100 bg-sky-50 p-4">
                                  <p className="text-sm font-black text-sky-950">Tipos de ingresso deste setor</p>
                                  <p className="mt-1 text-sm font-semibold leading-6 text-sky-800">
                                    Fluxo de capacidade: capacidade geral → datas → setores por data → tipos de ingresso → lotes. Inteira, Meia e Social dividem a capacidade deste setor, sem multiplicar ingressos.
                                  </p>
                                </div>

                                <div className="grid gap-4">
                                  {TICKET_KIND_OPTIONS.map((option) => (
                                    <div key={option.value}>{renderAutomationFields(session.localId, sectorId, option.value)}</div>
                                  ))}
                                </div>
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
        </div>
      );
    }

    function renderLotsStep() {
      const lotsGroups = groupTickets(tickets);

      return (
        <div className="grid gap-5">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
              <div>
                <h3 className="text-xl font-black text-slate-950">Visualização e ajustes dos lotes</h3>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
                  Aqui você confere o que foi gerado e ainda pode editar manualmente. Lotes posteriores não podem ficar mais baratos que os anteriores, e o mínimo por pedido segue travado em 1.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <MiniStat label="Grupos" value={lotsGroups.length} />
                <MiniStat label="Lotes" value={tickets.length} />
                <MiniStat label="Quantidade" value={totalDistributed} />
                <MiniStat label="Passaportes" value={passportTickets.length} />
              </div>
            </div>
          </div>

          {lotsGroups.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-black text-slate-950">Nenhum lote gerado ainda.</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Volte para Automatizar e gere os lotes por data e setor.</p>
            </div>
          ) : (
            lotsGroups.map((group) => {
              const first = group[0];
              const passport = isPassportTicket(first);
              const available = availableForSessionSector(first.eventSessionLocalId, first.venueSectorLocalId);
              const distributed = createdForSessionSector(first.eventSessionLocalId, first.venueSectorLocalId);
              const free = remainingForSessionSector(first.eventSessionLocalId, first.venueSectorLocalId);

              return (
                <div key={ticketGroupId(first)} className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                  <div className={`p-5 ${passport ? "bg-amber-50" : "bg-white"}`}>
                    <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-600">Grupo de venda</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          {passport ? "Passaporte" : sessionLabel(first.eventSessionLocalId)} • {sectorLabel(first.venueSectorLocalId)} • {ticketKindBadge(first.ticketKind)}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Abre pelo tempo programado ou quando o lote anterior esgotar.</p>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <MiniStat label="Disponível" value={available} />
                        <MiniStat label="Distribuído" value={distributed} />
                        <MiniStat label="Livre" value={free} />
                        <Field label="Máx. pedido" value={groupLimit(first)} onChange={(value) => updateGroupMax(first, value)} onlyNumbers helper="Vale para o grupo" />
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <div className="min-w-[1040px]">
                      <div className="grid grid-cols-[90px_1.5fr_110px_100px_170px_170px_110px] gap-0 bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                        <span>Lote</span>
                        <span>Nome</span>
                        <span>Preço</span>
                        <span>Qtd.</span>
                        <span>Início</span>
                        <span>Fim</span>
                        <span>Status</span>
                      </div>

                      {group.map((ticket, index) => {
                        const previous = group[index - 1];
                        const minimumPrice = maxPreviousTicketPrice(tickets, ticket);
                        const autoHidden = lotNumber(ticket.lotLabel) > 1 && group.some((item) => item.lotLabel === "1º Lote");
                        const rowFree = remainingForSessionSector(ticket.eventSessionLocalId, ticket.venueSectorLocalId, ticket.localId);

                        return (
                          <div key={ticket.localId} className="border-t border-slate-200 bg-white px-4 py-4">
                            <div className="grid grid-cols-[90px_1.5fr_110px_100px_170px_170px_110px] gap-2">
                              <Select label="Lote" value={ticket.lotLabel} onChange={(value) => updateTicket(ticket.localId, { lotLabel: value })} options={LOTS.map((lot) => ({ label: lot, value: lot }))} />
                              <Field label="Nome" value={ticket.name} onChange={(value) => updateTicket(ticket.localId, { name: value })} />
                              <Field
                                label="Preço"
                                value={ticket.price}
                                onChange={(value) => updateTicket(ticket.localId, { price: value })}
                                money
                                helper={minimumPrice > 0 ? `Mín: ${formatMoney(moneyInputFromNumber(minimumPrice))}` : formatMoney(ticket.price)}
                              />
                              <Field
                                label="Qtd."
                                value={ticket.quantity}
                                onChange={(value) => {
                                  const allowed = remainingForSessionSector(ticket.eventSessionLocalId, ticket.venueSectorLocalId, ticket.localId) + toNumber(ticket.quantity);
                                  const clean = onlyDigits(value);
                                  const limited = String(Math.min(positiveInt(clean, 1), Math.max(allowed, 1)));
                                  updateTicket(ticket.localId, { quantity: limited });
                                }}
                                onlyNumbers
                                helper={`Livre: ${rowFree}`}
                              />
                              <Field label="Início" value={inputDateDay(ticket.salesStartAt)} onChange={(value) => updateTicket(ticket.localId, { salesStartAt: value })} type="date" helper={previous ? "Após lote anterior" : "Editável"} />
                              <Field label="Fim" value={inputDateDay(ticket.salesEndAt)} onChange={(value) => updateTicket(ticket.localId, { salesEndAt: value })} type="date" helper={passport ? "Até 1ª sessão" : "Até dia da sessão"} />
                              <div className="grid gap-2">
                                <label className="flex h-[52px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={ticket.isHidden || autoHidden}
                                    disabled={autoHidden}
                                    onChange={(event) => updateTicket(ticket.localId, { isHidden: event.target.checked })}
                                  />
                                  Oculto
                                </label>
                                {tickets.length > 1 ? (
                                  <button type="button" onClick={() => removeTicket(ticket.localId)} className="rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50">
                                    Remover
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            <div className="mt-4">
                              <TextArea label="Descrição e benefícios" value={ticket.description} onChange={(value) => updateTicket(ticket.localId, { description: value })} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5">
                    <button
                      type="button"
                      onClick={() => addLotFor(first.eventSessionLocalId, first.venueSectorLocalId, first.ticketKind)}
                      className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 hover:bg-sky-100"
                    >
                      + Gerar mais um lote seguindo a regra
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    function renderPassportStep() {
      const passportSectors = visibleSectors.filter((sector) => {
        const realSector = selectedSectorForTicket(sectorTicketId(sector));
        return Boolean(realSector?.passportEnabled && sectorPassportReserve(sectorTicketId(sector)) > 0);
      });
      const activeSectorKey = expandedTicketSectorKey.startsWith("passport::")
        ? expandedTicketSectorKey.replace("passport::", "")
        : sectorTicketId(passportSectors[0] || visibleSectors[0]);
      const activeSector =
        passportSectors.find((sector) => sectorTicketId(sector) === activeSectorKey) ||
        passportSectors[0];
      const activeSectorId = activeSector ? sectorTicketId(activeSector) : "";
      const activePassportCount = tickets
        .filter((ticket) =>
          ticket.eventSessionLocalId === "" &&
          ticket.venueSectorLocalId === activeSectorId,
        )
        .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);

      return (
        <div className="grid gap-5">
          <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
              <div>
                <h3 className="text-xl font-black text-amber-950">
                  Passaporte opcional automatizado
                </h3>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-amber-900">
                  O passaporte usa o mesmo fluxo da automação: escolha o setor,
                  defina Inteira, Meia e Social, gere os lotes e depois confira
                  tudo na verificação final. Ele consome disponibilidade do setor
                  em todas as datas.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <MiniStat label="Passaportes" value={passportTickets.length} />
                <MiniStat label="Setores" value={passportSectors.length} />
                <MiniStat label="Selecionado" value={activeSector?.name || "Setor"} />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Setores do passaporte
                </p>
                <h4 className="mt-1 text-xl font-black text-slate-950">
                  Escolha um setor para configurar
                </h4>
              </div>

              <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black text-amber-800">
                Opcional
              </span>
            </div>

            {passportSectors.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-5 text-sm font-black text-amber-800">
                Nenhum setor foi marcado para passaporte. Volte em Setores / áreas, marque o botão Passaporte e informe a quantidade reservada.
              </div>
            ) : null}

            {passportSectors.length > 0 ? (
              <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-4">
              {passportSectors.map((sector) => {
                const sectorId = sectorTicketId(sector);
                const active = sectorId === activeSectorId;
                const generatedCount = tickets
                  .filter((ticket) =>
                    ticket.eventSessionLocalId === "" &&
                    ticket.venueSectorLocalId === sectorId,
                  )
                  .reduce((sum, ticket) => sum + toNumber(ticket.quantity), 0);
                const available = availableForSessionSector("", sectorId);
                const remaining = remainingForSessionSector("", sectorId);

                return (
                  <button
                    key={`passport-sector-${sectorId || "open"}`}
                    type="button"
                    onClick={() => setExpandedTicketSectorKey(`passport::${sectorId}`)}
                    className={`rounded-3xl border p-4 text-left transition ${
                      active
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : generatedCount > 0
                          ? "border-emerald-200 bg-emerald-50 hover:border-emerald-300"
                          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                    }`}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Setor
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      {sector.name || "Área única"}
                    </p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-2xl bg-white/80 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Disponível
                        </p>
                        <p className="text-sm font-black text-slate-950">{available}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Gerado
                        </p>
                        <p className="text-sm font-black text-slate-950">{generatedCount}</p>
                      </div>
                      <div className="rounded-2xl bg-white/80 p-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                          Livre
                        </p>
                        <p className="text-sm font-black text-slate-950">{remaining}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              </div>
            ) : null}
          </div>

          {activeSector ? (
            <div className="rounded-[2rem] border border-amber-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-600">
                    Setor selecionado
                  </p>
                  <h4 className="mt-1 text-2xl font-black text-slate-950">
                    {activeSector.name || "Área única"}
                  </h4>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Configure os tipos de passaporte abaixo. A disponibilidade vem da reserva feita na etapa de setores.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  <MiniStat label="Disponível" value={availableForSessionSector("", activeSectorId)} />
                  <MiniStat label="Distribuído" value={activePassportCount} />
                  <MiniStat label="Livre" value={remainingForSessionSector("", activeSectorId)} />
                </div>
              </div>

              <div className="mt-5 grid gap-4">
                {TICKET_KIND_OPTIONS.map((option) => (
                  <div key={`passport-${activeSectorId}-${option.value}`}>
                    {renderAutomationFields("", activeSectorId, option.value, true)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    function renderReviewTicketStep() {
      const normalGroups = groups.filter((group) => !isPassportTicket(group[0]));
      const passportGroups = groups.filter((group) => isPassportTicket(group[0]));

      return (
        <div className="grid gap-5">
          <div className={`rounded-[2rem] border p-5 ${ticketError ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
            <p className={`text-lg font-black ${ticketError ? "text-rose-800" : "text-emerald-900"}`}>
              {ticketError ? "Ainda existem ajustes nos ingressos" : "Ingressos prontos"}
            </p>
            {ticketError ? <p className="mt-2 text-sm font-black text-rose-700">{ticketError}</p> : <p className="mt-2 text-sm font-semibold text-emerald-800">Todos os setores obrigatórios têm pelo menos um lote em cada data.</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <MiniStat label="Grupos obrigatórios" value={normalGroups.length} />
            <MiniStat label="Passaportes" value={passportGroups.length} />
            <MiniStat label="Lotes totais" value={tickets.length} />
            <MiniStat label="Quantidade total" value={totalDistributed} />
            <MiniStat label="Pendências" value={missingRequired.length} />
          </div>

          {missingRequired.length > 0 ? (
            <div className="rounded-[2rem] border border-rose-200 bg-white p-5">
              <h3 className="text-xl font-black text-slate-950">Pendências obrigatórias</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {missingRequired.map((item) => (
                  <div key={`${item.session.localId}-${item.sectorId || "open"}`} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-black text-rose-800">{item.session.name || formatSessionName(item.session.startsAt)} • {item.sector.name || "Área única"}</p>
                    <p className="mt-1 text-xs font-semibold text-rose-700">Gere pelo menos um lote para este setor nesta data.</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xl font-black text-slate-950">Resumo dos grupos</h3>
            <div className="mt-4 grid gap-3">
              {groups.length === 0 ? (
                <p className="text-sm font-semibold text-slate-500">Nenhum grupo de venda criado.</p>
              ) : (
                groups.map((group) => {
                  const first = group[0];
                  const quantity = group.reduce((sum, item) => sum + toNumber(item.quantity), 0);
                  const prices = group.map((item) => moneyNumber(item.price)).filter((price) => price > 0);
                  const minPrice = prices.length ? Math.min(...prices) : 0;
                  const maxPrice = prices.length ? Math.max(...prices) : 0;

                  return (
                    <div key={ticketGroupId(first)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                          <p className="text-sm font-black text-slate-950">
                            {isPassportTicket(first) ? "Passaporte" : sessionLabel(first.eventSessionLocalId)} • {sectorLabel(first.venueSectorLocalId)} • {ticketKindBadge(first.ticketKind)}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {group.length} lote(s) • {quantity} ingresso(s) • {formatMoney(moneyInputFromNumber(minPrice))} até {formatMoney(moneyInputFromNumber(maxPrice))}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${isPassportTicket(first) ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {isPassportTicket(first) ? "Opcional" : "Obrigatório"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <StepShell
        eyebrow="Etapa 7"
        title="Ingressos e lotes"
        description="Gerador automatizado para criar lotes por data, setor e tipo de ingresso, com passaporte opcional e verificação final."
      >
        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 md:grid-cols-3">
              {ticketWizardSteps.map((step, index) => {
                const active = ticketBuilderStep === step.id;
                const done =
                  step.id === "CREATE"
                    ? missingRequired.length === 0
                    : step.id === "PASSPORT"
                      ? passportTickets.length > 0
                      : !ticketError;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setTicketBuilderStep(step.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-sky-500 bg-sky-50"
                        : done
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${active ? "bg-sky-600 text-white" : done ? "bg-[#ff6900] text-white" : "bg-slate-200 text-slate-700"}`}>
                      {done ? "✓" : index + 1}
                    </span>
                    <p className="mt-3 text-sm font-black text-slate-950">{step.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{step.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {ticketBuilderStep === "CREATE" ? renderCreateStep() : null}
          {ticketBuilderStep === "PASSPORT" ? renderPassportStep() : null}
          {ticketBuilderStep === "REVIEW" ? renderReviewTicketStep() : null}
        </div>
      </StepShell>
    );
  }
  function renderLocationStep() {
    const coordinatesReady = Boolean(latitude.trim() && longitude.trim());
    const isShortGoogleLink = /maps\.app\.goo\.gl|goo\.gl\/maps/i.test(mapUrl);

    return (
      <StepShell eyebrow="Etapa 8" title="Local e acesso" description="Endereço, CEP, link do mapa e coordenadas travadas pelo Google Maps.">
        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="grid gap-5 md:grid-cols-2">
              <Select label="Modo do evento" value={mode} onChange={setMode} options={[{ label: "Presencial", value: "PRESENTIAL" }, { label: "Online", value: "ONLINE" }, { label: "Híbrido", value: "HYBRID" }]} />
              <Field label={isOnline ? "Nome ou canal do evento" : "Nome do local"} value={venueName} onChange={setVenueName} required error={submitAttempted && !venueName.trim()} />
            </div>
          </div>

          {!isOnline ? (
            <>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Endereço físico</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">Dados do local</h3>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field label="CEP" value={zipCode} onChange={cepChange} onlyNumbers required error={submitAttempted && !zipCode.trim()} helper="Digite 8 números para preencher endereço, bairro, cidade e estado." />
                  <Field label="Endereço" value={addressLine1} onChange={setAddressLine1} />
                  <Field label="Número / complemento" value={addressLine2} onChange={setAddressLine2} />
                  <Field label="Bairro" value={neighborhood} onChange={setNeighborhood} />
                  <Field label="Cidade" value={city} onChange={setCity} />
                  <Field label="Estado" value={stateName} onChange={setStateName} />
                  <div className="md:col-span-2">
                    <Field label="Referência" value={reference} onChange={setReference} required error={submitAttempted && !reference.trim()} placeholder="Ex: entrada pela avenida principal, portão B..." />
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Mapa e coordenadas</p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">Google Maps</h3>
                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                      Cole o link completo ou encurtado do Google Maps. Para link encurtado, clique em resolver para a API abrir o redirecionamento e travar latitude e longitude.
                    </p>
                  </div>

                  <span className={`rounded-2xl px-4 py-3 text-sm font-black ${coordinatesReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {coordinatesReady ? "Coordenadas travadas" : "Aguardando coordenadas"}
                  </span>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
                  <Field
                    label="URL do mapa"
                    value={mapUrl}
                    onChange={mapUrlChange}
                    required
                    error={submitAttempted && (!isMapUrl(mapUrl) || !coordinatesReady)}
                    helper={
                      submitAttempted && !coordinatesReady
                        ? "Resolva ou cole um link completo que contenha latitude e longitude."
                        : isShortGoogleLink
                          ? "Link encurtado detectado. Clique em resolver encurtado."
                          : "Google Maps, Waze, OpenStreetMap ou Bing Maps."
                    }
                  />

                  <button
                    type="button"
                    onClick={resolveMapUrl}
                    disabled={resolvingMapUrl || !mapUrl.trim()}
                    className="h-[52px] rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {resolvingMapUrl ? "Resolvendo..." : "Resolver encurtado"}
                  </button>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field label="Latitude" value={latitude} onChange={setLatitude} disabled helper="Travada pelo link do mapa." />
                  <Field label="Longitude" value={longitude} onChange={setLongitude} disabled helper="Travada pelo link do mapa." />
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:col-span-2">
              <p className="text-lg font-black text-emerald-950">Evento online</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">Para evento online, endereço físico e URL do mapa não são obrigatórios.</p>
            </div>
          )}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <TextArea label={isOnline ? "Instruções de acesso online" : "Instruções de acesso"} value={instructions} onChange={setInstructions} />
          </div>
        </div>
      </StepShell>
    );
  }

  function renderReviewStep() {
    const image = normalizeUrl(bannerImageUrl || coverImageUrl || thumbnailUrl || mobileBannerUrl);
    return (
      <StepShell eyebrow="Etapa 9" title="Revisão e salvar" description="Confira os dados antes de criar o evento.">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="overflow-hidden rounded-[1.5rem] bg-slate-950">
              {image ? <img src={image} alt={eventName} className="h-64 w-full object-cover" /> : <div className="flex h-64 items-center justify-center text-white">{eventName || "Nome do evento"}</div>}
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-sky-600">{CATEGORIES.find((item) => item.value === category)?.label}</p>
            <h3 className="mt-2 text-3xl font-black">{eventName || "Evento sem nome"}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{shortDescription || summary || description || "Sem descrição."}</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <MiniStat label="Data" value={datePreview(startDate)} />
              <MiniStat label="Capacidade" value={capacity} />
              <MiniStat label="Ingressos" value={tickets.length} />
              <MiniStat label="Quantidade" value={tickets.reduce((sum, item) => sum + toNumber(item.quantity), 0)} />
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Produtora</p>
              <p className="mt-2 text-lg font-black">{selectedOrganizer?.tradeName || selectedOrganizer?.legalName || "Não selecionada"}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Ocupação</p>
              <p className="mt-2 text-lg font-black">{preset.label}</p>
              <p className="mt-1 text-sm font-semibold text-slate-500">{preset.description}</p>
            </div>
            <div className={`rounded-3xl border p-5 ${sessionError || mediaError || sectorError || ticketError ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Resumo técnico</p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                <li>Datas: {sessions.length}</li>
                <li>Soma das datas: {sessionTotal}</li>
                <li>Setores: {sectors.length}</li>
                <li>Soma dos setores: {sectorTotal}</li>
                <li>Itens no mapa: {mapObjects.length}</li>
                <li>Galeria: {gallery.length} arquivo(s)</li>
                <li>Status: publicado</li>
                <li>Visibilidade: público</li>
              </ul>
              {[sessionError, mediaError, sectorError, ticketError].filter(Boolean).map((error) => <p key={error} className="mt-4 text-sm font-black text-rose-700">{error}</p>)}
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function currentStep() {
    const id = steps[stepIndex]?.id;
    if (id === "type") return renderTypeStep();
    if (id === "basic") return renderBasicStep();
    if (id === "sessions") return renderSessionsStep();
    if (id === "media") return renderMediaStep();
    if (id === "sectors") return renderSectorsStep();
    if (id === "map") return renderMapStep();
    if (id === "tickets") return renderTicketsStep();
    if (id === "location") return renderLocationStep();
    if (id === "review") return renderReviewStep();
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <form onSubmit={submit} className="mx-auto max-w-[1600px]">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link href="/admin/events" className="text-sm font-black text-sky-700 hover:text-sky-900">← Voltar para eventos</Link>
            <h1 className="mt-3 text-3xl font-black md:text-4xl">Criar evento</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">Criação guiada com categoria, ocupação, datas, imagens, setores, mapa, ingressos e local.</p>
          </div>
          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Etapa atual</p>
            <p className="mt-1 text-lg font-black">{stepIndex + 1} de {steps.length}</p>
          </div>
        </div>
        <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
            {steps.map((step, index) => {
              const active = index === stepIndex;
              const done = step.id !== "review" && completion[step.id];
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => goToStep(index)}
                  className={`rounded-2xl border p-3 text-left transition ${active ? "border-sky-500 bg-sky-50" : done ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${active ? "bg-sky-600 text-white" : done ? "bg-[#ff6900] text-white" : "bg-slate-200"}`}>{done ? "✓" : index + 1}</span>
                  <p className="mt-3 text-xs font-black">{step.title}</p>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{step.description}</p>
                </button>
              );
            })}
          </div>
        </div>
        {currentStep()}
        <div className="mt-6 flex flex-col-reverse justify-between gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <button type="button" onClick={previousStep} disabled={stepIndex === 0 || saving} className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black disabled:opacity-50">
            Voltar
          </button>
          <div className="flex flex-col gap-3 md:flex-row">
            <Link href="/admin/events" className="rounded-2xl border border-slate-300 px-5 py-3 text-center text-sm font-black">Cancelar</Link>
            {stepIndex < steps.length - 1 ? (
              <button type="button" onClick={nextStep} disabled={saving} className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:opacity-60">Continuar</button>
            ) : (
              <button type="submit" disabled={saving || Boolean(sessionError) || Boolean(mediaError) || Boolean(sectorError) || Boolean(ticketError)} className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white disabled:opacity-60">
                {saving ? "Salvando..." : "Criar evento"}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}


