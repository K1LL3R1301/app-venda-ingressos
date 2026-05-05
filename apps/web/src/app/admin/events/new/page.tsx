"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
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
  feeAmount: string;
  feeDescription: string;
  benefitDescription: string;
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
  | "sectors"
  | "map"
  | "tickets"
  | "location"
  | "extras"
  | "review";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

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

function toIsoOrUndefined(value: string) {
  if (!value) return undefined;
  return new Date(value).toISOString();
}

function toNumberOrUndefined(value: string) {
  if (!value) return undefined;

  const parsed = Number(value.replace(",", "."));

  return Number.isNaN(parsed) ? undefined : parsed;
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

function getCategoryPreset(category: EventCategory): CategoryPreset {
  if (category === "TEATROS_ESPETACULOS") {
    return {
      label: "Teatro e espetáculo",
      description: "Criação focada em sessões e cadeiras numeradas.",
      defaultSectorName: "Cadeiras numeradas",
      defaultSectorType: "NUMBERED_SEATS",
      sessionLabel: "Sessão",
    };
  }

  if (category === "CONGRESSOS") {
    return {
      label: "Congresso e palestra",
      description: "Criação focada em auditórios, salas, cadeiras ou mesas.",
      defaultSectorName: "Auditório principal",
      defaultSectorType: "AUDITORIUM",
      sessionLabel: "Atividade",
    };
  }

  if (category === "GASTRONOMIA") {
    return {
      label: "Gastronomia, bar e restaurante",
      description: "Criação focada em mesas e ingressos avulsos.",
      defaultSectorName: "Salão principal",
      defaultSectorType: "DINING_ROOM",
      sessionLabel: "Horário",
    };
  }

  if (category === "STAND_UP_COMEDY") {
    return {
      label: "Stand-up comedy",
      description: "Criação focada em cadeiras numeradas ou mesas.",
      defaultSectorName: "Área principal",
      defaultSectorType: "MAIN_AREA",
      sessionLabel: "Sessão",
    };
  }

  if (category === "PASSEIOS_TOURS") {
    return {
      label: "Passeios e tours",
      description: "Criação focada em ingressos de evento aberto.",
      defaultSectorName: "Entrada geral",
      defaultSectorType: "OPEN_ADMISSION",
      sessionLabel: "Turma",
    };
  }

  if (category === "ESPORTES") {
    return {
      label: "Evento esportivo",
      description: "Criação focada em ingressos para evento aberto.",
      defaultSectorName: "Entrada geral",
      defaultSectorType: "OPEN_ADMISSION",
      sessionLabel: "Partida",
    };
  }

  if (category === "INFANTIL") {
    return {
      label: "Evento infantil",
      description: "Criação para ingresso aberto, plateia ou cadeiras.",
      defaultSectorName: "Entrada geral",
      defaultSectorType: "OPEN_ADMISSION",
      sessionLabel: "Sessão",
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
    name: index === 0 ? "Data principal" : `Data ${index + 1}`,
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
    name: index === 0 ? "Inteira" : "",
    lotLabel: `${index + 1}º Lote`,
    description: "",
    price: "",
    quantity: "100",
    salesStartAt: "",
    salesEndAt: "",
    minPerOrder: "1",
    maxPerOrder: "",
    displayOrder: String(index),
    feeAmount: "",
    feeDescription: "",
    benefitDescription: "",
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
  const parsed = Number(value.replace(",", "."));

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

function getNumericValue(value: string) {
  const parsed = Number(value);

  return Number.isNaN(parsed) ? 0 : parsed;
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
        min={min}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: boolean;
  helper?: string;
  minHeight?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${textareaClass(error)} ${minHeight}`}
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="text-rose-600"> *</span> : null}
      </label>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass()}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
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

function ImageUploadField({
  label,
  helper,
  value,
  kind,
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
  onChange: (value: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      alert("Faça login novamente para enviar imagens.");
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
            : "Erro ao enviar imagem",
        );
        return;
      }

      const uploadedUrl =
        result?.url || result?.publicUrl || result?.path || result?.fileUrl;

      if (!uploadedUrl) {
        alert("Upload concluído, mas a API não retornou a URL da imagem.");
        return;
      }

      onChange(uploadedUrl);
    } catch (error) {
      console.error("UPLOAD IMAGE ERROR:", error);
      alert("Erro ao conectar com a API de upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <label className="block text-sm font-black text-slate-800">{label}</label>
      {helper ? (
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
          {helper}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleUpload(file);
            }
          }}
          className="block w-full cursor-pointer rounded-2xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 file:mr-4 file:h-[48px] file:border-0 file:bg-slate-950 file:px-5 file:text-sm file:font-black file:text-white hover:file:bg-sky-700"
        />

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ou cole uma URL manualmente"
          className={inputClass()}
        />

        {uploading ? (
          <p className="text-xs font-black text-sky-600">Enviando imagem...</p>
        ) : null}

        {value ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="h-40 w-full object-cover" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectorColorPicker({
  value,
  onChange,
}: {
  value: string;
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

          return (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={`flex h-11 items-center justify-center rounded-2xl border transition ${
                active
                  ? "border-slate-950 ring-4 ring-slate-200"
                  : "border-slate-200 hover:border-slate-400"
              }`}
              title={color.label}
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
  const [status, setStatus] = useState("DRAFT");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [eventDate, setEventDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saleStartAt, setSaleStartAt] = useState("");
  const [saleEndAt, setSaleEndAt] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [featured, setFeatured] = useState(false);
  const [highlightTag, setHighlightTag] = useState("");
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
  const [seatRows, setSeatRows] = useState("8");
  const [seatColumns, setSeatColumns] = useState("12");
  const [tableCount, setTableCount] = useState("20");
  const [seatsPerTable, setSeatsPerTable] = useState("4");
  const [selectedSeatMapSectorId, setSelectedSeatMapSectorId] = useState("");
  const [selectedTableMapSectorId, setSelectedTableMapSectorId] = useState("");

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
  const showMapBuilder = selectedOccupancyPreset.requiresMap;
  const isOpenAdmissionOnly = occupancyPresetKey === "OPEN_ADMISSION";

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

  const sectorCapacityErrorMessage = useMemo(() => {
    if (hasSectorOverCapacity) {
      return "Nenhum setor pode ter capacidade maior que a capacidade geral do evento.";
    }

    if (hasSectorTotalOverCapacity) {
      return "A soma das capacidades dos setores não pode ultrapassar a capacidade geral do evento.";
    }

    return "";
  }, [hasSectorOverCapacity, hasSectorTotalOverCapacity]);

  const seatMapSectors = useMemo(() => {
    return sectors.filter((sector) => sector.sectorKind === "NUMBERED_SEATS");
  }, [sectors]);

  const tableMapSectors = useMemo(() => {
    return sectors.filter((sector) => sector.sectorKind === "TABLES");
  }, [sectors]);

  const primarySessionDate = sessions.find((session) => session.startsAt)
    ?.startsAt;
  const primaryEventDate = eventDate || primarySessionDate || "";

  const validTicketTypes = useMemo(() => {
    return ticketTypes.filter(
      (ticketType) =>
        ticketType.name.trim() &&
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

  const stepCompletion: Record<StepId, boolean> = {
    type: Boolean(category && occupancyPresetKey && occupancyMode),
    basic: Boolean(organizerId && name.trim() && Number(capacity) > 0),
    sessions: sessions.some((session) => session.name.trim() && session.startsAt),
    sectors:
      !hasSectorOverCapacity &&
      !hasSectorTotalOverCapacity &&
      (isOpenAdmissionOnly
        ? sectors.length === 1
        : sectors.some((sector) => sector.name.trim())),
    map: !showMapBuilder || mapObjects.length > 0,
    tickets: validTicketTypes.length > 0,
    location: Boolean(venueName.trim() && city.trim() && stateName.trim()),
    extras: true,
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
      title: `Datas / ${preset.sessionLabel.toLowerCase()}s`,
      description: "Uma ou várias datas do evento.",
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
      description: "Cadeiras numeradas ou mesas marcadas.",
      optional: !showMapBuilder,
    },
    {
      id: "tickets",
      title: "Ingressos / lotes",
      description: "Preços, quantidades e vínculos.",
    },
    {
      id: "location",
      title: "Local e acesso",
      description: "Endereço, cidade e instruções.",
    },
    {
      id: "extras",
      title: "Imagens e políticas",
      description: "Uploads, textos extras e regras.",
      optional: true,
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
    sectors: submitAttempted && !stepCompletion.sectors,
    map: submitAttempted && !stepCompletion.map,
    tickets: submitAttempted && !stepCompletion.tickets,
    venueName: submitAttempted && !venueName.trim(),
    city: submitAttempted && !city.trim(),
    stateName: submitAttempted && !stateName.trim(),
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
            organizersList[0].tradeName || organizersList[0].legalName || "",
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
    setSelectedSeatMapSectorId("");
    setSelectedTableMapSectorId("");
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
    setSelectedSeatMapSectorId("");
    setSelectedTableMapSectorId("");
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

    if (currentStep.id === "sectors" && sectorCapacityErrorMessage) {
      alert(sectorCapacityErrorMessage);
      return false;
    }

    const messages: Record<StepId, string> = {
      type: "Escolha a categoria e o tipo de ocupação do evento.",
      basic: "Preencha produtora, nome do evento e capacidade geral.",
      sessions: "Cadastre pelo menos uma data ou sessão com início.",
      sectors: "Cadastre pelo menos um setor ou área válido.",
      map: "Gere o mapa de cadeiras ou mesas para continuar.",
      tickets:
        "Cadastre pelo menos um ingresso válido com nome, preço e quantidade.",
      location: "Preencha local, cidade e estado.",
      extras: "",
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

  function addSession() {
    setSessions((currentSessions) => [
      ...currentSessions,
      createDefaultSession(currentSessions.length),
    ]);
  }

  function updateSession<K extends keyof EventSessionFormItem>(
    localId: string,
    field: K,
    value: EventSessionFormItem[K],
  ) {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.localId === localId ? { ...session, [field]: value } : session,
      ),
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

    setSectors((currentSectors) => [
      ...currentSectors,
      createDefaultSector(
        category,
        selectedOccupancyPreset,
        currentSectors.length,
        selectedOccupancyPreset.defaultSectorKind,
      ),
    ]);
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

    setMapObjects((currentObjects) =>
      currentObjects.filter((object) => object.venueSectorLocalId !== localId),
    );
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

  function addTicketType() {
    const firstSessionId = sessions[0]?.localId || "";
    const firstSectorId = isOpenAdmissionOnly ? "" : sectors[0]?.localId || "";
    const firstSector = sectors.find((sector) => sector.localId === firstSectorId);

    setTicketTypes((currentTicketTypes) => [
      ...currentTicketTypes,
      createDefaultTicketType(
        currentTicketTypes.length,
        firstSessionId,
        firstSectorId,
        firstSector?.occupancyMode || occupancyMode,
      ),
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

        if (field === "venueSectorLocalId") {
          const linkedSector = sectors.find((sector) => sector.localId === value);

          return {
            ...ticketType,
            venueSectorLocalId: String(value),
            occupancyMode: linkedSector?.occupancyMode || occupancyMode,
          };
        }

        return { ...ticketType, [field]: value };
      }),
    );
  }  function removeTicketType(localId: string) {
    setTicketTypes((currentTicketTypes) => {
      if (currentTicketTypes.length <= 1) return currentTicketTypes;

      return currentTicketTypes.filter(
        (ticketType) => ticketType.localId !== localId,
      );
    });
  }

  function generateSeatMap() {
    if (!allowSeatMap) {
      alert("Este tipo de evento não usa cadeiras numeradas.");
      return;
    }

    const targetSectorId = selectedSeatMapSectorId || seatMapSectors[0]?.localId;

    if (!targetSectorId) {
      alert(
        "Crie ou selecione um setor de cadeiras numeradas antes de gerar o mapa.",
      );
      return;
    }

    const rows = Math.max(1, Number.parseInt(seatRows, 10) || 1);
    const columns = Math.max(1, Number.parseInt(seatColumns, 10) || 1);
    const createdObjects: SeatMapObjectFormItem[] = [];
    const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const rowLabel =
        rowIndex < rowLetters.length
          ? rowLetters[rowIndex]
          : `R${rowIndex + 1}`;

      for (let columnIndex = 0; columnIndex < columns; columnIndex += 1) {
        const number = String(columnIndex + 1);
        const code = `${rowLabel}${number}`;

        createdObjects.push({
          localId: newLocalId("seat"),
          venueSectorLocalId: targetSectorId,
          code,
          label: `Cadeira ${code}`,
          type: "SEAT",
          row: rowLabel,
          number,
          capacity: "1",
          x: 40 + columnIndex * 52,
          y: 40 + rowIndex * 48,
          width: 38,
          height: 38,
          rotation: 0,
          status: "AVAILABLE",
        });
      }
    }

    setMapObjects((currentObjects) => [
      ...currentObjects.filter(
        (object) => object.venueSectorLocalId !== targetSectorId,
      ),
      ...createdObjects,
    ]);
  }

  function generateTableMap() {
    if (!allowTableMap) {
      alert("Este tipo de evento não usa mesas marcadas.");
      return;
    }

    const targetSectorId =
      selectedTableMapSectorId || tableMapSectors[0]?.localId;

    if (!targetSectorId) {
      alert("Crie ou selecione um setor de mesas antes de gerar o mapa.");
      return;
    }

    const count = Math.max(1, Number.parseInt(tableCount, 10) || 1);
    const capacityPerTable = Math.max(
      1,
      Number.parseInt(seatsPerTable, 10) || 1,
    );
    const createdObjects: SeatMapObjectFormItem[] = [];

    for (let index = 0; index < count; index += 1) {
      const number = String(index + 1);
      const code = `M${number.padStart(2, "0")}`;

      createdObjects.push({
        localId: newLocalId("table"),
        venueSectorLocalId: targetSectorId,
        code,
        label: `Mesa ${number}`,
        type: "TABLE",
        row: "",
        number,
        capacity: String(capacityPerTable),
        x: 48 + (index % 5) * 120,
        y: 48 + Math.floor(index / 5) * 110,
        width: 76,
        height: 76,
        rotation: 0,
        status: "AVAILABLE",
      });
    }

    setMapObjects((currentObjects) => [
      ...currentObjects.filter(
        (object) => object.venueSectorLocalId !== targetSectorId,
      ),
      ...createdObjects,
    ]);
  }

  function clearMap() {
    if (confirm("Deseja limpar o mapa gerado?")) {
      setMapObjects([]);
    }
  }

  function buildPayload() {
    const firstSessionStartsAt = sessions.find((session) => session.startsAt)
      ?.startsAt;
    const resolvedStartDate = startDate || firstSessionStartsAt || eventDate;

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
      eventDate: toIsoOrUndefined(eventDate || resolvedStartDate),
      startDate: toIsoOrUndefined(resolvedStartDate),
      endDate: toIsoOrUndefined(endDate),
      saleStartAt: toIsoOrUndefined(saleStartAt),
      saleEndAt: toIsoOrUndefined(saleEndAt),
      capacity: toIntOrUndefined(capacity),
      featured,
      highlightTag: normalizeText(highlightTag),
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
        latitude: toNumberOrUndefined(latitude),
        longitude: toNumberOrUndefined(longitude),
      },
      media: {
        coverImageUrl: normalizeText(coverImageUrl),
        bannerImageUrl: normalizeText(bannerImageUrl),
        thumbnailUrl: normalizeText(thumbnailUrl),
        mobileBannerUrl: normalizeText(mobileBannerUrl),
        sectorMapImageUrl: normalizeText(sectorMapImageUrl),
        gallery: galleryPreview,
      },
      policy: {
        ageRating: normalizeText(ageRating),
        refundPolicy: normalizeText(refundPolicy),
        halfEntryPolicy: normalizeText(halfEntryPolicy),
        transferPolicy: normalizeText(transferPolicy),
        termsNotes: normalizeText(termsNotes),
        entryRules: normalizeText(entryRules),
        documentRules: normalizeText(documentRules),
      },
      sessions: sessions
        .filter((session) => session.name.trim() || session.startsAt)
        .map((session, index) => ({
          localId: session.localId,
          name: session.name.trim() || `${preset.sessionLabel} ${index + 1}`,
          description: normalizeText(session.description),
          startsAt: toIsoOrUndefined(session.startsAt),
          endsAt: toIsoOrUndefined(session.endsAt),
          capacity: toIntOrUndefined(session.capacity),
          status: session.status,
          displayOrder: toIntOrUndefined(session.displayOrder) ?? index,
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
          displayOrder: toIntOrUndefined(sector.displayOrder) ?? index,
          color: normalizeText(sector.color),
          gateName: normalizeText(sector.gateName),
        })),
      venueLayouts: showMapBuilder
        ? [
            {
              localId: "layout-main",
              name: allowSeatMap
                ? "Mapa de cadeiras numeradas"
                : "Mapa de mesas",
              description: selectedOccupancyPreset.label,
              occupancyMode,
              width: 900,
              height: 640,
              isDefault: true,
              status: "ACTIVE",
            },
          ]
        : [],
      seatMapObjects: showMapBuilder
        ? mapObjects.map((object) => ({
            localId: object.localId,
            venueLayoutLocalId: "layout-main",
            venueSectorLocalId: object.venueSectorLocalId,
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
            metadata: object.metadata,
          }))
        : [],
      ticketTypes: ticketTypes
        .filter((ticketType) => ticketType.name.trim())
        .map((ticketType, index) => {
          const linkedSector = sectors.find(
            (sector) => sector.localId === ticketType.venueSectorLocalId,
          );

          return {
            localId: ticketType.localId,
            eventSessionLocalId: normalizeText(ticketType.eventSessionLocalId),
            venueSectorLocalId: normalizeText(ticketType.venueSectorLocalId),
            occupancyMode:
              linkedSector?.occupancyMode || ticketType.occupancyMode,
            name: ticketType.name.trim(),
            lotLabel: normalizeText(ticketType.lotLabel),
            description: normalizeText(ticketType.description),
            price: toNumberOrUndefined(ticketType.price),
            quantity: toIntOrUndefined(ticketType.quantity),
            salesStartAt: toIsoOrUndefined(ticketType.salesStartAt),
            salesEndAt: toIsoOrUndefined(ticketType.salesEndAt),
            minPerOrder: toIntOrUndefined(ticketType.minPerOrder),
            maxPerOrder: toIntOrUndefined(ticketType.maxPerOrder),
            displayOrder: toIntOrUndefined(ticketType.displayOrder) ?? index,
            feeAmount: toNumberOrUndefined(ticketType.feeAmount),
            feeDescription: normalizeText(ticketType.feeDescription),
            benefitDescription: normalizeText(ticketType.benefitDescription),
            isHidden: ticketType.isHidden,
            status: ticketType.status,
          };
        }),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);

    if (sectorCapacityErrorMessage) {
      setActiveStepIndex(
        stepDefinitions.findIndex((step) => step.id === "sectors"),
      );
      alert(sectorCapacityErrorMessage);
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

                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-black">
                      <span
                        className={`rounded-2xl px-3 py-2 ${
                          option.requiresMap
                            ? "bg-amber-300 text-amber-950"
                            : "bg-emerald-300 text-emerald-950"
                        }`}
                      >
                        {option.requiresMap ? "Com mapa" : "Sem mapa"}
                      </span>
                      <span className="rounded-2xl bg-white/15 px-3 py-2 text-white">
                        {option.supportsMultipleSectors
                          ? "Setores"
                          : "Área única"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MiniStat
              label="Área livre / plateia"
              value={
                selectedOccupancyPreset.usesPlateia ||
                selectedOccupancyPreset.usesOpenAdmission
                  ? "Sim"
                  : "Não"
              }
            />
            <MiniStat
              label="Cadeiras numeradas"
              value={selectedOccupancyPreset.usesNumberedSeats ? "Sim" : "Não"}
            />
            <MiniStat
              label="Mesas marcadas"
              value={selectedOccupancyPreset.usesTables ? "Sim" : "Não"}
            />
            <MiniStat
              label="Setores separados"
              value={
                selectedOccupancyPreset.supportsMultipleSectors ? "Sim" : "Não"
              }
            />
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
        description="Defina a produtora, o nome, status, visibilidade e informações principais do evento."
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
            type="number"
            min={1}
            required
            error={requiredErrors.capacity}
            helper="A soma dos setores não pode ultrapassar esta capacidade."
          />

          <SelectField
            label="Status inicial"
            value={status}
            onChange={setStatus}
            options={[
              { label: "Rascunho", value: "DRAFT" },
              { label: "Publicado", value: "PUBLISHED" },
              { label: "Pausado", value: "PAUSED" },
              { label: "Encerrado", value: "ENDED" },
            ]}
          />

          <SelectField
            label="Visibilidade"
            value={visibility}
            onChange={setVisibility}
            options={[
              { label: "Público", value: "PUBLIC" },
              { label: "Privado", value: "PRIVATE" },
              { label: "Não listado", value: "UNLISTED" },
            ]}
          />

          <Field
            label="Fuso horário"
            value={timezone}
            onChange={setTimezone}
            placeholder="America/Sao_Paulo"
          />

          <Field
            label="Tag de destaque"
            value={highlightTag}
            onChange={setHighlightTag}
            placeholder="Ex: Últimos ingressos"
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

          <div className="md:col-span-2">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-700">
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
                className="h-5 w-5 rounded border-slate-300"
              />
              Destacar evento na área pública
            </label>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderSessionsStep() {
    return (
      <StepShell
        eyebrow="Etapa 3"
        title={`Datas / ${preset.sessionLabel}s`}
        description="Cadastre uma ou mais datas. Cada ingresso pode ser vinculado a uma sessão específica."
      >
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-3">
            <Field
              label="Data principal"
              value={eventDate}
              onChange={setEventDate}
              type="datetime-local"
              helper="Opcional. Pode ser preenchida automaticamente pela primeira sessão."
            />
            <Field
              label="Início geral"
              value={startDate}
              onChange={setStartDate}
              type="datetime-local"
            />
            <Field
              label="Fim geral"
              value={endDate}
              onChange={setEndDate}
              type="datetime-local"
            />
          </div>

          {requiredErrors.sessions ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
              Cadastre pelo menos uma data ou sessão com início.
            </div>
          ) : null}

          <div className="space-y-4">
            {sessions.map((session, index) => (
              <div
                key={session.localId}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      {preset.sessionLabel} {index + 1}
                    </p>
                    <h3 className="text-lg font-black text-slate-950">
                      {session.name || `${preset.sessionLabel} ${index + 1}`}
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
                    label="Nome"
                    value={session.name}
                    onChange={(value) =>
                      updateSession(session.localId, "name", value)
                    }
                    placeholder="Ex: Sábado 20h"
                    required
                  />
                  <Field
                    label="Capacidade da sessão"
                    value={session.capacity}
                    onChange={(value) =>
                      updateSession(session.localId, "capacity", value)
                    }
                    type="number"
                    min={1}
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
                  />
                  <SelectField
                    label="Status"
                    value={session.status}
                    onChange={(value) =>
                      updateSession(session.localId, "status", value)
                    }
                    options={[
                      { label: "Ativa", value: "ACTIVE" },
                      { label: "Pausada", value: "PAUSED" },
                      { label: "Cancelada", value: "CANCELED" },
                      { label: "Encerrada", value: "ENDED" },
                    ]}
                  />
                  <Field
                    label="Ordem de exibição"
                    value={session.displayOrder}
                    onChange={(value) =>
                      updateSession(session.localId, "displayOrder", value)
                    }
                    type="number"
                    helper="Use 0 para aparecer primeiro, 1 para aparecer depois, e assim por diante."
                  />
                  <div className="md:col-span-2">
                    <TextAreaField
                      label="Descrição"
                      value={session.description}
                      onChange={(value) =>
                        updateSession(session.localId, "description", value)
                      }
                      placeholder="Informações específicas desta data ou sessão."
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
            + Adicionar outra {preset.sessionLabel.toLowerCase()}
          </button>
        </div>
      </StepShell>
    );
  }

  function renderSectorsStep() {
    return (
      <StepShell
        eyebrow="Etapa 4"
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
          ) : (
            <p className="mt-4 text-sm font-semibold text-slate-500">
              A soma das capacidades dos setores deve ficar dentro da capacidade
              geral configurada na etapa de dados principais.
            </p>
          )}
        </div>

        {isOpenAdmissionOnly ? (
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-xl font-black text-emerald-950">
              Evento aberto, sem setores separados.
            </p>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-emerald-800">
              Todos os ingressos compartilham a mesma capacidade geral. Use a
              etapa de ingressos para criar lotes, tipos de ingresso e preços.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field
                label="Tipo do espaço"
                value="Livre / evento aberto"
                onChange={() => undefined}
                disabled
                helper="Travado porque este tipo não usa setores separados."
              />
              <Field
                label="Nome da área"
                value={sectors[0]?.name || "Livre / evento aberto"}
                onChange={(value) =>
                  updateSector(sectors[0].localId, "name", value)
                }
                helper="Este nome é apenas interno."
              />
              <Field
                label="Capacidade da área"
                value={sectors[0]?.capacity || ""}
                onChange={(value) =>
                  updateSector(sectors[0].localId, "capacity", value)
                }
                type="number"
                min={1}
                error={Boolean(sectorCapacityErrorMessage)}
                helper="Opcional. Se vazio, usa a capacidade geral do evento."
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
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-sky-700">
                          {currentSectorKind.label}
                        </p>
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
                          helper="Travado porque este modelo permite apenas este tipo de setor."
                        />
                      )}

                      <Field
                        label="Capacidade"
                        value={sector.capacity}
                        onChange={(value) =>
                          updateSector(sector.localId, "capacity", value)
                        }
                        type="number"
                        min={1}
                        error={
                          sectorHasCapacityError || hasSectorTotalOverCapacity
                        }
                        helper={
                          sectorHasCapacityError
                            ? "Este setor excede a capacidade geral."
                            : "A soma dos setores não pode passar da capacidade geral."
                        }
                      />

                      <SectorColorPicker
                        value={sector.color}
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
                      <Field
                        label="Ordem de exibição"
                        value={sector.displayOrder}
                        onChange={(value) =>
                          updateSector(sector.localId, "displayOrder", value)
                        }
                        type="number"
                        helper="Use 0 para aparecer primeiro, 1 para aparecer depois."
                      />
                      <div className="md:col-span-2">
                        <TextAreaField
                          label="Descrição"
                          value={sector.description}
                          onChange={(value) =>
                            updateSector(sector.localId, "description", value)
                          }
                          placeholder="Detalhes, regras e observações do setor."
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
    return (
      <StepShell
        eyebrow="Etapa 5"
        title="Mapa do evento"
        description={
          showMapBuilder
            ? "Gere o mapa inicial somente para setores de cadeiras numeradas ou mesas."
            : "Este tipo de ocupação não precisa de mapa. Você pode seguir para ingressos."
        }
      >
        {!showMapBuilder ? (
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8">
            <p className="text-xl font-black text-emerald-950">
              Mapa desativado para este tipo de evento.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-emerald-800">
              Como o tipo escolhido é {selectedOccupancyPreset.label}, a venda
              será feita por quantidade, sem cadeira ou mesa marcada.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {requiredErrors.map ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
                Gere o mapa de cadeiras ou mesas para continuar.
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              {allowSeatMap ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-black text-slate-950">
                    Gerar cadeiras numeradas
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Escolha o setor de cadeiras e gere uma grade inicial.
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Setor de cadeiras"
                      value={
                        selectedSeatMapSectorId ||
                        seatMapSectors[0]?.localId ||
                        ""
                      }
                      onChange={setSelectedSeatMapSectorId}
                      options={
                        seatMapSectors.length > 0
                          ? seatMapSectors.map((sector) => ({
                              value: sector.localId,
                              label: sector.name,
                            }))
                          : [
                              {
                                value: "",
                                label: "Nenhum setor de cadeiras criado",
                              },
                            ]
                      }
                    />
                    <Field
                      label="Fileiras"
                      value={seatRows}
                      onChange={setSeatRows}
                      type="number"
                      min={1}
                    />
                    <Field
                      label="Cadeiras por fileira"
                      value={seatColumns}
                      onChange={setSeatColumns}
                      type="number"
                      min={1}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={generateSeatMap}
                    className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
                  >
                    Gerar mapa de cadeiras
                  </button>
                </div>
              ) : null}

              {allowTableMap ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-black text-slate-950">
                    Gerar mesas
                  </h3>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    Escolha o setor de mesas e gere um mapa inicial.
                  </p>

                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Setor de mesas"
                      value={
                        selectedTableMapSectorId ||
                        tableMapSectors[0]?.localId ||
                        ""
                      }
                      onChange={setSelectedTableMapSectorId}
                      options={
                        tableMapSectors.length > 0
                          ? tableMapSectors.map((sector) => ({
                              value: sector.localId,
                              label: sector.name,
                            }))
                          : [
                              {
                                value: "",
                                label: "Nenhum setor de mesas criado",
                              },
                            ]
                      }
                    />
                    <Field
                      label="Quantidade de mesas"
                      value={tableCount}
                      onChange={setTableCount}
                      type="number"
                      min={1}
                    />
                    <Field
                      label="Lugares por mesa"
                      value={seatsPerTable}
                      onChange={setSeatsPerTable}
                      type="number"
                      min={1}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={generateTableMap}
                    className="mt-5 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-sky-700"
                  >
                    Gerar mapa de mesas
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-950">
                    Prévia do mapa
                  </h3>
                  <p className="text-sm font-semibold text-slate-500">
                    {mapObjects.length} objeto
                    {mapObjects.length === 1 ? "" : "s"} gerado
                    {mapObjects.length === 1 ? "" : "s"}.
                  </p>
                </div>

                {mapObjects.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearMap}
                    className="rounded-full border border-rose-200 px-4 py-2 text-xs font-black text-rose-600 hover:bg-rose-50"
                  >
                    Limpar mapa
                  </button>
                ) : null}
              </div>

              <div className="relative min-h-[360px] overflow-auto rounded-3xl bg-slate-100 p-6">
                {mapObjects.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">
                    <div>
                      <p className="text-lg font-black text-slate-950">
                        Nenhum item no mapa ainda
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Use o gerador acima para criar cadeiras ou mesas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-[620px] w-[900px] rounded-3xl bg-white">
                    {mapObjects.map((object) => (
                      <div
                        key={object.localId}
                        className={`absolute flex items-center justify-center border text-[10px] font-black ${
                          object.type === "TABLE"
                            ? "rounded-full border-amber-300 bg-amber-100 text-amber-950"
                            : "rounded-xl border-sky-300 bg-sky-100 text-sky-950"
                        }`}
                        style={{
                          left: object.x,
                          top: object.y,
                          width: object.width,
                          height: object.height,
                          transform: `rotate(${object.rotation}deg)`,
                        }}
                        title={object.label}
                      >
                        {object.code}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </StepShell>
    );
  }

  function renderTicketsStep() {
    return (
      <StepShell
        eyebrow="Etapa 6"
        title="Ingressos / lotes"
        description="Configure preços, quantidades e vínculos com sessão e setor."
      >
        {requiredErrors.tickets ? (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-black text-rose-700">
            Cadastre pelo menos um ingresso válido com nome, preço e quantidade.
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MiniStat label="Tipos válidos" value={validTicketTypes.length} />
          <MiniStat label="Quantidade total" value={totalTicketQuantity} />
          <MiniStat label="Modelo" value={selectedOccupancyPreset.label} />
        </div>

        <div className="space-y-4">
          {ticketTypes.map((ticketType, index) => (
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
                <Field
                  label="Nome"
                  value={ticketType.name}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "name", value)
                  }
                  placeholder="Ex: Inteira"
                  required
                />
                <Field
                  label="Lote"
                  value={ticketType.lotLabel}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "lotLabel", value)
                  }
                  placeholder="Ex: 1º Lote"
                />
                <Field
                  label="Preço"
                  value={ticketType.price}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "price", value)
                  }
                  placeholder="Ex: 50,00"
                  required
                />
                <Field
                  label="Quantidade"
                  value={ticketType.quantity}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "quantity", value)
                  }
                  type="number"
                  min={1}
                  required
                />
                <SelectField
                  label="Sessão"
                  value={ticketType.eventSessionLocalId}
                  onChange={(value) =>
                    updateTicketType(
                      ticketType.localId,
                      "eventSessionLocalId",
                      value,
                    )
                  }
                  options={[
                    { label: "Todas as sessões", value: "" },
                    ...sessions.map((session) => ({
                      value: session.localId,
                      label: session.name || "Sessão sem nome",
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
                />
                <Field
                  label="Fim das vendas"
                  value={ticketType.salesEndAt}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "salesEndAt", value)
                  }
                  type="datetime-local"
                />
                <Field
                  label="Mínimo por pedido"
                  value={ticketType.minPerOrder}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "minPerOrder", value)
                  }
                  type="number"
                  min={1}
                />
                <Field
                  label="Máximo por pedido"
                  value={ticketType.maxPerOrder}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "maxPerOrder", value)
                  }
                  type="number"
                  min={1}
                />
                <Field
                  label="Taxa"
                  value={ticketType.feeAmount}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "feeAmount", value)
                  }
                  placeholder="Ex: 5,00"
                />
                <SelectField
                  label="Status"
                  value={ticketType.status}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "status", value)
                  }
                  options={[
                    { label: "Ativo", value: "ACTIVE" },
                    { label: "Pausado", value: "PAUSED" },
                    { label: "Esgotado", value: "SOLD_OUT" },
                    { label: "Encerrado", value: "ENDED" },
                  ]}
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Descrição"
                    value={ticketType.description}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "description", value)
                    }
                    placeholder="Descrição do ingresso, lote ou benefício."
                  />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Benefícios"
                    value={ticketType.benefitDescription}
                    onChange={(value) =>
                      updateTicketType(
                        ticketType.localId,
                        "benefitDescription",
                        value,
                      )
                    }
                    placeholder="Ex: acesso à área VIP, open bar, kit..."
                  />
                </div>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={ticketType.isHidden}
                    onChange={(event) =>
                      updateTicketType(
                        ticketType.localId,
                        "isHidden",
                        event.target.checked,
                      )
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  Ocultar este ingresso na página pública
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-white p-4 text-sm font-black text-slate-700">
                Prévia: {ticketType.name || "Ingresso"} por{" "}
                {formatMoneyPreview(ticketType.price)}.
              </div>
            </div>
          ))}
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
        eyebrow="Etapa 7"
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
            label="Nome do local"
            value={venueName}
            onChange={setVenueName}
            placeholder="Ex: Teatro Municipal"
            required
            error={requiredErrors.venueName}
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
            placeholder="Bloco, sala, portão..."
          />

          <Field
            label="Bairro"
            value={neighborhood}
            onChange={setNeighborhood}
          />

          <Field
            label="Cidade"
            value={city}
            onChange={setCity}
            required
            error={requiredErrors.city}
          />

          <Field
            label="Estado"
            value={stateName}
            onChange={setStateName}
            placeholder="Ex: SP"
            required
            error={requiredErrors.stateName}
          />

          <Field
            label="CEP"
            value={zipCode}
            onChange={setZipCode}
            placeholder="00000-000"
          />

          <Field
            label="Referência"
            value={reference}
            onChange={setReference}
            placeholder="Ex: Em frente à praça"
          />

          <Field
            label="URL do mapa"
            value={mapUrl}
            onChange={setMapUrl}
            placeholder="Link do Google Maps"
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

          <div className="md:col-span-2">
            <TextAreaField
              label="Instruções de acesso"
              value={instructions}
              onChange={setInstructions}
              placeholder="Estacionamento, entrada, portões, retirada de credencial..."
            />
          </div>
        </div>
      </StepShell>
    );
  }

  function renderExtrasStep() {
    return (
      <StepShell
        eyebrow="Etapa 8"
        title="Imagens e políticas"
        description="Envie imagens do evento e configure regras importantes para o comprador."
      >
        <div className="grid gap-8">
          <div>
            <h3 className="text-lg font-black text-slate-950">
              Imagens do evento
            </h3>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <ImageUploadField
                label="Capa"
                helper="Imagem principal do evento."
                kind="cover"
                value={coverImageUrl}
                onChange={setCoverImageUrl}
              />
              <ImageUploadField
                label="Banner"
                helper="Imagem horizontal para hero e destaque."
                kind="banner"
                value={bannerImageUrl}
                onChange={setBannerImageUrl}
              />
              <ImageUploadField
                label="Thumbnail"
                helper="Imagem para cards e listas."
                kind="thumbnail"
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
              />
              <ImageUploadField
                label="Banner mobile"
                helper="Imagem otimizada para celular."
                kind="mobile-banner"
                value={mobileBannerUrl}
                onChange={setMobileBannerUrl}
              />

              {(allowSeatMap || allowTableMap) && (
                <ImageUploadField
                  label="Imagem do mapa/setor"
                  helper="Opcional. Pode ser usada como referência visual."
                  kind="sector-map"
                  value={sectorMapImageUrl}
                  onChange={setSectorMapImageUrl}
                />
              )}
            </div>

            <div className="mt-5">
              <TextAreaField
                label="Galeria"
                value={galleryText}
                onChange={setGalleryText}
                placeholder="Cole uma URL por linha."
                helper="Cada linha vira uma imagem da galeria."
              />
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-950">
              Conteúdo público
            </h3>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
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
              <TextAreaField
                label="Sobre a produtora"
                value={producerDescription}
                onChange={setProducerDescription}
              />
              <div className="md:col-span-2">
                <TextAreaField
                  label="Instruções de compra"
                  value={purchaseInstructions}
                  onChange={setPurchaseInstructions}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-black text-slate-950">
              Políticas e regras
            </h3>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <Field
                label="Classificação indicativa"
                value={ageRating}
                onChange={setAgeRating}
                placeholder="Ex: 18 anos"
              />
              <TextAreaField
                label="Política de reembolso"
                value={refundPolicy}
                onChange={setRefundPolicy}
              />
              <TextAreaField
                label="Política de meia-entrada"
                value={halfEntryPolicy}
                onChange={setHalfEntryPolicy}
              />
              <TextAreaField
                label="Política de transferência"
                value={transferPolicy}
                onChange={setTransferPolicy}
              />
              <TextAreaField
                label="Regras de entrada"
                value={entryRules}
                onChange={setEntryRules}
              />
              <TextAreaField
                label="Documentos obrigatórios"
                value={documentRules}
                onChange={setDocumentRules}
              />
              <div className="md:col-span-2">
                <TextAreaField
                  label="Termos e observações"
                  value={termsNotes}
                  onChange={setTermsNotes}
                />
              </div>
            </div>
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
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainPreviewImage}
                  alt={name || "Prévia do evento"}
                  className="h-64 w-full object-cover"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-center">
                  <div>
                    <p className="text-xl font-black text-white">
                      {name || "Nome do evento"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-400">
                      Nenhuma imagem principal adicionada.
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
                {[city, stateName].filter(Boolean).join(" - ") ||
                  "Cidade/estado não informados"}
              </p>
            </div>

            <div
              className={`rounded-3xl border p-5 ${
                sectorCapacityErrorMessage
                  ? "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Resumo técnico
              </p>
              <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-600">
                <li>Sessões: {sessions.length}</li>
                <li>
                  {isOpenAdmissionOnly
                    ? "Área única: sim"
                    : `Setores: ${sectors.length}`}
                </li>
                <li>Capacidade geral: {capacity || "0"}</li>
                <li>Soma dos setores: {sectorCapacityTotal}</li>
                <li>Itens no mapa: {mapObjects.length}</li>
                <li>Galeria: {galleryPreview.length} imagem(ns)</li>
                <li>Status: {status}</li>
              </ul>

              {sectorCapacityErrorMessage ? (
                <p className="mt-4 text-sm font-black text-rose-700">
                  {sectorCapacityErrorMessage}
                </p>
              ) : null}
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
    if (currentStep.id === "sectors") return renderSectorsStep();
    if (currentStep.id === "map") return renderMapStep();
    if (currentStep.id === "tickets") return renderTicketsStep();
    if (currentStep.id === "location") return renderLocationStep();
    if (currentStep.id === "extras") return renderExtrasStep();
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
              Criação guiada com categoria, ocupação personalizada, sessões,
              setores, mapa, ingressos, local, imagens e políticas.
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
                    {step.optional ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                        Opcional
                      </span>
                    ) : null}
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
                disabled={saving || Boolean(sectorCapacityErrorMessage)}
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