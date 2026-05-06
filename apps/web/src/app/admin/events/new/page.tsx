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
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
}

function normalizeUrl(value: string | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  const origin = getApiOrigin();
  if (!origin) return trimmed;
  if (trimmed.startsWith("/")) return `${origin}${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `${origin}/${trimmed}`;
  return trimmed;
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

function isMapUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
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

function shiftInputDate(value: string, diffMs: number) {
  if (!value) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const next = new Date(date.getTime() + diffMs);
  next.setMinutes(next.getMinutes() - next.getTimezoneOffset());
  return next.toISOString().slice(0, 16);
}

function formatSessionName(value: string) {
  if (!value) return "Data sem início";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data sem início";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "A definir";
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

export default function NewEventPage() {
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

  const [tickets, setTickets] = useState<TicketItem[]>([newTicket()]);
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
    const cover = normalizeUrl(coverImageUrl);
    const banner = normalizeUrl(bannerImageUrl);
    const thumb = normalizeUrl(thumbnailUrl);
    const mobile = normalizeUrl(mobileBannerUrl);
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
    if (sessions.some((item) => item.endsAt < item.startsAt)) return "Nenhuma data pode ter fim antes do início.";
    if (sessions.some((item) => toNumber(item.capacity) > generalCapacity)) return "A capacidade de uma data não pode ultrapassar a capacidade geral.";
    if (sessionTotal > generalCapacity) return "A soma das capacidades das datas não pode ultrapassar a capacidade geral.";
    if (sessions.some((item, index) => index > 0 && item.startsAt < sessions[index - 1].startsAt)) return "A data 2 e as próximas não podem começar antes da data anterior.";
    return "";
  }, [startDate, endDate, sessions, generalCapacity, sessionTotal]);

  const sectorError = useMemo(() => {
    if (sectors.some((item) => toNumber(item.capacity) <= 0)) return "A capacidade de cada setor é obrigatória.";
    if (sectors.some((item) => toNumber(item.capacity) > generalCapacity)) return "Nenhum setor pode ultrapassar a capacidade geral.";
    if (sectorTotal > generalCapacity) return "A soma dos setores não pode ultrapassar a capacidade geral.";
    if (new Set(sectors.map((item) => item.color)).size !== sectors.length) return "Cada setor precisa ter uma cor diferente.";
    return "";
  }, [sectors, generalCapacity, sectorTotal]);

  const ticketError = useMemo(() => {
    for (const ticket of tickets) {
      if (ticket.salesStartAt && ticket.salesStartAt < today) return "O início das vendas não pode ser antes de agora.";
      if (ticket.salesEndAt && ticket.salesStartAt && ticket.salesEndAt < ticket.salesStartAt) return "O fim das vendas não pode ser antes do início.";
      const currentLot = lotNumber(ticket.lotLabel);
      if (currentLot <= 1) continue;
      const previous = tickets.filter((other) => {
        return (
          other.localId !== ticket.localId &&
          other.venueSectorLocalId === ticket.venueSectorLocalId &&
          other.eventSessionLocalId === ticket.eventSessionLocalId &&
          other.ticketKind === ticket.ticketKind &&
          lotNumber(other.lotLabel) < currentLot
        );
      });
      const maxPrevious = previous.reduce((max, item) => Math.max(max, moneyNumber(item.price)), 0);
      if (maxPrevious > 0 && moneyNumber(ticket.price) < maxPrevious) return "Lote posterior não pode ser mais barato que lote anterior do mesmo setor e tipo.";
    }
    return "";
  }, [tickets, today]);

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

  function setGeneralStart(value: string) {
    const old = startDate;
    const hasOld = Boolean(old);
    const diff = hasOld ? new Date(value).getTime() - new Date(old).getTime() : 0;
    setStartDate(value);
    setEndDate((current) => (current ? (hasOld ? shiftInputDate(current, diff) : current) : value));
    setSessions((current) =>
      current.map((item, index) => {
        const startsAt = item.startsAt ? (hasOld ? shiftInputDate(item.startsAt, diff) : item.startsAt) : value;
        const endsAt = item.endsAt ? (hasOld ? shiftInputDate(item.endsAt, diff) : item.endsAt) : value;
        return { ...item, startsAt, endsAt, name: startsAt ? formatSessionName(startsAt) : `Data ${index + 1}`, capacity: item.capacity || capacity };
      }),
    );
  }

  function setGeneralEnd(value: string) {
    const old = endDate;
    const hasOld = Boolean(old);
    const diff = hasOld ? new Date(value).getTime() - new Date(old).getTime() : 0;
    setEndDate(value);
    setSessions((current) => current.map((item) => ({ ...item, endsAt: item.endsAt ? (hasOld ? shiftInputDate(item.endsAt, diff) : item.endsAt) : value })));
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
    setSessions((current) => [...current, { ...newSession(current.length), startsAt: startDate, endsAt: endDate, name: startDate ? formatSessionName(startDate) : `Data ${current.length + 1}`, capacity }]);
  }

  function updateSession(localId: string, patch: Partial<SessionItem>) {
    setSessions((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;
        const next = { ...item, ...patch };
        if (patch.startsAt) next.name = formatSessionName(patch.startsAt);
        if (patch.capacity !== undefined) next.capacity = onlyDigits(patch.capacity);
        return next;
      }),
    );
  }

  function removeSession(localId: string) {
    setSessions((current) => (current.length <= 1 ? current : current.filter((item) => item.localId !== localId)));
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

  function addTicket() {
    const sessionId = sessions[0]?.localId || "";
    const sectorId = isOpenOnly ? "" : sectors[0]?.localId || "";
    const sector = sectors.find((item) => item.localId === sectorId);
    const session = sessions.find((item) => item.localId === sessionId);
    setTickets((current) => [
      ...current,
      {
        ...newTicket(current.length, sessionId, sectorId, sector?.mode || preset.mode),
        salesEndAt: session?.startsAt ? mergeDateAndTime(session.startsAt, session.endsAt) : "",
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

        if (patch.ticketKind) {
          next.name = TICKET_KIND_OPTIONS.find((option) => option.value === patch.ticketKind)?.label || next.name;
        }

        if (patch.venueSectorLocalId !== undefined) {
          const sector = sectors.find((sectorItem) => sectorItem.localId === patch.venueSectorLocalId);
          next.occupancyMode = sector?.mode || preset.mode;
        }

        const nextSession = sessions.find((sessionItem) => sessionItem.localId === next.eventSessionLocalId);

        if ((patch.eventSessionLocalId !== undefined || patch.salesEndAt !== undefined) && nextSession?.startsAt) {
          next.salesEndAt = mergeDateAndTime(nextSession.startsAt, patch.salesEndAt || next.salesEndAt || nextSession.endsAt);
        }

        if (patch.lotLabel || patch.venueSectorLocalId !== undefined || patch.eventSessionLocalId !== undefined || patch.ticketKind) {
          const previousNumber = lotNumber(next.lotLabel) - 1;

          if (previousNumber >= 1) {
            const previousLot = current.find((other) =>
              other.localId !== next.localId &&
              other.venueSectorLocalId === next.venueSectorLocalId &&
              other.eventSessionLocalId === next.eventSessionLocalId &&
              other.ticketKind === next.ticketKind &&
              lotNumber(other.lotLabel) === previousNumber,
            );

            if (previousLot?.salesEndAt) {
              next.salesStartAt = previousLot.salesEndAt;
            }
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

  function dragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!interaction) return;
    const dx = event.clientX - interaction.clientX;
    const dy = event.clientY - interaction.clientY;

    setMapObjects((current) =>
      current.map((object) => {
        if (object.localId !== interaction.objectId) return object;

        if (interaction.type === "move") {
          return {
            ...object,
            x: Math.min(Math.max(interaction.startX + dx, 0), MAP_W - object.width),
            y: Math.min(Math.max(interaction.startY + dy, 0), MAP_H - object.height),
          };
        }

        if (interaction.type === "point") {
          const points = objectPoints(object);
          const index = interaction.pointIndex || 0;
          const nextX = Math.min(Math.max((interaction.startPointX || 0) + (dx / interaction.startWidth) * 100, 0), 100);
          const nextY = Math.min(Math.max((interaction.startPointY || 0) + (dy / interaction.startHeight) * 100, 0), 100);
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

        x = Math.min(Math.max(x, 0), MAP_W - MAP_MIN);
        y = Math.min(Math.max(y, 0), MAP_H - MAP_MIN);
        width = Math.min(Math.max(width, MAP_MIN), MAP_W - x);
        height = Math.min(Math.max(height, MAP_MIN), MAP_H - y);

        return { ...object, x, y, width, height };
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
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/maps/resolve?url=${encodeURIComponent(normalized)}`, {
        headers: token && token !== "undefined" ? { Authorization: `Bearer ${token}` } : undefined,
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
          : "Não foi possível resolver o link encurtado. Confira se o módulo /maps/resolve foi adicionado na API.",
      );
    } finally {
      setResolvingMapUrl(false);
    }
  }

  function payload() {
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
      eventDate: isoOrUndefined(startDate),
      startDate: isoOrUndefined(startDate),
      endDate: isoOrUndefined(endDate),
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
        mapUrl: textOrUndefined(mapUrl),
        instructions: textOrUndefined(instructions),
        latitude: textOrUndefined(latitude),
        longitude: textOrUndefined(longitude),
      },
      media: {
        coverImageUrl: normalizeUrl(coverImageUrl),
        bannerImageUrl: normalizeUrl(bannerImageUrl),
        thumbnailUrl: normalizeUrl(thumbnailUrl),
        mobileBannerUrl: normalizeUrl(mobileBannerUrl),
        sectorMapImageUrl: normalizeUrl(sectorMapImageUrl),
        gallery: gallery.map((item) => normalizeUrl(item)).filter(Boolean),
      },
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
        startsAt: isoOrUndefined(session.startsAt),
        endsAt: isoOrUndefined(session.endsAt),
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
      ticketTypes: tickets.map((ticket, index) => {
        const sector = sectors.find((item) => item.localId === ticket.venueSectorLocalId);
        return {
          eventSessionLocalId: textOrUndefined(ticket.eventSessionLocalId),
          venueSectorLocalId: textOrUndefined(ticket.venueSectorLocalId),
          occupancyMode: sector?.mode || ticket.occupancyMode,
          name: `${TICKET_KIND_OPTIONS.find((item) => item.value === ticket.ticketKind)?.label || "Inteira"} - ${ticket.name} - ${ticket.lotLabel}`,
          lotLabel: textOrUndefined(ticket.lotLabel),
          description: textOrUndefined(ticket.description),
          price: moneyApi(ticket.price),
          quantity: intOrUndefined(ticket.quantity),
          salesStartAt: isoOrUndefined(ticket.salesStartAt),
          salesEndAt: isoOrUndefined(ticket.salesEndAt),
          minPerOrder: 1,
          maxPerOrder: intOrUndefined(ticket.maxPerOrder),
          displayOrder: index,
          feeAmount: undefined,
          feeDescription: undefined,
          benefitDescription: undefined,
          isHidden: ticket.isHidden,
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
          <Field label="Capacidade geral" value={capacity} onChange={setCapacity} onlyNumbers required error={submitAttempted && generalCapacity <= 0} />
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
            <Field label="Início geral" value={startDate} onChange={setGeneralStart} type="datetime-local" required error={requiredErrors.sessions && !startDate} />
            <Field label="Fim geral" value={endDate} onChange={setGeneralEnd} type="datetime-local" required error={requiredErrors.sessions && !endDate} />
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
                <Field label="Nome da data" value={session.name} onChange={() => undefined} disabled />
                <Field label="Capacidade da data" value={session.capacity} onChange={(value) => updateSession(session.localId, { capacity: value })} onlyNumbers required />
                <Field label="Início" value={session.startsAt} onChange={(value) => updateSession(session.localId, { startsAt: value })} type="datetime-local" required />
                <Field label="Fim" value={session.endsAt} onChange={(value) => updateSession(session.localId, { endsAt: value })} type="datetime-local" required />
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
              <MediaField label="Capa" kind="cover" value={coverImageUrl} onChange={setCoverImageUrl} required error={requiredErrors.media && !coverImageUrl} />
              <MediaField label="Banner" kind="banner" value={bannerImageUrl} onChange={setBannerImageUrl} required error={requiredErrors.media && !bannerImageUrl} />
              <MediaField label="Thumbnail" kind="thumbnail" value={thumbnailUrl} onChange={setThumbnailUrl} required error={requiredErrors.media && !thumbnailUrl} />
              <MediaField label="Banner mobile" kind="mobile-banner" value={mobileBannerUrl} onChange={setMobileBannerUrl} required error={requiredErrors.media && !mobileBannerUrl} />
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
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
            <h3 className="text-2xl font-black">Políticas e regras</h3>
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field label="Classificação indicativa" value={ageRating} onChange={setAgeRating} />
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black">
                <input type="checkbox" checked={refundEnabled} onChange={(event) => setRefundEnabled(event.target.checked)} />
                Permitir reembolso neste evento
              </label>
              {refundEnabled ? <TextArea label="Política de reembolso" value={refundPolicy} onChange={setRefundPolicy} /> : null}
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black">
                <input type="checkbox" checked={transferEnabled} onChange={(event) => setTransferEnabled(event.target.checked)} />
                Permitir transferência neste evento
              </label>
              {transferEnabled ? <TextArea label="Política de transferência" value={transferPolicy} onChange={setTransferPolicy} /> : null}
              <TextArea label="Política de meia-entrada" value={halfEntryPolicy} onChange={setHalfEntryPolicy} />
              <TextArea label="Regras de entrada" value={entryRules} onChange={setEntryRules} />
              <TextArea label="Documentos obrigatórios" value={documentRules} onChange={setDocumentRules} />
              <TextArea label="Termos e observações" value={termsNotes} onChange={setTermsNotes} />
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderSectorsStep() {
    function sectorCapacity(sector: SectorItem) {
      if (sector.kind === "NUMBERED_SEATS") {
        return positiveInt(sector.chairRows || "10") * positiveInt(sector.chairsPerRow || "10");
      }

      if (sector.kind === "TABLES") {
        return positiveInt(sector.tableCount || "20") * positiveInt(sector.seatsPerTable || "4");
      }

      return toNumber(sector.capacity);
    }

    function changeSectorKind(localId: string, kind: SectorKind) {
      updateSector(localId, { kind });
    }

    function updateChairRows(sector: SectorItem, value: string) {
      const chairRows = onlyDigits(value);
      updateSector(sector.localId, {
        chairRows,
        capacity: String(positiveInt(chairRows) * positiveInt(sector.chairsPerRow || "10")),
      });
    }

    function updateChairsPerRow(sector: SectorItem, value: string) {
      const chairsPerRow = onlyDigits(value);
      updateSector(sector.localId, {
        chairsPerRow,
        capacity: String(positiveInt(sector.chairRows || "10") * positiveInt(chairsPerRow)),
      });
    }

    function updateTableCount(sector: SectorItem, value: string) {
      const tableCount = onlyDigits(value);
      updateSector(sector.localId, {
        tableCount,
        capacity: String(positiveInt(tableCount) * positiveInt(sector.seatsPerTable || "4")),
      });
    }

    function updateSeatsPerTable(sector: SectorItem, value: string) {
      const seatsPerTable = onlyDigits(value);
      updateSector(sector.localId, {
        seatsPerTable,
        capacity: String(positiveInt(sector.tableCount || "20") * positiveInt(seatsPerTable)),
      });
    }

    function renderStructuredFields(sector: SectorItem) {
      if (sector.kind === "NUMBERED_SEATS") {
        const chairRows = sector.chairRows || "10";
        const chairsPerRow = sector.chairsPerRow || "10";
        const total = positiveInt(chairRows) * positiveInt(chairsPerRow);

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
                <p className="mt-1 text-xl font-black text-slate-950">{total} cadeiras</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Quantidade de fileiras" value={chairRows} onChange={(value) => updateChairRows(sector, value)} onlyNumbers required />
              <Field label="Cadeiras por fileira" value={chairsPerRow} onChange={(value) => updateChairsPerRow(sector, value)} onlyNumbers required />
              <Field label="Total de cadeiras" value={String(total)} onChange={() => undefined} disabled />
            </div>
          </div>
        );
      }

      if (sector.kind === "TABLES") {
        const tableCountValue = sector.tableCount || "20";
        const seatsPerTableValue = sector.seatsPerTable || "4";
        const total = positiveInt(tableCountValue) * positiveInt(seatsPerTableValue);

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
                <p className="mt-1 text-xl font-black text-slate-950">{total} lugares</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Field label="Quantidade de mesas" value={tableCountValue} onChange={(value) => updateTableCount(sector, value)} onlyNumbers required />
              <Field label="Cadeiras por mesa" value={seatsPerTableValue} onChange={(value) => updateSeatsPerTable(sector, value)} onlyNumbers required />
              <Field label="Capacidade total" value={String(total)} onChange={() => undefined} disabled />
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
    function ticketGroupId(ticket: TicketItem) {
      return `${ticket.eventSessionLocalId || "all"}::${ticket.venueSectorLocalId || "all"}::${ticket.ticketKind}`;
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

      return Array.from(groups.values()).map((group) => group.sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel)));
    }

    function sessionLabel(sessionId: string) {
      if (!sessionId) return "Todas as datas";
      return sessions.find((session) => session.localId === sessionId)?.name || "Data";
    }

    function sectorLabel(sectorId: string) {
      if (isOpenOnly || !sectorId) return isOpenOnly ? "Área única" : "Todos os setores";
      return sectors.find((sector) => sector.localId === sectorId)?.name || "Setor";
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

    function addLotFor(sessionId: string, sectorId: string, ticketKind: TicketKind) {
      const sector = sectors.find((item) => item.localId === sectorId);
      const session = sessions.find((item) => item.localId === sessionId) || sessions[0];

      setTickets((current) => {
        const group = current
          .filter((ticket) =>
            ticket.eventSessionLocalId === sessionId &&
            ticket.venueSectorLocalId === sectorId &&
            ticket.ticketKind === ticketKind,
          )
          .sort((a, b) => lotNumber(a.lotLabel) - lotNumber(b.lotLabel));

        const previous = group[group.length - 1];
        const nextLotNumber = group.length + 1;
        const nextLotLabel = `${nextLotNumber}º Lote`;
        const kindLabel = TICKET_KIND_OPTIONS.find((option) => option.value === ticketKind)?.label || "Inteira";
        const firstLimit = group.find((ticket) => lotNumber(ticket.lotLabel) === 1)?.maxPerOrder || previous?.maxPerOrder || "";

        return [
          ...current,
          {
            ...newTicket(current.length, sessionId, sectorId, sector?.mode || preset.mode),
            ticketKind,
            name: kindLabel,
            lotLabel: nextLotLabel,
            salesStartAt: previous?.salesEndAt || today,
            salesEndAt: session?.startsAt ? mergeDateAndTime(session.startsAt, previous?.salesEndAt || session.endsAt || session.startsAt) : "",
            maxPerOrder: firstLimit,
            isHidden: nextLotNumber > 1 && group.some((ticket) => ticket.lotLabel === "1º Lote"),
          },
        ];
      });
    }

    const groups = groupTickets(tickets);
    const validTickets = tickets.filter((item) => item.name.trim() && item.price.trim());
    const sessionOptions = [{ label: "Todas as datas", value: "" }, ...sessions.map((item) => ({ label: item.name, value: item.localId }))];
    const sectorOptions = isOpenOnly
      ? [{ label: "Área única", value: "" }]
      : [{ label: "Todos os setores", value: "" }, ...sectors.map((item) => ({ label: item.name, value: item.localId }))];

    return (
      <StepShell
        eyebrow="Etapa 7"
        title="Ingressos e lotes"
        description="Crie lotes por setor, data e tipo de ingresso. O próximo lote começa quando o anterior termina ou esgota a quantidade disponível."
      >
        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-sky-100 bg-sky-50 p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
              <div>
                <h3 className="text-xl font-black text-slate-950">Criador rápido por setor</h3>
                <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-sky-900">
                  Escolha a data e o setor abaixo e clique no tipo de ingresso. Se já existir 1º lote para aquele setor/data/tipo, o sistema cria o próximo lote como oculto e usa o fim do lote anterior como início sugerido.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <MiniStat label="Tipos válidos" value={validTickets.length} />
                <MiniStat label="Quantidade total" value={tickets.reduce((sum, item) => sum + toNumber(item.quantity), 0)} />
                <MiniStat label="Grupos" value={groups.length} />
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {(sessions.length ? sessions : [newSession(0)]).map((session) => (
                <div key={session.localId || "all-session"} className="rounded-3xl border border-sky-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">{session.name || "Data"}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">Fim padrão das vendas: {datePreview(session.startsAt || startDate)}</p>

                  <div className="mt-4 grid gap-3">
                    {(isOpenOnly ? [{ localId: "", name: "Área única", mode: preset.mode } as SectorItem] : sectors).map((sector) => (
                      <div key={`${session.localId}-${sector.localId || "open"}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-sm font-black text-slate-950">{sector.name || "Área única"}</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">Capacidade do setor: {sector.capacity || capacity}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {TICKET_KIND_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => addLotFor(session.localId, sector.localId || "", option.value)}
                                className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-sky-700"
                              >
                                + {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {ticketError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
              {ticketError}
            </div>
          ) : null}

          {groups.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-lg font-black text-slate-950">Nenhum lote criado ainda</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Use o criador rápido acima para gerar os primeiros lotes.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {groups.map((group) => {
                const first = group[0];
                const groupTitle = `${sessionLabel(first.eventSessionLocalId)} • ${sectorLabel(first.venueSectorLocalId)} • ${TICKET_KIND_OPTIONS.find((item) => item.value === first.ticketKind)?.label || "Inteira"}`;
                const maxPerOrder = groupLimit(first);

                return (
                  <div key={ticketGroupId(first)} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">Grupo de venda</p>
                        <h3 className="mt-1 text-xl font-black text-slate-950">{groupTitle}</h3>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                          Mínimo por pedido travado em 1. O máximo definido aqui vale para todos os lotes deste grupo.
                        </p>
                      </div>

                      <Field
                        label="Máximo por pedido do grupo"
                        value={maxPerOrder}
                        onChange={(value) => updateGroupMax(first, value)}
                        onlyNumbers
                        helper="Aplicado a todos os lotes deste setor/data/tipo."
                      />
                    </div>

                    <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
                      <div className="grid grid-cols-[110px_1fr_120px_120px_190px_190px_120px] gap-0 bg-slate-950 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white">
                        <span>Lote</span>
                        <span>Nome</span>
                        <span>Preço</span>
                        <span>Qtd.</span>
                        <span>Início</span>
                        <span>Fim</span>
                        <span>Status</span>
                      </div>

                      <div className="divide-y divide-slate-200">
                        {group.map((ticket) => {
                          const autoHidden = lotNumber(ticket.lotLabel) > 1 && group.some((item) => item.lotLabel === "1º Lote");
                          const previousEnd = previousLotEnd(ticket, ticket.lotLabel);

                          return (
                            <div key={ticket.localId} className="grid grid-cols-[110px_1fr_120px_120px_190px_190px_120px] items-start gap-0 bg-white px-4 py-4 text-sm">
                              <Select label="" value={ticket.lotLabel} onChange={(value) => updateTicket(ticket.localId, { lotLabel: value })} options={ticketLotOptions(ticket)} />
                              <Field label="" value={ticket.name} onChange={(value) => updateTicket(ticket.localId, { name: value })} />
                              <Field label="" value={ticket.price} onChange={(value) => updateTicket(ticket.localId, { price: value })} money placeholder="250,00" helper={formatMoney(ticket.price)} />
                              <Field label="" value={ticket.quantity} onChange={(value) => updateTicket(ticket.localId, { quantity: value })} onlyNumbers />
                              <Field
                                label=""
                                value={ticket.salesStartAt || previousEnd}
                                onChange={(value) => updateTicket(ticket.localId, { salesStartAt: value })}
                                type="datetime-local"
                                helper={previousEnd ? "Sugerido pelo fim do lote anterior." : undefined}
                              />
                              <Field
                                label=""
                                value={ticket.salesEndAt}
                                onChange={(value) => updateTicket(ticket.localId, { salesEndAt: value })}
                                type="datetime-local"
                                helper="Dia preso à data escolhida."
                              />
                              <div className="grid gap-2">
                                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
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

                              <div className="col-span-7 mt-3">
                                <TextArea label="Descrição e benefícios" value={ticket.description} onChange={(value) => updateTicket(ticket.localId, { description: value })} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addLotFor(first.eventSessionLocalId, first.venueSectorLocalId, first.ticketKind)}
                        className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-3 text-sm font-black text-sky-700 hover:bg-sky-100"
                      >
                        + Adicionar próximo lote deste grupo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${active ? "bg-sky-600 text-white" : done ? "bg-emerald-600 text-white" : "bg-slate-200"}`}>{done ? "✓" : index + 1}</span>
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
