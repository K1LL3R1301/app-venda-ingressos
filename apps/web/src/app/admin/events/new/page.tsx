"use client";

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

type OrganizerItem = {
  id: string;
  tradeName?: string;
  legalName?: string;
  document?: string;
  email?: string;
  phone?: string;
  status?: string;
  description?: string;
};

type OccupancyMode =
  | "GENERAL_ADMISSION"
  | "RESERVED_SEATING"
  | "RESERVED_TABLE"
  | "MIXED";

type EventCategory =
  | "FESTAS_SHOWS"
  | "TEATROS_ESPETACULOS"
  | "STAND_UP_COMEDY"
  | "ESPORTES"
  | "PASSEIOS_TOURS"
  | "CONGRESSOS"
  | "INFANTIL"
  | "GASTRONOMIA";

type OccupancyPresetKey =
  | "OPEN_ADMISSION"
  | "PLATEIA_ONLY"
  | "NUMBERED_SEATS_ONLY"
  | "TABLES_ONLY"
  | "NUMBERED_SEATS_AND_PLATEIA"
  | "TABLES_AND_PLATEIA"
  | "TABLES_AND_OPEN_ADMISSION";

type SectorKind =
  | "OPEN_ADMISSION"
  | "PLATEIA"
  | "NUMBERED_SEATS"
  | "TABLES";

type TicketKind = "INTEIRA" | "MEIA" | "SOCIAL";

type MapShape = "RECTANGLE" | "ROUNDED" | "CIRCLE" | "PILL" | "FREEFORM";

type MapPoint = {
  x: number;
  y: number;
};

type ResizeDirection = "nw" | "ne" | "sw" | "se";

type MapInteraction = {
  type: "move" | "resize" | "point";
  objectId: string;
  direction?: ResizeDirection;
  pointIndex?: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startPointX?: number;
  startPointY?: number;
};

type SectorColorOption = {
  label: string;
  value: string;
};

type SectorKindConfig = {
  key: SectorKind;
  label: string;
  description: string;
  internalType: string;
  occupancyMode: OccupancyMode;
};

type OccupancyPresetOption = {
  key: OccupancyPresetKey;
  label: string;
  description: string;
  occupancyMode: OccupancyMode;
  usesOpenAdmission: boolean;
  usesPlateia: boolean;
  usesNumberedSeats: boolean;
  usesTables: boolean;
  requiresMap: boolean;
  allowSeatMap: boolean;
  allowTableMap: boolean;
  supportsMultipleSectors: boolean;
  defaultSectorKind: SectorKind;
  allowedSectorKinds: SectorKind[];
};

type EventSessionFormItem = {
  localId: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  status: string;
  displayOrder: string;
};

type VenueSectorFormItem = {
  localId: string;
  name: string;
  description: string;
  sectorKind: SectorKind;
  type: string;
  occupancyMode: OccupancyMode;
  capacity: string;
  displayOrder: string;
  color: string;
  gateName: string;
};

type SeatMapObjectFormItem = {
  localId: string;
  venueSectorLocalId: string;
  code: string;
  label: string;
  type:
    | "SEAT"
    | "ACCESSIBLE_SEAT"
    | "COMPANION_SEAT"
    | "TABLE"
    | "BOOTH"
    | "COUNTER"
    | "AREA"
    | "STAGE"
    | "SCREEN"
    | "AISLE"
    | "BLOCKED_SPACE";
  row: string;
  number: string;
  capacity: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: string;
  metadata?: Record<string, unknown>;
};

type TicketTypeFormItem = {
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
  minPerOrder: string;
  maxPerOrder: string;
  displayOrder: string;
  isHidden: boolean;
  status: string;
};

type CategoryPreset = {
  label: string;
  description: string;
  defaultSectorName: string;
  defaultSectorType: string;
  sessionLabel: string;
};

type StepId =
  | "type"
  | "basic"
  | "sessions"
  | "extras"
  | "sectors"
  | "map"
  | "tickets"
  | "location"
  | "review";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const DEFAULT_STATUS = "PUBLISHED";
const DEFAULT_VISIBILITY = "PUBLIC";
const MAP_CANVAS_WIDTH = 1200;
const MAP_CANVAS_HEIGHT = 850;
const MAP_MIN_OBJECT_SIZE = 54;

const categoryOptions: Array<{
  value: EventCategory;
  label: string;
  description: string;
}> = [
  {
    value: "FESTAS_SHOWS",
    label: "Festas e shows",
    description: "Shows, festivais, baladas, rodeios e eventos com setores.",
  },
  {
    value: "TEATROS_ESPETACULOS",
    label: "Teatros e espetáculos",
    description: "Eventos com cadeiras numeradas e sessões.",
  },
  {
    value: "STAND_UP_COMEDY",
    label: "Stand-up comedy",
    description: "Pode usar cadeiras numeradas ou mesas marcadas.",
  },
  {
    value: "CONGRESSOS",
    label: "Congressos e palestras",
    description: "Auditórios, salas, sessões, cadeiras ou mesas.",
  },
  {
    value: "GASTRONOMIA",
    label: "Gastronomia, bar e restaurantes",
    description: "Mesas, reservas e ingressos para evento aberto.",
  },
  {
    value: "ESPORTES",
    label: "Esportes",
    description: "Venda de ingressos para evento aberto.",
  },
  {
    value: "PASSEIOS_TOURS",
    label: "Passeios e tours",
    description: "Turmas, horários, pontos de encontro e capacidade por sessão.",
  },
  {
    value: "INFANTIL",
    label: "Infantil",
    description: "Eventos infantis com ingresso aberto, plateia ou cadeiras.",
  },
];

const sectorColorOptions: SectorColorOption[] = [
  { label: "Azul", value: "#2563eb" },
  { label: "Céu", value: "#0284c7" },
  { label: "Ciano", value: "#0891b2" },
  { label: "Teal", value: "#0f766e" },
  { label: "Verde", value: "#16a34a" },
  { label: "Esmeralda", value: "#059669" },
  { label: "Lima", value: "#65a30d" },
  { label: "Amarelo", value: "#ca8a04" },
  { label: "Laranja", value: "#ea580c" },
  { label: "Vermelho", value: "#dc2626" },
  { label: "Rosa", value: "#db2777" },
  { label: "Roxo", value: "#9333ea" },
  { label: "Violeta", value: "#7c3aed" },
  { label: "Índigo", value: "#4f46e5" },
  { label: "Cinza", value: "#475569" },
];

const ticketKindOptions: Array<{ label: string; value: TicketKind }> = [
  { label: "Inteira", value: "INTEIRA" },
  { label: "Meia", value: "MEIA" },
  { label: "Social", value: "SOCIAL" },
];

const mapShapeOptions: Array<{ label: string; value: MapShape }> = [
  { label: "Retângulo", value: "RECTANGLE" },
  { label: "Arredondado", value: "ROUNDED" },
  { label: "Círculo", value: "CIRCLE" },
  { label: "Pílula", value: "PILL" },
  { label: "Quebrado", value: "FREEFORM" },
];

const lotOptions = Array.from({ length: 20 }, (_, index) => {
  return `${index + 1}º Lote`;
});

const sectorKindCatalog: Record<SectorKind, SectorKindConfig> = {
  OPEN_ADMISSION: {
    key: "OPEN_ADMISSION",
    label: "Livre / evento aberto",
    description:
      "Área única para todos os ingressos, sem separação por setor, mesa ou cadeira.",
    internalType: "OPEN_ADMISSION",
    occupancyMode: "GENERAL_ADMISSION",
  },
  PLATEIA: {
    key: "PLATEIA",
    label: "Plateia",
    description:
      "Área livre de plateia, pista, mezanino ou camarote sem lugar marcado.",
    internalType: "PLATEIA",
    occupancyMode: "GENERAL_ADMISSION",
  },
  NUMBERED_SEATS: {
    key: "NUMBERED_SEATS",
    label: "Cadeiras numeradas",
    description: "Setor com mapa de cadeiras numeradas.",
    internalType: "NUMBERED_SEATS",
    occupancyMode: "RESERVED_SEATING",
  },
  TABLES: {
    key: "TABLES",
    label: "Mesas",
    description: "Setor com mapa de mesas marcadas.",
    internalType: "TABLES",
    occupancyMode: "RESERVED_TABLE",
  },
};

const occupancyPresetCatalog: Record<OccupancyPresetKey, OccupancyPresetOption> =
  {
    OPEN_ADMISSION: {
      key: "OPEN_ADMISSION",
      label: "Ingressos evento aberto",
      description:
        "Venda por quantidade em área única. Não usa setores separados, mesas ou cadeiras.",
      occupancyMode: "GENERAL_ADMISSION",
      usesOpenAdmission: true,
      usesPlateia: false,
      usesNumberedSeats: false,
      usesTables: false,
      requiresMap: false,
      allowSeatMap: false,
      allowTableMap: false,
      supportsMultipleSectors: false,
      defaultSectorKind: "OPEN_ADMISSION",
      allowedSectorKinds: ["OPEN_ADMISSION"],
    },
    PLATEIA_ONLY: {
      key: "PLATEIA_ONLY",
      label: "Somente plateia",
      description:
        "Permite criar vários setores de plateia, pista, mezanino ou camarote sem cadeira e sem mesa.",
      occupancyMode: "GENERAL_ADMISSION",
      usesOpenAdmission: false,
      usesPlateia: true,
      usesNumberedSeats: false,
      usesTables: false,
      requiresMap: false,
      allowSeatMap: false,
      allowTableMap: false,
      supportsMultipleSectors: true,
      defaultSectorKind: "PLATEIA",
      allowedSectorKinds: ["PLATEIA"],
    },
    NUMBERED_SEATS_ONLY: {
      key: "NUMBERED_SEATS_ONLY",
      label: "Somente cadeiras numeradas",
      description:
        "Permite criar vários setores, todos com cadeiras numeradas no mapa.",
      occupancyMode: "RESERVED_SEATING",
      usesOpenAdmission: false,
      usesPlateia: false,
      usesNumberedSeats: true,
      usesTables: false,
      requiresMap: true,
      allowSeatMap: true,
      allowTableMap: false,
      supportsMultipleSectors: true,
      defaultSectorKind: "NUMBERED_SEATS",
      allowedSectorKinds: ["NUMBERED_SEATS"],
    },
    TABLES_ONLY: {
      key: "TABLES_ONLY",
      label: "Somente mesas",
      description:
        "Permite criar vários setores, todos com mesas marcadas no mapa.",
      occupancyMode: "RESERVED_TABLE",
      usesOpenAdmission: false,
      usesPlateia: false,
      usesNumberedSeats: false,
      usesTables: true,
      requiresMap: true,
      allowSeatMap: false,
      allowTableMap: true,
      supportsMultipleSectors: true,
      defaultSectorKind: "TABLES",
      allowedSectorKinds: ["TABLES"],
    },
    NUMBERED_SEATS_AND_PLATEIA: {
      key: "NUMBERED_SEATS_AND_PLATEIA",
      label: "Cadeiras numeradas e plateia",
      description:
        "Permite vários setores. Em cada setor, escolha plateia ou cadeiras numeradas.",
      occupancyMode: "MIXED",
      usesOpenAdmission: false,
      usesPlateia: true,
      usesNumberedSeats: true,
      usesTables: false,
      requiresMap: true,
      allowSeatMap: true,
      allowTableMap: false,
      supportsMultipleSectors: true,
      defaultSectorKind: "PLATEIA",
      allowedSectorKinds: ["PLATEIA", "NUMBERED_SEATS"],
    },
    TABLES_AND_PLATEIA: {
      key: "TABLES_AND_PLATEIA",
      label: "Mesas e plateia",
      description:
        "Permite vários setores. Em cada setor, escolha plateia ou mesas marcadas.",
      occupancyMode: "MIXED",
      usesOpenAdmission: false,
      usesPlateia: true,
      usesNumberedSeats: false,
      usesTables: true,
      requiresMap: true,
      allowSeatMap: false,
      allowTableMap: true,
      supportsMultipleSectors: true,
      defaultSectorKind: "PLATEIA",
      allowedSectorKinds: ["PLATEIA", "TABLES"],
    },
    TABLES_AND_OPEN_ADMISSION: {
      key: "TABLES_AND_OPEN_ADMISSION",
      label: "Mesas e ingressos evento aberto",
      description:
        "Permite uma área aberta para ingressos avulsos e setores de mesas marcadas.",
      occupancyMode: "MIXED",
      usesOpenAdmission: true,
      usesPlateia: false,
      usesNumberedSeats: false,
      usesTables: true,
      requiresMap: true,
      allowSeatMap: false,
      allowTableMap: true,
      supportsMultipleSectors: true,
      defaultSectorKind: "OPEN_ADMISSION",
      allowedSectorKinds: ["OPEN_ADMISSION", "TABLES"],
    },
  };

const categoryOccupancyPresetKeys: Record<
  EventCategory,
  OccupancyPresetKey[]
> = {
  FESTAS_SHOWS: [
    "PLATEIA_ONLY",
    "TABLES_ONLY",
    "NUMBERED_SEATS_ONLY",
    "NUMBERED_SEATS_AND_PLATEIA",
    "TABLES_AND_PLATEIA",
  ],
  TEATROS_ESPETACULOS: ["NUMBERED_SEATS_ONLY"],
  STAND_UP_COMEDY: ["NUMBERED_SEATS_ONLY", "TABLES_ONLY"],
  CONGRESSOS: ["NUMBERED_SEATS_ONLY", "TABLES_ONLY"],
  GASTRONOMIA: ["TABLES_AND_OPEN_ADMISSION", "TABLES_ONLY"],
  ESPORTES: ["OPEN_ADMISSION"],
  PASSEIOS_TOURS: ["OPEN_ADMISSION"],
  INFANTIL: [
    "OPEN_ADMISSION",
    "NUMBERED_SEATS_ONLY",
    "PLATEIA_ONLY",
    "NUMBERED_SEATS_AND_PLATEIA",
  ],
};

function getDefaultOccupancyPresetKey(category: EventCategory) {
  return categoryOccupancyPresetKeys[category]?.[0] || "OPEN_ADMISSION";
}

function getOccupancyPreset(key: OccupancyPresetKey) {
  return occupancyPresetCatalog[key];
}

function getOccupancyPresetOptions(category: EventCategory) {
  return categoryOccupancyPresetKeys[category].map(
    (key) => occupancyPresetCatalog[key],
  );
}

function getSectorKindConfig(sectorKind: SectorKind) {
  return sectorKindCatalog[sectorKind];
}

function newLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function onlyMoney(value: string) {
  const cleaned = value.replace(/[^\d,]/g, "");
  const parts = cleaned.split(",");

  if (parts.length <= 1) return cleaned;

  return `${parts[0]},${parts.slice(1).join("").slice(0, 2)}`;
}

function priceToApiString(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  if (Number.isNaN(parsed)) return "0.00";

  return parsed.toFixed(2);
}

function parseMoney(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function toIsoOrUndefined(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function toIntOrUndefined(value: string) {
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseGallery(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getNumericValue(value: string) {
  const parsed = Number(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLotNumber(lotLabel: string) {
  const parsed = Number.parseInt(lotLabel.replace(/\D/g, ""), 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function getTicketKindLabel(ticketKind: TicketKind) {
  return (
    ticketKindOptions.find((option) => option.value === ticketKind)?.label ||
    "Inteira"
  );
}

function getTodayInputDateTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

  return now.toISOString().slice(0, 16);
}

function formatInputDateTimeFromDate(date: Date) {
  const normalized = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return normalized.toISOString().slice(0, 16);
}

function shiftInputDateTime(value: string, diffMs: number) {
  if (!value) return value;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return formatInputDateTimeFromDate(new Date(date.getTime() + diffMs));
}

function getApiOrigin() {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return "";
  }
}

function normalizeMediaUrl(value: string | undefined) {
  if (!value) return undefined;

  const trimmed = value.trim();

  if (!trimmed) return undefined;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const apiOrigin = getApiOrigin();

  if (!apiOrigin) return trimmed;

  if (trimmed.startsWith("/")) {
    return `${apiOrigin}${trimmed}`;
  }

  if (trimmed.startsWith("uploads/")) {
    return `${apiOrigin}/${trimmed}`;
  }

  return trimmed;
}

function isValidHttpUrl(value: string | undefined) {
  if (!value) return false;

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidMapUrl(value: string) {
  if (!value.trim()) return false;

  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();

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

function getDatePart(value: string) {
  return value ? value.slice(0, 10) : "";
}

function getTimePart(value: string, fallback = "23:59") {
  if (!value || !value.includes("T")) return fallback;

  return value.slice(11, 16) || fallback;
}

function mergeDateAndTime(
  dateSource: string,
  timeSource: string,
  fallbackTime = "23:59",
) {
  const datePart = getDatePart(dateSource);

  if (!datePart) return timeSource;

  return `${datePart}T${getTimePart(timeSource, fallbackTime)}`;
}

function formatSessionNameFromDate(value: string) {
  if (!value) return "Data sem início";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Data sem início";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
  });
}

function getCategoryPreset(category: EventCategory): CategoryPreset {
  if (category === "TEATROS_ESPETACULOS") {
    return {
      label: "Teatro e espetáculo",
      description: "Criação focada em sessões e cadeiras numeradas.",
      defaultSectorName: "Cadeiras numeradas",
      defaultSectorType: "NUMBERED_SEATS",
      sessionLabel: "Data",
    };
  }

  if (category === "CONGRESSOS") {
    return {
      label: "Congresso e palestra",
      description: "Criação focada em auditórios, salas, cadeiras ou mesas.",
      defaultSectorName: "Auditório principal",
      defaultSectorType: "AUDITORIUM",
      sessionLabel: "Data",
    };
  }

  if (category === "GASTRONOMIA") {
    return {
      label: "Gastronomia, bar e restaurante",
      description: "Criação focada em mesas e ingressos avulsos.",
      defaultSectorName: "Salão principal",
      defaultSectorType: "DINING_ROOM",
      sessionLabel: "Data",
    };
  }

  if (category === "STAND_UP_COMEDY") {
    return {
      label: "Stand-up comedy",
      description: "Criação focada em cadeiras numeradas ou mesas.",
      defaultSectorName: "Área principal",
      defaultSectorType: "MAIN_AREA",
      sessionLabel: "Data",
    };
  }

  if (category === "PASSEIOS_TOURS") {
    return {
      label: "Passeios e tours",
      description: "Criação focada em ingressos de evento aberto.",
      defaultSectorName: "Entrada geral",
      defaultSectorType: "OPEN_ADMISSION",
      sessionLabel: "Data",
    };
  }

  if (category === "ESPORTES") {
    return {
      label: "Evento esportivo",
      description: "Criação focada em ingressos para evento aberto.",
      defaultSectorName: "Entrada geral",
      defaultSectorType: "OPEN_ADMISSION",
      sessionLabel: "Data",
    };
  }

  if (category === "INFANTIL") {
    return {
      label: "Evento infantil",
      description: "Criação para ingresso aberto, plateia ou cadeiras.",
      defaultSectorName: "Entrada geral",
      defaultSectorType: "OPEN_ADMISSION",
      sessionLabel: "Data",
    };
  }

  return {
    label: "Festas e shows",
    description: "Criação para plateia, mesas, cadeiras ou modelos mistos.",
    defaultSectorName: "Plateia",
    defaultSectorType: "PLATEIA",
    sessionLabel: "Data",
  };
}
function getDefaultSectorName(
  category: EventCategory,
  sectorKind: SectorKind,
  index = 0,
) {
  const categoryPreset = getCategoryPreset(category);
  const sectorKindConfig = getSectorKindConfig(sectorKind);

  if (index > 0) {
    return `${sectorKindConfig.label} ${index + 1}`;
  }

  if (sectorKind === "OPEN_ADMISSION") return "Livre / evento aberto";
  if (sectorKind === "PLATEIA") return "Plateia";
  if (sectorKind === "NUMBERED_SEATS") return "Cadeiras numeradas";
  if (sectorKind === "TABLES") return "Mesas";

  return categoryPreset.defaultSectorName;
}

function createDefaultSession(index = 0): EventSessionFormItem {
  return {
    localId: newLocalId("session"),
    name: index === 0 ? "Data sem início" : `Data ${index + 1}`,
    description: "",
    startsAt: "",
    endsAt: "",
    capacity: "",
    status: "ACTIVE",
    displayOrder: String(index),
  };
}

function createDefaultSector(
  category: EventCategory,
  occupancyPreset: OccupancyPresetOption,
  index = 0,
  forcedSectorKind?: SectorKind,
): VenueSectorFormItem {
  const sectorKind = forcedSectorKind || occupancyPreset.defaultSectorKind;
  const sectorKindConfig = getSectorKindConfig(sectorKind);

  return {
    localId: newLocalId("sector"),
    name: getDefaultSectorName(category, sectorKind, index),
    description: "",
    sectorKind,
    type: sectorKindConfig.internalType,
    occupancyMode: sectorKindConfig.occupancyMode,
    capacity: "",
    displayOrder: String(index),
    color: sectorColorOptions[index % sectorColorOptions.length].value,
    gateName: "",
  };
}

function createDefaultTicketType(
  index = 0,
  sessionLocalId = "",
  sectorLocalId = "",
  occupancyMode: OccupancyMode = "GENERAL_ADMISSION",
): TicketTypeFormItem {
  return {
    localId: newLocalId("ticket-type"),
    eventSessionLocalId: sessionLocalId,
    venueSectorLocalId: sectorLocalId,
    occupancyMode,
    ticketKind: "INTEIRA",
    name: "Inteira",
    lotLabel: "1º Lote",
    description: "",
    price: "",
    quantity: "100",
    salesStartAt: "",
    salesEndAt: "",
    minPerOrder: "1",
    maxPerOrder: "",
    displayOrder: String(index),
    isHidden: false,
    status: "ACTIVE",
  };
}

function inputClass(hasError = false) {
  return `h-[52px] w-full rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
    hasError
      ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
      : "border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
  }`;
}

function textareaClass(hasError = false) {
  return `min-h-[120px] w-full rounded-2xl border bg-white p-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 ${
    hasError
      ? "border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
      : "border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
  }`;
}

function formatMoneyPreview(value: string) {
  const parsed = parseMoney(value);

  if (Number.isNaN(parsed)) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(parsed);
}

function formatDatePreview(value: string) {
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

function getCategoryLabel(value: EventCategory) {
  return categoryOptions.find((item) => item.value === value)?.label || value;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error = false,
  helper,
  min,
  disabled = false,
  onlyNumbers = false,
  money = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: boolean;
  helper?: string;
  min?: number;
  disabled?: boolean;
  onlyNumbers?: boolean;
  money?: boolean;
}) {
  function handleChange(rawValue: string) {
    if (onlyNumbers) {
      onChange(onlyDigits(rawValue));
      return;
    }

    if (money) {
      onChange(onlyMoney(rawValue));
      return;
    }

    onChange(rawValue);
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      <input
        type={type}
        value={value}
        min={min}
        disabled={disabled}
        inputMode={onlyNumbers || money ? "numeric" : undefined}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className={`${inputClass(error)} ${
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
        }`}
      />

      {helper ? (
        <p
          className={`mt-2 text-xs font-semibold ${
            error ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  required = false,
  error = false,
  helper,
  minHeight = "min-h-[120px]",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helper?: string;
  minHeight?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      <textarea
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${textareaClass(error)} ${minHeight} ${
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
        }`}
      />

      {helper ? (
        <p
          className={`mt-2 text-xs font-semibold ${
            error ? "text-rose-600" : "text-slate-500"
          }`}
        >
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string; disabled?: boolean }>;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass()} ${
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""
        }`}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function StepShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
          {description}
        </p>
      </div>

      {children}
    </section>
  );
}

function EventMediaUploadField({
  label,
  helper,
  value,
  kind,
  required = false,
  error = false,
  onChange,
}: {
  label: string;
  helper?: string;
  value: string;
  kind:
    | "cover"
    | "banner"
    | "thumbnail"
    | "mobile-banner"
    | "sector-map"
    | "gallery"
    | "event-image";
  required?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  function isAllowedMedia(file: File) {
    return file.type.startsWith("image/") || file.type.startsWith("video/");
  }

  function isVideoFile(url: string) {
    const lowerUrl = url.toLowerCase();

    return (
      lowerUrl.includes(".mp4") ||
      lowerUrl.includes(".webm") ||
      lowerUrl.includes(".mov") ||
      lowerUrl.includes(".m4v")
    );
  }

  async function handleUpload(file: File) {
    if (!isAllowedMedia(file)) {
      alert("Envie apenas arquivos de imagem ou vídeo.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      alert("Faça login novamente para enviar arquivos.");
      window.location.href = "/login";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);

    setUploading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/uploads/event-image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : "Erro ao enviar arquivo",
        );
        return;
      }

      const uploadedUrl =
        result?.url || result?.publicUrl || result?.path || result?.fileUrl;

      if (!uploadedUrl) {
        alert("Upload concluído, mas a API não retornou a URL do arquivo.");
        return;
      }

      onChange(normalizeMediaUrl(uploadedUrl) || uploadedUrl);
    } catch (uploadError) {
      console.error("UPLOAD MEDIA ERROR:", uploadError);
      alert("Erro ao conectar com a API de upload.");
    } finally {
      setUploading(false);
    }
  }

  const normalizedValue = normalizeMediaUrl(value) || value;
  const isVideo = isVideoFile(normalizedValue);

  return (
    <div
      className={`rounded-[1.75rem] border p-5 transition ${
        error
          ? "border-rose-300 bg-rose-50"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="block text-sm font-black text-slate-900">
            {label}
            {required ? <span className="text-rose-600"> *</span> : null}
          </label>

          {helper ? (
            <p
              className={`mt-1 text-xs font-semibold leading-5 ${
                error ? "text-rose-600" : "text-slate-500"
              }`}
            >
              {helper}
            </p>
          ) : null}
        </div>

        {value ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">
            Enviado
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
            Pendente
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="file"
          accept="image/*,video/*"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleUpload(file);
            }
          }}
          className="block w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700 file:mr-4 file:h-[48px] file:border-0 file:bg-slate-950 file:px-5 file:text-sm file:font-black file:text-white hover:file:bg-sky-700"
        />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ou cole uma URL manualmente"
          className={inputClass(error)}
        />

        {uploading ? (
          <p className="text-xs font-black text-sky-600">Enviando arquivo...</p>
        ) : null}

        {value ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {isVideo ? (
              <video
                src={normalizedValue}
                className="h-44 w-full object-cover"
                controls
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizedValue}
                alt={label}
                className="h-44 w-full object-cover"
              />
            )}

            <button
              type="button"
              onClick={() => onChange("")}
              className="w-full bg-white px-4 py-3 text-xs font-black text-rose-600 hover:bg-rose-50"
            >
              Remover arquivo
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GalleryUploadField({
  value,
  required = false,
  error = false,
  onChange,
}: {
  value: string;
  required?: boolean;
  error?: boolean;
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const galleryItems = parseGallery(value);

  function isAllowedMedia(file: File) {
    return file.type.startsWith("image/") || file.type.startsWith("video/");
  }

  function isVideoFile(url: string) {
    const lowerUrl = url.toLowerCase();

    return (
      lowerUrl.includes(".mp4") ||
      lowerUrl.includes(".webm") ||
      lowerUrl.includes(".mov") ||
      lowerUrl.includes(".m4v")
    );
  }

  async function uploadOne(file: File) {
    if (!isAllowedMedia(file)) {
      throw new Error("A galeria aceita apenas imagens ou vídeos.");
    }

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      throw new Error("Faça login novamente para enviar arquivos.");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "gallery");

    const response = await fetch(`${API_BASE_URL}/uploads/event-image`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        typeof result?.message === "string"
          ? result.message
          : "Erro ao enviar arquivo da galeria",
      );
    }

    const uploadedUrl =
      result?.url || result?.publicUrl || result?.path || result?.fileUrl || "";

    return normalizeMediaUrl(uploadedUrl) || uploadedUrl;
  }

  async function handleMultipleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const uploadedUrl = await uploadOne(file);

        if (uploadedUrl) {
          uploadedUrls.push(uploadedUrl);
        }
      }

      onChange([...galleryItems, ...uploadedUrls].join("\n"));
    } catch (uploadError) {
      console.error("UPLOAD GALLERY ERROR:", uploadError);
      alert(
        uploadError instanceof Error
          ? uploadError.message
          : "Erro ao enviar galeria.",
      );
    } finally {
      setUploading(false);
    }
  }

  function removeGalleryItem(item: string) {
    onChange(galleryItems.filter((galleryItem) => galleryItem !== item).join("\n"));
  }

  return (
    <div
      className={`rounded-[1.75rem] border p-5 ${
        error ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <label className="block text-sm font-black text-slate-900">
            Galeria
            {required ? <span className="text-rose-600"> *</span> : null}
          </label>

          <p
            className={`mt-1 text-xs font-semibold leading-5 ${
              error ? "text-rose-600" : "text-slate-500"
            }`}
          >
            Selecione várias imagens ou vídeos. Cada arquivo enviado entra na galeria.
          </p>
        </div>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {galleryItems.length} arquivo(s)
        </span>
      </div>

      <input
        type="file"
        accept="image/*,video/*"
        multiple
        disabled={uploading}
        onChange={(event) => {
          void handleMultipleUpload(event.target.files);
        }}
        className="mt-4 block w-full cursor-pointer rounded-2xl border border-slate-300 bg-slate-50 text-sm font-semibold text-slate-700 file:mr-4 file:h-[48px] file:border-0 file:bg-slate-950 file:px-5 file:text-sm file:font-black file:text-white hover:file:bg-sky-700"
      />

      {uploading ? (
        <p className="mt-3 text-xs font-black text-sky-600">
          Enviando arquivos da galeria...
        </p>
      ) : null}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ou cole uma URL por linha."
        className={`${textareaClass(error)} mt-4`}
      />

      {galleryItems.length > 0 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {galleryItems.map((item) => {
            const normalizedItem = normalizeMediaUrl(item) || item;
            const isVideo = isVideoFile(normalizedItem);

            return (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {isVideo ? (
                  <video
                    src={normalizedItem}
                    className="h-28 w-full object-cover"
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizedItem}
                    alt="Arquivo da galeria"
                    className="h-28 w-full object-cover"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeGalleryItem(item)}
                  className="w-full bg-white px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                >
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

function SectorColorPicker({
  value,
  usedColors,
  onChange,
}: {
  value: string;
  usedColors: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        Cor do setor
      </label>

      <div className="grid grid-cols-5 gap-2">
        {sectorColorOptions.map((color) => {
          const active = color.value === value;
          const disabled = !active && usedColors.includes(color.value);

          return (
            <button
              key={color.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(color.value)}
              className={`flex h-11 items-center justify-center rounded-2xl border transition ${
                active
                  ? "border-slate-950 ring-4 ring-slate-200"
                  : disabled
                    ? "cursor-not-allowed border-slate-200 opacity-30"
                    : "border-slate-200 hover:border-slate-400"
              }`}
              title={
                disabled
                  ? `${color.label} já está sendo usada em outro setor`
                  : color.label
              }
              aria-label={`Selecionar cor ${color.label}`}
            >
              <span
                className="h-7 w-7 rounded-full border border-white shadow"
                style={{ backgroundColor: color.value }}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-xs font-semibold text-slate-500">
        Cor selecionada: {value}
      </p>
    </div>
  );
}
export default function NewEventPage() {
  const [organizers, setOrganizers] = useState<OrganizerItem[]>([]);
  const [loadingOrganizers, setLoadingOrganizers] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const [organizerId, setOrganizerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<EventCategory>("FESTAS_SHOWS");
  const [occupancyPresetKey, setOccupancyPresetKey] =
    useState<OccupancyPresetKey>("PLATEIA_ONLY");
  const [occupancyMode, setOccupancyMode] = useState<OccupancyMode>(
    occupancyPresetCatalog.PLATEIA_ONLY.occupancyMode,
  );

  const [status] = useState(DEFAULT_STATUS);
  const [visibility] = useState(DEFAULT_VISIBILITY);
  const [timezone] = useState(DEFAULT_TIMEZONE);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saleStartAt, setSaleStartAt] = useState("");
  const [saleEndAt, setSaleEndAt] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [checkoutTitle, setCheckoutTitle] = useState("");
  const [checkoutSubtitle, setCheckoutSubtitle] = useState("");

  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [fullDescription, setFullDescription] = useState("");
  const [attractions, setAttractions] = useState("");
  const [schedule, setSchedule] = useState("");
  const [sectorDetails, setSectorDetails] = useState("");
  const [importantInfo, setImportantInfo] = useState("");
  const [faq, setFaq] = useState("");
  const [producerDescription, setProducerDescription] = useState("");
  const [purchaseInstructions, setPurchaseInstructions] = useState("");

  const [mode, setMode] = useState("PRESENTIAL");
  const [venueName, setVenueName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [reference, setReference] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [bannerImageUrl, setBannerImageUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [mobileBannerUrl, setMobileBannerUrl] = useState("");
  const [sectorMapImageUrl, setSectorMapImageUrl] = useState("");
  const [galleryText, setGalleryText] = useState("");

  const [ageRating, setAgeRating] = useState("");
  const [refundPolicyEnabled, setRefundPolicyEnabled] = useState(false);
  const [transferPolicyEnabled, setTransferPolicyEnabled] = useState(false);
  const [refundPolicy, setRefundPolicy] = useState("");
  const [halfEntryPolicy, setHalfEntryPolicy] = useState("");
  const [transferPolicy, setTransferPolicy] = useState("");
  const [termsNotes, setTermsNotes] = useState("");
  const [entryRules, setEntryRules] = useState("");
  const [documentRules, setDocumentRules] = useState("");

  const initialOccupancyPreset = occupancyPresetCatalog.PLATEIA_ONLY;

  const [sessions, setSessions] = useState<EventSessionFormItem[]>([
    createDefaultSession(0),
  ]);
  const [sectors, setSectors] = useState<VenueSectorFormItem[]>([
    createDefaultSector("FESTAS_SHOWS", initialOccupancyPreset, 0),
  ]);
  const [mapObjects, setMapObjects] = useState<SeatMapObjectFormItem[]>([]);
  const [tableCount, setTableCount] = useState("20");
  const [seatsPerTable, setSeatsPerTable] = useState("4");
  const [tableSaleMode, setTableSaleMode] = useState<"WHOLE_TABLE" | "BY_SEAT">(
    "WHOLE_TABLE",
  );

    const [selectedMapObjectId, setSelectedMapObjectId] = useState("");
  const [mapInteraction, setMapInteraction] = useState<MapInteraction | null>(
    null,
  );

  const [ticketTypes, setTicketTypes] = useState<TicketTypeFormItem[]>([
    createDefaultTicketType(
      0,
      "",
      "",
      initialOccupancyPreset.occupancyMode,
    ),
  ]);

  const preset = useMemo(() => getCategoryPreset(category), [category]);

  const availableOccupancyPresets = useMemo(() => {
    return getOccupancyPresetOptions(category);
  }, [category]);

  const selectedOccupancyPreset = useMemo(() => {
    return getOccupancyPreset(occupancyPresetKey);
  }, [occupancyPresetKey]);

  const galleryPreview = useMemo(() => parseGallery(galleryText), [galleryText]);

  const selectedOrganizer = useMemo(() => {
    return organizers.find((organizer) => organizer.id === organizerId) || null;
  }, [organizers, organizerId]);

  const mainPreviewImage =
    bannerImageUrl || coverImageUrl || thumbnailUrl || mobileBannerUrl;

  const allowSeatMap = selectedOccupancyPreset.allowSeatMap;
  const allowTableMap = selectedOccupancyPreset.allowTableMap;
  const isOpenAdmissionOnly = occupancyPresetKey === "OPEN_ADMISSION";
  const isOnlineEvent = mode === "ONLINE";
  const todayInputDateTime = getTodayInputDateTime();

  const generalCapacityNumber = useMemo(() => {
    return getNumericValue(capacity);
  }, [capacity]);

  const sectorCapacityTotal = useMemo(() => {
    return sectors.reduce((sum, sector) => {
      return sum + getNumericValue(sector.capacity);
    }, 0);
  }, [sectors]);

  const hasSectorOverCapacity = useMemo(() => {
    if (generalCapacityNumber <= 0) return false;

    return sectors.some((sector) => {
      const sectorCapacity = getNumericValue(sector.capacity);

      return sectorCapacity > generalCapacityNumber;
    });
  }, [generalCapacityNumber, sectors]);

  const hasSectorTotalOverCapacity = useMemo(() => {
    if (generalCapacityNumber <= 0) return false;

    return sectorCapacityTotal > generalCapacityNumber;
  }, [generalCapacityNumber, sectorCapacityTotal]);

  const hasRequiredSectorCapacityMissing = useMemo(() => {
    return sectors.some((sector) => getNumericValue(sector.capacity) <= 0);
  }, [sectors]);

  const hasDuplicateSectorColors = useMemo(() => {
    const colors = sectors.map((sector) => sector.color).filter(Boolean);

    return new Set(colors).size !== colors.length;
  }, [sectors]);

  const sectorCapacityErrorMessage = useMemo(() => {
    if (hasRequiredSectorCapacityMissing) {
      return "A capacidade de cada setor é obrigatória.";
    }

    if (hasSectorOverCapacity) {
      return "Nenhum setor pode ter capacidade maior que a capacidade geral do evento.";
    }

    if (hasSectorTotalOverCapacity) {
      return "A soma das capacidades dos setores não pode ultrapassar a capacidade geral do evento.";
    }

    if (hasDuplicateSectorColors) {
      return "Cada setor deve ter uma cor diferente.";
    }

    return "";
  }, [
    hasDuplicateSectorColors,
    hasRequiredSectorCapacityMissing,
    hasSectorOverCapacity,
    hasSectorTotalOverCapacity,
  ]);

  const sessionCapacityTotal = useMemo(() => {
    return sessions.reduce((sum, session) => {
      return sum + getNumericValue(session.capacity);
    }, 0);
  }, [sessions]);

  const sessionCapacityErrorMessage = useMemo(() => {
    if (!startDate) {
      return "O início geral é obrigatório.";
    }

    if (!endDate) {
      return "O fim geral é obrigatório.";
    }

    if (endDate < startDate) {
      return "O fim geral não pode ser antes do início geral.";
    }

    const hasIncompleteSession = sessions.some((session) => {
      return (
        !session.startsAt ||
        !session.endsAt ||
        getNumericValue(session.capacity) <= 0
      );
    });

    if (hasIncompleteSession) {
      return "Todas as datas cadastradas precisam ter início, fim e capacidade.";
    }

    const hasSessionEndBeforeStart = sessions.some((session) => {
      return session.endsAt < session.startsAt;
    });

    if (hasSessionEndBeforeStart) {
      return "Nenhuma data pode ter fim antes do início.";
    }

    const hasSessionOverCapacity = sessions.some((session) => {
      return getNumericValue(session.capacity) > generalCapacityNumber;
    });

    if (hasSessionOverCapacity) {
      return "A capacidade de uma data não pode ultrapassar a capacidade geral.";
    }

    if (
      generalCapacityNumber > 0 &&
      sessionCapacityTotal > generalCapacityNumber
    ) {
      return "A soma das capacidades das datas não pode ultrapassar a capacidade geral.";
    }

    const hasDateBeforePreviousDate = sessions.some((session, index) => {
      if (index === 0) return false;

      const previousSession = sessions[index - 1];

      return Boolean(
        session.startsAt &&
          previousSession?.startsAt &&
          session.startsAt < previousSession.startsAt,
      );
    });

    if (hasDateBeforePreviousDate) {
      return "A data 2 e as próximas datas não podem começar antes da data anterior.";
    }

    return "";
  }, [
    endDate,
    generalCapacityNumber,
    sessionCapacityTotal,
    sessions,
    startDate,
  ]);

  const mediaErrorMessage = useMemo(() => {
    const normalizedCoverImageUrl = normalizeMediaUrl(coverImageUrl);
    const normalizedBannerImageUrl = normalizeMediaUrl(bannerImageUrl);
    const normalizedThumbnailUrl = normalizeMediaUrl(thumbnailUrl);
    const normalizedMobileBannerUrl = normalizeMediaUrl(mobileBannerUrl);

    if (!normalizedCoverImageUrl) return "A capa é obrigatória.";
    if (!normalizedBannerImageUrl) return "O banner é obrigatório.";
    if (!normalizedThumbnailUrl) return "A thumbnail é obrigatória.";
    if (!normalizedMobileBannerUrl) return "O banner mobile é obrigatório.";

    if (!isValidHttpUrl(normalizedCoverImageUrl)) {
      return "A capa precisa ser uma URL válida.";
    }

    if (!isValidHttpUrl(normalizedBannerImageUrl)) {
      return "O banner precisa ser uma URL válida.";
    }

    if (!isValidHttpUrl(normalizedThumbnailUrl)) {
      return "A thumbnail precisa ser uma URL válida.";
    }

    if (!isValidHttpUrl(normalizedMobileBannerUrl)) {
      return "O banner mobile precisa ser uma URL válida.";
    }

    return "";
  }, [bannerImageUrl, coverImageUrl, mobileBannerUrl, thumbnailUrl]);

  const primarySessionDate = sessions.find((session) => session.startsAt)
    ?.startsAt;
  const primaryEventDate = startDate || primarySessionDate || "";

  const validTicketTypes = useMemo(() => {
    return ticketTypes.filter(
      (ticketType) =>
        ticketType.name.trim() &&
        ticketType.lotLabel.trim() &&
        ticketType.price.trim() &&
        Number(ticketType.quantity) > 0,
    );
  }, [ticketTypes]);

  const totalTicketQuantity = useMemo(() => {
    return ticketTypes.reduce((sum, ticketType) => {
      const quantity = Number(ticketType.quantity);
      return sum + (Number.isNaN(quantity) ? 0 : quantity);
    }, 0);
  }, [ticketTypes]);

  const ticketLotPriceErrorMessage = useMemo(() => {
    for (const ticketType of ticketTypes) {
      const currentLotNumber = getLotNumber(ticketType.lotLabel);
      const currentPrice = parseMoney(ticketType.price);

      if (!ticketType.venueSectorLocalId || currentLotNumber <= 1) continue;

      const previousLots = ticketTypes.filter((otherTicketType) => {
        return (
          otherTicketType.localId !== ticketType.localId &&
          otherTicketType.venueSectorLocalId === ticketType.venueSectorLocalId &&
          otherTicketType.eventSessionLocalId === ticketType.eventSessionLocalId &&
          otherTicketType.ticketKind === ticketType.ticketKind &&
          getLotNumber(otherTicketType.lotLabel) < currentLotNumber
        );
      });

      const mostExpensivePreviousLot = previousLots.reduce((max, item) => {
        return Math.max(max, parseMoney(item.price));
      }, 0);

      if (mostExpensivePreviousLot > 0 && currentPrice < mostExpensivePreviousLot) {
        return "Lotes posteriores não podem ser mais baratos que lotes anteriores do mesmo setor e do mesmo tipo de ingresso.";
      }
    }

    return "";
  }, [ticketTypes]);

  const ticketDateErrorMessage = useMemo(() => {
    for (const ticketType of ticketTypes) {
      if (!ticketType.salesStartAt) continue;

      if (ticketType.salesStartAt < todayInputDateTime) {
        return "O início das vendas não pode ser antes da data e hora atual.";
      }

      if (
        ticketType.salesEndAt &&
        ticketType.salesStartAt &&
        ticketType.salesEndAt < ticketType.salesStartAt
      ) {
        return "O fim das vendas não pode ser antes do início das vendas.";
      }
    }

    return "";
  }, [ticketTypes, todayInputDateTime]);

  const stepCompletion: Record<StepId, boolean> = {
    type: Boolean(category && occupancyPresetKey && occupancyMode),
    basic: Boolean(organizerId && name.trim() && Number(capacity) > 0),
    sessions: Boolean(
      startDate &&
        endDate &&
        sessions.some((session) => session.startsAt && session.endsAt) &&
        !sessionCapacityErrorMessage,
    ),
    extras: !mediaErrorMessage,
    sectors:
      !sectorCapacityErrorMessage &&
      (isOpenAdmissionOnly
        ? sectors.length === 1
        : sectors.some((sector) => sector.name.trim())),
    map: mapObjects.length > 0,
    tickets:
      validTicketTypes.length > 0 &&
      !ticketLotPriceErrorMessage &&
      !ticketDateErrorMessage,
    location: isOnlineEvent
      ? Boolean(venueName.trim())
      : Boolean(
          venueName.trim() &&
            zipCode.trim() &&
            mapUrl.trim() &&
            isValidMapUrl(mapUrl) &&
            reference.trim(),
        ),
    review: false,
  };

  const stepDefinitions: Array<{
    id: StepId;
    title: string;
    description: string;
    optional?: boolean;
  }> = [
    {
      id: "type",
      title: "Tipo de evento",
      description: "Categoria e ocupação personalizada.",
    },
    {
      id: "basic",
      title: "Dados principais",
      description: "Nome, produtora, capacidade e descrição.",
    },
    {
      id: "sessions",
      title: "Datas",
      description: "Início, fim e datas do evento.",
    },
    {
      id: "extras",
      title: "Imagens e políticas",
      description: "Uploads, textos extras e regras.",
    },
    {
      id: "sectors",
      title: "Setores / áreas",
      description: isOpenAdmissionOnly
        ? "Área única para todos os ingressos."
        : "Plateia, cadeiras numeradas, mesas ou modelos mistos.",
    },
    {
      id: "map",
      title: "Mapa",
      description: "Blocos coloridos por setor.",
    },
    {
      id: "tickets",
      title: "Ingressos / lotes",
      description: "Preços, lotes, quantidades e vínculos.",
    },
    {
      id: "location",
      title: "Local e acesso",
      description: "CEP, endereço, mapa e instruções.",
    },
    {
      id: "review",
      title: "Revisão",
      description: "Conferir e criar evento.",
    },
  ];

  const requiredErrors = {
    organizerId: submitAttempted && !organizerId,
    name: submitAttempted && !name.trim(),
    capacity: submitAttempted && (!capacity || Number(capacity) < 1),
    sessions: submitAttempted && !stepCompletion.sessions,
    extras: submitAttempted && !stepCompletion.extras,
    sectors: submitAttempted && !stepCompletion.sectors,
    map: submitAttempted && !stepCompletion.map,
    tickets: submitAttempted && !stepCompletion.tickets,
    venueName: submitAttempted && !venueName.trim(),
    zipCode: submitAttempted && !isOnlineEvent && !zipCode.trim(),
    mapUrl:
      submitAttempted &&
      !isOnlineEvent &&
      (!mapUrl.trim() || !isValidMapUrl(mapUrl)),
    reference: submitAttempted && !isOnlineEvent && !reference.trim(),
  };

  useEffect(() => {
    async function loadOrganizers() {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined") {
        window.location.href = "/login";
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/organizers`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          alert(
            typeof result?.message === "string"
              ? result.message
              : "Erro ao carregar produtoras",
          );
          return;
        }

        const organizersList = Array.isArray(result) ? result : [];
        setOrganizers(organizersList);

        if (organizersList.length > 0) {
          setOrganizerId(organizersList[0].id);
          setProducerDescription(
            [
              organizersList[0].tradeName || organizersList[0].legalName,
              organizersList[0].email,
              organizersList[0].phone,
              organizersList[0].document,
            ]
              .filter(Boolean)
              .join(" • "),
          );
        }
      } catch (error) {
        console.error("LOAD ORGANIZERS ERROR:", error);
        alert("Erro ao conectar com a API");
      } finally {
        setLoadingOrganizers(false);
      }
    }

    loadOrganizers();
  }, []);

  function syncTicketTypesWithSectors(nextSectors: VenueSectorFormItem[]) {
    setTicketTypes((currentTicketTypes) =>
      currentTicketTypes.map((ticketType) => {
        const linkedSector = nextSectors.find(
          (sector) => sector.localId === ticketType.venueSectorLocalId,
        );

        return {
          ...ticketType,
          occupancyMode: linkedSector?.occupancyMode || occupancyMode,
        };
      }),
    );
  }

  function applyOccupancyPreset(nextKey: OccupancyPresetKey) {
    const nextPreset = getOccupancyPreset(nextKey);
    const nextDefaultSector = createDefaultSector(category, nextPreset, 0);

    setOccupancyPresetKey(nextKey);
    setOccupancyMode(nextPreset.occupancyMode);
    setMapObjects([]);
    setSectors([nextDefaultSector]);

    setTicketTypes((currentTicketTypes) =>
      currentTicketTypes.map((ticketType) => ({
        ...ticketType,
        venueSectorLocalId: "",
        occupancyMode: nextPreset.occupancyMode,
      })),
    );
  }

  function handleCategoryChange(nextCategory: EventCategory) {
    const nextPresetKey = getDefaultOccupancyPresetKey(nextCategory);
    const nextPreset = getOccupancyPreset(nextPresetKey);
    const nextDefaultSector = createDefaultSector(nextCategory, nextPreset, 0);

    setCategory(nextCategory);
    setOccupancyPresetKey(nextPresetKey);
    setOccupancyMode(nextPreset.occupancyMode);
    setMapObjects([]);
    setSectors([nextDefaultSector]);

    setTicketTypes((currentTicketTypes) =>
      currentTicketTypes.map((ticketType) => ({
        ...ticketType,
        venueSectorLocalId: "",
        occupancyMode: nextPreset.occupancyMode,
      })),
    );
  }

  function isStepAccessible(index: number) {
    if (index === 0) return true;

    for (let currentIndex = 0; currentIndex < index; currentIndex += 1) {
      const step = stepDefinitions[currentIndex];

      if (step.id === "review") continue;

      if (!stepCompletion[step.id]) return false;
    }

    return true;
  }

  function getFirstIncompleteStepIndex() {
    const index = stepDefinitions.findIndex((step) => {
      if (step.id === "review") return false;
      return !stepCompletion[step.id];
    });

    return index === -1 ? stepDefinitions.length - 1 : index;
  }

  function handleStepClick(index: number) {
    if (!isStepAccessible(index)) {
      alert("Conclua as etapas anteriores para liberar esta etapa.");
      return;
    }

    setActiveStepIndex(index);
  }

  function validateCurrentStep() {
    const currentStep = stepDefinitions[activeStepIndex];

    if (!currentStep) return false;

    if (currentStep.id === "review") {
      return stepDefinitions
        .filter((step) => step.id !== "review")
        .every((step) => stepCompletion[step.id]);
    }

    if (stepCompletion[currentStep.id]) {
      return true;
    }

    if (currentStep.id === "sessions" && sessionCapacityErrorMessage) {
      alert(sessionCapacityErrorMessage);
      return false;
    }

    if (currentStep.id === "extras" && mediaErrorMessage) {
      alert(mediaErrorMessage);
      return false;
    }

    if (currentStep.id === "sectors" && sectorCapacityErrorMessage) {
      alert(sectorCapacityErrorMessage);
      return false;
    }

    if (currentStep.id === "tickets" && ticketLotPriceErrorMessage) {
      alert(ticketLotPriceErrorMessage);
      return false;
    }

    if (currentStep.id === "tickets" && ticketDateErrorMessage) {
      alert(ticketDateErrorMessage);
      return false;
    }

    const messages: Record<StepId, string> = {
      type: "Escolha a categoria e o tipo de ocupação do evento.",
      basic: "Preencha produtora, nome do evento e capacidade geral.",
      sessions:
        "Preencha início geral, fim geral e todas as datas com início, fim e capacidade.",
      extras: "Envie capa, banner, thumbnail e banner mobile.",
      sectors: "Cadastre setores válidos com capacidade e cor única.",
      map: "Gere o mapa em blocos para continuar.",
      tickets:
        "Cadastre pelo menos um ingresso válido com tipo, lote, nome, preço e quantidade.",
      location: isOnlineEvent
        ? "Informe pelo menos o nome ou canal do evento online."
        : "Preencha CEP, URL válida do mapa, nome do local e referência.",
      review: "",
    };

    alert(messages[currentStep.id]);
    return false;
  }

  function goNextStep() {
    setSubmitAttempted(true);

    if (!validateCurrentStep()) return;

    setActiveStepIndex((currentIndex) =>
      Math.min(currentIndex + 1, stepDefinitions.length - 1),
    );
  }

  function goPreviousStep() {
    setActiveStepIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }

  function handleGeneralStartDateChange(value: string) {
    const oldStartDate = startDate;
    const hasOldStartDate = Boolean(oldStartDate);
    const diffMs =
      hasOldStartDate && value
        ? new Date(value).getTime() - new Date(oldStartDate).getTime()
        : 0;

    setStartDate(value);

    setEndDate((currentEndDate) => {
      if (!currentEndDate) return value;

      if (!hasOldStartDate) return currentEndDate;

      return shiftInputDateTime(currentEndDate, diffMs);
    });

    setSessions((currentSessions) => {
      return currentSessions.map((session, index) => {
        const nextStartsAt = session.startsAt
          ? hasOldStartDate
            ? shiftInputDateTime(session.startsAt, diffMs)
            : session.startsAt
          : value;

        const nextEndsAt = session.endsAt
          ? hasOldStartDate
            ? shiftInputDateTime(session.endsAt, diffMs)
            : session.endsAt
          : value;

        return {
          ...session,
          startsAt: nextStartsAt,
          endsAt: nextEndsAt,
          name: nextStartsAt
            ? formatSessionNameFromDate(nextStartsAt)
            : index === 0
              ? "Data sem início"
              : `Data ${index + 1}`,
          capacity: session.capacity || capacity,
        };
      });
    });
  }

  function handleGeneralEndDateChange(value: string) {
    const oldEndDate = endDate;
    const hasOldEndDate = Boolean(oldEndDate);
    const diffMs =
      hasOldEndDate && value
        ? new Date(value).getTime() - new Date(oldEndDate).getTime()
        : 0;

    setEndDate(value);

    setSessions((currentSessions) => {
      return currentSessions.map((session) => {
        const nextEndsAt = session.endsAt
          ? hasOldEndDate
            ? shiftInputDateTime(session.endsAt, diffMs)
            : session.endsAt
          : value;

        return {
          ...session,
          endsAt: nextEndsAt,
        };
      });
    });
  }

  function addSession() {
    setSessions((currentSessions) => [
      ...currentSessions,
      {
        ...createDefaultSession(currentSessions.length),
        startsAt: startDate,
        endsAt: endDate,
        name: startDate
          ? formatSessionNameFromDate(startDate)
          : `Data ${currentSessions.length + 1}`,
        capacity,
      },
    ]);
  }

  function updateSession<K extends keyof EventSessionFormItem>(
    localId: string,
    field: K,
    value: EventSessionFormItem[K],
  ) {
    setSessions((currentSessions) =>
      currentSessions.map((session) => {
        if (session.localId !== localId) return session;

        const nextSession = { ...session, [field]: value };

        if (field === "startsAt") {
          const formattedName = formatSessionNameFromDate(String(value));

          return {
            ...nextSession,
            name: formattedName,
            endsAt: session.endsAt || String(value),
          };
        }

        if (field === "capacity") {
          return {
            ...nextSession,
            capacity: onlyDigits(String(value)),
          };
        }

        return nextSession;
      }),
    );
  }

  function removeSession(localId: string) {
    setSessions((currentSessions) => {
      if (currentSessions.length <= 1) return currentSessions;

      return currentSessions.filter((session) => session.localId !== localId);
    });

    setTicketTypes((currentTicketTypes) =>
      currentTicketTypes.map((ticketType) =>
        ticketType.eventSessionLocalId === localId
          ? { ...ticketType, eventSessionLocalId: "" }
          : ticketType,
      ),
    );
  }
  function addSector() {
    if (!selectedOccupancyPreset.supportsMultipleSectors) {
      alert("Este tipo de evento usa área única, sem setores separados.");
      return;
    }

    const nextIndex = sectors.length;
    const nextColor =
      sectorColorOptions.find(
        (color) => !sectors.some((sector) => sector.color === color.value),
      )?.value || sectorColorOptions[nextIndex % sectorColorOptions.length].value;

    const nextSector = createDefaultSector(
      category,
      selectedOccupancyPreset,
      nextIndex,
      selectedOccupancyPreset.defaultSectorKind,
    );

    setSectors((currentSectors) => [
      ...currentSectors,
      {
        ...nextSector,
        color: nextColor,
      },
    ]);

    setMapObjects([]);
  }

  function updateSector<K extends keyof VenueSectorFormItem>(
    localId: string,
    field: K,
    value: VenueSectorFormItem[K],
  ) {
    setSectors((currentSectors) => {
      const nextSectors = currentSectors.map((sector) =>
        sector.localId === localId ? { ...sector, [field]: value } : sector,
      );

      syncTicketTypesWithSectors(nextSectors);
      return nextSectors;
    });

    setMapObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.venueSectorLocalId !== localId) return object;

        const linkedSector = sectors.find((sector) => sector.localId === localId);

        return {
          ...object,
          label:
            field === "name" && typeof value === "string"
              ? value
              : object.label,
          capacity:
            field === "capacity" && typeof value === "string"
              ? value
              : object.capacity,
          metadata: {
            ...object.metadata,
            sectorName:
              field === "name" && typeof value === "string"
                ? value
                : linkedSector?.name,
            sectorColor:
              field === "color" && typeof value === "string"
                ? value
                : linkedSector?.color,
          },
        };
      }),
    );
  }

  function updateSectorKind(localId: string, sectorKind: SectorKind) {
    const config = getSectorKindConfig(sectorKind);

    setSectors((currentSectors) => {
      const nextSectors = currentSectors.map((sector) => {
        if (sector.localId !== localId) return sector;

        return {
          ...sector,
          sectorKind,
          type: config.internalType,
          occupancyMode: config.occupancyMode,
        };
      });

      syncTicketTypesWithSectors(nextSectors);
      return nextSectors;
    });

    setMapObjects([]);
  }

  function removeSector(localId: string) {
    if (!selectedOccupancyPreset.supportsMultipleSectors) {
      alert("Este tipo de evento usa área única, sem setores separados.");
      return;
    }

    setSectors((currentSectors) => {
      if (currentSectors.length <= 1) return currentSectors;

      const nextSectors = currentSectors.filter(
        (sector) => sector.localId !== localId,
      );

      syncTicketTypesWithSectors(nextSectors);
      return nextSectors;
    });

    setTicketTypes((currentTicketTypes) =>
      currentTicketTypes.map((ticketType) =>
        ticketType.venueSectorLocalId === localId
          ? { ...ticketType, venueSectorLocalId: "" }
          : ticketType,
      ),
    );

    setMapObjects((currentObjects) =>
      currentObjects.filter((object) => object.venueSectorLocalId !== localId),
    );
  }

  function getTicketLotOptions(ticketType: TicketTypeFormItem) {
    return lotOptions.map((lotLabel) => {
      const alreadyExistsForSameSectorAndDate = ticketTypes.some(
        (otherTicketType) => {
          return (
            otherTicketType.localId !== ticketType.localId &&
            otherTicketType.venueSectorLocalId === ticketType.venueSectorLocalId &&
            otherTicketType.eventSessionLocalId ===
              ticketType.eventSessionLocalId &&
            otherTicketType.ticketKind === ticketType.ticketKind &&
            otherTicketType.lotLabel === lotLabel
          );
        },
      );

      return {
        label: alreadyExistsForSameSectorAndDate
          ? `${lotLabel} indisponível para esta data/setor/tipo`
          : lotLabel,
        value: lotLabel,
        disabled: alreadyExistsForSameSectorAndDate,
      };
    });
  }

  function hasFirstLotForTicket(ticketType: TicketTypeFormItem) {
    return ticketTypes.some((otherTicketType) => {
      return (
        otherTicketType.localId !== ticketType.localId &&
        otherTicketType.venueSectorLocalId === ticketType.venueSectorLocalId &&
        otherTicketType.eventSessionLocalId === ticketType.eventSessionLocalId &&
        otherTicketType.ticketKind === ticketType.ticketKind &&
        otherTicketType.lotLabel === "1º Lote"
      );
    });
  }

  function getPreviousLotEndDate(
    ticketType: TicketTypeFormItem,
    nextLotLabel: string,
  ) {
    const nextLotNumber = getLotNumber(nextLotLabel);

    if (nextLotNumber <= 1) return "";

    const previousLot = ticketTypes.find((otherTicketType) => {
      return (
        otherTicketType.localId !== ticketType.localId &&
        otherTicketType.venueSectorLocalId === ticketType.venueSectorLocalId &&
        otherTicketType.eventSessionLocalId === ticketType.eventSessionLocalId &&
        otherTicketType.ticketKind === ticketType.ticketKind &&
        getLotNumber(otherTicketType.lotLabel) === nextLotNumber - 1
      );
    });

    return previousLot?.salesEndAt || "";
  }

  function addTicketType() {
    const firstSessionId = sessions[0]?.localId || "";
    const firstSectorId = isOpenAdmissionOnly ? "" : sectors[0]?.localId || "";
    const firstSector = sectors.find((sector) => sector.localId === firstSectorId);
    const firstSession = sessions.find((session) => session.localId === firstSessionId);

    setTicketTypes((currentTicketTypes) => [
      ...currentTicketTypes,
      {
        ...createDefaultTicketType(
          currentTicketTypes.length,
          firstSessionId,
          firstSectorId,
          firstSector?.occupancyMode || occupancyMode,
        ),
        salesEndAt: firstSession?.startsAt
          ? mergeDateAndTime(firstSession.startsAt, firstSession.endsAt, "23:59")
          : "",
      },
    ]);
  }

  function updateTicketType<K extends keyof TicketTypeFormItem>(
    localId: string,
    field: K,
    value: TicketTypeFormItem[K],
  ) {
    setTicketTypes((currentTicketTypes) =>
      currentTicketTypes.map((ticketType) => {
        if (ticketType.localId !== localId) return ticketType;

        if (field === "price") {
          return {
            ...ticketType,
            price: onlyMoney(String(value)),
          };
        }

        if (field === "quantity" || field === "maxPerOrder") {
          return {
            ...ticketType,
            [field]: onlyDigits(String(value)),
          };
        }

        if (field === "minPerOrder") {
          return {
            ...ticketType,
            minPerOrder: "1",
          };
        }

        if (field === "ticketKind") {
          const nextTicketKind = value as TicketKind;

          return {
            ...ticketType,
            ticketKind: nextTicketKind,
            name: getTicketKindLabel(nextTicketKind),
            isHidden: false,
          };
        }

        if (field === "venueSectorLocalId") {
          const linkedSector = sectors.find((sector) => sector.localId === value);
          const shouldHide =
            ticketType.lotLabel !== "1º Lote" &&
            currentTicketTypes.some((otherTicketType) => {
              return (
                otherTicketType.localId !== ticketType.localId &&
                otherTicketType.venueSectorLocalId === String(value) &&
                otherTicketType.eventSessionLocalId ===
                  ticketType.eventSessionLocalId &&
                otherTicketType.ticketKind === ticketType.ticketKind &&
                otherTicketType.lotLabel === "1º Lote"
              );
            });

          return {
            ...ticketType,
            venueSectorLocalId: String(value),
            occupancyMode: linkedSector?.occupancyMode || occupancyMode,
            isHidden: shouldHide,
          };
        }

        if (field === "lotLabel") {
          const nextLotLabel = String(value);
          const shouldHide =
            nextLotLabel !== "1º Lote" &&
            currentTicketTypes.some((otherTicketType) => {
              return (
                otherTicketType.localId !== ticketType.localId &&
                otherTicketType.venueSectorLocalId ===
                  ticketType.venueSectorLocalId &&
                otherTicketType.eventSessionLocalId ===
                  ticketType.eventSessionLocalId &&
                otherTicketType.ticketKind === ticketType.ticketKind &&
                otherTicketType.lotLabel === "1º Lote"
              );
            });

          const previousLotEndDate = getPreviousLotEndDate(
            ticketType,
            nextLotLabel,
          );

          return {
            ...ticketType,
            lotLabel: nextLotLabel,
            salesStartAt: previousLotEndDate || ticketType.salesStartAt,
            isHidden: shouldHide,
          };
        }

        if (field === "eventSessionLocalId") {
          const nextSessionLocalId = String(value);
          const selectedSession = sessions.find(
            (session) => session.localId === nextSessionLocalId,
          );

          const shouldHide =
            ticketType.lotLabel !== "1º Lote" &&
            currentTicketTypes.some((otherTicketType) => {
              return (
                otherTicketType.localId !== ticketType.localId &&
                otherTicketType.venueSectorLocalId ===
                  ticketType.venueSectorLocalId &&
                otherTicketType.eventSessionLocalId === nextSessionLocalId &&
                otherTicketType.ticketKind === ticketType.ticketKind &&
                otherTicketType.lotLabel === "1º Lote"
              );
            });

          return {
            ...ticketType,
            eventSessionLocalId: nextSessionLocalId,
            salesEndAt: selectedSession?.startsAt
              ? mergeDateAndTime(
                  selectedSession.startsAt,
                  ticketType.salesEndAt || selectedSession.endsAt,
                  "23:59",
                )
              : ticketType.salesEndAt,
            isHidden: shouldHide,
          };
        }

        if (field === "salesEndAt") {
          const selectedSession = sessions.find(
            (session) => session.localId === ticketType.eventSessionLocalId,
          );

          return {
            ...ticketType,
            salesEndAt: selectedSession?.startsAt
              ? mergeDateAndTime(selectedSession.startsAt, String(value), "23:59")
              : String(value),
          };
        }

        return { ...ticketType, [field]: value };
      }),
    );
  }

  function removeTicketType(localId: string) {
    setTicketTypes((currentTicketTypes) => {
      if (currentTicketTypes.length <= 1) return currentTicketTypes;

      return currentTicketTypes.filter(
        (ticketType) => ticketType.localId !== localId,
      );
    });
  }

   function generateBlockMap() {
    const stageObject: SeatMapObjectFormItem = {
      localId: newLocalId("stage"),
      venueSectorLocalId: "",
      code: "PALCO",
      label: "PALCO",
      type: "STAGE",
      row: "",
      number: "",
      capacity: "",
      x: 420,
      y: 40,
      width: 360,
      height: 90,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        sectorColor: "#111827",
        fixed: true,
        shape: "ROUNDED",
      },
    };

    const sectorObjects: SeatMapObjectFormItem[] = sectors.map((sector, index) => {
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

      const template = templates[index % templates.length];
      const capacityNumber = getNumericValue(sector.capacity);

      return {
        localId: newLocalId("area"),
        venueSectorLocalId: sector.localId,
        code: `S${index + 1}`,
        label: sector.name || `Setor ${index + 1}`,
        type: sector.sectorKind === "TABLES" ? "TABLE" : "AREA",
        row: "",
        number: String(index + 1),
        capacity: sector.capacity,
        x: template.x,
        y: template.y,
        width: template.width,
        height: template.height,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          sectorKind: sector.sectorKind,
          sectorName: sector.name,
          sectorColor: sector.color,
          capacity: capacityNumber,
          shape: "ROUNDED",
          polygonPoints: [
            { x: 0, y: 12 },
            { x: 100, y: 0 },
            { x: 100, y: 88 },
            { x: 0, y: 100 },
          ],
          tableSaleMode:
            sector.sectorKind === "TABLES" ? tableSaleMode : undefined,
          seatsPerTable:
            sector.sectorKind === "TABLES"
              ? Math.max(1, Number.parseInt(seatsPerTable, 10) || 1)
              : undefined,
          tableCount:
            sector.sectorKind === "TABLES"
              ? Math.max(1, Number.parseInt(tableCount, 10) || 1)
              : undefined,
        },
      };
    });

    setSelectedMapObjectId("");
    setMapObjects([stageObject, ...sectorObjects]);
  }

    const sectorObjects: SeatMapObjectFormItem[] = sectors.map((sector, index) => {
      const templates = [
        { x: 150, y: 140, width: 250, height: 150 },
        { x: 500, y: 140, width: 250, height: 150 },
        { x: 260, y: 320, width: 380, height: 190 },
        { x: 80, y: 330, width: 160, height: 220 },
        { x: 660, y: 330, width: 160, height: 220 },
        { x: 260, y: 540, width: 380, height: 80 },
      ];

      const template = templates[index % templates.length];
      const capacityNumber = getNumericValue(sector.capacity);

      return {
        localId: newLocalId("area"),
        venueSectorLocalId: sector.localId,
        code: `S${index + 1}`,
        label: sector.name || `Setor ${index + 1}`,
        type: sector.sectorKind === "TABLES" ? "TABLE" : "AREA",
        row: "",
        number: String(index + 1),
        capacity: sector.capacity,
        x: template.x,
        y: template.y,
        width: template.width,
        height: template.height,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          sectorKind: sector.sectorKind,
          sectorName: sector.name,
          sectorColor: sector.color,
          capacity: capacityNumber,
          shape: "ROUNDED",
          tableSaleMode:
            sector.sectorKind === "TABLES" ? tableSaleMode : undefined,
          seatsPerTable:
            sector.sectorKind === "TABLES"
              ? Math.max(1, Number.parseInt(seatsPerTable, 10) || 1)
              : undefined,
          tableCount:
            sector.sectorKind === "TABLES"
              ? Math.max(1, Number.parseInt(tableCount, 10) || 1)
              : undefined,
        },
      };
    });

    setMapObjects([stageObject, ...sectorObjects]);
  }

     function clampMapValue(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function isMapPoint(value: unknown): value is MapPoint {
    if (typeof value !== "object" || value === null) return false;

    const point = value as Record<string, unknown>;

    return typeof point.x === "number" && typeof point.y === "number";
  }

  function getDefaultPolygonPoints(): MapPoint[] {
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

  function getMapObjectPolygonPoints(object: SeatMapObjectFormItem): MapPoint[] {
    const rawPoints = object.metadata?.polygonPoints;

    if (Array.isArray(rawPoints) && rawPoints.every(isMapPoint)) {
      return rawPoints;
    }

    return getDefaultPolygonPoints();
  }

  function getSvgPolygonPoints(object: SeatMapObjectFormItem) {
    return getMapObjectPolygonPoints(object)
      .map((point) => {
        const absoluteX = (point.x / 100) * object.width;
        const absoluteY = (point.y / 100) * object.height;

        return `${absoluteX},${absoluteY}`;
      })
      .join(" ");
  }

  function getCssPolygonPoints(object: SeatMapObjectFormItem) {
    return getMapObjectPolygonPoints(object)
      .map((point) => `${point.x}% ${point.y}%`)
      .join(", ");
  }

  function getMapObjectShape(object: SeatMapObjectFormItem): MapShape {
    return String(object.metadata?.shape || "ROUNDED") as MapShape;
  }

  function getMapObjectBorderRadius(object: SeatMapObjectFormItem) {
    const shape = getMapObjectShape(object);

    if (shape === "CIRCLE") return "9999px";
    if (shape === "PILL") return "9999px";
    if (shape === "RECTANGLE") return "0.75rem";

    return "2rem";
  }

  function startMoveMapObject(
    event: ReactPointerEvent<HTMLDivElement>,
    object: SeatMapObjectFormItem,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedMapObjectId(object.localId);

    setMapInteraction({
      type: "move",
      objectId: object.localId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: object.x,
      startY: object.y,
      startWidth: object.width,
      startHeight: object.height,
    });
  }

  function startResizeMapObject(
    event: ReactPointerEvent<HTMLButtonElement>,
    object: SeatMapObjectFormItem,
    direction: ResizeDirection,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedMapObjectId(object.localId);

    setMapInteraction({
      type: "resize",
      objectId: object.localId,
      direction,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: object.x,
      startY: object.y,
      startWidth: object.width,
      startHeight: object.height,
    });
  }

  function startMovePolygonPoint(
    event: ReactPointerEvent<HTMLButtonElement>,
    object: SeatMapObjectFormItem,
    pointIndex: number,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const point = getMapObjectPolygonPoints(object)[pointIndex];

    if (!point) return;

    setSelectedMapObjectId(object.localId);

    setMapInteraction({
      type: "point",
      objectId: object.localId,
      pointIndex,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: object.x,
      startY: object.y,
      startWidth: object.width,
      startHeight: object.height,
      startPointX: point.x,
      startPointY: point.y,
    });
  }

  function handleMapPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!mapInteraction) return;

    const deltaX = event.clientX - mapInteraction.startClientX;
    const deltaY = event.clientY - mapInteraction.startClientY;

    setMapObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.localId !== mapInteraction.objectId) return object;

        if (mapInteraction.type === "move") {
          const nextX = clampMapValue(
            mapInteraction.startX + deltaX,
            0,
            MAP_CANVAS_WIDTH - object.width,
          );
          const nextY = clampMapValue(
            mapInteraction.startY + deltaY,
            0,
            MAP_CANVAS_HEIGHT - object.height,
          );

          return {
            ...object,
            x: nextX,
            y: nextY,
          };
        }

        if (mapInteraction.type === "point") {
          const pointIndex = mapInteraction.pointIndex ?? 0;
          const points = getMapObjectPolygonPoints(object);

          const nextPointX = clampMapValue(
            (mapInteraction.startPointX ?? points[pointIndex]?.x ?? 50) +
              (deltaX / Math.max(mapInteraction.startWidth, 1)) * 100,
            0,
            100,
          );

          const nextPointY = clampMapValue(
            (mapInteraction.startPointY ?? points[pointIndex]?.y ?? 50) +
              (deltaY / Math.max(mapInteraction.startHeight, 1)) * 100,
            0,
            100,
          );

          const nextPoints = points.map((point, index) =>
            index === pointIndex
              ? {
                  x: nextPointX,
                  y: nextPointY,
                }
              : point,
          );

          return {
            ...object,
            metadata: {
              ...object.metadata,
              shape: "FREEFORM",
              polygonPoints: nextPoints,
            },
          };
        }

        let nextX = mapInteraction.startX;
        let nextY = mapInteraction.startY;
        let nextWidth = mapInteraction.startWidth;
        let nextHeight = mapInteraction.startHeight;

        if (mapInteraction.direction?.includes("e")) {
          nextWidth = mapInteraction.startWidth + deltaX;
        }

        if (mapInteraction.direction?.includes("s")) {
          nextHeight = mapInteraction.startHeight + deltaY;
        }

        if (mapInteraction.direction?.includes("w")) {
          nextX = mapInteraction.startX + deltaX;
          nextWidth = mapInteraction.startWidth - deltaX;
        }

        if (mapInteraction.direction?.includes("n")) {
          nextY = mapInteraction.startY + deltaY;
          nextHeight = mapInteraction.startHeight - deltaY;
        }

        if (nextWidth < MAP_MIN_OBJECT_SIZE) {
          if (mapInteraction.direction?.includes("w")) {
            nextX =
              mapInteraction.startX +
              mapInteraction.startWidth -
              MAP_MIN_OBJECT_SIZE;
          }

          nextWidth = MAP_MIN_OBJECT_SIZE;
        }

        if (nextHeight < MAP_MIN_OBJECT_SIZE) {
          if (mapInteraction.direction?.includes("n")) {
            nextY =
              mapInteraction.startY +
              mapInteraction.startHeight -
              MAP_MIN_OBJECT_SIZE;
          }

          nextHeight = MAP_MIN_OBJECT_SIZE;
        }

        nextX = clampMapValue(nextX, 0, MAP_CANVAS_WIDTH - MAP_MIN_OBJECT_SIZE);
        nextY = clampMapValue(nextY, 0, MAP_CANVAS_HEIGHT - MAP_MIN_OBJECT_SIZE);
        nextWidth = clampMapValue(
          nextWidth,
          MAP_MIN_OBJECT_SIZE,
          MAP_CANVAS_WIDTH - nextX,
        );
        nextHeight = clampMapValue(
          nextHeight,
          MAP_MIN_OBJECT_SIZE,
          MAP_CANVAS_HEIGHT - nextY,
        );

        return {
          ...object,
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
        };
      }),
    );
  }

  function stopMapInteraction() {
    setMapInteraction(null);
  }

  function updateMapObjectShape(localId: string, shape: MapShape) {
    setMapObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.localId !== localId) return object;

        if (shape === "CIRCLE") {
          const size = Math.min(object.width, object.height);

          return {
            ...object,
            width: size,
            height: size,
            metadata: {
              ...object.metadata,
              shape,
            },
          };
        }

        if (shape === "FREEFORM") {
          return {
            ...object,
            metadata: {
              ...object.metadata,
              shape,
              polygonPoints:
                Array.isArray(object.metadata?.polygonPoints) &&
                object.metadata.polygonPoints.every(isMapPoint)
                  ? object.metadata.polygonPoints
                  : getDefaultPolygonPoints(),
            },
          };
        }

        return {
          ...object,
          metadata: {
            ...object.metadata,
            shape,
          },
        };
      }),
    );
  }

  function addPointToSelectedMapObject() {
    if (!selectedMapObjectId) return;

    setMapObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.localId !== selectedMapObjectId) return object;

        const points = getMapObjectPolygonPoints(object);

        return {
          ...object,
          metadata: {
            ...object.metadata,
            shape: "FREEFORM",
            polygonPoints: [
              ...points,
              {
                x: 50,
                y: 50,
              },
            ],
          },
        };
      }),
    );
  }

  function removePointFromSelectedMapObject() {
    if (!selectedMapObjectId) return;

    setMapObjects((currentObjects) =>
      currentObjects.map((object) => {
        if (object.localId !== selectedMapObjectId) return object;

        const points = getMapObjectPolygonPoints(object);

        if (points.length <= 3) {
          alert("Um setor quebrado precisa ter pelo menos 3 pontos.");
          return object;
        }

        return {
          ...object,
          metadata: {
            ...object.metadata,
            shape: "FREEFORM",
            polygonPoints: points.slice(0, -1),
          },
        };
      }),
    );
  }

  function resetSelectedMapObjectPolygon() {
    if (!selectedMapObjectId) return;

    setMapObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.localId === selectedMapObjectId
          ? {
              ...object,
              metadata: {
                ...object.metadata,
                shape: "FREEFORM",
                polygonPoints: getDefaultPolygonPoints(),
              },
            }
          : object,
      ),
    );
  }

  function updateMapObjectShape(localId: string, shape: MapShape) {
    setMapObjects((currentObjects) =>
      currentObjects.map((object) =>
        object.localId === localId
          ? {
              ...object,
              metadata: {
                ...object.metadata,
                shape,
              },
            }
          : object,
      ),
    );
  }

  function clearMap() {
    if (confirm("Deseja limpar o mapa gerado?")) {
      setMapObjects([]);
    }
  }

  function handleZipCodeChange(value: string) {
    const nextZipCode = onlyDigits(value).slice(0, 8);
    setZipCode(nextZipCode);

    if (nextZipCode.length !== 8) return;

    fetch(`https://viacep.com.br/ws/${nextZipCode}/json/`)
      .then((response) => response.json())
      .then((result) => {
        if (result?.erro) {
          alert("CEP não encontrado.");
          return;
        }

        setAddressLine1(result?.logradouro || "");
        setNeighborhood(result?.bairro || "");
        setCity(result?.localidade || "");
        setStateName(result?.uf || "");
      })
      .catch((error) => {
        console.error("CEP LOOKUP ERROR:", error);
        alert("Não foi possível buscar o CEP agora.");
      });
  }

  function handleMapUrlChange(value: string) {
    setMapUrl(value);

    const atCoordinatesMatch = value.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const queryCoordinatesMatch = value.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);

    const match = atCoordinatesMatch || queryCoordinatesMatch;

    if (match?.[1] && match?.[2]) {
      setLatitude(match[1]);
      setLongitude(match[2]);
    }
  }

  function buildPayload() {
    const firstSessionStartsAt = sessions.find((session) => session.startsAt)
      ?.startsAt;
    const firstSessionEndsAt = sessions.find((session) => session.endsAt)?.endsAt;
    const resolvedStartDate = startDate || firstSessionStartsAt;
    const resolvedEndDate = endDate || firstSessionEndsAt;

    const mapObjectsForApi = mapObjects.map((object) => ({
      localId: object.localId,
      code: object.code,
      label: object.label,
      type: object.type,
      row: normalizeText(object.row),
      number: normalizeText(object.number),
      capacity: toIntOrUndefined(object.capacity),
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
      status: object.status,
      venueSectorLocalId: normalizeText(object.venueSectorLocalId),
      metadata: object.metadata,
    }));

    return {
      organizerId,
      name: name.trim(),
      description: normalizeText(description),
      shortDescription: normalizeText(shortDescription),
      slug: normalizeText(slug),
      category,
      occupancyMode,
      status,
      visibility,
      timezone,
      eventDate: toIsoOrUndefined(resolvedStartDate),
      startDate: toIsoOrUndefined(resolvedStartDate),
      endDate: toIsoOrUndefined(resolvedEndDate),
      saleStartAt: toIsoOrUndefined(saleStartAt),
      saleEndAt: toIsoOrUndefined(saleEndAt),
      capacity: toIntOrUndefined(capacity),
      featured: false,
      highlightTag: undefined,
      checkoutTitle: normalizeText(checkoutTitle),
      checkoutSubtitle: normalizeText(checkoutSubtitle),
      allowSeatMap,
      allowTableMap,
      multiSession: sessions.length > 1,
      content: {
        headline: normalizeText(headline),
        summary: normalizeText(summary),
        fullDescription: normalizeText(fullDescription),
        attractions: normalizeText(attractions),
        schedule: normalizeText(schedule),
        sectorDetails: normalizeText(sectorDetails),
        importantInfo: normalizeText(importantInfo),
        faq: normalizeText(faq),
        producerDescription: normalizeText(producerDescription),
        purchaseInstructions: normalizeText(purchaseInstructions),
      },
      location: {
        mode,
        venueName: normalizeText(venueName),
        addressLine1: normalizeText(addressLine1),
        addressLine2: normalizeText(addressLine2),
        neighborhood: normalizeText(neighborhood),
        city: normalizeText(city),
        state: normalizeText(stateName),
        zipCode: normalizeText(zipCode),
        reference: normalizeText(reference),
        mapUrl: normalizeText(mapUrl),
        instructions: normalizeText(instructions),
        latitude: normalizeText(latitude),
        longitude: normalizeText(longitude),
      },
      media: {
        coverImageUrl: normalizeMediaUrl(coverImageUrl),
        bannerImageUrl: normalizeMediaUrl(bannerImageUrl),
        thumbnailUrl: normalizeMediaUrl(thumbnailUrl),
        mobileBannerUrl: normalizeMediaUrl(mobileBannerUrl),
        sectorMapImageUrl: normalizeMediaUrl(sectorMapImageUrl),
        gallery: galleryPreview
          .map((item) => normalizeMediaUrl(item))
          .filter((item): item is string => Boolean(item)),
      },
      policy: {
        ageRating: normalizeText(ageRating),
        refundPolicy: refundPolicyEnabled
          ? normalizeText(refundPolicy)
          : undefined,
        halfEntryPolicy: normalizeText(halfEntryPolicy),
        transferPolicy: transferPolicyEnabled
          ? normalizeText(transferPolicy)
          : undefined,
        termsNotes: normalizeText(termsNotes),
        entryRules: normalizeText(entryRules),
        documentRules: normalizeText(documentRules),
      },
      sessions: sessions
        .filter((session) => session.startsAt || session.endsAt)
        .map((session, index) => ({
          localId: session.localId,
          name:
            session.name.trim() ||
            formatSessionNameFromDate(session.startsAt) ||
            `Data ${index + 1}`,
          description: normalizeText(session.description),
          startsAt: toIsoOrUndefined(session.startsAt),
          endsAt: toIsoOrUndefined(session.endsAt),
          capacity: toIntOrUndefined(session.capacity),
          status: "ACTIVE",
          displayOrder: index,
        })),
      sectors: sectors
        .filter((sector) => sector.name.trim())
        .map((sector, index) => ({
          localId: sector.localId,
          name: sector.name.trim(),
          description: normalizeText(sector.description),
          type: sector.type,
          occupancyMode: sector.occupancyMode,
          capacity: toIntOrUndefined(sector.capacity),
          displayOrder: index,
          color: normalizeText(sector.color),
          gateName: normalizeText(sector.gateName),
        })),
      venueLayouts:
        mapObjects.length > 0
          ? [
              {
                localId: "layout-main",
                name: "Mapa do evento",
                occupancyMode,
                width: MAP_CANVAS_WIDTH,
                height: MAP_CANVAS_HEIGHT,
                isDefault: true,
                status: "ACTIVE",
                objects: mapObjectsForApi,
              },
            ]
          : [],
      ticketTypes: ticketTypes
        .filter((ticketType) => ticketType.name.trim())
        .map((ticketType, index) => {
          const linkedSector = sectors.find(
            (sector) => sector.localId === ticketType.venueSectorLocalId,
          );

          return {
            eventSessionLocalId: normalizeText(ticketType.eventSessionLocalId),
            venueSectorLocalId: normalizeText(ticketType.venueSectorLocalId),
            occupancyMode:
              linkedSector?.occupancyMode || ticketType.occupancyMode,
            name: `${getTicketKindLabel(ticketType.ticketKind)} - ${ticketType.name.trim()} - ${ticketType.lotLabel}`,
            lotLabel: normalizeText(ticketType.lotLabel),
            description: normalizeText(ticketType.description),
            price: priceToApiString(ticketType.price),
            quantity: toIntOrUndefined(ticketType.quantity),
            salesStartAt: toIsoOrUndefined(ticketType.salesStartAt),
            salesEndAt: toIsoOrUndefined(ticketType.salesEndAt),
            minPerOrder: 1,
            maxPerOrder: toIntOrUndefined(ticketType.maxPerOrder),
            displayOrder: index,
            feeAmount: undefined,
            feeDescription: undefined,
            benefitDescription: undefined,
            isHidden: ticketType.isHidden,
            status: "ACTIVE",
          };
        }),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (sessionCapacityErrorMessage) {
      setActiveStepIndex(
        stepDefinitions.findIndex((step) => step.id === "sessions"),
      );
      alert(sessionCapacityErrorMessage);
      return;
    }

    if (mediaErrorMessage) {
      setActiveStepIndex(
        stepDefinitions.findIndex((step) => step.id === "extras"),
      );
      alert(mediaErrorMessage);
      return;
    }

    if (sectorCapacityErrorMessage) {
      setActiveStepIndex(
        stepDefinitions.findIndex((step) => step.id === "sectors"),
      );
      alert(sectorCapacityErrorMessage);
      return;
    }

    if (ticketLotPriceErrorMessage || ticketDateErrorMessage) {
      setActiveStepIndex(
        stepDefinitions.findIndex((step) => step.id === "tickets"),
      );
      alert(ticketLotPriceErrorMessage || ticketDateErrorMessage);
      return;
    }

    const firstIncompleteStepIndex = getFirstIncompleteStepIndex();

    if (firstIncompleteStepIndex !== stepDefinitions.length - 1) {
      setActiveStepIndex(firstIncompleteStepIndex);
      alert("Revise as etapas obrigatórias antes de salvar o evento.");
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
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(buildPayload()),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : Array.isArray(result?.message)
              ? result.message.join("\n")
              : "Erro ao criar evento",
        );
        return;
      }

      alert("Evento criado com sucesso!");

      const eventId = result?.id || result?.event?.id;

      if (eventId) {
        window.location.href = `/admin/events/${eventId}`;
        return;
      }

      window.location.href = "/admin/events";
    } catch (error) {
      console.error("CREATE EVENT ERROR:", error);
      alert("Erro ao conectar com a API");
    } finally {
      setSaving(false);
    }
  }

  function renderTypeStep() {
    return (
      <StepShell
        eyebrow="Etapa 1"
        title="Escolha a categoria e o tipo de ocupação"
        description="A categoria define quais modelos aparecem. Depois disso, a criação guiada libera apenas os campos que fazem sentido para esse modelo."
      >
        <div className="grid gap-8">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              Categoria do evento
            </h3>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {categoryOptions.map((option) => {
                const active = option.value === category;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleCategoryChange(option.value)}
                    className={`rounded-3xl border p-5 text-left transition ${
                      active
                        ? "border-sky-500 bg-sky-50 shadow-[0_18px_45px_rgba(14,165,233,0.18)]"
                        : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-black ${
                        active
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {active ? "✓" : "•"}
                    </div>

                    <p className="text-base font-black text-slate-950">
                      {option.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
                  Ocupações disponíveis para {getCategoryLabel(category)}
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Tipos personalizados
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                  Ao trocar a categoria, esta lista muda automaticamente. O
                  restante do formulário acompanha a escolha.
                </p>
              </div>

              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white">
                {availableOccupancyPresets.length} opção
                {availableOccupancyPresets.length === 1 ? "" : "ões"}
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {availableOccupancyPresets.map((option) => {
                const active = option.key === occupancyPresetKey;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => applyOccupancyPreset(option.key)}
                    className={`rounded-3xl border p-5 text-left transition ${
                      active
                        ? "border-sky-300 bg-sky-500 text-white shadow-[0_18px_45px_rgba(14,165,233,0.25)]"
                        : "border-white/10 bg-white/5 text-white hover:border-white/30 hover:bg-white/10"
                    }`}
                  >
                    <div className="mb-4 flex flex-wrap gap-2">
                      {option.usesOpenAdmission ? (
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                          Livre
                        </span>
                      ) : null}

                      {option.usesPlateia ? (
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                          Plateia
                        </span>
                      ) : null}

                      {option.usesNumberedSeats ? (
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                          Cadeiras
                        </span>
                      ) : null}

                      {option.usesTables ? (
                        <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                          Mesas
                        </span>
                      ) : null}
                    </div>

                    <p className="text-lg font-black">{option.label}</p>
                    <p
                      className={`mt-2 text-sm font-semibold leading-6 ${
                        active ? "text-sky-50" : "text-slate-300"
                      }`}
                    >
                      {option.description}
                    </p>
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
      <StepShell
        eyebrow="Etapa 2"
        title="Dados principais"
        description="Defina a produtora, o nome, a capacidade e as informações principais do evento."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Produtora"
            value={organizerId}
            onChange={setOrganizerId}
            required
            options={[
              {
                label: loadingOrganizers
                  ? "Carregando produtoras..."
                  : "Selecione a produtora",
                value: "",
              },
              ...organizers.map((organizer) => ({
                value: organizer.id,
                label:
                  organizer.tradeName ||
                  organizer.legalName ||
                  organizer.email ||
                  "Produtora sem nome",
              })),
            ]}
          />

          <Field
            label="Nome do evento"
            value={name}
            onChange={setName}
            placeholder="Ex: Festival de Verão 2026"
            required
            error={requiredErrors.name}
          />

          <Field
            label="Slug público"
            value={slug}
            onChange={setSlug}
            placeholder="festival-de-verao-2026"
            helper="Opcional. Se vazio, a API pode gerar automaticamente."
          />

          <Field
            label="Capacidade geral"
            value={capacity}
            onChange={setCapacity}
            type="text"
            onlyNumbers
            required
            error={requiredErrors.capacity}
            helper="A soma das datas e setores não pode ultrapassar esta capacidade."
          />

          <SelectField
            label="Status inicial"
            value={status}
            onChange={() => undefined}
            disabled
            options={[{ label: "Publicado", value: DEFAULT_STATUS }]}
          />

          <SelectField
            label="Visibilidade"
            value={visibility}
            onChange={() => undefined}
            disabled
            options={[{ label: "Público", value: DEFAULT_VISIBILITY }]}
          />

          <Field
            label="Fuso horário"
            value="Brasil - Horário de Brasília"
            onChange={() => undefined}
            disabled
            helper={`Salvo internamente como ${DEFAULT_TIMEZONE}.`}
          />

          <div className="md:col-span-2">
            <TextAreaField
              label="Descrição curta"
              value={shortDescription}
              onChange={setShortDescription}
              placeholder="Resumo rápido para cards e listagens."
            />
          </div>

          <div className="md:col-span-2">
            <TextAreaField
              label="Descrição interna"
              value={description}
              onChange={setDescription}
              placeholder="Descrição geral usada no cadastro do evento."
            />
          </div>
        </div>
      </StepShell>
    );
  }

  function renderSessionsStep() {
    return (
      <StepShell
        eyebrow="Etapa 3"
        title="Datas"
        description="Defina o início, o fim e as datas ou sessões do evento."
      >
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Início geral"
              value={startDate}
              onChange={handleGeneralStartDateChange}
              type="datetime-local"
              required
              error={requiredErrors.sessions && !startDate}
              helper="Ao alterar, todas as datas são deslocadas automaticamente."
            />
            <Field
              label="Fim geral"
              value={endDate}
              onChange={handleGeneralEndDateChange}
              type="datetime-local"
              required
              error={requiredErrors.sessions && !endDate}
              helper="Não pode ser antes do início geral."
            />
          </div>

          <div
            className={`rounded-3xl border p-5 ${
              sessionCapacityErrorMessage
                ? "border-rose-200 bg-rose-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MiniStat label="Capacidade geral" value={capacity || "0"} />
              <MiniStat label="Soma das datas" value={sessionCapacityTotal} />
              <MiniStat
                label="Disponível"
                value={Math.max(generalCapacityNumber - sessionCapacityTotal, 0)}
              />
            </div>

            {sessionCapacityErrorMessage ? (
              <p className="mt-4 text-sm font-black text-rose-700">
                {sessionCapacityErrorMessage}
              </p>
            ) : (
              <p className="mt-4 text-sm font-semibold text-slate-500">
                Todas as datas precisam ter início, fim e capacidade. A soma das
                datas não pode ultrapassar a capacidade geral.
              </p>
            )}
          </div>

          <div className="space-y-4">
            {sessions.map((session, index) => (
              <div
                key={session.localId}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Data {index + 1}
                    </p>
                    <h3 className="text-lg font-black text-slate-950">
                      {session.name || "Data sem início"}
                    </h3>
                  </div>

                  {sessions.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeSession(session.localId)}
                      className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Nome da data"
                    value={session.name}
                    onChange={() => undefined}
                    disabled
                    helper="Gerado automaticamente pelo início."
                  />
                  <Field
                    label="Capacidade da data"
                    value={session.capacity}
                    onChange={(value) =>
                      updateSession(session.localId, "capacity", value)
                    }
                    type="text"
                    onlyNumbers
                    required
                    error={
                      requiredErrors.sessions &&
                      getNumericValue(session.capacity) <= 0
                    }
                    helper="Obrigatória. A soma das datas não pode passar da capacidade geral."
                  />
                  <Field
                    label="Início"
                    value={session.startsAt}
                    onChange={(value) =>
                      updateSession(session.localId, "startsAt", value)
                    }
                    type="datetime-local"
                    required
                  />
                  <Field
                    label="Fim"
                    value={session.endsAt}
                    onChange={(value) =>
                      updateSession(session.localId, "endsAt", value)
                    }
                    type="datetime-local"
                    required
                  />
                  <div className="md:col-span-2">
                    <TextAreaField
                      label="Descrição"
                      value={session.description}
                      onChange={(value) =>
                        updateSession(session.localId, "description", value)
                      }
                      placeholder="Informações específicas desta data."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSession}
            className="rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 hover:bg-sky-100"
          >
            + Adicionar outra data
          </button>
        </div>
      </StepShell>
    );
  }

  function renderExtrasStep() {
    return (
      <StepShell
        eyebrow="Etapa 4"
        title="Imagens e políticas"
        description="Envie imagens ou vídeos do evento e configure regras importantes para o comprador."
      >
        <div className="grid gap-8">
          {mediaErrorMessage || requiredErrors.extras ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
              {mediaErrorMessage}
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
                  Mídia do evento
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Imagens e vídeos
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  Aceita arquivos de imagem e vídeo. Capa, banner, thumbnail e
                  banner mobile são obrigatórios.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Obrigatório
                </p>
                <p className="mt-1 text-sm font-black">4 arquivos principais</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <EventMediaUploadField
                label="Capa"
                helper="Arquivo principal do evento."
                kind="cover"
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                required
                error={requiredErrors.extras && !coverImageUrl}
              />
              <EventMediaUploadField
                label="Banner"
                helper="Arquivo horizontal para destaque."
                kind="banner"
                value={bannerImageUrl}
                onChange={setBannerImageUrl}
                required
                error={requiredErrors.extras && !bannerImageUrl}
              />
              <EventMediaUploadField
                label="Thumbnail"
                helper="Arquivo para cards e listagens."
                kind="thumbnail"
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                required
                error={requiredErrors.extras && !thumbnailUrl}
              />
              <EventMediaUploadField
                label="Banner mobile"
                helper="Arquivo otimizado para celular."
                kind="mobile-banner"
                value={mobileBannerUrl}
                onChange={setMobileBannerUrl}
                required
                error={requiredErrors.extras && !mobileBannerUrl}
              />
              <EventMediaUploadField
                label="Imagem do mapa/setor"
                helper="Opcional. Referência visual do local ou mapa."
                kind="sector-map"
                value={sectorMapImageUrl}
                onChange={setSectorMapImageUrl}
              />
            </div>

            <div className="mt-5">
              <GalleryUploadField value={galleryText} onChange={setGalleryText} />
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
              Conteúdo público
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">
              Textos comerciais do evento
            </h3>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <Field
                label="Título de checkout"
                value={checkoutTitle}
                onChange={setCheckoutTitle}
                placeholder="Ex: Escolha seus ingressos"
              />
              <Field
                label="Subtítulo de checkout"
                value={checkoutSubtitle}
                onChange={setCheckoutSubtitle}
                placeholder="Ex: Garanta seu lugar"
              />
              <Field
                label="Chamada principal"
                value={headline}
                onChange={setHeadline}
                placeholder="Headline da página pública"
              />
              <Field
                label="Resumo"
                value={summary}
                onChange={setSummary}
                placeholder="Resumo comercial do evento"
              />
              <div className="md:col-span-2">
                <TextAreaField
                  label="Descrição completa"
                  value={fullDescription}
                  onChange={setFullDescription}
                  minHeight="min-h-[180px]"
                />
              </div>
              <TextAreaField
                label="Atrações"
                value={attractions}
                onChange={setAttractions}
              />
              <TextAreaField
                label="Programação"
                value={schedule}
                onChange={setSchedule}
              />
              <TextAreaField
                label="Detalhes dos setores"
                value={sectorDetails}
                onChange={setSectorDetails}
              />
              <TextAreaField
                label="Informações importantes"
                value={importantInfo}
                onChange={setImportantInfo}
              />
              <TextAreaField label="FAQ" value={faq} onChange={setFaq} />
              <div className="md:col-span-2">
                <TextAreaField
                  label="Sobre a produtora"
                  value={producerDescription}
                  onChange={() => undefined}
                  disabled
                  helper="Informações puxadas da produtora selecionada. A edição fica na tela de produtora."
                />
              </div>
              <div className="md:col-span-2">
                <TextAreaField
                  label="Instruções de compra"
                  value={purchaseInstructions}
                  onChange={setPurchaseInstructions}
                />
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-600">
                  Políticas do evento
                </p>
                <h3 className="mt-2 text-2xl font-black text-slate-950">
                  Regras, documentos e condições
                </h3>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                  O produtor pode configurar regras próprias, sempre respeitando
                  as regras gerais da plataforma.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Controle
                </p>
                <p className="mt-1 text-sm font-black">
                  Reembolso e transferência opcionais
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-base font-black text-slate-950">
                  Classificação e meia-entrada
                </h4>
                <div className="mt-5 grid gap-4">
                  <Field
                    label="Classificação indicativa"
                    value={ageRating}
                    onChange={setAgeRating}
                    placeholder="Ex: 18 anos"
                  />
                  <TextAreaField
                    label="Política de meia-entrada"
                    value={halfEntryPolicy}
                    onChange={setHalfEntryPolicy}
                    placeholder="Ex: estudantes, idosos, PCD, professores..."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-base font-black text-slate-950">
                  Reembolso
                </h4>
                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={refundPolicyEnabled}
                    onChange={(event) =>
                      setRefundPolicyEnabled(event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  Permitir reembolso neste evento
                </label>

                {refundPolicyEnabled ? (
                  <div className="mt-4">
                    <TextAreaField
                      label="Política de reembolso"
                      value={refundPolicy}
                      onChange={setRefundPolicy}
                      placeholder="Descreva prazo, condições e exceções."
                      helper="A política do evento deve respeitar as regras gerais da plataforma."
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold leading-6 text-slate-500">
                    Reembolso específico desativado. Valem as regras gerais da
                    plataforma.
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-base font-black text-slate-950">
                  Transferência de ingresso
                </h4>
                <label className="mt-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700">
                  <input
                    type="checkbox"
                    checked={transferPolicyEnabled}
                    onChange={(event) =>
                      setTransferPolicyEnabled(event.target.checked)
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  Permitir transferência neste evento
                </label>

                {transferPolicyEnabled ? (
                  <div className="mt-4">
                    <TextAreaField
                      label="Política de transferência"
                      value={transferPolicy}
                      onChange={setTransferPolicy}
                      placeholder="Descreva prazo, limite e regras."
                      helper="A política do evento deve respeitar as regras gerais da plataforma."
                    />
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold leading-6 text-slate-500">
                    Transferência específica desativada. O evento segue o padrão
                    da plataforma.
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-base font-black text-slate-950">
                  Entrada e documentos
                </h4>
                <div className="mt-5 grid gap-4">
                  <TextAreaField
                    label="Regras de entrada"
                    value={entryRules}
                    onChange={setEntryRules}
                    placeholder="Ex: horário de abertura, tolerância, revista..."
                  />
                  <TextAreaField
                    label="Documentos obrigatórios"
                    value={documentRules}
                    onChange={setDocumentRules}
                    placeholder="Ex: documento com foto, comprovante de meia..."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 lg:col-span-2">
                <h4 className="text-base font-black text-slate-950">
                  Termos e observações gerais
                </h4>
                <div className="mt-5">
                  <TextAreaField
                    label="Termos e observações"
                    value={termsNotes}
                    onChange={setTermsNotes}
                    placeholder="Avisos finais que precisam aparecer para o comprador."
                    minHeight="min-h-[160px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderSectorsStep() {
    return (
      <StepShell
        eyebrow="Etapa 5"
        title={isOpenAdmissionOnly ? "Área única do evento" : "Setores / áreas"}
        description={
          isOpenAdmissionOnly
            ? "Este tipo usa o mesmo espaço para todos os ingressos, sem setores separados."
            : "Configure os setores permitidos para o tipo de ocupação escolhido."
        }
      >
        <div className="mb-6 rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-sm font-black text-sky-950">
            Tipo escolhido: {selectedOccupancyPreset.label}
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-sky-800">
            {selectedOccupancyPreset.description}
          </p>
        </div>

        <div
          className={`mb-6 rounded-3xl border p-5 ${
            sectorCapacityErrorMessage
              ? "border-rose-200 bg-rose-50"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat label="Capacidade geral" value={capacity || "0"} />
            <MiniStat label="Soma dos setores" value={sectorCapacityTotal} />
            <MiniStat
              label="Disponível"
              value={Math.max(generalCapacityNumber - sectorCapacityTotal, 0)}
            />
          </div>

          {sectorCapacityErrorMessage ? (
            <p className="mt-4 text-sm font-black text-rose-700">
              {sectorCapacityErrorMessage}
            </p>
          ) : null}
        </div>

        {isOpenAdmissionOnly ? (
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xl font-black text-emerald-950">
              Evento aberto, sem setores separados.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="Tipo do espaço"
                value="Livre / evento aberto"
                onChange={() => undefined}
                disabled
              />
              <Field
                label="Nome da área"
                value={sectors[0]?.name || "Livre / evento aberto"}
                onChange={(value) =>
                  updateSector(sectors[0].localId, "name", value)
                }
              />
              <Field
                label="Capacidade da área"
                value={sectors[0]?.capacity || ""}
                onChange={(value) =>
                  updateSector(sectors[0].localId, "capacity", value)
                }
                type="text"
                onlyNumbers
                required
                error={Boolean(sectorCapacityErrorMessage)}
              />
            </div>
          </div>
        ) : (
          <>
            {requiredErrors.sectors ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                {sectorCapacityErrorMessage ||
                  "Cadastre pelo menos um setor ou área."}
              </div>
            ) : null}

            <div className="space-y-4">
              {sectors.map((sector, index) => {
                const currentSectorKind = getSectorKindConfig(sector.sectorKind);
                const canChooseKind =
                  selectedOccupancyPreset.allowedSectorKinds.length > 1;
                const sectorCapacity = getNumericValue(sector.capacity);
                const sectorHasCapacityError =
                  generalCapacityNumber > 0 &&
                  sectorCapacity > generalCapacityNumber;
                const usedColors = sectors
                  .filter((item) => item.localId !== sector.localId)
                  .map((item) => item.color)
                  .filter(Boolean);

                return (
                  <div
                    key={sector.localId}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                          Setor {index + 1}
                        </p>
                        <h3 className="text-lg font-black text-slate-950">
                          {sector.name || `Setor ${index + 1}`}
                        </h3>
                      </div>

                      {sectors.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeSector(sector.localId)}
                          className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                        >
                          Remover
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field
                        label="Nome"
                        value={sector.name}
                        onChange={(value) =>
                          updateSector(sector.localId, "name", value)
                        }
                        required
                      />

                      {canChooseKind ? (
                        <SelectField
                          label="Tipo do setor"
                          value={sector.sectorKind}
                          onChange={(value) =>
                            updateSectorKind(sector.localId, value as SectorKind)
                          }
                          options={selectedOccupancyPreset.allowedSectorKinds.map(
                            (sectorKind) => {
                              const config = getSectorKindConfig(sectorKind);

                              return {
                                value: sectorKind,
                                label: config.label,
                              };
                            },
                          )}
                        />
                      ) : (
                        <Field
                          label="Tipo do setor"
                          value={currentSectorKind.label}
                          onChange={() => undefined}
                          disabled
                        />
                      )}

                      <Field
                        label="Capacidade"
                        value={sector.capacity}
                        onChange={(value) =>
                          updateSector(sector.localId, "capacity", value)
                        }
                        type="text"
                        onlyNumbers
                        required
                        error={
                          sectorHasCapacityError ||
                          hasSectorTotalOverCapacity ||
                          getNumericValue(sector.capacity) <= 0
                        }
                      />

                      <SectorColorPicker
                        value={sector.color}
                        usedColors={usedColors}
                        onChange={(value) =>
                          updateSector(sector.localId, "color", value)
                        }
                      />

                      <Field
                        label="Portão de acesso"
                        value={sector.gateName}
                        onChange={(value) =>
                          updateSector(sector.localId, "gateName", value)
                        }
                        placeholder="Ex: Portão A"
                      />

                      <div className="md:col-span-2">
                        <TextAreaField
                          label="Descrição"
                          value={sector.description}
                          onChange={(value) =>
                            updateSector(sector.localId, "description", value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addSector}
              className="mt-5 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 hover:bg-sky-100"
            >
              + Adicionar setor ou área
            </button>
          </>
        )}
      </StepShell>
    );
  }

    function renderMapStep() {
    const selectedMapObject =
      mapObjects.find((object) => object.localId === selectedMapObjectId) ||
      null;

    const selectedMapObjectShape = selectedMapObject
      ? getMapObjectShape(selectedMapObject)
      : null;

    return (
      <StepShell
        eyebrow="Etapa 6"
        title="Mapa do evento"
        description="Monte o mapa visualmente com blocos, formatos e setores quebrados."
      >
        <div className="grid gap-6">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-black text-slate-950">
              Editor visual do mapa
            </h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              Clique em um bloco para selecionar. Arraste para mover. Puxe as
              bolinhas dos cantos para redimensionar. No formato quebrado,
              arraste os pontos azuis para modelar o setor.
            </p>

            {allowTableMap ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <SelectField
                  label="Venda de mesas"
                  value={tableSaleMode}
                  onChange={(value) =>
                    setTableSaleMode(value as "WHOLE_TABLE" | "BY_SEAT")
                  }
                  options={[
                    { label: "Comprar mesa inteira", value: "WHOLE_TABLE" },
                    { label: "Comprar lugares da mesa", value: "BY_SEAT" },
                  ]}
                />
                <Field
                  label="Lugares por mesa"
                  value={seatsPerTable}
                  onChange={setSeatsPerTable}
                  type="text"
                  onlyNumbers
                />
                <Field
                  label="Quantidade de mesas"
                  value={tableCount}
                  onChange={setTableCount}
                  type="text"
                  onlyNumbers
                />
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={generateBlockMap}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
              >
                Gerar mapa em blocos
              </button>

              {mapObjects.length > 0 ? (
                <button
                  type="button"
                  onClick={clearMap}
                  className="rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-black text-rose-600 hover:bg-rose-50"
                >
                  Limpar mapa
                </button>
              ) : null}
            </div>
          </div>

          {requiredErrors.map ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
              Gere o mapa em blocos para continuar.
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Área de montagem do mapa
                </h3>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {selectedMapObject
                    ? `Selecionado: ${selectedMapObject.label}`
                    : "Selecione um bloco para editar o formato."}
                </p>
              </div>

              {selectedMapObject ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                    Formato do setor
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {mapShapeOptions.map((shapeOption) => {
                      const active = selectedMapObjectShape === shapeOption.value;

                      return (
                        <button
                          key={shapeOption.value}
                          type="button"
                          onClick={() =>
                            updateMapObjectShape(
                              selectedMapObject.localId,
                              shapeOption.value,
                            )
                          }
                          className={`rounded-2xl px-4 py-2 text-xs font-black transition ${
                            active
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {shapeOption.label}
                        </button>
                      );
                    })}
                  </div>

                  {selectedMapObjectShape === "FREEFORM" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={addPointToSelectedMapObject}
                        className="rounded-2xl bg-sky-600 px-4 py-2 text-xs font-black text-white hover:bg-sky-700"
                      >
                        + Adicionar ponto
                      </button>
                      <button
                        type="button"
                        onClick={removePointFromSelectedMapObject}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-100"
                      >
                        Remover ponto
                      </button>
                      <button
                        type="button"
                        onClick={resetSelectedMapObjectPolygon}
                        className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                      >
                        Resetar quebrado
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-5 relative min-h-[760px] overflow-auto rounded-3xl bg-slate-100 p-6">
              {mapObjects.length === 0 ? (
                <div className="flex h-[680px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
                  <div>
                    <p className="text-lg font-black text-slate-950">
                      Nenhum bloco criado ainda
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Clique em “Gerar mapa em blocos”.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="relative touch-none overflow-hidden rounded-3xl bg-gradient-to-b from-slate-50 to-slate-200 shadow-inner"
                  style={{
                    width: MAP_CANVAS_WIDTH,
                    height: MAP_CANVAS_HEIGHT,
                  }}
                  onPointerMove={handleMapPointerMove}
                  onPointerUp={stopMapInteraction}
                  onPointerLeave={stopMapInteraction}
                  onPointerCancel={stopMapInteraction}
                  onPointerDown={() => setSelectedMapObjectId("")}
                >
                  <div
                    className="absolute rounded-t-[2rem] bg-white/70 shadow-inner"
                    style={{
                      left: MAP_CANVAS_WIDTH / 2 - 45,
                      top: 150,
                      width: 90,
                      height: 620,
                    }}
                  />

                  {mapObjects.map((object) => {
                    const linkedSector = sectors.find(
                      (sector) => sector.localId === object.venueSectorLocalId,
                    );
                    const backgroundColor =
                      linkedSector?.color ||
                      String(object.metadata?.sectorColor || "#111827");
                    const isStage = object.type === "STAGE";
                    const isTable = object.type === "TABLE";
                    const selected = selectedMapObjectId === object.localId;
                    const shape = getMapObjectShape(object);
                    const isFreeform = shape === "FREEFORM";
                    const polygonPoints = getMapObjectPolygonPoints(object);
                    const seatsInfo =
                      isTable && object.metadata?.tableSaleMode === "BY_SEAT"
                        ? `${object.metadata?.seatsPerTable || 0} lugares por mesa`
                        : isTable
                          ? "Mesa inteira"
                          : `${object.capacity || 0} pessoas`;

                    return (
                      <div
                        key={object.localId}
                        onPointerDown={(event) =>
                          startMoveMapObject(event, object)
                        }
                        className={`absolute cursor-move select-none ${
                          selected ? "z-20" : "z-10"
                        }`}
                        style={{
                          left: object.x,
                          top: object.y,
                          width: object.width,
                          height: object.height,
                          transform: `rotate(${object.rotation}deg)`,
                          outline: selected
                            ? "3px solid rgba(56, 189, 248, 0.65)"
                            : undefined,
                          outlineOffset: 4,
                        }}
                        title={object.label}
                      >
                        {isFreeform ? (
                          <svg
                            className="absolute inset-0 h-full w-full overflow-visible"
                            viewBox={`0 0 ${object.width} ${object.height}`}
                            preserveAspectRatio="none"
                          >
                            <polygon
                              points={getSvgPolygonPoints(object)}
                              fill={backgroundColor}
                              stroke={selected ? "#38bdf8" : "#ffffff"}
                              strokeWidth="5"
                              filter="drop-shadow(0px 12px 12px rgba(15,23,42,0.25))"
                            />
                          </svg>
                        ) : (
                          <div
                            className={`absolute inset-0 border-4 shadow-xl ${
                              isStage
                                ? "border-slate-950 bg-slate-950"
                                : "border-white"
                            }`}
                            style={{
                              backgroundColor,
                              borderRadius: getMapObjectBorderRadius(object),
                            }}
                          />
                        )}

                        <div
                          className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-white"
                          style={
                            isFreeform
                              ? {
                                  clipPath: `polygon(${getCssPolygonPoints(
                                    object,
                                  )})`,
                                }
                              : undefined
                          }
                        >
                          <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]">
                            {isStage
                              ? "Palco"
                              : linkedSector
                                ? getSectorKindConfig(linkedSector.sectorKind)
                                    .label
                                : "Setor"}
                          </span>

                          <strong className="mt-2 px-3 text-2xl font-black uppercase leading-none">
                            {object.label}
                          </strong>

                          {!isStage ? (
                            <span className="mt-3 rounded-full bg-black/20 px-3 py-1 text-xs font-black">
                              {seatsInfo}
                            </span>
                          ) : null}
                        </div>

                        {selected && isFreeform
                          ? polygonPoints.map((point, pointIndex) => (
                              <button
                                key={`${object.localId}-point-${pointIndex}`}
                                type="button"
                                aria-label={`Mover ponto ${pointIndex + 1}`}
                                onPointerDown={(event) =>
                                  startMovePolygonPoint(
                                    event,
                                    object,
                                    pointIndex,
                                  )
                                }
                                className="absolute z-30 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border-2 border-white bg-sky-500 shadow active:cursor-grabbing"
                                style={{
                                  left: `${point.x}%`,
                                  top: `${point.y}%`,
                                }}
                              />
                            ))
                          : null}

                        {selected ? (
                          <>
                            <button
                              type="button"
                              aria-label="Redimensionar canto superior esquerdo"
                              onPointerDown={(event) =>
                                startResizeMapObject(event, object, "nw")
                              }
                              className="absolute -left-3 -top-3 z-30 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow"
                            />
                            <button
                              type="button"
                              aria-label="Redimensionar canto superior direito"
                              onPointerDown={(event) =>
                                startResizeMapObject(event, object, "ne")
                              }
                              className="absolute -right-3 -top-3 z-30 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-white bg-sky-500 shadow"
                            />
                            <button
                              type="button"
                              aria-label="Redimensionar canto inferior esquerdo"
                              onPointerDown={(event) =>
                                startResizeMapObject(event, object, "sw")
                              }
                              className="absolute -bottom-3 -left-3 z-30 h-6 w-6 cursor-nesw-resize rounded-full border-2 border-white bg-sky-500 shadow"
                            />
                            <button
                              type="button"
                              aria-label="Redimensionar canto inferior direito"
                              onPointerDown={(event) =>
                                startResizeMapObject(event, object, "se")
                              }
                              className="absolute -bottom-3 -right-3 z-30 h-6 w-6 cursor-nwse-resize rounded-full border-2 border-white bg-sky-500 shadow"
                            />
                          </>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">
                Como usar o setor quebrado
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                Selecione um setor, clique em “Quebrado” e mova os pontos azuis.
                Use “Adicionar ponto” para criar recortes, curvas falsas,
                setores em L, áreas tortas e camarotes irregulares.
              </p>
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderTicketsStep() {
    return (
      <StepShell
        eyebrow="Etapa 7"
        title="Ingressos / lotes"
        description="Configure tipos de ingresso, preços, lotes, quantidades e vínculos."
      >
        {requiredErrors.tickets ||
        ticketLotPriceErrorMessage ||
        ticketDateErrorMessage ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
            {ticketLotPriceErrorMessage ||
              ticketDateErrorMessage ||
              "Cadastre pelo menos um ingresso válido com tipo, lote, nome, preço e quantidade."}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MiniStat label="Tipos válidos" value={validTicketTypes.length} />
          <MiniStat label="Quantidade total" value={totalTicketQuantity} />
          <MiniStat label="Modelo" value={selectedOccupancyPreset.label} />
        </div>

        <div className="space-y-4">
          {ticketTypes.map((ticketType, index) => {
            const shouldAutoHide =
              ticketType.lotLabel !== "1º Lote" &&
              hasFirstLotForTicket(ticketType);

            return (
              <div
                key={ticketType.localId}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Ingresso / lote {index + 1}
                    </p>
                    <h3 className="text-lg font-black text-slate-950">
                      {ticketType.name || `Ingresso ${index + 1}`}
                    </h3>
                    {shouldAutoHide ? (
                      <p className="mt-1 text-xs font-black text-amber-700">
                        Lote oculto até o lote anterior encerrar.
                      </p>
                    ) : null}
                  </div>

                  {ticketTypes.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeTicketType(ticketType.localId)}
                      className="rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField
                    label="Tipo do ingresso"
                    value={ticketType.ticketKind}
                    onChange={(value) =>
                      updateTicketType(
                        ticketType.localId,
                        "ticketKind",
                        value as TicketKind,
                      )
                    }
                    required
                    options={ticketKindOptions}
                  />

                  <Field
                    label="Nome"
                    value={ticketType.name}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "name", value)
                    }
                    placeholder="Ex: Inteira"
                    required
                  />

                  <SelectField
                    label="Lote"
                    value={ticketType.lotLabel}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "lotLabel", value)
                    }
                    required
                    options={getTicketLotOptions(ticketType)}
                  />

                  <Field
                    label="Preço"
                    value={ticketType.price}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "price", value)
                    }
                    placeholder="Ex: 250,00"
                    required
                    money
                    helper="Use vírgula para centavos."
                  />

                  <Field
                    label="Quantidade"
                    value={ticketType.quantity}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "quantity", value)
                    }
                    type="text"
                    onlyNumbers
                    required
                  />

                  <SelectField
                    label="Data"
                    value={ticketType.eventSessionLocalId}
                    onChange={(value) =>
                      updateTicketType(
                        ticketType.localId,
                        "eventSessionLocalId",
                        value,
                      )
                    }
                    options={[
                      { label: "Todas as datas", value: "" },
                      ...sessions.map((session) => ({
                        value: session.localId,
                        label: session.name || "Data sem nome",
                      })),
                    ]}
                  />

                  <SelectField
                    label="Setor"
                    value={ticketType.venueSectorLocalId}
                    onChange={(value) =>
                      updateTicketType(
                        ticketType.localId,
                        "venueSectorLocalId",
                        value,
                      )
                    }
                    options={
                      isOpenAdmissionOnly
                        ? [{ label: "Área única do evento", value: "" }]
                        : [
                            { label: "Todos os setores", value: "" },
                            ...sectors.map((sector) => ({
                              value: sector.localId,
                              label: `${sector.name} - ${
                                getSectorKindConfig(sector.sectorKind).label
                              }`,
                            })),
                          ]
                    }
                  />

                  <Field
                    label="Início das vendas"
                    value={ticketType.salesStartAt}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "salesStartAt", value)
                    }
                    type="datetime-local"
                    helper="Não pode ser antes de agora."
                  />

                  <Field
                    label="Fim das vendas"
                    value={ticketType.salesEndAt}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "salesEndAt", value)
                    }
                    type="datetime-local"
                    helper="O dia fica preso à data selecionada."
                  />

                  <Field
                    label="Mínimo por pedido"
                    value="1"
                    onChange={() => undefined}
                    type="text"
                    disabled
                    helper="Travado em 1 para todos os lotes."
                  />

                  <Field
                    label="Máximo por pedido"
                    value={ticketType.maxPerOrder}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "maxPerOrder", value)
                    }
                    type="text"
                    onlyNumbers
                  />

                  <div className="md:col-span-2">
                    <TextAreaField
                      label="Descrição e benefícios"
                      value={ticketType.description}
                      onChange={(value) =>
                        updateTicketType(ticketType.localId, "description", value)
                      }
                      placeholder="Descrição do ingresso, benefícios, regras e observações."
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={ticketType.isHidden || shouldAutoHide}
                      onChange={(event) =>
                        updateTicketType(
                          ticketType.localId,
                          "isHidden",
                          event.target.checked,
                        )
                      }
                      disabled={shouldAutoHide}
                      className="h-5 w-5 rounded border-slate-300 disabled:cursor-not-allowed"
                    />
                    Ocultar este ingresso na página pública
                  </label>
                </div>

                <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-black text-slate-700">
                  Prévia: {ticketType.name || "Ingresso"} por{" "}
                  {formatMoneyPreview(ticketType.price)}.
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={addTicketType}
          className="mt-5 rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 hover:bg-sky-100"
        >
          + Adicionar ingresso ou lote
        </button>
      </StepShell>
    );
  }

  function renderLocationStep() {
    return (
      <StepShell
        eyebrow="Etapa 8"
        title="Local e acesso"
        description="Informe onde o evento acontece e como o comprador deve chegar."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Modo do evento"
            value={mode}
            onChange={setMode}
            options={[
              { label: "Presencial", value: "PRESENTIAL" },
              { label: "Online", value: "ONLINE" },
              { label: "Híbrido", value: "HYBRID" },
            ]}
          />

          <Field
            label={isOnlineEvent ? "Nome ou canal do evento" : "Nome do local"}
            value={venueName}
            onChange={setVenueName}
            placeholder={
              isOnlineEvent ? "Ex: Transmissão online" : "Ex: Teatro Municipal"
            }
            required
            error={requiredErrors.venueName}
          />

          {!isOnlineEvent ? (
            <>
              <Field
                label="CEP"
                value={zipCode}
                onChange={handleZipCodeChange}
                placeholder="00000000"
                onlyNumbers
                required
                error={requiredErrors.zipCode}
                helper="Ao preencher 8 números, o endereço será buscado automaticamente."
              />

              <Field
                label="Endereço"
                value={addressLine1}
                onChange={setAddressLine1}
                placeholder="Rua, avenida, número..."
              />

              <Field
                label="Complemento"
                value={addressLine2}
                onChange={setAddressLine2}
              />

              <Field
                label="Bairro"
                value={neighborhood}
                onChange={setNeighborhood}
              />

              <Field label="Cidade" value={city} onChange={setCity} />

              <Field
                label="Estado"
                value={stateName}
                onChange={setStateName}
                placeholder="Ex: SP"
              />

              <Field
                label="Referência"
                value={reference}
                onChange={setReference}
                placeholder="Ex: Em frente à praça"
                required
                error={requiredErrors.reference}
              />

              <Field
                label="URL do mapa"
                value={mapUrl}
                onChange={handleMapUrlChange}
                placeholder="Link do Google Maps, Waze ou OpenStreetMap"
                required
                error={requiredErrors.mapUrl}
                helper={
                  requiredErrors.mapUrl
                    ? "Informe um link válido de mapa."
                    : "Links de mapa podem preencher latitude e longitude automaticamente."
                }
              />

              <Field
                label="Latitude"
                value={latitude}
                onChange={setLatitude}
                placeholder="-23.5505"
              />

              <Field
                label="Longitude"
                value={longitude}
                onChange={setLongitude}
                placeholder="-46.6333"
              />
            </>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 md:col-span-2">
              <p className="text-lg font-black text-emerald-950">
                Evento online
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
                Para evento online, endereço físico, CEP, URL do mapa e
                coordenadas não são obrigatórios.
              </p>
            </div>
          )}

          <div className="md:col-span-2">
            <TextAreaField
              label={
                isOnlineEvent ? "Instruções de acesso online" : "Instruções de acesso"
              }
              value={instructions}
              onChange={setInstructions}
              placeholder={
                isOnlineEvent
                  ? "Link, plataforma, horário de liberação, senha ou instruções."
                  : "Estacionamento, entrada, portões, retirada de credencial..."
              }
            />
          </div>
        </div>
      </StepShell>
    );
  }

  function renderReviewStep() {
    return (
      <StepShell
        eyebrow="Etapa 9"
        title="Revisão e salvar"
        description="Confira os principais dados antes de criar o evento."
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="overflow-hidden rounded-[1.5rem] bg-slate-950">
              {mainPreviewImage ? (
                mainPreviewImage.toLowerCase().includes(".mp4") ? (
                  <video
                    src={normalizeMediaUrl(mainPreviewImage)}
                    className="h-64 w-full object-cover"
                    controls
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizeMediaUrl(mainPreviewImage)}
                    alt={name || "Prévia do evento"}
                    className="h-64 w-full object-cover"
                  />
                )
              ) : (
                <div className="flex h-64 items-center justify-center text-center">
                  <div>
                    <p className="text-xl font-black text-white">
                      {name || "Nome do evento"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-400">
                      Nenhum arquivo principal adicionado.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-600">
                {getCategoryLabel(category)}
              </p>
              <h3 className="mt-2 text-3xl font-black text-slate-950">
                {name || "Evento sem nome"}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {shortDescription ||
                  summary ||
                  description ||
                  "Sem descrição curta."}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <MiniStat label="Data" value={formatDatePreview(primaryEventDate)} />
              <MiniStat label="Capacidade" value={capacity || "A definir"} />
              <MiniStat label="Ingressos" value={validTicketTypes.length} />
              <MiniStat label="Quantidade" value={totalTicketQuantity} />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Produtora
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {selectedOrganizer?.tradeName ||
                  selectedOrganizer?.legalName ||
                  "Produtora não selecionada"}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Ocupação
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {selectedOccupancyPreset.label}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {selectedOccupancyPreset.description}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Local
              </p>
              <p className="mt-2 text-lg font-black text-slate-950">
                {venueName || "Local não informado"}
              </p>
              <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                {isOnlineEvent
                  ? "Evento online"
                  : [city, stateName].filter(Boolean).join(" - ") ||
                    "Cidade/estado não informados"}
              </p>
            </div>

            <div
              className={`rounded-3xl border p-5 ${
                sectorCapacityErrorMessage ||
                ticketLotPriceErrorMessage ||
                ticketDateErrorMessage ||
                mediaErrorMessage ||
                sessionCapacityErrorMessage
                  ? "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Resumo técnico
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                <li>Datas: {sessions.length}</li>
                <li>Soma das datas: {sessionCapacityTotal}</li>
                <li>
                  {isOpenAdmissionOnly
                    ? "Área única: sim"
                    : `Setores: ${sectors.length}`}
                </li>
                <li>Capacidade geral: {capacity || "0"}</li>
                <li>Soma dos setores: {sectorCapacityTotal}</li>
                <li>Itens no mapa: {mapObjects.length}</li>
                <li>Galeria: {galleryPreview.length} arquivo(s)</li>
                <li>Status: publicado</li>
                <li>Visibilidade: público</li>
              </ul>

              {[
                sessionCapacityErrorMessage,
                mediaErrorMessage,
                sectorCapacityErrorMessage,
                ticketLotPriceErrorMessage,
                ticketDateErrorMessage,
              ]
                .filter(Boolean)
                .map((message) => (
                  <p key={message} className="mt-4 text-sm font-black text-rose-700">
                    {message}
                  </p>
                ))}
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderCurrentStep() {
    const currentStep = stepDefinitions[activeStepIndex];

    if (!currentStep) return null;

    if (currentStep.id === "type") return renderTypeStep();
    if (currentStep.id === "basic") return renderBasicStep();
    if (currentStep.id === "sessions") return renderSessionsStep();
    if (currentStep.id === "extras") return renderExtrasStep();
    if (currentStep.id === "sectors") return renderSectorsStep();
    if (currentStep.id === "map") return renderMapStep();
    if (currentStep.id === "tickets") return renderTicketsStep();
    if (currentStep.id === "location") return renderLocationStep();
    if (currentStep.id === "review") return renderReviewStep();

    return null;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-950 md:px-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              href="/admin/events"
              className="text-sm font-black text-sky-700 hover:text-sky-900"
            >
              ← Voltar para eventos
            </Link>
            <h1 className="mt-3 text-3xl font-black text-slate-950 md:text-4xl">
              Criar evento
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Criação guiada com categoria, ocupação personalizada, datas,
              imagens, setores, mapa, ingressos e local.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Etapa atual
            </p>
            <p className="mt-1 text-lg font-black">
              {activeStepIndex + 1} de {stepDefinitions.length}
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-9">
            {stepDefinitions.map((step, index) => {
              const active = index === activeStepIndex;
              const completed =
                step.id === "review" ? false : stepCompletion[step.id];
              const accessible = isStepAccessible(index);

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? "border-sky-500 bg-sky-50"
                      : completed
                        ? "border-emerald-200 bg-emerald-50"
                        : accessible
                          ? "border-slate-200 bg-white hover:bg-slate-50"
                          : "border-slate-100 bg-slate-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                        active
                          ? "bg-sky-600 text-white"
                          : completed
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </span>
                  </div>

                  <p className="mt-3 text-xs font-black text-slate-950">
                    {step.title}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                    {step.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {renderCurrentStep()}

        <div className="mt-6 flex flex-col-reverse justify-between gap-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
          <button
            type="button"
            onClick={goPreviousStep}
            disabled={activeStepIndex === 0 || saving}
            className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Voltar
          </button>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Link
              href="/admin/events"
              className="rounded-2xl border border-slate-300 px-5 py-3 text-center text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Cancelar
            </Link>

            {activeStepIndex < stepDefinitions.length - 1 ? (
              <button
                type="button"
                onClick={goNextStep}
                disabled={saving}
                className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Continuar
              </button>
            ) : (
              <button
                type="submit"
                disabled={
                  saving ||
                  Boolean(sessionCapacityErrorMessage) ||
                  Boolean(mediaErrorMessage) ||
                  Boolean(sectorCapacityErrorMessage) ||
                  Boolean(ticketLotPriceErrorMessage) ||
                  Boolean(ticketDateErrorMessage)
                }
                className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Criar evento"}
              </button>
            )}
          </div>
        </div>
      </form>
    </main>
  );
}