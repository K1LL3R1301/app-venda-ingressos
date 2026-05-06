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

const MAP_W = 1200;
const MAP_H = 850;
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
  return {
    localId: id("sector"),
    name,
    kind,
    type: KIND_TYPE[kind],
    mode: KIND_MODE[kind],
    capacity: "",
    color: COLORS[index % COLORS.length],
    gateName: "",
    description: "",
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
    location: isOnline ? Boolean(venueName.trim()) : Boolean(venueName.trim() && zipCode.trim() && reference.trim() && isMapUrl(mapUrl)),
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
    setSectors((current) =>
      current.map((item) => {
        if (item.localId !== localId) return item;
        const next = { ...item, ...patch };
        if (patch.kind) {
          next.type = KIND_TYPE[patch.kind];
          next.mode = KIND_MODE[patch.kind];
        }
        if (patch.capacity !== undefined) next.capacity = onlyDigits(patch.capacity);
        return next;
      }),
    );
    setMapObjects((current) =>
      current.map((item) => (item.venueSectorLocalId === localId ? { ...item, label: patch.name || item.label, capacity: patch.capacity || item.capacity } : item)),
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
        let next = { ...item, ...patch };
        if (patch.price !== undefined) next.price = onlyMoney(patch.price);
        if (patch.quantity !== undefined) next.quantity = onlyDigits(patch.quantity);
        if (patch.maxPerOrder !== undefined) next.maxPerOrder = onlyDigits(patch.maxPerOrder);
        if (patch.ticketKind) next.name = TICKET_KIND_OPTIONS.find((option) => option.value === patch.ticketKind)?.label || next.name;
        if (patch.venueSectorLocalId !== undefined) {
          const sector = sectors.find((sectorItem) => sectorItem.localId === patch.venueSectorLocalId);
          next.occupancyMode = sector?.mode || preset.mode;
        }
        if (patch.lotLabel) {
          const autoStart = previousLotEnd(item, patch.lotLabel);
          if (autoStart) next.salesStartAt = autoStart;
        }
        if (patch.eventSessionLocalId !== undefined) {
          const session = sessions.find((sessionItem) => sessionItem.localId === patch.eventSessionLocalId);
          if (session?.startsAt) next.salesEndAt = mergeDateAndTime(session.startsAt, next.salesEndAt || session.endsAt);
        }
        if (patch.salesEndAt !== undefined) {
          const session = sessions.find((sessionItem) => sessionItem.localId === item.eventSessionLocalId);
          if (session?.startsAt) next.salesEndAt = mergeDateAndTime(session.startsAt, patch.salesEndAt);
        }
        if (next.lotLabel !== "1º Lote") {
          next.isHidden = current.some((other) => {
            return (
              other.localId !== next.localId &&
              other.venueSectorLocalId === next.venueSectorLocalId &&
              other.eventSessionLocalId === next.eventSessionLocalId &&
              other.ticketKind === next.ticketKind &&
              other.lotLabel === "1º Lote"
            );
          });
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

  function radius(object: MapObject) {
    const shape = objectShape(object);
    if (shape === "CIRCLE" || shape === "PILL") return "9999px";
    if (shape === "RECTANGLE") return "0.75rem";
    return "2rem";
  }

  function generateMap() {
    const stage: MapObject = {
      localId: id("stage"),
      venueSectorLocalId: "",
      code: "PALCO",
      label: "PALCO",
      type: "STAGE",
      capacity: "",
      x: 420,
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
    ];

    const objects = sectors.map<MapObject>((sector, index) => {
      const template = templates[index % templates.length];
      return {
        localId: id("area"),
        venueSectorLocalId: sector.localId,
        code: `S${index + 1}`,
        label: sector.name || `Setor ${index + 1}`,
        type: sector.kind === "TABLES" ? "TABLE" : "AREA",
        capacity: sector.capacity,
        x: template.x,
        y: template.y,
        width: template.width,
        height: template.height,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          sectorKind: sector.kind,
          sectorColor: sector.color,
          shape: "ROUNDED",
          polygonPoints: [
            { x: 0, y: 12 },
            { x: 100, y: 0 },
            { x: 100, y: 88 },
            { x: 0, y: 100 },
          ],
          tableSaleMode: sector.kind === "TABLES" ? tableSaleMode : undefined,
          seatsPerTable: sector.kind === "TABLES" ? Math.max(1, Number.parseInt(seatsPerTable, 10) || 1) : undefined,
          tableCount: sector.kind === "TABLES" ? Math.max(1, Number.parseInt(tableCount, 10) || 1) : undefined,
        },
      };
    });

    setSelectedMapObjectId("");
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
          return { ...object, metadata: { ...object.metadata, shape, polygonPoints: objectPoints(object) } };
        }
        return { ...object, metadata: { ...object.metadata, shape } };
      }),
    );
  }

  function addPoint() {
    if (!selectedMapObjectId) return;
    setMapObjects((current) =>
      current.map((object) =>
        object.localId === selectedMapObjectId
          ? { ...object, metadata: { ...object.metadata, shape: "FREEFORM", polygonPoints: [...objectPoints(object), { x: 50, y: 50 }] } }
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
      current.map((object) => (object.localId === selectedMapObjectId ? { ...object, metadata: { ...object.metadata, shape: "FREEFORM", polygonPoints: defaultPolygon() } } : object)),
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

  function mapUrlChange(value: string) {
    setMapUrl(value);
    const match = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || value.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match?.[1] && match?.[2]) {
      setLatitude(match[1]);
      setLongitude(match[2]);
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
              <TextArea label="Galeria, uma URL por linha" value={galleryText} onChange={setGalleryText} />
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
            return (
              <div key={sector.localId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-5 flex justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Setor {index + 1}</p>
                    <h3 className="text-lg font-black">{sector.name}</h3>
                  </div>
                  {sectors.length > 1 ? <button type="button" onClick={() => removeSector(sector.localId)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600">Remover</button> : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Nome" value={sector.name} onChange={(value) => updateSector(sector.localId, { name: value })} />
                  <Select
                    label="Tipo do setor"
                    value={sector.kind}
                    onChange={(value) => updateSector(sector.localId, { kind: value as SectorKind })}
                    disabled={preset.sectorKinds.length === 1}
                    options={preset.sectorKinds.map((kind) => ({ label: KIND_LABEL[kind], value: kind }))}
                  />
                  <Field label="Capacidade" value={sector.capacity} onChange={(value) => updateSector(sector.localId, { capacity: value })} onlyNumbers />
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

  function renderMapStep() {
    const selected = mapObjects.find((item) => item.localId === selectedMapObjectId) || null;
    return (
      <StepShell eyebrow="Etapa 6" title="Mapa do evento" description="Monte o mapa visualmente com mouse e setores quebrados.">
        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black">Editor visual</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Arraste blocos, redimensione pelos cantos e use o formato quebrado com pontos azuis.</p>
            {preset.allowTableMap ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <Select label="Venda de mesas" value={tableSaleMode} onChange={(value) => setTableSaleMode(value as "WHOLE_TABLE" | "BY_SEAT")} options={[{ label: "Comprar mesa inteira", value: "WHOLE_TABLE" }, { label: "Comprar lugares da mesa", value: "BY_SEAT" }]} />
                <Field label="Lugares por mesa" value={seatsPerTable} onChange={setSeatsPerTable} onlyNumbers />
                <Field label="Quantidade de mesas" value={tableCount} onChange={setTableCount} onlyNumbers />
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={generateMap} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Gerar mapa em blocos</button>
              {mapObjects.length > 0 ? <button type="button" onClick={() => { setMapObjects([]); setSelectedMapObjectId(""); }} className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-600">Limpar mapa</button> : null}
            </div>
          </div>
          {requiredErrors.map ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">Gere o mapa para continuar.</div> : null}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row">
              <div>
                <h3 className="text-lg font-black">Área de montagem</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">{selected ? `Selecionado: ${selected.label}` : "Selecione um bloco."}</p>
              </div>
              {selected ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">Formato</p>
                  <div className="flex flex-wrap gap-2">
                    {SHAPES.map((shape) => (
                      <button
                        key={shape.value}
                        type="button"
                        onClick={() => setShape(selected.localId, shape.value)}
                        className={`rounded-2xl px-4 py-2 text-xs font-black ${objectShape(selected) === shape.value ? "bg-slate-950 text-white" : "border border-slate-200 bg-white"}`}
                      >
                        {shape.label}
                      </button>
                    ))}
                  </div>
                  {objectShape(selected) === "FREEFORM" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={addPoint} className="rounded-2xl bg-sky-600 px-4 py-2 text-xs font-black text-white">+ Adicionar ponto</button>
                      <button type="button" onClick={removePoint} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black">Remover ponto</button>
                      <button type="button" onClick={resetPolygon} className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600">Resetar</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mt-5 min-h-[760px] overflow-auto rounded-3xl bg-slate-100 p-6">
              {mapObjects.length === 0 ? (
                <div className="flex h-[680px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
                  <div>
                    <p className="text-lg font-black">Nenhum bloco criado ainda</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">Clique em “Gerar mapa em blocos”.</p>
                  </div>
                </div>
              ) : (
                <div
                  className="relative touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50 to-slate-200 shadow-inner"
                  style={{ width: MAP_W, height: MAP_H }}
                  onPointerMove={dragMove}
                  onPointerUp={() => setInteraction(null)}
                  onPointerLeave={() => setInteraction(null)}
                  onPointerCancel={() => setInteraction(null)}
                  onPointerDown={() => setSelectedMapObjectId("")}
                >
                  <div className="absolute rounded-t-[2rem] bg-white/70 shadow-inner" style={{ left: MAP_W / 2 - 45, top: 150, width: 90, height: 620 }} />
                  {mapObjects.map((object) => {
                    const sector = sectors.find((item) => item.localId === object.venueSectorLocalId);
                    const bg = sector?.color || String(object.metadata?.sectorColor || "#111827");
                    const isSelected = selectedMapObjectId === object.localId;
                    const isFree = objectShape(object) === "FREEFORM";
                    const isStage = object.type === "STAGE";
                    const points = objectPoints(object);
                    return (
                      <div
                        key={object.localId}
                        onPointerDown={(event) => startMove(event, object)}
                        className={`absolute cursor-move select-none ${isSelected ? "z-20" : "z-10"}`}
                        style={{ left: object.x, top: object.y, width: object.width, height: object.height, transform: `rotate(${object.rotation}deg)`, outline: isSelected ? "3px solid rgba(56, 189, 248, 0.65)" : undefined, outlineOffset: 4 }}
                      >
                        {isFree ? (
                          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${object.width} ${object.height}`} preserveAspectRatio="none">
                            <polygon points={svgPoints(object)} fill={bg} stroke={isSelected ? "#38bdf8" : "#ffffff"} strokeWidth="5" filter="drop-shadow(0px 12px 12px rgba(15,23,42,0.25))" />
                          </svg>
                        ) : (
                          <div className={`absolute inset-0 border-4 shadow-xl ${isStage ? "border-slate-950 bg-slate-950" : "border-white"}`} style={{ backgroundColor: bg, borderRadius: radius(object) }} />
                        )}
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white" style={isFree ? { clipPath: `polygon(${cssPoints(object)})` } : undefined}>
                          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">{isStage ? "Palco" : sector ? KIND_LABEL[sector.kind] : "Setor"}</span>
                          <strong className="mt-2 px-3 text-2xl font-black uppercase leading-none">{object.label}</strong>
                          {!isStage ? <span className="mt-3 rounded-full bg-black/20 px-3 py-1 text-xs font-black">{object.capacity || 0} pessoas</span> : null}
                        </div>
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
                            <button type="button" onPointerDown={(event) => startResize(event, object, "nw")} className="absolute -left-3 -top-3 z-30 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                            <button type="button" onPointerDown={(event) => startResize(event, object, "ne")} className="absolute -right-3 -top-3 z-30 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                            <button type="button" onPointerDown={(event) => startResize(event, object, "sw")} className="absolute -bottom-3 -left-3 z-30 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-white bg-sky-500 shadow" />
                            <button type="button" onPointerDown={(event) => startResize(event, object, "se")} className="absolute -bottom-3 -right-3 z-30 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow" />
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
    return (
      <StepShell eyebrow="Etapa 7" title="Ingressos / lotes" description="Tipos, lotes, preços e vendas.">
        {ticketError ? <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">{ticketError}</div> : null}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MiniStat label="Tipos válidos" value={tickets.filter((item) => item.name.trim() && item.price.trim()).length} />
          <MiniStat label="Quantidade total" value={tickets.reduce((sum, item) => sum + toNumber(item.quantity), 0)} />
          <MiniStat label="Modelo" value={preset.label} />
        </div>
        <div className="space-y-4">
          {tickets.map((ticket, index) => {
            const autoHide = ticket.lotLabel !== "1º Lote" && hasFirstLot(ticket);
            return (
              <div key={ticket.localId} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-5 flex justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Ingresso / lote {index + 1}</p>
                    <h3 className="text-lg font-black">{ticket.name}</h3>
                    {autoHide ? <p className="text-xs font-black text-amber-700">Oculto até o lote anterior encerrar.</p> : null}
                  </div>
                  {tickets.length > 1 ? <button type="button" onClick={() => removeTicket(ticket.localId)} className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600">Remover</button> : null}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Select label="Tipo do ingresso" value={ticket.ticketKind} onChange={(value) => updateTicket(ticket.localId, { ticketKind: value as TicketKind })} options={TICKET_KIND_OPTIONS} />
                  <Field label="Nome" value={ticket.name} onChange={(value) => updateTicket(ticket.localId, { name: value })} />
                  <Select label="Lote" value={ticket.lotLabel} onChange={(value) => updateTicket(ticket.localId, { lotLabel: value })} options={ticketLotOptions(ticket)} />
                  <Field label="Preço" value={ticket.price} onChange={(value) => updateTicket(ticket.localId, { price: value })} money placeholder="250,00" helper={formatMoney(ticket.price)} />
                  <Field label="Quantidade" value={ticket.quantity} onChange={(value) => updateTicket(ticket.localId, { quantity: value })} onlyNumbers />
                  <Select label="Data" value={ticket.eventSessionLocalId} onChange={(value) => updateTicket(ticket.localId, { eventSessionLocalId: value })} options={[{ label: "Todas as datas", value: "" }, ...sessions.map((item) => ({ label: item.name, value: item.localId }))]} />
                  <Select label="Setor" value={ticket.venueSectorLocalId} onChange={(value) => updateTicket(ticket.localId, { venueSectorLocalId: value })} options={isOpenOnly ? [{ label: "Área única", value: "" }] : [{ label: "Todos os setores", value: "" }, ...sectors.map((item) => ({ label: item.name, value: item.localId }))]} />
                  <Field label="Início das vendas" value={ticket.salesStartAt} onChange={(value) => updateTicket(ticket.localId, { salesStartAt: value })} type="datetime-local" />
                  <Field label="Fim das vendas" value={ticket.salesEndAt} onChange={(value) => updateTicket(ticket.localId, { salesEndAt: value })} type="datetime-local" helper="O dia fica preso à data selecionada." />
                  <Field label="Mínimo por pedido" value="1" onChange={() => undefined} disabled />
                  <Field label="Máximo por pedido" value={ticket.maxPerOrder} onChange={(value) => updateTicket(ticket.localId, { maxPerOrder: value })} onlyNumbers />
                  <div className="md:col-span-2">
                    <TextArea label="Descrição e benefícios" value={ticket.description} onChange={(value) => updateTicket(ticket.localId, { description: value })} />
                  </div>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black md:col-span-2">
                    <input type="checkbox" checked={ticket.isHidden || autoHide} disabled={autoHide} onChange={(event) => updateTicket(ticket.localId, { isHidden: event.target.checked })} />
                    Ocultar este ingresso na página pública
                  </label>
                </div>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={addTicket} className="mt-5 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700">
          + Adicionar ingresso ou lote
        </button>
      </StepShell>
    );
  }

  function renderLocationStep() {
    return (
      <StepShell eyebrow="Etapa 8" title="Local e acesso" description="Endereço, CEP, mapa e instruções.">
        <div className="grid gap-5 md:grid-cols-2">
          <Select label="Modo do evento" value={mode} onChange={setMode} options={[{ label: "Presencial", value: "PRESENTIAL" }, { label: "Online", value: "ONLINE" }, { label: "Híbrido", value: "HYBRID" }]} />
          <Field label={isOnline ? "Nome ou canal do evento" : "Nome do local"} value={venueName} onChange={setVenueName} required error={submitAttempted && !venueName.trim()} />
          {!isOnline ? (
            <>
              <Field label="CEP" value={zipCode} onChange={cepChange} onlyNumbers required error={submitAttempted && !zipCode.trim()} />
              <Field label="Endereço" value={addressLine1} onChange={setAddressLine1} />
              <Field label="Complemento" value={addressLine2} onChange={setAddressLine2} />
              <Field label="Bairro" value={neighborhood} onChange={setNeighborhood} />
              <Field label="Cidade" value={city} onChange={setCity} />
              <Field label="Estado" value={stateName} onChange={setStateName} />
              <Field label="Referência" value={reference} onChange={setReference} required error={submitAttempted && !reference.trim()} />
              <Field label="URL do mapa" value={mapUrl} onChange={mapUrlChange} required error={submitAttempted && !isMapUrl(mapUrl)} helper={submitAttempted && !isMapUrl(mapUrl) ? "Informe um link válido de mapa." : "Google Maps, Waze ou OpenStreetMap."} />
              <Field label="Latitude" value={latitude} onChange={setLatitude} />
              <Field label="Longitude" value={longitude} onChange={setLongitude} />
            </>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:col-span-2">
              <p className="text-lg font-black text-emerald-950">Evento online</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">Para evento online, endereço físico e URL do mapa não são obrigatórios.</p>
            </div>
          )}
          <div className="md:col-span-2">
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
      <form onSubmit={submit} className="mx-auto max-w-7xl">
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
