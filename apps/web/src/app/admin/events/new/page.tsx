"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import EventImageUploadField from "../../../../components/admin/EventImageUploadField";

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
  suggestedOccupancyMode: OccupancyMode;
  allowSeatMap: boolean;
  allowTableMap: boolean;
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
    description: "Eventos com plateia, assentos marcados e sessões.",
  },
  {
    value: "STAND_UP_COMEDY",
    label: "Stand-up comedy",
    description: "Pode ser entrada geral, assento marcado ou mesa marcada.",
  },
  {
    value: "CONGRESSOS",
    label: "Congressos e palestras",
    description: "Auditórios, salas, sessões, assentos e credenciais.",
  },
  {
    value: "GASTRONOMIA",
    label: "Gastronomia, bar e restaurante",
    description: "Mesas, reservas, salões, áreas VIP e eventos gastronômicos.",
  },
  {
    value: "ESPORTES",
    label: "Esportes",
    description: "Arquibancadas, setores, assentos ou entrada geral.",
  },
  {
    value: "PASSEIOS_TOURS",
    label: "Passeios e tours",
    description: "Turmas, horários, pontos de encontro e capacidade por sessão.",
  },
  {
    value: "INFANTIL",
    label: "Infantil",
    description: "Eventos infantis, acompanhantes e regras especiais.",
  },
];

const occupancyOptions: Array<{
  value: OccupancyMode;
  label: string;
  description: string;
}> = [
  {
    value: "GENERAL_ADMISSION",
    label: "Entrada geral",
    description: "O comprador escolhe quantidade, sem lugar marcado.",
  },
  {
    value: "RESERVED_SEATING",
    label: "Assento marcado",
    description: "Ideal para teatro, congresso, cinema, auditório e stand-up.",
  },
  {
    value: "RESERVED_TABLE",
    label: "Mesa marcada",
    description: "Ideal para bar, gastronomia, jantar, camarote e restaurante.",
  },
  {
    value: "MIXED",
    label: "Misto",
    description: "Combina entrada geral, assentos, mesas e setores no mesmo evento.",
  },
];

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

function parseGallery(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasDefinedValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).some(hasDefinedValue);
  }

  return false;
}

function getCategoryPreset(category: EventCategory): CategoryPreset {
  if (category === "TEATROS_ESPETACULOS") {
    return {
      label: "Teatro e espetáculo",
      description:
        "Libera sessões, setores e mapa de assentos para plateia, mezanino ou camarote.",
      suggestedOccupancyMode: "RESERVED_SEATING",
      allowSeatMap: true,
      allowTableMap: false,
      defaultSectorName: "Plateia",
      defaultSectorType: "AUDITORIUM",
      sessionLabel: "Sessão",
    };
  }

  if (category === "CONGRESSOS") {
    return {
      label: "Congresso e palestra",
      description:
        "Libera sessões, auditórios, salas e assentos opcionais por atividade.",
      suggestedOccupancyMode: "RESERVED_SEATING",
      allowSeatMap: true,
      allowTableMap: false,
      defaultSectorName: "Auditório principal",
      defaultSectorType: "AUDITORIUM",
      sessionLabel: "Atividade",
    };
  }

  if (category === "GASTRONOMIA") {
    return {
      label: "Gastronomia, bar e restaurante",
      description:
        "Libera mapa de mesas, salões, áreas VIP e capacidade por mesa.",
      suggestedOccupancyMode: "RESERVED_TABLE",
      allowSeatMap: false,
      allowTableMap: true,
      defaultSectorName: "Salão principal",
      defaultSectorType: "DINING_ROOM",
      sessionLabel: "Horário",
    };
  }

  if (category === "STAND_UP_COMEDY") {
    return {
      label: "Stand-up comedy",
      description:
        "Permite entrada geral, assentos marcados, mesas ou modelo misto.",
      suggestedOccupancyMode: "MIXED",
      allowSeatMap: true,
      allowTableMap: true,
      defaultSectorName: "Área principal",
      defaultSectorType: "MAIN_AREA",
      sessionLabel: "Sessão",
    };
  }

  if (category === "PASSEIOS_TOURS") {
    return {
      label: "Passeios e tours",
      description:
        "Libera turmas por horário, ponto de encontro e capacidade por saída.",
      suggestedOccupancyMode: "GENERAL_ADMISSION",
      allowSeatMap: false,
      allowTableMap: false,
      defaultSectorName: "Turma principal",
      defaultSectorType: "TOUR_GROUP",
      sessionLabel: "Turma",
    };
  }

  if (category === "ESPORTES") {
    return {
      label: "Evento esportivo",
      description:
        "Permite setores, arquibancadas e futuramente assentos por setor.",
      suggestedOccupancyMode: "MIXED",
      allowSeatMap: true,
      allowTableMap: false,
      defaultSectorName: "Arquibancada",
      defaultSectorType: "STAND",
      sessionLabel: "Partida",
    };
  }

  if (category === "INFANTIL") {
    return {
      label: "Evento infantil",
      description:
        "Permite sessões, setores e regras especiais para acompanhantes.",
      suggestedOccupancyMode: "GENERAL_ADMISSION",
      allowSeatMap: false,
      allowTableMap: false,
      defaultSectorName: "Entrada geral",
      defaultSectorType: "GENERAL",
      sessionLabel: "Sessão",
    };
  }

  return {
    label: "Festas e shows",
    description:
      "Libera múltiplas datas, setores como pista, VIP, camarote e lotes.",
    suggestedOccupancyMode: "GENERAL_ADMISSION",
    allowSeatMap: false,
    allowTableMap: false,
    defaultSectorName: "Entrada geral",
    defaultSectorType: "GENERAL",
    sessionLabel: "Data",
  };
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
  occupancyMode?: OccupancyMode,
  index = 0,
): VenueSectorFormItem {
  const preset = getCategoryPreset(category);
  const resolvedOccupancyMode = occupancyMode || preset.suggestedOccupancyMode;

  return {
    localId: newLocalId("sector"),
    name: index === 0 ? preset.defaultSectorName : `Setor ${index + 1}`,
    description: "",
    type: preset.defaultSectorType,
    occupancyMode: resolvedOccupancyMode,
    capacity: "",
    displayOrder: String(index),
    color: "",
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

function getOccupancyLabel(value: OccupancyMode) {
  return occupancyOptions.find((item) => item.value === value)?.label || value;
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass(error)}
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
  const [occupancyMode, setOccupancyMode] =
    useState<OccupancyMode>("GENERAL_ADMISSION");
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
  const [lastGalleryUploadUrl, setLastGalleryUploadUrl] = useState("");

  const [ageRating, setAgeRating] = useState("");
  const [refundPolicy, setRefundPolicy] = useState("");
  const [halfEntryPolicy, setHalfEntryPolicy] = useState("");
  const [transferPolicy, setTransferPolicy] = useState("");
  const [termsNotes, setTermsNotes] = useState("");
  const [entryRules, setEntryRules] = useState("");
  const [documentRules, setDocumentRules] = useState("");

  const [sessions, setSessions] = useState<EventSessionFormItem[]>([
    createDefaultSession(0),
  ]);
  const [sectors, setSectors] = useState<VenueSectorFormItem[]>([
    createDefaultSector("FESTAS_SHOWS", "GENERAL_ADMISSION", 0),
  ]);
  const [mapObjects, setMapObjects] = useState<SeatMapObjectFormItem[]>([]);
  const [seatRows, setSeatRows] = useState("8");
  const [seatColumns, setSeatColumns] = useState("12");
  const [tableCount, setTableCount] = useState("20");
  const [seatsPerTable, setSeatsPerTable] = useState("4");

  const [ticketTypes, setTicketTypes] = useState<TicketTypeFormItem[]>([
    createDefaultTicketType(0),
  ]);

  const preset = useMemo(() => getCategoryPreset(category), [category]);
  const galleryPreview = useMemo(() => parseGallery(galleryText), [galleryText]);

  const selectedOrganizer = useMemo(() => {
    return organizers.find((organizer) => organizer.id === organizerId) || null;
  }, [organizers, organizerId]);

  const mainPreviewImage =
    bannerImageUrl || coverImageUrl || thumbnailUrl || mobileBannerUrl;

  const allowSeatMap =
    occupancyMode === "RESERVED_SEATING" || occupancyMode === "MIXED";
  const allowTableMap =
    occupancyMode === "RESERVED_TABLE" || occupancyMode === "MIXED";
  const showMapBuilder = allowSeatMap || allowTableMap;

  const primarySessionDate = sessions.find((session) => session.startsAt)?.startsAt;
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
    type: Boolean(category && occupancyMode),
    basic: Boolean(organizerId && name.trim() && Number(capacity) > 0),
    sessions: sessions.some((session) => session.name.trim() && session.startsAt),
    sectors: sectors.some((sector) => sector.name.trim()),
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
      description: "Categoria e tipo de ocupação.",
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
      description: "Pista, plateia, salão, camarote ou auditório.",
    },
    {
      id: "map",
      title: "Mapa",
      description: "Assentos, mesas ou mapa misto.",
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
        const res = await fetch("http://localhost:3001/v1/organizers", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await res.json();

        if (!res.ok) {
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

    const messages: Record<StepId, string> = {
      type: "Escolha a categoria e o tipo de ocupação do evento.",
      basic: "Preencha produtora, nome do evento e capacidade geral.",
      sessions: "Cadastre pelo menos uma data ou sessão com início.",
      sectors: "Cadastre pelo menos um setor ou área.",
      map: "Gere o mapa de assentos ou mesas para continuar.",
      tickets: "Cadastre pelo menos um ingresso válido com nome, preço e quantidade.",
      location: "Preencha nome do local, cidade e estado.",
      extras: "Esta etapa é opcional.",
      review: "Revise os dados antes de salvar.",
    };

    alert(messages[currentStep.id]);
    return false;
  }

  function goToNextStep() {
    setSubmitAttempted(true);

    if (!validateCurrentStep()) return;

    const nextIndex = Math.min(activeStepIndex + 1, stepDefinitions.length - 1);
    setActiveStepIndex(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goToPreviousStep() {
    const previousIndex = Math.max(activeStepIndex - 1, 0);
    setActiveStepIndex(previousIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCategoryChange(value: EventCategory) {
    const nextPreset = getCategoryPreset(value);
    const nextOccupancyMode = nextPreset.suggestedOccupancyMode;

    setCategory(value);
    setOccupancyMode(nextOccupancyMode);

    setSectors((prev) => {
      if (prev.length === 0 || prev.length === 1) {
        return [createDefaultSector(value, nextOccupancyMode, 0)];
      }

      return prev.map((sector) => ({
        ...sector,
        occupancyMode: nextOccupancyMode,
      }));
    });

    setTicketTypes((prev) =>
      prev.map((ticketType) => ({
        ...ticketType,
        occupancyMode: nextOccupancyMode,
      })),
    );

    if (
      nextOccupancyMode === "GENERAL_ADMISSION" &&
      value !== "ESPORTES" &&
      value !== "STAND_UP_COMEDY"
    ) {
      setMapObjects([]);
    }
  }

  function handleOccupancyModeChange(value: OccupancyMode) {
    setOccupancyMode(value);

    setSectors((prev) =>
      prev.map((sector) => ({
        ...sector,
        occupancyMode: value,
      })),
    );

    setTicketTypes((prev) =>
      prev.map((ticketType) => ({
        ...ticketType,
        occupancyMode: value,
      })),
    );

    if (value === "GENERAL_ADMISSION") {
      setMapObjects([]);
    }
  }

  function updateSession(
    localId: string,
    field: keyof EventSessionFormItem,
    value: string,
  ) {
    setSessions((prev) =>
      prev.map((session) =>
        session.localId === localId
          ? {
              ...session,
              [field]: value,
            }
          : session,
      ),
    );

    if (field === "startsAt" && !eventDate) {
      setEventDate(value);
    }
  }

  function handleAddSession() {
    setSessions((prev) => [...prev, createDefaultSession(prev.length)]);
  }

  function handleRemoveSession(localId: string) {
    setSessions((prev) => {
      if (prev.length === 1) {
        return [createDefaultSession(0)];
      }

      return prev.filter((session) => session.localId !== localId);
    });

    setTicketTypes((prev) =>
      prev.map((ticketType) =>
        ticketType.eventSessionLocalId === localId
          ? {
              ...ticketType,
              eventSessionLocalId: "",
            }
          : ticketType,
      ),
    );
  }

  function updateSector(
    localId: string,
    field: keyof VenueSectorFormItem,
    value: string,
  ) {
    setSectors((prev) =>
      prev.map((sector) =>
        sector.localId === localId
          ? {
              ...sector,
              [field]: field === "occupancyMode" ? (value as OccupancyMode) : value,
            }
          : sector,
      ),
    );
  }

  function handleAddSector() {
    setSectors((prev) => [
      ...prev,
      createDefaultSector(category, occupancyMode, prev.length),
    ]);
  }

  function handleRemoveSector(localId: string) {
    setSectors((prev) => {
      if (prev.length === 1) {
        return [createDefaultSector(category, occupancyMode, 0)];
      }

      return prev.filter((sector) => sector.localId !== localId);
    });

    setMapObjects((prev) =>
      prev.filter((object) => object.venueSectorLocalId !== localId),
    );

    setTicketTypes((prev) =>
      prev.map((ticketType) =>
        ticketType.venueSectorLocalId === localId
          ? {
              ...ticketType,
              venueSectorLocalId: "",
            }
          : ticketType,
      ),
    );
  }

  function updateTicketType(
    localId: string,
    field: keyof TicketTypeFormItem,
    value: string | boolean,
  ) {
    setTicketTypes((prev) =>
      prev.map((ticketType) =>
        ticketType.localId === localId
          ? {
              ...ticketType,
              [field]:
                field === "isHidden"
                  ? Boolean(value)
                  : field === "occupancyMode"
                    ? (value as OccupancyMode)
                    : value,
            }
          : ticketType,
      ),
    );
  }

  function handleAddTicketType() {
    const firstSession = sessions[0]?.localId || "";
    const firstSector = sectors[0]?.localId || "";

    setTicketTypes((prev) => [
      ...prev,
      createDefaultTicketType(
        prev.length,
        firstSession,
        firstSector,
        occupancyMode,
      ),
    ]);
  }

  function handleRemoveTicketType(localId: string) {
    setTicketTypes((prev) => {
      if (prev.length === 1) {
        return [
          createDefaultTicketType(
            0,
            sessions[0]?.localId || "",
            sectors[0]?.localId || "",
            occupancyMode,
          ),
        ];
      }

      return prev.filter((ticketType) => ticketType.localId !== localId);
    });
  }

  function generateSlugFromName() {
    const generatedSlug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    setSlug(generatedSlug);
  }

  function generateSeatMap() {
    const rows = Math.max(1, Number(seatRows) || 1);
    const columns = Math.max(1, Number(seatColumns) || 1);
    const sectorLocalId = sectors[0]?.localId || "";
    const objects: SeatMapObjectFormItem[] = [];

    for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
      const rowLabel = String.fromCharCode(65 + rowIndex);

      for (let columnIndex = 1; columnIndex <= columns; columnIndex += 1) {
        objects.push({
          localId: newLocalId("seat"),
          venueSectorLocalId: sectorLocalId,
          code: `${rowLabel}${columnIndex}`,
          label: `${rowLabel}${columnIndex}`,
          type: "SEAT",
          row: rowLabel,
          number: String(columnIndex),
          capacity: "1",
          x: columnIndex * 44,
          y: rowIndex * 44,
          width: 34,
          height: 34,
          rotation: 0,
          status: "AVAILABLE",
        });
      }
    }

    setMapObjects(objects);
  }

  function generateTableMap() {
    const count = Math.max(1, Number(tableCount) || 1);
    const tableCapacity = Math.max(1, Number(seatsPerTable) || 1);
    const sectorLocalId = sectors[0]?.localId || "";
    const objects: SeatMapObjectFormItem[] = [];

    for (let index = 0; index < count; index += 1) {
      const column = index % 5;
      const row = Math.floor(index / 5);

      objects.push({
        localId: newLocalId("table"),
        venueSectorLocalId: sectorLocalId,
        code: `M${String(index + 1).padStart(2, "0")}`,
        label: `Mesa ${String(index + 1).padStart(2, "0")}`,
        type: "TABLE",
        row: String(row + 1),
        number: String(index + 1),
        capacity: String(tableCapacity),
        x: column * 96,
        y: row * 96,
        width: 72,
        height: 72,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          seatsPerTable: tableCapacity,
        },
      });
    }

    setMapObjects(objects);
  }

  function clearMapObjects() {
    setMapObjects([]);
  }

  function handleGalleryUploaded(url: string) {
    setLastGalleryUploadUrl(url);
    setGalleryText((prev) => (prev ? `${prev}\n${url}` : url));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitAttempted(true);

    const allRequiredStepsDone = stepDefinitions
      .filter((step) => step.id !== "review")
      .every((step) => stepCompletion[step.id]);

    if (!allRequiredStepsDone) {
      const firstIncomplete = getFirstIncompleteStepIndex();
      setActiveStepIndex(firstIncomplete);
      alert("Conclua as etapas pendentes antes de criar o evento.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token || token === "undefined") {
      window.location.href = "/login";
      return;
    }

    if (!organizerId) {
      alert("Selecione a produtora responsável pelo evento.");
      return;
    }

    if (!name.trim()) {
      alert("Informe o nome do evento.");
      return;
    }

    if (!primaryEventDate) {
      alert("Informe pelo menos uma data/sessão do evento.");
      return;
    }

    if (!capacity || Number(capacity) < 1) {
      alert("Informe uma capacidade válida.");
      return;
    }

    if (!venueName.trim()) {
      alert("Informe o nome do local.");
      return;
    }

    if (!city.trim()) {
      alert("Informe a cidade do evento.");
      return;
    }

    if (!stateName.trim()) {
      alert("Informe o estado do evento.");
      return;
    }

    const parsedSessions = sessions
      .filter((session) => session.name.trim() && session.startsAt)
      .map((session, index) => ({
        localId: session.localId,
        name: session.name.trim(),
        description: normalizeText(session.description),
        startsAt: new Date(session.startsAt).toISOString(),
        endsAt: toIsoOrUndefined(session.endsAt),
        capacity: toNumberOrUndefined(session.capacity),
        status: normalizeText(session.status) || "ACTIVE",
        displayOrder: toNumberOrUndefined(session.displayOrder) ?? index,
      }));

    const fallbackSession =
      parsedSessions.length > 0
        ? parsedSessions
        : [
            {
              localId: "default-session",
              name: "Data principal",
              description: undefined,
              startsAt: new Date(primaryEventDate).toISOString(),
              endsAt: toIsoOrUndefined(endDate),
              capacity: Number(capacity),
              status: "ACTIVE",
              displayOrder: 0,
            },
          ];

    const parsedSectors = sectors
      .filter((sector) => sector.name.trim())
      .map((sector, index) => ({
        localId: sector.localId,
        name: sector.name.trim(),
        description: normalizeText(sector.description),
        type: normalizeText(sector.type),
        occupancyMode: sector.occupancyMode,
        capacity: toNumberOrUndefined(sector.capacity),
        displayOrder: toNumberOrUndefined(sector.displayOrder) ?? index,
        color: normalizeText(sector.color),
        gateName: normalizeText(sector.gateName),
      }));

    const fallbackSectors =
      parsedSectors.length > 0
        ? parsedSectors
        : [
            {
              localId: "default-sector",
              name: preset.defaultSectorName,
              description: undefined,
              type: preset.defaultSectorType,
              occupancyMode,
              capacity: Number(capacity),
              displayOrder: 0,
              color: undefined,
              gateName: undefined,
            },
          ];

    const parsedTicketTypes = ticketTypes
      .map((ticketType, index) => ({
        eventSessionLocalId: normalizeText(ticketType.eventSessionLocalId),
        venueSectorLocalId: normalizeText(ticketType.venueSectorLocalId),
        occupancyMode: ticketType.occupancyMode,
        name: ticketType.name.trim(),
        lotLabel: normalizeText(ticketType.lotLabel),
        description: normalizeText(ticketType.description),
        price: normalizeText(ticketType.price.replace(",", ".")),
        quantity: toNumberOrUndefined(ticketType.quantity),
        salesStartAt: toIsoOrUndefined(ticketType.salesStartAt),
        salesEndAt: toIsoOrUndefined(ticketType.salesEndAt),
        minPerOrder: toNumberOrUndefined(ticketType.minPerOrder),
        maxPerOrder: toNumberOrUndefined(ticketType.maxPerOrder),
        displayOrder: toNumberOrUndefined(ticketType.displayOrder) ?? index,
        feeAmount: normalizeText(ticketType.feeAmount.replace(",", ".")),
        feeDescription: normalizeText(ticketType.feeDescription),
        benefitDescription: normalizeText(ticketType.benefitDescription),
        isHidden: ticketType.isHidden,
        status: normalizeText(ticketType.status) || "ACTIVE",
      }))
      .filter(
        (ticketType) =>
          Boolean(ticketType.name) &&
          Boolean(ticketType.price) &&
          Boolean(ticketType.quantity && ticketType.quantity > 0),
      );

    const parsedMapObjects = mapObjects.map((object) => ({
      localId: object.localId,
      venueSectorLocalId: normalizeText(object.venueSectorLocalId),
      code: object.code,
      label: normalizeText(object.label),
      type: object.type,
      row: normalizeText(object.row),
      number: normalizeText(object.number),
      capacity: toNumberOrUndefined(object.capacity) || 1,
      x: object.x,
      y: object.y,
      width: object.width,
      height: object.height,
      rotation: object.rotation,
      status: normalizeText(object.status) || "AVAILABLE",
      metadata: object.metadata,
    }));

    const content = {
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
    };

    const location = {
      mode: normalizeText(mode) || "PRESENTIAL",
      venueName: venueName.trim(),
      addressLine1: normalizeText(addressLine1),
      addressLine2: normalizeText(addressLine2),
      neighborhood: normalizeText(neighborhood),
      city: city.trim(),
      state: stateName.trim().toUpperCase(),
      zipCode: normalizeText(zipCode),
      reference: normalizeText(reference),
      mapUrl: normalizeText(mapUrl),
      instructions: normalizeText(instructions),
      latitude: normalizeText(latitude),
      longitude: normalizeText(longitude),
    };

    const media = {
      coverImageUrl: normalizeText(coverImageUrl),
      bannerImageUrl: normalizeText(bannerImageUrl),
      thumbnailUrl: normalizeText(thumbnailUrl),
      mobileBannerUrl: normalizeText(mobileBannerUrl),
      sectorMapImageUrl: normalizeText(sectorMapImageUrl),
      gallery: galleryPreview.length > 0 ? galleryPreview : undefined,
    };

    const policy = {
      ageRating: normalizeText(ageRating),
      refundPolicy: normalizeText(refundPolicy),
      halfEntryPolicy: normalizeText(halfEntryPolicy),
      transferPolicy: normalizeText(transferPolicy),
      termsNotes: normalizeText(termsNotes),
      entryRules: normalizeText(entryRules),
      documentRules: normalizeText(documentRules),
    };

    const payload = {
      organizerId,
      name: name.trim(),
      description: normalizeText(description),
      eventDate: new Date(primaryEventDate).toISOString(),
      capacity: Number(capacity),

      slug: normalizeText(slug),
      shortDescription: normalizeText(shortDescription),
      category,
      occupancyMode,
      multiSession: fallbackSession.length > 1,
      allowSeatMap,
      allowTableMap,
      status: normalizeText(status),
      visibility: normalizeText(visibility),
      timezone: normalizeText(timezone),
      startDate: toIsoOrUndefined(startDate || primaryEventDate),
      endDate: toIsoOrUndefined(endDate),
      saleStartAt: toIsoOrUndefined(saleStartAt),
      saleEndAt: toIsoOrUndefined(saleEndAt),
      featured,
      highlightTag: normalizeText(highlightTag),
      checkoutTitle: normalizeText(checkoutTitle),
      checkoutSubtitle: normalizeText(checkoutSubtitle),

      content: hasDefinedValue(content) ? content : undefined,
      location,
      media: hasDefinedValue(media) ? media : undefined,
      policy: hasDefinedValue(policy) ? policy : undefined,
      sessions: fallbackSession,
      sectors: fallbackSectors,
      venueLayouts:
        showMapBuilder && parsedMapObjects.length > 0
          ? [
              {
                localId: "default-layout",
                name:
                  occupancyMode === "RESERVED_TABLE"
                    ? "Mapa de mesas"
                    : occupancyMode === "RESERVED_SEATING"
                      ? "Mapa de assentos"
                      : "Mapa misto",
                occupancyMode,
                width: 1000,
                height: 700,
                isDefault: true,
                status: "ACTIVE",
                mapData: {
                  source: "admin-event-create",
                  category,
                  generatedAt: new Date().toISOString(),
                },
                objects: parsedMapObjects,
              },
            ]
          : undefined,
      ticketTypes: parsedTicketTypes.length > 0 ? parsedTicketTypes : undefined,
    };

    setSaving(true);

    try {
      const res = await fetch("http://localhost:3001/v1/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        alert(
          typeof result?.message === "string"
            ? result.message
            : JSON.stringify(result),
        );
        return;
      }

      alert("Evento criado com sucesso.");

      if (result?.id) {
        window.location.href = `/admin/events/${result.id}`;
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

  function StepNavigation() {
    return (
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
            Progresso
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Criação guiada
          </h2>

          <div className="mt-5 space-y-2">
            {stepDefinitions.map((step, index) => {
              const isActive = activeStepIndex === index;
              const isAccessible = isStepAccessible(index);
              const isComplete =
                step.id === "review"
                  ? stepDefinitions
                      .filter((item) => item.id !== "review")
                      .every((item) => stepCompletion[item.id])
                  : stepCompletion[step.id];

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-sky-300 bg-sky-50"
                      : isComplete
                        ? "border-emerald-200 bg-emerald-50/60"
                        : isAccessible
                          ? "border-slate-200 bg-white hover:bg-slate-50"
                          : "border-slate-200 bg-slate-50 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        isComplete
                          ? "bg-emerald-500 text-white"
                          : isActive
                            ? "bg-sky-600 text-white"
                            : isAccessible
                              ? "bg-slate-950 text-white"
                              : "bg-slate-300 text-slate-600"
                      }`}
                    >
                      {isComplete ? "✓" : index + 1}
                    </span>

                    <span className="min-w-0">
                      <span className="block text-sm font-black text-slate-900">
                        {step.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {isAccessible ? step.description : "Bloqueado"}
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
            Prévia
          </p>

          <h2 className="mt-2 line-clamp-2 text-2xl font-black text-slate-950">
            {name || "Nome do evento"}
          </h2>

          <div className="mt-4 overflow-hidden rounded-2xl bg-slate-950">
            {mainPreviewImage ? (
              <img
                src={mainPreviewImage}
                alt="Prévia do evento"
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="h-36 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.45),transparent_34%),linear-gradient(135deg,#020617,#0f172a,#075985)]" />
            )}
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p>
              <strong>Categoria:</strong> {preset.label}
            </p>
            <p>
              <strong>Ocupação:</strong> {getOccupancyLabel(occupancyMode)}
            </p>
            <p>
              <strong>Data:</strong> {formatDatePreview(primaryEventDate)}
            </p>
            <p>
              <strong>Local:</strong>{" "}
              {[venueName, city, stateName].filter(Boolean).join(", ") ||
                "Local a confirmar"}
            </p>
          </div>
        </section>
      </aside>
    );
  }

  function StepShell({
    eyebrow,
    title,
    description,
    children,
    showPrevious = true,
    nextLabel = "Continuar",
    onNext,
  }: {
    eyebrow: string;
    title: string;
    description: string;
    children: ReactNode;
    showPrevious?: boolean;
    nextLabel?: string;
    onNext?: () => void;
  }) {
    return (
      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-600">
            {eyebrow}
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950 md:text-3xl">
            {title}
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className="mt-7">{children}</div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
          {showPrevious ? (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Voltar etapa
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={onNext || goToNextStep}
            className="rounded-2xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-slate-800"
          >
            {nextLabel}
          </button>
        </div>
      </section>
    );
  }

  function renderTypeStep() {
    return (
      <StepShell
        eyebrow="Etapa 1"
        title="Tipo de evento"
        description="Escolha a categoria para liberar sessões, setores, assentos ou mesas conforme o tipo de operação."
        showPrevious={false}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-slate-700">
              Categoria do evento
            </label>

            <select
              value={category}
              onChange={(event) =>
                handleCategoryChange(event.target.value as EventCategory)
              }
              className={inputClass()}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {preset.description}
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-slate-700">
              Tipo de ocupação
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              {occupancyOptions.map((option) => {
                const active = occupancyMode === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleOccupancyModeChange(option.value)}
                    className={`rounded-[22px] border p-4 text-left transition ${
                      active
                        ? "border-sky-300 bg-sky-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        active ? "text-sky-700" : "text-slate-900"
                      }`}
                    >
                      {option.label}
                    </p>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
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
        description="Defina a identidade do evento, produtora responsável e regras gerais de exibição."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-black text-slate-700">
              Produtora responsável <span className="text-rose-600">*</span>
            </label>

            <select
              value={organizerId}
              onChange={(event) => setOrganizerId(event.target.value)}
              className={inputClass(requiredErrors.organizerId)}
            >
              <option value="">Selecione uma produtora</option>
              {organizers.map((organizer) => (
                <option key={organizer.id} value={organizer.id}>
                  {organizer.tradeName || organizer.legalName || organizer.id}
                </option>
              ))}
            </select>

            {requiredErrors.organizerId ? (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                Selecione a produtora responsável.
              </p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <Field
              label="Nome do evento"
              value={name}
              onChange={setName}
              placeholder="Ex: Festival de Verão 2026"
              required
              error={requiredErrors.name}
              helper={requiredErrors.name ? "Informe o nome do evento." : undefined}
            />
          </div>

          <div>
            <Field
              label="Slug"
              value={slug}
              onChange={setSlug}
              placeholder="festival-de-verao-2026"
            />

            <button
              type="button"
              onClick={generateSlugFromName}
              className="mt-2 text-xs font-black text-sky-600 hover:text-sky-700"
            >
              Gerar pelo nome
            </button>
          </div>

          <Field
            label="Capacidade geral"
            type="number"
            min={1}
            value={capacity}
            onChange={setCapacity}
            placeholder="1000"
            required
            error={requiredErrors.capacity}
            helper={
              requiredErrors.capacity ? "Informe uma capacidade válida." : undefined
            }
          />

          <SelectField
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { label: "Rascunho", value: "DRAFT" },
              { label: "Publicado", value: "PUBLISHED" },
              { label: "Ativo", value: "ACTIVE" },
              { label: "Cancelado", value: "CANCELED" },
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
            label="Timezone"
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
            <Field
              label="Descrição curta"
              value={shortDescription}
              onChange={setShortDescription}
              placeholder="Resumo rápido que aparece nos cards do evento"
            />
          </div>

          <div className="md:col-span-2">
            <TextAreaField
              label="Descrição base"
              value={description}
              onChange={setDescription}
              placeholder="Descrição principal usada em cards, detalhes e resumo"
            />
          </div>

          <div className="flex h-[52px] items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4">
            <input
              id="featured"
              type="checkbox"
              checked={featured}
              onChange={(event) => setFeatured(event.target.checked)}
              className="h-4 w-4"
            />

            <label htmlFor="featured" className="text-sm font-black text-slate-700">
              Evento em destaque
            </label>
          </div>

          <Field
            label="Título do checkout"
            value={checkoutTitle}
            onChange={setCheckoutTitle}
            placeholder="Escolha seu ingresso"
          />

          <Field
            label="Subtítulo do checkout"
            value={checkoutSubtitle}
            onChange={setCheckoutSubtitle}
            placeholder="Selecione o lote ideal"
          />
        </div>
      </StepShell>
    );
  }

  function renderSessionsStep() {
    return (
      <StepShell
        eyebrow="Etapa 3"
        title={`Datas / ${preset.sessionLabel.toLowerCase()}s`}
        description="Cadastre uma ou várias datas. Isso permite eventos de vários dias, turmas, sessões ou horários."
      >
        <div className="space-y-5">
          {sessions.map((session, index) => (
            <div
              key={session.localId}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {preset.sessionLabel} {index + 1}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {session.name || `${preset.sessionLabel} ${index + 1}`}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSession(session.localId)}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-50"
                >
                  Remover
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label={`Nome da ${preset.sessionLabel.toLowerCase()}`}
                  value={session.name}
                  onChange={(value) =>
                    updateSession(session.localId, "name", value)
                  }
                  placeholder="Ex: Sexta-feira, Turma 20h, Sessão 1"
                  required
                />

                <Field
                  label="Capacidade da sessão"
                  type="number"
                  min={1}
                  value={session.capacity}
                  onChange={(value) =>
                    updateSession(session.localId, "capacity", value)
                  }
                  placeholder="Opcional"
                />

                <Field
                  label="Início"
                  type="datetime-local"
                  value={session.startsAt}
                  onChange={(value) =>
                    updateSession(session.localId, "startsAt", value)
                  }
                  required
                  error={requiredErrors.sessions && !session.startsAt}
                />

                <Field
                  label="Fim"
                  type="datetime-local"
                  value={session.endsAt}
                  onChange={(value) =>
                    updateSession(session.localId, "endsAt", value)
                  }
                />

                <SelectField
                  label="Status"
                  value={session.status}
                  onChange={(value) =>
                    updateSession(session.localId, "status", value)
                  }
                  options={[
                    { label: "Ativa", value: "ACTIVE" },
                    { label: "Rascunho", value: "DRAFT" },
                    { label: "Esgotada", value: "SOLD_OUT" },
                    { label: "Cancelada", value: "CANCELED" },
                  ]}
                />

                <Field
                  label="Ordem"
                  type="number"
                  min={0}
                  value={session.displayOrder}
                  onChange={(value) =>
                    updateSession(session.localId, "displayOrder", value)
                  }
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Descrição"
                    value={session.description}
                    onChange={(value) =>
                      updateSession(session.localId, "description", value)
                    }
                    placeholder="Ex: Abertura dos portões às 19h"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddSession}
            className="w-full rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 transition hover:bg-sky-100"
          >
            Adicionar outra data/sessão
          </button>
        </div>
      </StepShell>
    );
  }

  function renderSectorsStep() {
    return (
      <StepShell
        eyebrow="Etapa 4"
        title="Setores / áreas"
        description="Crie áreas como pista, camarote, plateia, salão, VIP, auditório ou turma."
      >
        <div className="space-y-5">
          {sectors.map((sector, index) => (
            <div
              key={sector.localId}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Setor {index + 1}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {sector.name || `Setor ${index + 1}`}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSector(sector.localId)}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-50"
                >
                  Remover
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="Nome do setor"
                  value={sector.name}
                  onChange={(value) =>
                    updateSector(sector.localId, "name", value)
                  }
                  placeholder="Pista, Camarote, Plateia, Salão..."
                  required
                  error={requiredErrors.sectors && !sector.name}
                />

                <Field
                  label="Tipo interno"
                  value={sector.type}
                  onChange={(value) =>
                    updateSector(sector.localId, "type", value)
                  }
                  placeholder="GENERAL, VIP, AUDITORIUM..."
                />

                <SelectField
                  label="Tipo de ocupação do setor"
                  value={sector.occupancyMode}
                  onChange={(value) =>
                    updateSector(sector.localId, "occupancyMode", value)
                  }
                  options={occupancyOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                />

                <Field
                  label="Capacidade"
                  type="number"
                  min={1}
                  value={sector.capacity}
                  onChange={(value) =>
                    updateSector(sector.localId, "capacity", value)
                  }
                  placeholder="Opcional"
                />

                <Field
                  label="Cor"
                  value={sector.color}
                  onChange={(value) =>
                    updateSector(sector.localId, "color", value)
                  }
                  placeholder="#0ea5e9"
                />

                <Field
                  label="Portão"
                  value={sector.gateName}
                  onChange={(value) =>
                    updateSector(sector.localId, "gateName", value)
                  }
                  placeholder="Portão A"
                />

                <Field
                  label="Ordem"
                  type="number"
                  min={0}
                  value={sector.displayOrder}
                  onChange={(value) =>
                    updateSector(sector.localId, "displayOrder", value)
                  }
                />

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Descrição"
                    value={sector.description}
                    onChange={(value) =>
                      updateSector(sector.localId, "description", value)
                    }
                    placeholder="Explique o que este setor inclui"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddSector}
            className="w-full rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 transition hover:bg-sky-100"
          >
            Adicionar outro setor
          </button>
        </div>
      </StepShell>
    );
  }

  function renderMapStep() {
    if (!showMapBuilder) {
      return (
        <StepShell
          eyebrow="Etapa 5"
          title="Mapa não necessário"
          description="Para entrada geral, o comprador escolhe apenas quantidade de ingressos."
        >
          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
            <h3 className="text-xl font-black text-slate-950">
              Esta categoria não exige assento ou mesa.
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Você pode continuar para os ingressos. Se precisar de assentos ou
              mesas, volte na etapa 1 e altere o tipo de ocupação.
            </p>
          </div>
        </StepShell>
      );
    }

    return (
      <StepShell
        eyebrow="Etapa 5"
        title={
          allowTableMap && !allowSeatMap
            ? "Mapa de mesas"
            : allowSeatMap && !allowTableMap
              ? "Mapa de assentos"
              : "Mapa misto"
        }
        description="Gere um mapa inicial de assentos ou mesas. Depois vamos evoluir para um editor visual mais avançado."
      >
        <div className="grid gap-5 md:grid-cols-2">
          {allowSeatMap ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-black text-slate-950">
                Gerar assentos
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ideal para teatro, congresso, auditório, stand-up sentado e
                eventos com cadeira numerada.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Fileiras"
                  type="number"
                  min={1}
                  value={seatRows}
                  onChange={setSeatRows}
                />

                <Field
                  label="Assentos por fileira"
                  type="number"
                  min={1}
                  value={seatColumns}
                  onChange={setSeatColumns}
                />
              </div>

              <button
                type="button"
                onClick={generateSeatMap}
                className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Gerar mapa de assentos
              </button>
            </div>
          ) : null}

          {allowTableMap ? (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-black text-slate-950">Gerar mesas</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ideal para bar, restaurante, gastronomia, camarote e eventos com
                reserva de mesa.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field
                  label="Quantidade de mesas"
                  type="number"
                  min={1}
                  value={tableCount}
                  onChange={setTableCount}
                />

                <Field
                  label="Lugares por mesa"
                  type="number"
                  min={1}
                  value={seatsPerTable}
                  onChange={setSeatsPerTable}
                />
              </div>

              <button
                type="button"
                onClick={generateTableMap}
                className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Gerar mapa de mesas
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Prévia do mapa
              </p>

              <h3 className="mt-1 text-xl font-black text-slate-950">
                {mapObjects.length} objeto(s)
              </h3>
            </div>

            <button
              type="button"
              onClick={clearMapObjects}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              Limpar mapa
            </button>
          </div>

          {mapObjects.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              Nenhum assento ou mesa gerado ainda.
            </div>
          ) : (
            <div className="mt-5 max-h-[360px] overflow-auto rounded-2xl bg-slate-950 p-5">
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
                {mapObjects.slice(0, 180).map((object) => (
                  <div
                    key={object.localId}
                    className={`flex h-12 items-center justify-center rounded-xl text-xs font-black ${
                      object.type === "TABLE"
                        ? "bg-amber-300 text-amber-950"
                        : "bg-sky-300 text-sky-950"
                    }`}
                  >
                    {object.label || object.code}
                  </div>
                ))}
              </div>

              {mapObjects.length > 180 ? (
                <p className="mt-4 text-center text-xs font-bold text-white/60">
                  Mostrando 180 de {mapObjects.length} objetos.
                </p>
              ) : null}
            </div>
          )}

          {requiredErrors.map ? (
            <p className="mt-3 text-sm font-bold text-rose-600">
              Gere um mapa para continuar.
            </p>
          ) : null}
        </div>
      </StepShell>
    );
  }

  function renderTicketsStep() {
    return (
      <StepShell
        eyebrow="Etapa 6"
        title="Ingressos / lotes"
        description="Crie ingressos vinculados ao evento inteiro, a uma data, a um setor ou ao modelo de ocupação."
      >
        <div className="space-y-5">
          {ticketTypes.map((ticketType, index) => (
            <div
              key={ticketType.localId}
              className="rounded-[28px] border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                    Ingresso {index + 1}
                  </p>

                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    {ticketType.name || "Novo ingresso"}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveTicketType(ticketType.localId)}
                  className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-black text-rose-600 transition hover:bg-rose-50"
                >
                  Remover
                </button>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="Nome do ingresso"
                  value={ticketType.name}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "name", value)
                  }
                  placeholder="Inteira, Meia, VIP, Mesa..."
                  error={requiredErrors.tickets && !ticketType.name}
                />

                <Field
                  label="Lote"
                  value={ticketType.lotLabel}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "lotLabel", value)
                  }
                  placeholder="1º Lote"
                />

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Data/sessão
                  </label>

                  <select
                    value={ticketType.eventSessionLocalId}
                    onChange={(event) =>
                      updateTicketType(
                        ticketType.localId,
                        "eventSessionLocalId",
                        event.target.value,
                      )
                    }
                    className={inputClass()}
                  >
                    <option value="">Todas as datas</option>
                    {sessions.map((session) => (
                      <option key={session.localId} value={session.localId}>
                        {session.name || "Sessão"} - {formatDatePreview(session.startsAt)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Setor
                  </label>

                  <select
                    value={ticketType.venueSectorLocalId}
                    onChange={(event) =>
                      updateTicketType(
                        ticketType.localId,
                        "venueSectorLocalId",
                        event.target.value,
                      )
                    }
                    className={inputClass()}
                  >
                    <option value="">Setor padrão</option>
                    {sectors.map((sector) => (
                      <option key={sector.localId} value={sector.localId}>
                        {sector.name || "Setor"}
                      </option>
                    ))}
                  </select>
                </div>

                <SelectField
                  label="Ocupação do ingresso"
                  value={ticketType.occupancyMode}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "occupancyMode", value)
                  }
                  options={occupancyOptions.map((option) => ({
                    label: option.label,
                    value: option.value,
                  }))}
                />

                <Field
                  label="Preço"
                  value={ticketType.price}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "price", value)
                  }
                  placeholder="100.00"
                  error={requiredErrors.tickets && !ticketType.price}
                />

                <Field
                  label="Quantidade"
                  type="number"
                  min={1}
                  value={ticketType.quantity}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "quantity", value)
                  }
                  placeholder="100"
                  error={requiredErrors.tickets && Number(ticketType.quantity) <= 0}
                />

                <Field
                  label="Mínimo por pedido"
                  type="number"
                  min={1}
                  value={ticketType.minPerOrder}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "minPerOrder", value)
                  }
                  placeholder="1"
                />

                <Field
                  label="Máximo por pedido"
                  type="number"
                  min={1}
                  value={ticketType.maxPerOrder}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "maxPerOrder", value)
                  }
                  placeholder="4"
                />

                <Field
                  label="Início das vendas"
                  type="datetime-local"
                  value={ticketType.salesStartAt}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "salesStartAt", value)
                  }
                />

                <Field
                  label="Fim das vendas"
                  type="datetime-local"
                  value={ticketType.salesEndAt}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "salesEndAt", value)
                  }
                />

                <Field
                  label="Taxa adicional"
                  value={ticketType.feeAmount}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "feeAmount", value)
                  }
                  placeholder="0.00"
                />

                <Field
                  label="Ordem"
                  type="number"
                  min={0}
                  value={ticketType.displayOrder}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "displayOrder", value)
                  }
                  placeholder="0"
                />

                <SelectField
                  label="Status"
                  value={ticketType.status}
                  onChange={(value) =>
                    updateTicketType(ticketType.localId, "status", value)
                  }
                  options={[
                    { label: "Ativo", value: "ACTIVE" },
                    { label: "Inativo", value: "INACTIVE" },
                    { label: "Esgotado", value: "SOLD_OUT" },
                  ]}
                />

                <div className="flex h-[52px] items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4">
                  <input
                    id={`hidden-${ticketType.localId}`}
                    type="checkbox"
                    checked={ticketType.isHidden}
                    onChange={(event) =>
                      updateTicketType(
                        ticketType.localId,
                        "isHidden",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />

                  <label
                    htmlFor={`hidden-${ticketType.localId}`}
                    className="text-sm font-black text-slate-700"
                  >
                    Ocultar da vitrine
                  </label>
                </div>

                <div className="md:col-span-2">
                  <TextAreaField
                    label="Descrição do ingresso"
                    value={ticketType.description}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "description", value)
                    }
                    placeholder="Descreva o que este ingresso inclui"
                  />
                </div>

                <div className="md:col-span-2">
                  <Field
                    label="Descrição da taxa"
                    value={ticketType.feeDescription}
                    onChange={(value) =>
                      updateTicketType(ticketType.localId, "feeDescription", value)
                    }
                    placeholder="Ex: Taxa de serviço"
                  />
                </div>

                <div className="md:col-span-2">
                  <Field
                    label="Benefícios"
                    value={ticketType.benefitDescription}
                    onChange={(value) =>
                      updateTicketType(
                        ticketType.localId,
                        "benefitDescription",
                        value,
                      )
                    }
                    placeholder="Ex: Acesso ao camarote, open bar..."
                  />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  Prévia
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-950">
                      {ticketType.name || "Nome do ingresso"}
                    </p>

                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {getOccupancyLabel(ticketType.occupancyMode)}
                    </p>
                  </div>

                  <p className="text-lg font-black text-sky-600">
                    {formatMoneyPreview(ticketType.price)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddTicketType}
            className="w-full rounded-2xl border border-dashed border-sky-300 bg-sky-50 px-5 py-4 text-sm font-black text-sky-700 transition hover:bg-sky-100"
          >
            Adicionar outro ingresso
          </button>
        </div>
      </StepShell>
    );
  }

  function renderLocationStep() {
    return (
      <StepShell
        eyebrow="Etapa 7"
        title="Local e acesso"
        description="Dados usados na página do evento, filtros por cidade e orientação do comprador."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField
            label="Formato"
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
            placeholder="Ex: Arena Central"
            required
            error={requiredErrors.venueName}
            helper={requiredErrors.venueName ? "Informe o nome do local." : undefined}
          />

          <div className="md:col-span-2">
            <Field
              label="Endereço principal"
              value={addressLine1}
              onChange={setAddressLine1}
              placeholder="Rua, avenida, número"
            />
          </div>

          <div className="md:col-span-2">
            <Field
              label="Complemento"
              value={addressLine2}
              onChange={setAddressLine2}
              placeholder="Bloco, sala, portão, setor..."
            />
          </div>

          <Field
            label="Bairro"
            value={neighborhood}
            onChange={setNeighborhood}
            placeholder="Centro"
          />

          <Field
            label="Cidade"
            value={city}
            onChange={setCity}
            placeholder="São Paulo"
            required
            error={requiredErrors.city}
            helper={requiredErrors.city ? "Informe a cidade do evento." : undefined}
          />

          <Field
            label="Estado"
            value={stateName}
            onChange={setStateName}
            placeholder="SP"
            required
            error={requiredErrors.stateName}
            helper={requiredErrors.stateName ? "Informe o estado do evento." : undefined}
          />

          <Field
            label="CEP"
            value={zipCode}
            onChange={setZipCode}
            placeholder="00000-000"
          />

          <div className="md:col-span-2">
            <Field
              label="Referência"
              value={reference}
              onChange={setReference}
              placeholder="Ex: Entrada pelo portão 2"
            />
          </div>

          <div className="md:col-span-2">
            <Field
              label="Link do mapa"
              value={mapUrl}
              onChange={setMapUrl}
              placeholder="https://maps.google.com/..."
            />
          </div>

          <Field
            label="Latitude"
            value={latitude}
            onChange={setLatitude}
            placeholder="-23.550520"
          />

          <Field
            label="Longitude"
            value={longitude}
            onChange={setLongitude}
            placeholder="-46.633308"
          />

          <div className="md:col-span-2">
            <TextAreaField
              label="Instruções de acesso"
              value={instructions}
              onChange={setInstructions}
              placeholder="Descreva portões, estacionamento, retirada de credencial, acesso especial..."
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
        title="Imagens, página e políticas"
        description="Faça upload das imagens e complete textos extras, regras e políticas do evento."
      >
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-black text-slate-950">
              Imagens do evento
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Envie imagens direto do computador. A API salva e devolve uma URL
              interna para o evento.
            </p>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <EventImageUploadField
                label="Imagem de capa"
                kind="cover"
                value={coverImageUrl}
                onChange={setCoverImageUrl}
                helper="Usada em cards e listagens."
              />

              <EventImageUploadField
                label="Banner principal"
                kind="banner"
                value={bannerImageUrl}
                onChange={setBannerImageUrl}
                helper="Usado no topo da página do evento."
              />

              <EventImageUploadField
                label="Thumbnail"
                kind="thumbnail"
                value={thumbnailUrl}
                onChange={setThumbnailUrl}
                helper="Imagem menor para áreas compactas."
              />

              <EventImageUploadField
                label="Banner mobile"
                kind="mobile-banner"
                value={mobileBannerUrl}
                onChange={setMobileBannerUrl}
                helper="Imagem otimizada para celular."
              />

              <EventImageUploadField
                label="Mapa de setores em imagem"
                kind="sector-map"
                value={sectorMapImageUrl}
                onChange={setSectorMapImageUrl}
                helper="Opcional para mostrar visão geral de setores."
              />

              <EventImageUploadField
                label="Adicionar foto à galeria"
                kind="gallery"
                value={lastGalleryUploadUrl}
                onChange={handleGalleryUploaded}
                helper="Cada upload entra na galeria do evento."
              />
            </div>

            {galleryPreview.length > 0 ? (
              <div className="mt-5 rounded-[26px] border border-slate-200 bg-white p-5">
                <p className="text-sm font-black text-slate-800">
                  Galeria enviada
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {galleryPreview.map((url) => (
                    <div
                      key={url}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={url}
                        alt="Imagem da galeria"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-950">
              Conteúdo da página
            </h3>

            <div className="mt-5 grid gap-5">
              <Field
                label="Headline"
                value={headline}
                onChange={setHeadline}
                placeholder="Uma chamada forte para vender o evento"
              />

              <TextAreaField
                label="Resumo"
                value={summary}
                onChange={setSummary}
                placeholder="Resumo do evento para o topo da página"
              />

              <TextAreaField
                label="Descrição completa"
                value={fullDescription}
                onChange={setFullDescription}
                placeholder="Conteúdo principal da página de compra"
                minHeight="min-h-[180px]"
              />

              <TextAreaField
                label="Atrações"
                value={attractions}
                onChange={setAttractions}
                placeholder="Line-up, artistas, convidados, atividades..."
              />

              <TextAreaField
                label="Programação"
                value={schedule}
                onChange={setSchedule}
                placeholder="Horários, abertura, shows, intervalos..."
              />

              <TextAreaField
                label="Detalhes de setores"
                value={sectorDetails}
                onChange={setSectorDetails}
                placeholder="Informações sobre pistas, camarotes, mesas..."
              />

              <TextAreaField
                label="Informações importantes"
                value={importantInfo}
                onChange={setImportantInfo}
                placeholder="Regras de acesso, horários, abertura dos portões..."
              />

              <TextAreaField
                label="FAQ"
                value={faq}
                onChange={setFaq}
                placeholder="Dúvidas frequentes"
              />

              <TextAreaField
                label="Sobre o produtor"
                value={producerDescription}
                onChange={setProducerDescription}
                placeholder="Descrição do organizador/produtor"
              />

              <TextAreaField
                label="Instruções de compra"
                value={purchaseInstructions}
                onChange={setPurchaseInstructions}
                placeholder="Mensagens para orientar o comprador"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-black text-slate-950">
              Políticas e regras
            </h3>

            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <Field
                label="Classificação indicativa"
                value={ageRating}
                onChange={setAgeRating}
                placeholder="Livre, 16 anos, 18 anos..."
              />

              <Field
                label="Observações dos termos"
                value={termsNotes}
                onChange={setTermsNotes}
                placeholder="Notas gerais dos termos"
              />

              <div className="md:col-span-2">
                <TextAreaField
                  label="Política de reembolso"
                  value={refundPolicy}
                  onChange={setRefundPolicy}
                  placeholder="Explique as regras de cancelamento e reembolso"
                />
              </div>

              <div className="md:col-span-2">
                <TextAreaField
                  label="Política de meia-entrada"
                  value={halfEntryPolicy}
                  onChange={setHalfEntryPolicy}
                  placeholder="Explique documentos aceitos e validação"
                />
              </div>

              <div className="md:col-span-2">
                <TextAreaField
                  label="Política de transferência"
                  value={transferPolicy}
                  onChange={setTransferPolicy}
                  placeholder="Explique se o ingresso pode ser transferido"
                />
              </div>

              <div className="md:col-span-2">
                <TextAreaField
                  label="Regras de entrada"
                  value={entryRules}
                  onChange={setEntryRules}
                  placeholder="Documento obrigatório, horários, pulseiras, revista..."
                />
              </div>

              <div className="md:col-span-2">
                <TextAreaField
                  label="Regras de documentos"
                  value={documentRules}
                  onChange={setDocumentRules}
                  placeholder="Documento com foto, comprovantes, credenciais..."
                />
              </div>
            </div>
          </div>
        </div>
      </StepShell>
    );
  }

  function renderReviewStep() {
    const allRequiredStepsDone = stepDefinitions
      .filter((step) => step.id !== "review")
      .every((step) => stepCompletion[step.id]);

    return (
      <StepShell
        eyebrow="Etapa 9"
        title="Revisão final"
        description="Confira os principais dados antes de criar o evento."
        nextLabel={saving ? "Salvando..." : "Criar evento"}
        onNext={() => {
          const fakeEvent = {
            preventDefault: () => undefined,
          } as FormEvent;

          void handleSubmit(fakeEvent);
        }}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <MiniStat label="Categoria" value={preset.label} />
          <MiniStat label="Ocupação" value={getOccupancyLabel(occupancyMode)} />
          <MiniStat label="Sessões" value={sessions.length} />
          <MiniStat label="Setores" value={sectors.length} />
          <MiniStat label="Mapa" value={`${mapObjects.length} objeto(s)`} />
          <MiniStat label="Ingressos" value={validTicketTypes.length} />
          <MiniStat label="Quantidade total" value={totalTicketQuantity} />
          <MiniStat label="Data principal" value={formatDatePreview(primaryEventDate)} />
        </div>

        <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xl font-black text-slate-950">
            {name || "Evento sem nome"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {shortDescription || description || "Sem descrição cadastrada."}
          </p>

          <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
            <p>
              <strong>Produtora:</strong>{" "}
              {selectedOrganizer?.tradeName ||
                selectedOrganizer?.legalName ||
                "Não selecionada"}
            </p>
            <p>
              <strong>Local:</strong>{" "}
              {[venueName, city, stateName].filter(Boolean).join(", ") ||
                "Local a confirmar"}
            </p>
            <p>
              <strong>Status:</strong> {status}
            </p>
            <p>
              <strong>Capacidade:</strong> {Number(capacity || 0).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        {!allRequiredStepsDone ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
            Ainda existem etapas pendentes. Volte no menu lateral e conclua antes
            de salvar.
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Tudo pronto para criar o evento.
          </div>
        )}
      </StepShell>
    );
  }

  function renderActiveStep() {
    const currentStep = stepDefinitions[activeStepIndex];

    if (!currentStep) return renderTypeStep();

    if (currentStep.id === "type") return renderTypeStep();
    if (currentStep.id === "basic") return renderBasicStep();
    if (currentStep.id === "sessions") return renderSessionsStep();
    if (currentStep.id === "sectors") return renderSectorsStep();
    if (currentStep.id === "map") return renderMapStep();
    if (currentStep.id === "tickets") return renderTicketsStep();
    if (currentStep.id === "location") return renderLocationStep();
    if (currentStep.id === "extras") return renderExtrasStep();
    if (currentStep.id === "review") return renderReviewStep();

    return renderTypeStep();
  }

  if (loadingOrganizers) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 py-8">
        <section className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-bold text-slate-600">
            Carregando produtoras...
          </p>
        </section>
      </main>
    );
  }

  if (organizers.length === 0) {
    return (
      <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-8">
        <section className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-sm md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />

          <div className="relative z-10">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
              Novo evento
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-5xl">
              Antes de criar eventos, cadastre sua produtora.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              A produtora será usada para separar eventos, pedidos, operadores,
              relatórios e regras comerciais.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/admin/organizers/new"
                className="rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-950 transition hover:bg-slate-100"
              >
                Cadastrar produtora
              </Link>

              <Link
                href="/admin/events"
                className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-sm font-black text-white transition hover:bg-white/15"
              >
                Voltar para eventos
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[1180px] px-4 pb-14 pt-8">
      <section className="relative overflow-hidden rounded-[36px] bg-slate-950 p-8 text-white shadow-sm md:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.25),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.28),transparent_32%)]" />
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-white/60">
              Cadastro de evento
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
              Crie o evento por etapas.
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/70">
              Cada etapa libera a próxima. Assim o cadastro fica organizado e
              evita campos demais aparecendo de uma só vez.
            </p>
          </div>

          <Link
            href="/admin/events"
            className="rounded-2xl border border-white/20 bg-white/10 px-5 py-4 text-center text-sm font-black text-white transition hover:bg-white/15"
          >
            Voltar para eventos
          </Link>
        </div>
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-4">
        <MiniStat label="Categoria" value={preset.label} />
        <MiniStat label="Ocupação" value={getOccupancyLabel(occupancyMode)} />
        <MiniStat label="Etapa atual" value={`${activeStepIndex + 1}/9`} />
        <MiniStat label="Mapa" value={`${mapObjects.length} lugar(es)`} />
      </section>

      <form
        onSubmit={handleSubmit}
        className="mt-8 grid gap-7 lg:grid-cols-[360px_minmax(0,1fr)]"
      >
        <StepNavigation />

        <div>{renderActiveStep()}</div>
      </form>
    </main>
  );
}