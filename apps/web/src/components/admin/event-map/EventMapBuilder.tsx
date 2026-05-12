"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export type EventMapObjectType =
  | "AREA"
  | "TABLE"
  | "SEAT"
  | "STAGE"
  | "AISLE"
  | "BOOTH"
  | "BLOCKED_SPACE";

export type MapRole =
  | "SECTOR"
  | "STAGE"
  | "AISLE"
  | "BLOCKED"
  | "OPERATIONAL";

export type OperationalType =
  | "BAR"
  | "RESTROOM"
  | "ENTRANCE"
  | "EXIT"
  | "EMERGENCY"
  | "ACCESSIBILITY";

export type EventMapSector = {
  localId: string;
  name: string;
  color?: string;
  kind?: string;
  capacity?: string;
  allowMultipleSpaces?: boolean;
};

export type EventMapPoint = {
  x: number;
  y: number;
  curve?: boolean;
  cx?: number;
  cy?: number;
};

export type EventMapObject = {
  localId: string;
  venueSectorLocalId: string;
  code: string;
  label: string;
  type: EventMapObjectType;
  capacity: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  status: string;
  metadata?: {
    shape?: "RECT" | "ELLIPSE" | "POLYGON" | "PATH";
    points?: EventMapPoint[];
    role?: MapRole;
    operationalType?: OperationalType;
    customColor?: string;
    generatedBy?: "manual" | "assistant";
    prompt?: string;
  };
};

type Props = {
  sectors: EventMapSector[];
  value: EventMapObject[];
  onChange: (nextObjects: EventMapObject[]) => void;
  width?: number;
  height?: number;
};

type Tool = "select" | "pen" | "rect" | "square" | "circle" | "stagePen" | "aislePen" | "blockedPen";
type DrawRole = "SECTOR" | "STAGE" | "AISLE" | "BLOCKED";
type StagePreset = "RECT" | "T" | "RUNWAY" | "CIRCLE";
type AislePreset = "STRAIGHT" | "L" | "CURVE";

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type DragState =
  | {
      kind: "object";
      objectId: string;
      startX: number;
      startY: number;
      original: EventMapObject;
    }
  | {
      kind: "resize";
      objectId: string;
      handle: ResizeHandle;
      startX: number;
      startY: number;
      original: EventMapObject;
    }
  | {
      kind: "point";
      objectId: string;
      pointIndex: number;
    }
  | {
      kind: "curveControl";
      objectId: string;
      pointIndex: number;
    };

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 900;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3001/v1";

const TOOL_LABELS: Record<Tool, string> = {
  select: "Selecionar",
  pen: "Caneta",
  rect: "Retângulo",
  square: "Quadrado",
  circle: "Círculo",
  stagePen: "Caneta palco",
  aislePen: "Caneta corredor",
  blockedPen: "Caneta bloqueio",
};

const PRIMARY_TOOLS: Tool[] = ["select", "pen", "rect", "square", "circle"];

const DRAW_ROLE_LABELS: Record<DrawRole, string> = {
  SECTOR: "Setor",
  STAGE: "Palco",
  AISLE: "Corredor",
  BLOCKED: "Bloqueio",
};

const OPERATIONAL_LABELS: Record<OperationalType, string> = {
  BAR: "Bar",
  RESTROOM: "Banheiro",
  ENTRANCE: "Entrada",
  EXIT: "Saída",
  EMERGENCY: "Emergência",
  ACCESSIBILITY: "Acessibilidade",
};

const ROLE_LABELS: Record<MapRole, string> = {
  SECTOR: "Setor de venda",
  STAGE: "Palco",
  AISLE: "Corredor",
  BLOCKED: "Bloqueio",
  OPERATIONAL: "Operacional",
};

const STATUS_OPTIONS = ["AVAILABLE", "UNAVAILABLE", "RESERVED", "BLOCKED"];

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function distance(a: EventMapPoint, b: EventMapPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: EventMapPoint, b: EventMapPoint) {
  return {
    x: Math.round((a.x + b.x) / 2),
    y: Math.round((a.y + b.y) / 2),
  };
}

function boundsFromPoints(points: EventMapPoint[]) {
  const xs = points.flatMap((point) =>
    point.cx === undefined ? [point.x] : [point.x, point.cx],
  );
  const ys = points.flatMap((point) =>
    point.cy === undefined ? [point.y] : [point.y, point.cy],
  );

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function normalizePoints(points: EventMapPoint[]) {
  const bounds = boundsFromPoints(points);

  return {
    bounds,
    points: points.map((point) => ({
      ...point,
      x: Math.round(point.x - bounds.x),
      y: Math.round(point.y - bounds.y),
      cx: point.cx === undefined ? undefined : Math.round(point.cx - bounds.x),
      cy: point.cy === undefined ? undefined : Math.round(point.cy - bounds.y),
    })),
  };
}

function absolutePoints(object: EventMapObject) {
  const points = object.metadata?.points || [];

  return points.map((point) => ({
    ...point,
    x: point.x + object.x,
    y: point.y + object.y,
    cx: point.cx === undefined ? undefined : point.cx + object.x,
    cy: point.cy === undefined ? undefined : point.cy + object.y,
  }));
}

function pathFromPoints(points: EventMapPoint[], closed = true) {
  if (points.length === 0) return "";

  const [first, ...rest] = points;
  const commands = [`M ${first.x} ${first.y}`];

  rest.forEach((point, index) => {
    const previous = points[index];

    if (point.curve) {
      const cx = point.cx ?? (previous.x + point.x) / 2;
      const cy = point.cy ?? (previous.y + point.y) / 2;
      commands.push(`Q ${cx} ${cy} ${point.x} ${point.y}`);
      return;
    }

    commands.push(`L ${point.x} ${point.y}`);
  });

  if (closed && points.length > 2) {
    commands.push("Z");
  }

  return commands.join(" ");
}

function sectorUsedCount(objects: EventMapObject[], sectorId: string) {
  return objects.filter(
    (object) =>
      object.metadata?.role === "SECTOR" &&
      object.venueSectorLocalId === sectorId,
  ).length;
}

function objectColor(object: EventMapObject, sector?: EventMapSector) {
  if (object.metadata?.customColor) return object.metadata.customColor;
  if (object.type === "STAGE") return "#facc15";
  if (object.type === "AISLE") return "#94a3b8";
  if (object.type === "BLOCKED_SPACE") return "#ef4444";
  if (object.metadata?.role === "OPERATIONAL") return "#14b8a6";
  return sector?.color || "#2563eb";
}

function objectTextColor(object: EventMapObject) {
  return object.type === "STAGE" ? "#020617" : "#ffffff";
}

function typeLabel(type: EventMapObjectType) {
  const labels: Record<EventMapObjectType, string> = {
    AREA: "Área",
    TABLE: "Mesa",
    SEAT: "Assento",
    STAGE: "Palco",
    AISLE: "Corredor",
    BOOTH: "Camarote",
    BLOCKED_SPACE: "Bloqueio",
  };

  return labels[type];
}

function roleFromTool(tool: Tool): MapRole {
  if (tool === "stagePen") return "STAGE";
  if (tool === "aislePen") return "AISLE";
  if (tool === "blockedPen") return "BLOCKED";
  return "SECTOR";
}

function typeFromTool(tool: Tool): EventMapObjectType {
  if (tool === "stagePen") return "STAGE";
  if (tool === "aislePen") return "AISLE";
  if (tool === "blockedPen") return "BLOCKED_SPACE";
  return "AREA";
}

function labelFromTool(tool: Tool, sector?: EventMapSector) {
  if (tool === "stagePen") return "Palco";
  if (tool === "aislePen") return "Corredor";
  if (tool === "blockedPen") return "Bloqueio";
  return sector?.name || "Setor";
}

function typeFromDrawRole(role: DrawRole): EventMapObjectType {
  if (role === "STAGE") return "STAGE";
  if (role === "AISLE") return "AISLE";
  if (role === "BLOCKED") return "BLOCKED_SPACE";
  return "AREA";
}

function roleLabel(role: DrawRole, sector?: EventMapSector) {
  if (role === "STAGE") return "Palco";
  if (role === "AISLE") return "Corredor";
  if (role === "BLOCKED") return "Bloqueio";
  return sector?.name || "Setor";
}

function roleFromLegacyTool(tool: Tool): DrawRole {
  if (tool === "stagePen") return "STAGE";
  if (tool === "aislePen") return "AISLE";
  if (tool === "blockedPen") return "BLOCKED";
  return "SECTOR";
}

function defaultShapeSize(tool: Tool, role: DrawRole) {
  if (tool === "circle") {
    return role === "STAGE" ? { width: 260, height: 160 } : { width: 190, height: 190 };
  }

  if (tool === "square") {
    return { width: 190, height: 190 };
  }

  if (role === "AISLE") {
    return { width: 460, height: 64 };
  }

  if (role === "STAGE") {
    return { width: 360, height: 100 };
  }

  if (role === "BLOCKED") {
    return { width: 230, height: 130 };
  }

  return { width: 280, height: 160 };
}

function createStagePoints(preset: StagePreset) {
  if (preset === "T") {
    return [
      { x: 0, y: 0 },
      { x: 360, y: 0 },
      { x: 360, y: 90 },
      { x: 220, y: 90 },
      { x: 220, y: 210 },
      { x: 140, y: 210 },
      { x: 140, y: 90 },
      { x: 0, y: 90 },
    ];
  }

  if (preset === "RUNWAY") {
    return [
      { x: 0, y: 0 },
      { x: 420, y: 0 },
      { x: 420, y: 90 },
      { x: 260, y: 90 },
      { x: 260, y: 270 },
      { x: 160, y: 270 },
      { x: 160, y: 90 },
      { x: 0, y: 90 },
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: 360, y: 0 },
    { x: 360, y: 100 },
    { x: 0, y: 100 },
  ];
}

function createAislePoints(preset: AislePreset) {
  if (preset === "L") {
    return [
      { x: 0, y: 0 },
      { x: 360, y: 0 },
      { x: 360, y: 70 },
      { x: 80, y: 70 },
      { x: 80, y: 330 },
      { x: 0, y: 330 },
    ];
  }

  if (preset === "CURVE") {
    return [
      { x: 0, y: 55 },
      { x: 260, y: 0, curve: true, cx: 120, cy: -45 },
      { x: 520, y: 55, curve: true, cx: 400, cy: -45 },
      { x: 520, y: 110 },
      { x: 260, y: 60, curve: true, cx: 400, cy: 150 },
      { x: 0, y: 110, curve: true, cx: 120, cy: 150 },
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: 520, y: 0 },
    { x: 520, y: 64 },
    { x: 0, y: 64 },
  ];
}

function splitMapLabel(label: string, maxChars: number, maxLines = 2) {
  const words = String(label || "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (next.length <= maxChars) {
      current = next;
      return;
    }

    if (current) {
      lines.push(current);
      current = word;
      return;
    }

    lines.push(word.slice(0, maxChars));
    current = word.slice(maxChars);
  });

  if (current) {
    lines.push(current);
  }

  const finalLines = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    finalLines[maxLines - 1] = `${finalLines[maxLines - 1].slice(0, Math.max(4, maxChars - 1))}…`;
  }

  return finalLines;
}

function getLabelFontSize(object: EventMapObject) {
  const role = object.metadata?.role;
  const minSide = Math.min(object.width, object.height);

  if (role === "OPERATIONAL") return 15;
  if (object.type === "AISLE") return 16;
  if (object.type === "STAGE") return 18;
  if (minSide < 70) return 13;
  if (object.width < 150) return 14;
  if (object.width < 260) return 17;

  return 21;
}

function getLabelMaxChars(object: EventMapObject) {
  if (object.metadata?.role === "OPERATIONAL") return 16;
  if (object.type === "AISLE") return 22;
  if (object.width < 110) return 9;
  if (object.width < 180) return 12;
  if (object.width < 280) return 17;

  return 24;
}

function renderStaticObject({
  object,
  sectors,
  active,
  onPointerDown,
  widthScale = 1,
}: {
  object: EventMapObject;
  sectors: EventMapSector[];
  active?: boolean;
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
  widthScale?: number;
}) {
  const sector = sectors.find((item) => item.localId === object.venueSectorLocalId);
  const color = objectColor(object, sector);
  const points = absolutePoints(object);
  const hasPoints = points.length >= 3;
  const shape = object.metadata?.shape || "RECT";
  const role = object.metadata?.role;
  const labelX = object.x + object.width / 2;
  const labelY = object.y + object.height / 2;
  const fontSize = getLabelFontSize(object);
  const lineHeight = Math.round(fontSize * 1.18);
  const maxChars = getLabelMaxChars(object);
  const labelLines = splitMapLabel(object.label, maxChars, object.width < 85 ? 1 : 2);
  const maxLineLength = Math.max(...labelLines.map((line) => line.length), 1);
  const estimatedTextWidth = Math.min(
    Math.max(74, maxLineLength * fontSize * 0.58 + 26),
    Math.max(92, object.width * 1.02),
  );
  const labelBoxHeight = labelLines.length * lineHeight + 12;
  const showLabel = object.width >= 42 && object.height >= 28;
  const labelBoxColor =
    role === "OPERATIONAL"
      ? "rgba(2, 44, 34, 0.72)"
      : object.type === "AISLE"
        ? "rgba(15, 23, 42, 0.58)"
        : object.type === "STAGE"
          ? "rgba(250, 204, 21, 0.74)"
          : "rgba(15, 23, 42, 0.50)";
  const labelColor = object.type === "STAGE" ? "#020617" : "#ffffff";
  const shapeOpacity =
    object.type === "AISLE"
      ? 0.82
      : role === "OPERATIONAL"
        ? 0.90
        : 0.94;

  const commonProps = {
    onPointerDown,
    className: onPointerDown ? "cursor-move transition" : "transition",
    fill: color,
    opacity: shapeOpacity,
    stroke: active ? "#38bdf8" : "rgba(255,255,255,0.72)",
    strokeWidth: active ? 4 * widthScale : 1.8 * widthScale,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    style: {
      filter: active
        ? "drop-shadow(0px 0px 13px rgba(56,189,248,0.85))"
        : "drop-shadow(0px 10px 16px rgba(0,0,0,0.28))",
    },
  };

  return (
    <g
      key={object.localId}
      transform={`rotate(${object.rotation || 0} ${labelX} ${labelY})`}
    >
      {hasPoints ? (
        <path {...commonProps} d={pathFromPoints(points)} />
      ) : shape === "ELLIPSE" || object.type === "SEAT" || object.type === "TABLE" ? (
        <ellipse
          {...commonProps}
          cx={labelX}
          cy={labelY}
          rx={Math.max(12, object.width / 2)}
          ry={Math.max(12, object.height / 2)}
        />
      ) : (
        <rect
          {...commonProps}
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          rx={object.type === "AISLE" ? 14 : role === "OPERATIONAL" ? 22 : 18}
        />
      )}

      {showLabel ? (
        <g className="pointer-events-none select-none">
          <rect
            x={labelX - estimatedTextWidth / 2}
            y={labelY - labelBoxHeight / 2}
            width={estimatedTextWidth}
            height={labelBoxHeight}
            rx={Math.min(18, labelBoxHeight / 2)}
            fill={labelBoxColor}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1}
          />
          <text
            x={labelX}
            y={labelY - ((labelLines.length - 1) * lineHeight) / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={labelColor}
            style={{
              fontSize,
              fontWeight: 900,
              paintOrder: "stroke",
              stroke: object.type === "STAGE" ? "rgba(255,255,255,0.45)" : "rgba(2,6,23,0.45)",
              strokeWidth: 2,
              letterSpacing: role === "OPERATIONAL" ? 0.2 : 0,
            }}
          >
            {labelLines.map((line, index) => (
              <tspan key={`${object.localId}-label-${index}`} x={labelX} dy={index === 0 ? 0 : lineHeight}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      ) : null}
    </g>
  );
}


function MapPreview({
  sectors,
  objects,
  width,
  height,
}: {
  sectors: EventMapSector[];
  objects: EventMapObject[];
  width: number;
  height: number;
}) {
  return (
    <div className="rounded-[28px] bg-slate-950 p-4">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="aspect-[1280/900] w-full overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[length:40px_40px]"
      >
        <rect width={width} height={height} fill="transparent" />
        {objects.length > 0 ? (
          objects.map((object) =>
            renderStaticObject({
              object,
              sectors,
            }),
          )
        ) : (
          <text
            x={width / 2}
            y={height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#94a3b8"
            className="text-[34px] font-black"
          >
            Mapa ainda não criado
          </text>
        )}
      </svg>
    </div>
  );
}

export default function EventMapBuilder({
  sectors,
  value,
  onChange,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: Props) {
  const [studioOpen, setStudioOpen] = useState(false);
  const [draftObjects, setDraftObjects] = useState<EventMapObject[]>(value);

  useEffect(() => {
    if (!studioOpen) {
      setDraftObjects(value);
    }
  }, [value, studioOpen]);

  function openStudio() {
    setDraftObjects(value);
    setStudioOpen(true);
  }

  function saveStudio(nextObjects: EventMapObject[]) {
    onChange(nextObjects);
    setDraftObjects(nextObjects);
    setStudioOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-600">
              Mapa do evento
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">
              Visualização do mapa
            </h3>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Abra o criador para desenhar em tela grande, pedir ajuda ao assistente
              e salvar o mapa. Depois de salvar, você volta para esta etapa do carrossel.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openStudio}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-sky-700"
            >
              Abrir criador de mapa
            </button>
            {value.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-700 transition hover:bg-rose-100"
              >
                Limpar mapa
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5">
          <MapPreview sectors={sectors} objects={value} width={width} height={height} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Setores
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">{sectors.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Desenhos
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">{value.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Palcos
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {value.filter((object) => object.type === "STAGE").length}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
              Operação
            </p>
            <p className="mt-1 text-xl font-black text-slate-950">
              {value.filter((object) => object.metadata?.role === "OPERATIONAL").length}
            </p>
          </div>
        </div>
      </div>

      {studioOpen ? (
        <MapStudio
          sectors={sectors}
          initialObjects={draftObjects}
          width={width}
          height={height}
          onCancel={() => {
            setDraftObjects(value);
            setStudioOpen(false);
          }}
          onSave={saveStudio}
        />
      ) : null}
    </div>
  );
}

function MapStudio({
  sectors,
  initialObjects,
  width,
  height,
  onCancel,
  onSave,
}: {
  sectors: EventMapSector[];
  initialObjects: EventMapObject[];
  width: number;
  height: number;
  onCancel: () => void;
  onSave: (nextObjects: EventMapObject[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [objects, setObjects] = useState<EventMapObject[]>(initialObjects);
  const [tool, setTool] = useState<Tool>("select");
  const [drawRole, setDrawRole] = useState<DrawRole>("SECTOR");
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [selectedSectorId, setSelectedSectorId] = useState(sectors[0]?.localId || "");
  const [multiSpaceSectorIds, setMultiSpaceSectorIds] = useState<string[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ clientX: 0, clientY: 0, x: 0, y: 0 });
  const [drawingPoints, setDrawingPoints] = useState<EventMapPoint[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantReferenceImage, setAssistantReferenceImage] = useState<{
    name: string;
    mimeType: string;
    dataUrl: string;
  } | null>(null);
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      role: "assistant",
      content:
        "Sou o assistente do mapa. Posso sugerir disposição dos setores, palco, corredores, entradas, bares e banheiros. Descreva o que você quer.",
    },
  ]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;

      const tagName = target.tagName.toLowerCase();

      return (
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target.isContentEditable
      );
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;

      const key = event.key.toLowerCase();

      if (event.code === "Space") {
        event.preventDefault();
        setSpacePressed(true);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (key === "+" || key === "=")) {
        event.preventDefault();
        zoomIn();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "-") {
        event.preventDefault();
        zoomOut();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "0") {
        event.preventDefault();
        resetZoom();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();

        if (drawingPoints.length > 0) {
          setDrawingPoints((current) => current.slice(0, -1));
          setNotice("Último ponto removido.");
          return;
        }

        setNotice("Use Ctrl+Z enquanto estiver desenhando para remover o último ponto.");
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedObjectId) return;

        event.preventDefault();
        removeObject(selectedObjectId);
        setNotice("Forma selecionada removida.");
        return;
      }

      if (event.key === "Escape") {
        if (drawingPoints.length > 0) {
          event.preventDefault();
          setDrawingPoints([]);
          setNotice("Desenho cancelado.");
          return;
        }

        if (selectedObjectId) {
          event.preventDefault();
          setSelectedObjectId("");
          setNotice("Seleção removida.");
        }
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") {
        setSpacePressed(false);
        setIsPanning(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [drawingPoints.length, selectedObjectId, zoom, pan.x, pan.y, objects.length]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyHeight = document.body.style.height;
    const previousHtmlHeight = document.documentElement.style.height;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.height = "100%";
    document.documentElement.style.height = "100%";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.height = previousBodyHeight;
      document.documentElement.style.height = previousHtmlHeight;
    };
  }, []);

  const selectedObject = useMemo(
    () => objects.find((object) => object.localId === selectedObjectId) || null,
    [selectedObjectId, objects],
  );

  const selectedSector = useMemo(
    () => sectors.find((sector) => sector.localId === selectedSectorId),
    [sectors, selectedSectorId],
  );

  const availableSectors = useMemo(
    () =>
      sectors.map((sector) => {
        const usedCount = sectorUsedCount(objects, sector.localId);
        const localMulti = multiSpaceSectorIds.includes(sector.localId);
        const canRepeat = Boolean(sector.allowMultipleSpaces || localMulti);
        const unavailable = usedCount > 0 && !canRepeat;

        return {
          ...sector,
          usedCount,
          localMulti,
          canRepeat,
          unavailable,
        };
      }),
    [sectors, objects, multiSpaceSectorIds],
  );

  const selectedSectorAvailability = useMemo(
    () => availableSectors.find((sector) => sector.localId === selectedSectorId),
    [availableSectors, selectedSectorId],
  );

  function updateObjects(updater: (current: EventMapObject[]) => EventMapObject[]) {
    setObjects(updater);
  }

  function updateObject(objectId: string, patch: Partial<EventMapObject>) {
    updateObjects((current) =>
      current.map((object) =>
        object.localId === objectId ? { ...object, ...patch } : object,
      ),
    );
  }

  function updateObjectMetadata(
    object: EventMapObject,
    metadata: NonNullable<EventMapObject["metadata"]>,
  ) {
    updateObject(object.localId, {
      metadata: {
        ...object.metadata,
        ...metadata,
      },
    });
  }

  function removeObject(objectId: string) {
    updateObjects((current) => current.filter((object) => object.localId !== objectId));

    if (selectedObjectId === objectId) {
      setSelectedObjectId("");
    }
  }

  function duplicateObject(object: EventMapObject) {
    const nextObject: EventMapObject = {
      ...object,
      localId: makeId("map-copy"),
      code: `${object.code || object.type}-COPY`,
      label: `${object.label} cópia`,
      x: object.x + 36,
      y: object.y + 36,
      metadata: {
        ...object.metadata,
        points: object.metadata?.points
          ? object.metadata.points.map((point) => ({ ...point }))
          : undefined,
      },
    };

    updateObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.localId);
    setNotice("Objeto duplicado.");
  }

  function updateSelectedObjectNumber(
    object: EventMapObject,
    field: "x" | "y" | "width" | "height" | "rotation",
    value: string,
  ) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return;

    if (field === "width" || field === "height") {
      updateObject(object.localId, {
        [field]: Math.max(20, Math.round(parsed)),
      });
      return;
    }

    updateObject(object.localId, {
      [field]: Math.round(parsed),
    });
  }

  function getPanBounds(visibleWidth: number, visibleHeight: number) {
    const marginX = visibleWidth * 0.75;
    const marginY = visibleHeight * 0.75;

    return {
      minX: -marginX,
      maxX: width + marginX - visibleWidth,
      minY: -marginY,
      maxY: height + marginY - visibleHeight,
    };
  }

  function clampPan(nextPan: { x: number; y: number }, visibleWidth: number, visibleHeight: number) {
    const bounds = getPanBounds(visibleWidth, visibleHeight);

    return {
      x: clamp(nextPan.x, bounds.minX, bounds.maxX),
      y: clamp(nextPan.y, bounds.minY, bounds.maxY),
    };
  }

  function getVisibleViewBox() {
    const safeZoom = Math.max(0.35, Math.min(4, zoom));
    const visibleWidth = width / safeZoom;
    const visibleHeight = height / safeZoom;
    const nextPan = clampPan(pan, visibleWidth, visibleHeight);

    return {
      x: Math.round(nextPan.x),
      y: Math.round(nextPan.y),
      width: Math.round(visibleWidth),
      height: Math.round(visibleHeight),
    };
  }

  function setZoomKeepingCenter(nextZoom: number) {
    const current = getVisibleViewBox();
    const centerX = current.x + current.width / 2;
    const centerY = current.y + current.height / 2;
    const safeZoom = Math.max(0.35, Math.min(4, nextZoom));
    const nextWidth = width / safeZoom;
    const nextHeight = height / safeZoom;

    setZoom(safeZoom);
    setPan(clampPan({
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
    }, nextWidth, nextHeight));
  }

  function zoomIn() {
    setZoomKeepingCenter(zoom * 1.25);
  }

  function zoomOut() {
    setZoomKeepingCenter(zoom / 1.25);
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function centerCanvas() {
    const safeZoom = Math.max(0.35, Math.min(4, zoom));
    const visibleWidth = width / safeZoom;
    const visibleHeight = height / safeZoom;

    setPan(clampPan({
      x: width / 2 - visibleWidth / 2,
      y: height / 2 - visibleHeight / 2,
    }, visibleWidth, visibleHeight));
  }

  function fitAllObjects() {
    if (objects.length === 0) {
      resetZoom();
      return;
    }

    const minX = Math.min(...objects.map((object) => object.x));
    const minY = Math.min(...objects.map((object) => object.y));
    const maxX = Math.max(...objects.map((object) => object.x + object.width));
    const maxY = Math.max(...objects.map((object) => object.y + object.height));
    const padding = 90;
    const boxWidth = Math.max(120, maxX - minX + padding * 2);
    const boxHeight = Math.max(120, maxY - minY + padding * 2);
    const nextZoom = Math.max(0.35, Math.min(4, Math.min(width / boxWidth, height / boxHeight)));

    const visibleWidth = width / nextZoom;
    const visibleHeight = height / nextZoom;

    setZoom(nextZoom);
    setPan(clampPan({
      x: minX - padding,
      y: minY - padding,
    }, visibleWidth, visibleHeight));
  }

  function focusSelectedObject() {
    if (!selectedObject) return;

    const nextZoom = Math.max(1.5, zoom);
    const visibleWidth = width / nextZoom;
    const visibleHeight = height / nextZoom;
    const centerX = selectedObject.x + selectedObject.width / 2;
    const centerY = selectedObject.y + selectedObject.height / 2;

    setZoom(nextZoom);
    setPan(clampPan({
      x: centerX - visibleWidth / 2,
      y: centerY - visibleHeight / 2,
    }, visibleWidth, visibleHeight));
  }

  function movePan(deltaX: number, deltaY: number) {
    const current = getVisibleViewBox();

    setPan(clampPan({
      x: current.x + deltaX,
      y: current.y + deltaY,
    }, current.width, current.height));
  }

  function pointFromEvent(event: ReactPointerEvent<SVGSVGElement | SVGElement>) {
    const svg = svgRef.current;
    const rect = svg?.getBoundingClientRect();

    if (!rect) {
      return {
        x: 0,
        y: 0,
      };
    }

    const viewBox = getVisibleViewBox();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;

    return {
      x: Math.round(clamp(viewBox.x + (event.clientX - rect.left) * scaleX, 0, width)),
      y: Math.round(clamp(viewBox.y + (event.clientY - rect.top) * scaleY, 0, height)),
    };
  }

  function canUseSelectedSector(role: DrawRole = drawRole) {
    if (role !== "SECTOR") return true;

    if (!selectedSector) {
      setNotice("Selecione um setor antes de desenhar.");
      return false;
    }

    if (selectedSectorAvailability?.unavailable) {
      setNotice("Este setor já foi usado. Ative '+1 espaço' para permitir outra área.");
      return false;
    }

    return true;
  }

  function createObjectFromPoints(points: EventMapPoint[], sourceTool: Tool) {
    if (points.length < 3) return;

    const role = sourceTool === "pen" ? drawRole : roleFromLegacyTool(sourceTool);

    if (!canUseSelectedSector(role)) return;

    const type = typeFromDrawRole(role);
    const isSector = role === "SECTOR";
    const normalized = normalizePoints(points);

    const nextObject: EventMapObject = {
      localId: makeId("map"),
      venueSectorLocalId: isSector ? selectedSectorId : "",
      code: `${type}-${objects.length + 1}`,
      label: roleLabel(role, selectedSector),
      type,
      capacity: isSector ? selectedSector?.capacity || "1" : "1",
      x: normalized.bounds.x,
      y: normalized.bounds.y,
      width: normalized.bounds.width,
      height: normalized.bounds.height,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        shape: "POLYGON",
        points: normalized.points,
        role,
        generatedBy: "manual",
      },
    };

    updateObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.localId);
    setDrawingPoints([]);
    setTool("select");
    setNotice("");
  }

  function createShapeAtPoint(point: EventMapPoint) {
    if (tool === "select" || tool === "pen") return;
    if (!canUseSelectedSector(drawRole)) return;

    const size = defaultShapeSize(tool, drawRole);
    const type = typeFromDrawRole(drawRole);
    const isSector = drawRole === "SECTOR";

    const nextObject: EventMapObject = {
      localId: makeId("map"),
      venueSectorLocalId: isSector ? selectedSectorId : "",
      code: `${type}-${objects.length + 1}`,
      label: roleLabel(drawRole, selectedSector),
      type,
      capacity: isSector ? selectedSector?.capacity || "1" : "1",
      x: Math.round(clamp(point.x - size.width / 2, 0, width - size.width)),
      y: Math.round(clamp(point.y - size.height / 2, 0, height - size.height)),
      width: size.width,
      height: size.height,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        shape: tool === "circle" ? "ELLIPSE" : "RECT",
        role: drawRole,
        generatedBy: "manual",
      },
    };

    updateObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.localId);
    setTool("select");
    setNotice("");
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (spacePressed || event.button === 1 || tool === "select") {
      event.preventDefault();

      if (tool === "select") {
        setSelectedObjectId("");
      }

      const current = getVisibleViewBox();
      setIsPanning(true);
      setPanStart({
        clientX: event.clientX,
        clientY: event.clientY,
        x: current.x,
        y: current.y,
      });
      return;
    }

    const point = pointFromEvent(event);

    if (tool !== "pen") {
      createShapeAtPoint(point);
      return;
    }

    if (!canUseSelectedSector(drawRole)) return;

    const firstPoint = drawingPoints[0];

    if (drawingPoints.length >= 3 && firstPoint && distance(point, firstPoint) <= 18) {
      createObjectFromPoints(drawingPoints, tool);
      return;
    }

    setDrawingPoints((current) => [...current, point]);
  }

  function startObjectDrag(
    event: ReactPointerEvent<SVGElement>,
    object: EventMapObject,
  ) {
    event.stopPropagation();

    if (tool !== "select") return;

    const point = pointFromEvent(event);

    setSelectedObjectId(object.localId);
    setDragState({
      kind: "object",
      objectId: object.localId,
      startX: point.x,
      startY: point.y,
      original: object,
    });
  }

  function startResizeDrag(
    event: ReactPointerEvent<SVGRectElement>,
    object: EventMapObject,
    handle: ResizeHandle,
  ) {
    event.stopPropagation();

    if (tool !== "select") return;

    const point = pointFromEvent(event);

    setSelectedObjectId(object.localId);
    setDragState({
      kind: "resize",
      objectId: object.localId,
      handle,
      startX: point.x,
      startY: point.y,
      original: {
        ...object,
        metadata: {
          ...object.metadata,
          points: object.metadata?.points
            ? object.metadata.points.map((item) => ({ ...item }))
            : undefined,
        },
      },
    });
  }

  function startPointDrag(
    event: ReactPointerEvent<SVGCircleElement>,
    object: EventMapObject,
    pointIndex: number,
  ) {
    event.stopPropagation();
    setSelectedObjectId(object.localId);
    setDragState({
      kind: "point",
      objectId: object.localId,
      pointIndex,
    });
  }

  function startCurveControlDrag(
    event: ReactPointerEvent<SVGCircleElement>,
    object: EventMapObject,
    pointIndex: number,
  ) {
    event.stopPropagation();
    setSelectedObjectId(object.localId);
    setDragState({
      kind: "curveControl",
      objectId: object.localId,
      pointIndex,
    });
  }

  function handleCanvasMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (isPanning) {
      const viewBox = getVisibleViewBox();
      const svg = svgRef.current;
      const rect = svg?.getBoundingClientRect();

      if (!rect) return;

      const scaleX = viewBox.width / rect.width;
      const scaleY = viewBox.height / rect.height;

      setPan(clampPan({
        x: panStart.x - (event.clientX - panStart.clientX) * scaleX,
        y: panStart.y - (event.clientY - panStart.clientY) * scaleY,
      }, viewBox.width, viewBox.height));
      return;
    }

    if (!dragState) return;

    const point = pointFromEvent(event);

    if (dragState.kind === "object") {
      const nextX = clamp(
        dragState.original.x + point.x - dragState.startX,
        0,
        width - dragState.original.width,
      );
      const nextY = clamp(
        dragState.original.y + point.y - dragState.startY,
        0,
        height - dragState.original.height,
      );

      updateObject(dragState.objectId, {
        x: Math.round(nextX),
        y: Math.round(nextY),
      });

      return;
    }

    if (dragState.kind === "resize") {
      const deltaX = point.x - dragState.startX;
      const deltaY = point.y - dragState.startY;
      const original = dragState.original;
      const minSize = 24;

      let nextX = original.x;
      let nextY = original.y;
      let nextWidth = original.width;
      let nextHeight = original.height;

      if (dragState.handle.includes("e")) {
        nextWidth = Math.max(minSize, original.width + deltaX);
      }

      if (dragState.handle.includes("s")) {
        nextHeight = Math.max(minSize, original.height + deltaY);
      }

      if (dragState.handle.includes("w")) {
        const rawWidth = original.width - deltaX;
        nextWidth = Math.max(minSize, rawWidth);
        nextX = original.x + original.width - nextWidth;
      }

      if (dragState.handle.includes("n")) {
        const rawHeight = original.height - deltaY;
        nextHeight = Math.max(minSize, rawHeight);
        nextY = original.y + original.height - nextHeight;
      }

      const originalPoints = original.metadata?.points;

      const scaledPoints = originalPoints?.length
        ? originalPoints.map((item) => {
            const scaleX = original.width ? nextWidth / original.width : 1;
            const scaleY = original.height ? nextHeight / original.height : 1;

            return {
              ...item,
              x: Math.round(item.x * scaleX),
              y: Math.round(item.y * scaleY),
              cx: item.cx === undefined ? undefined : Math.round(item.cx * scaleX),
              cy: item.cy === undefined ? undefined : Math.round(item.cy * scaleY),
            };
          })
        : undefined;

      updateObject(dragState.objectId, {
        x: Math.round(nextX),
        y: Math.round(nextY),
        width: Math.round(nextWidth),
        height: Math.round(nextHeight),
        metadata: {
          ...original.metadata,
          points: scaledPoints || original.metadata?.points,
        },
      });

      return;
    }

    const object = objects.find((item) => item.localId === dragState.objectId);

    if (!object) return;

    const points = [...(object.metadata?.points || [])];
    const currentPoint = points[dragState.pointIndex];

    if (!currentPoint) return;

    if (dragState.kind === "point") {
      points[dragState.pointIndex] = {
        ...currentPoint,
        x: Math.round(point.x - object.x),
        y: Math.round(point.y - object.y),
      };
    }

    if (dragState.kind === "curveControl") {
      points[dragState.pointIndex] = {
        ...currentPoint,
        curve: true,
        cx: Math.round(point.x - object.x),
        cy: Math.round(point.y - object.y),
      };
    }

    updateObject(object.localId, {
      metadata: {
        ...object.metadata,
        points,
      },
    });
  }

  function toggleMultiSpace(sectorId: string) {
    setMultiSpaceSectorIds((current) =>
      current.includes(sectorId)
        ? current.filter((item) => item !== sectorId)
        : [...current, sectorId],
    );
  }

  function addRectangleForSelectedSector() {
    if (!canUseSelectedSector()) return;
    if (!selectedSector) return;

    const nextObject: EventMapObject = {
      localId: makeId("map"),
      venueSectorLocalId: selectedSector.localId,
      code: `AREA-${objects.length + 1}`,
      label: selectedSector.name,
      type: "AREA",
      capacity: selectedSector.capacity || "1",
      x: 120 + (objects.length % 6) * 40,
      y: 150 + (objects.length % 5) * 40,
      width: 260,
      height: 150,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        shape: "RECT",
        role: "SECTOR",
        generatedBy: "manual",
      },
    };

    updateObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.localId);
    setNotice("");
  }

  function addObjectFromLocalPoints({
    points,
    type,
    label,
    role,
    shape = "POLYGON",
    x = 420,
    y = 80,
    capacity = "1",
    operationalType,
  }: {
    points: EventMapPoint[];
    type: EventMapObjectType;
    label: string;
    role: MapRole;
    shape?: NonNullable<EventMapObject["metadata"]>["shape"];
    x?: number;
    y?: number;
    capacity?: string;
    operationalType?: OperationalType;
  }) {
    const normalized = normalizePoints(
      points.map((point) => ({
        ...point,
        x: point.x + x,
        y: point.y + y,
        cx: point.cx === undefined ? undefined : point.cx + x,
        cy: point.cy === undefined ? undefined : point.cy + y,
      })),
    );

    const nextObject: EventMapObject = {
      localId: makeId("map"),
      venueSectorLocalId: "",
      code: `${type}-${objects.length + 1}`,
      label,
      type,
      capacity,
      x: normalized.bounds.x,
      y: normalized.bounds.y,
      width: normalized.bounds.width,
      height: normalized.bounds.height,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        shape,
        role,
        points: shape === "ELLIPSE" ? undefined : normalized.points,
        operationalType,
        generatedBy: "manual",
      },
    };

    updateObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.localId);
  }

  function addStagePreset(preset: StagePreset) {
    if (preset === "CIRCLE") {
      const nextObject: EventMapObject = {
        localId: makeId("map"),
        venueSectorLocalId: "",
        code: `STAGE-${objects.length + 1}`,
        label: "Palco circular",
        type: "STAGE",
        capacity: "1",
        x: 470,
        y: 70,
        width: 260,
        height: 150,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          shape: "ELLIPSE",
          role: "STAGE",
          generatedBy: "manual",
        },
      };

      updateObjects((current) => [...current, nextObject]);
      setSelectedObjectId(nextObject.localId);
      return;
    }

    addObjectFromLocalPoints({
      points: createStagePoints(preset),
      type: "STAGE",
      label:
        preset === "T"
          ? "Palco em T"
          : preset === "RUNWAY"
            ? "Palco com passarela"
            : "Palco retangular",
      role: "STAGE",
      x: preset === "RUNWAY" ? 390 : 430,
      y: 60,
    });
  }

  function addAislePreset(preset: AislePreset) {
    addObjectFromLocalPoints({
      points: createAislePoints(preset),
      type: "AISLE",
      label:
        preset === "L"
          ? "Corredor em L"
          : preset === "CURVE"
            ? "Corredor curvo"
            : "Corredor reto",
      role: "AISLE",
      x: 180,
      y: preset === "L" ? 250 : 500,
    });
  }

  function addBlockedArea() {
    addObjectFromLocalPoints({
      points: [
        { x: 0, y: 0 },
        { x: 220, y: 0 },
        { x: 220, y: 120 },
        { x: 0, y: 120 },
      ],
      type: "BLOCKED_SPACE",
      label: "Área bloqueada",
      role: "BLOCKED",
      x: 850,
      y: 520,
    });
  }

  function addOperationalObject(operationalType: OperationalType) {
    const nextObject: EventMapObject = {
      localId: makeId("map"),
      venueSectorLocalId: "",
      code: `${operationalType}-${objects.length + 1}`,
      label: OPERATIONAL_LABELS[operationalType],
      type: "AREA",
      capacity: "1",
      x: 980 + (objects.length % 4) * 18,
      y: 110 + (objects.length % 6) * 55,
      width: operationalType === "ENTRANCE" || operationalType === "EXIT" ? 150 : 130,
      height: 70,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        shape: "RECT",
        role: "OPERATIONAL",
        operationalType,
        generatedBy: "manual",
      },
    };

    updateObjects((current) => [...current, nextObject]);
    setSelectedObjectId(nextObject.localId);
  }

  function normalizeRotation(value: number) {
    const normalized = value % 360;

    return normalized < 0 ? normalized + 360 : normalized;
  }

  function rotateSelectedObject(amount: number) {
    if (!selectedObject) return;

    updateObject(selectedObject.localId, {
      rotation: normalizeRotation((selectedObject.rotation || 0) + amount),
    });
  }

  function setSelectedObjectRotation(value: string) {
    if (!selectedObject) return;

    const parsed = Number(value);

    updateObject(selectedObject.localId, {
      rotation: Number.isFinite(parsed) ? normalizeRotation(parsed) : 0,
    });
  }

  function convertSelectedShapeToPoints() {
    if (!selectedObject) return;

    if (selectedObject.metadata?.points?.length) {
      setNotice("Esta forma já é editável por pontos.");
      return;
    }

    const points =
      selectedObject.metadata?.shape === "ELLIPSE"
        ? [
            { x: Math.round(selectedObject.width / 2), y: 0, curve: true, cx: Math.round(selectedObject.width), cy: 0 },
            { x: selectedObject.width, y: Math.round(selectedObject.height / 2), curve: true, cx: selectedObject.width, cy: selectedObject.height },
            { x: Math.round(selectedObject.width / 2), y: selectedObject.height, curve: true, cx: 0, cy: selectedObject.height },
            { x: 0, y: Math.round(selectedObject.height / 2), curve: true, cx: 0, cy: 0 },
          ]
        : [
            { x: 0, y: 0 },
            { x: selectedObject.width, y: 0 },
            { x: selectedObject.width, y: selectedObject.height },
            { x: 0, y: selectedObject.height },
          ];

    updateObjectMetadata(selectedObject, {
      shape: "PATH",
      points,
    });

    setNotice("Forma convertida em pontos. Agora você pode adicionar/remover pontos e criar formatos quebrados.");
  }

  function straightenSelectedShape() {
    if (!selectedObject?.metadata?.points?.length) return;

    const points = selectedObject.metadata.points.map((point) => ({
      x: point.x,
      y: point.y,
    }));

    updateObjectMetadata(selectedObject, {
      shape: "POLYGON",
      points,
    });

    setNotice("Linhas endireitadas.");
  }

  function moveSelectedLayer(direction: "front" | "back" | "up" | "down") {
    if (!selectedObject) return;

    setObjects((current) => {
      const index = current.findIndex((object) => object.localId === selectedObject.localId);

      if (index < 0) return current;

      const next = [...current];
      const [item] = next.splice(index, 1);

      if (direction === "front") {
        next.push(item);
        return next;
      }

      if (direction === "back") {
        next.unshift(item);
        return next;
      }

      if (direction === "up") {
        next.splice(Math.min(next.length, index + 1), 0, item);
        return next;
      }

      next.splice(Math.max(0, index - 1), 0, item);
      return next;
    });
  }

  function insertPointAfter(pointIndex: number) {
    if (!selectedObject?.metadata?.points) return;

    const points = [...selectedObject.metadata.points];
    const current = points[pointIndex];
    const next = points[(pointIndex + 1) % points.length];

    if (!current || !next) return;

    points.splice(pointIndex + 1, 0, midpoint(current, next));

    updateObjectMetadata(selectedObject, {
      points,
      shape: "PATH",
    });
  }

  function removePoint(pointIndex: number) {
    if (!selectedObject?.metadata?.points) return;

    const points = [...selectedObject.metadata.points];

    if (points.length <= 3) {
      setNotice("A forma precisa manter pelo menos 3 pontos.");
      return;
    }

    points.splice(pointIndex, 1);

    updateObjectMetadata(selectedObject, {
      points,
      shape: "PATH",
    });
  }

  function toggleSelectedPointCurve(pointIndex: number) {
    if (!selectedObject) return;

    const points = [...(selectedObject.metadata?.points || [])];
    const point = points[pointIndex];
    const previous = points[pointIndex - 1] || points[points.length - 1];

    if (!point || !previous) return;

    const isCurve = !point.curve;

    points[pointIndex] = {
      ...point,
      curve: isCurve,
      cx: isCurve ? point.cx ?? Math.round((previous.x + point.x) / 2) : undefined,
      cy: isCurve ? point.cy ?? Math.round((previous.y + point.y) / 2 - 45) : undefined,
    };

    updateObjectMetadata(selectedObject, {
      shape: "PATH",
      points,
    });
  }

  function closeCurrentDrawing() {
    if (drawingPoints.length < 3) {
      setNotice("Crie pelo menos 3 pontos antes de fechar a forma.");
      return;
    }

    createObjectFromPoints(drawingPoints, tool);
  }

  function resizeReferenceImage(file: File) {
    return new Promise<{
      name: string;
      mimeType: string;
      dataUrl: string;
    }>((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(new Error("Não consegui ler a imagem."));
      reader.onload = () => {
        const image = new Image();

        image.onerror = () => reject(new Error("Imagem inválida."));
        image.onload = () => {
          const maxSize = 1200;
          const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");

          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));

          const context = canvas.getContext("2d");

          if (!context) {
            reject(new Error("Não consegui preparar a imagem."));
            return;
          }

          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          resolve({
            name: file.name,
            mimeType: "image/jpeg",
            dataUrl: canvas.toDataURL("image/jpeg", 0.78),
          });
        };

        image.src = String(reader.result || "");
      };

      reader.readAsDataURL(file);
    });
  }

  async function callRealMapAi(mode: "chat" | "generate", prompt: string) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : "";

    const response = await fetch(`${API_BASE_URL}/ai/event-map/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && token !== "undefined"
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {}),
      },
      body: JSON.stringify({
        mode,
        prompt,
        map: {
          width,
          height,
        },
        sectors,
        currentObjects: objects,
        referenceImage: assistantReferenceImage
          ? {
              name: assistantReferenceImage.name,
              mimeType: assistantReferenceImage.mimeType,
              dataUrl: assistantReferenceImage.dataUrl,
            }
          : undefined,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        typeof result?.message === "string"
          ? result.message
          : "Erro ao consultar IA do mapa.",
      );
    }

    return result as {
      provider: string;
      model: string;
      message: string;
      action: "advice" | "replace_map" | "append_objects";
      objects: EventMapObject[];
      warnings?: string[];
      suggestions?: string[];
    };
  }

  function applyAssistantDraft(prompt: string) {
    const lower = prompt.toLowerCase();
    const nextObjects: EventMapObject[] = [];
    const stageIsT = lower.includes("palco em t") || lower.includes("passarela");
    const wantsSideAisles =
      lower.includes("corredor") || lower.includes("laterais") || lower.includes("entrada");
    const wantsBars = lower.includes("bar") || lower.includes("bebida");
    const wantsRestrooms = lower.includes("banheiro");

    nextObjects.push({
      localId: makeId("map"),
      venueSectorLocalId: "",
      code: "STAGE-AI",
      label: stageIsT ? "Palco em T" : "Palco frontal",
      type: "STAGE",
      capacity: "1",
      x: stageIsT ? 480 : 420,
      y: 45,
      width: stageIsT ? 360 : 430,
      height: stageIsT ? 210 : 90,
      rotation: 0,
      status: "AVAILABLE",
      metadata: {
        shape: "POLYGON",
        role: "STAGE",
        generatedBy: "assistant",
        prompt,
        points: createStagePoints(stageIsT ? "T" : "RECT"),
      },
    });

    sectors.forEach((sector, index) => {
      const row = Math.floor(index / 3);
      const col = index % 3;
      const isVip =
        sector.name.toLowerCase().includes("vip") ||
        sector.name.toLowerCase().includes("diamante") ||
        sector.name.toLowerCase().includes("premium") ||
        sector.name.toLowerCase().includes("camarote");

      nextObjects.push({
        localId: makeId("map"),
        venueSectorLocalId: sector.localId,
        code: `AREA-AI-${index + 1}`,
        label: sector.name,
        type: "AREA",
        capacity: sector.capacity || "1",
        x: 145 + col * 340,
        y: isVip ? 205 : 300 + row * 155,
        width: 275,
        height: isVip ? 125 : 138,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          shape: "POLYGON",
          role: "SECTOR",
          generatedBy: "assistant",
          prompt,
          points:
            index % 2 === 0
              ? [
                  { x: 0, y: 18 },
                  { x: 45, y: 0 },
                  { x: 275, y: 0 },
                  { x: 260, y: 125 },
                  { x: 35, y: 138 },
                  { x: 0, y: 98 },
                ]
              : [
                  { x: 25, y: 0 },
                  { x: 275, y: 16 },
                  { x: 245, y: 138 },
                  { x: 0, y: 118 },
                  { x: 0, y: 28 },
                ],
        },
      });
    });

    if (wantsSideAisles) {
      nextObjects.push(
        {
          localId: makeId("map"),
          venueSectorLocalId: "",
          code: "AISLE-L",
          label: "Corredor esquerdo",
          type: "AISLE",
          capacity: "1",
          x: 70,
          y: 180,
          width: 54,
          height: 560,
          rotation: 0,
          status: "AVAILABLE",
          metadata: {
            shape: "RECT",
            role: "AISLE",
            generatedBy: "assistant",
            prompt,
          },
        },
        {
          localId: makeId("map"),
          venueSectorLocalId: "",
          code: "AISLE-R",
          label: "Corredor direito",
          type: "AISLE",
          capacity: "1",
          x: 1150,
          y: 180,
          width: 54,
          height: 560,
          rotation: 0,
          status: "AVAILABLE",
          metadata: {
            shape: "RECT",
            role: "AISLE",
            generatedBy: "assistant",
            prompt,
          },
        },
      );
    }

    if (wantsBars) {
      nextObjects.push({
        localId: makeId("map"),
        venueSectorLocalId: "",
        code: "BAR-AI",
        label: "Bar",
        type: "AREA",
        capacity: "1",
        x: 1000,
        y: 720,
        width: 140,
        height: 72,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          shape: "RECT",
          role: "OPERATIONAL",
          operationalType: "BAR",
          generatedBy: "assistant",
          prompt,
        },
      });
    }

    if (wantsRestrooms) {
      nextObjects.push({
        localId: makeId("map"),
        venueSectorLocalId: "",
        code: "RESTROOM-AI",
        label: "Banheiro",
        type: "AREA",
        capacity: "1",
        x: 1000,
        y: 810,
        width: 150,
        height: 66,
        rotation: 0,
        status: "AVAILABLE",
        metadata: {
          shape: "RECT",
          role: "OPERATIONAL",
          operationalType: "RESTROOM",
          generatedBy: "assistant",
          prompt,
        },
      });
    }

    setObjects(nextObjects);
    setSelectedObjectId(nextObjects[0]?.localId || "");
    setNotice("Sugestão aplicada. Ajuste manualmente antes de salvar.");
  }

  function getPromptForGeneration() {
    const typedPrompt = assistantPrompt.trim();

    if (typedPrompt) return typedPrompt;

    const lastUserMessage = [...assistantMessages]
      .reverse()
      .find((message) => message.role === "user");

    return lastUserMessage?.content?.trim() || "";
  }

  async function askAssistant() {
    const prompt = assistantPrompt.trim();

    if (!prompt || assistantLoading) return;

    setAssistantMessages((current) => [
      ...current,
      {
        role: "user",
        content: prompt,
      },
    ]);
    setAssistantPrompt("");
    setAssistantLoading(true);

    try {
      const result = await callRealMapAi("chat", prompt);

      setAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: [
            result.message,
            ...(result.warnings || []).map((warning) => `Atenção: ${warning}`),
            ...(result.suggestions || []).map((suggestion) => `Sugestão: ${suggestion}`),
          ].join("\n"),
        },
      ]);
    } catch (error) {
      setAssistantMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Não consegui consultar a IA agora.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  }

  function buildAssistantResponse(prompt: string) {
    const lower = prompt.toLowerCase();

    if (lower.includes("palco")) {
      return "Para palco, eu recomendo posicionar no topo do mapa e deixar corredores laterais livres. Se tiver passarela, use o modelo 'Palco com passarela' e depois ajuste os pontos.";
    }

    if (lower.includes("corredor") || lower.includes("entrada") || lower.includes("saída")) {
      return "Corredores devem conectar entrada, setores principais, banheiros e saídas. Use corredor reto ou em L para fluxo simples; use caneta corredor para formatos reais.";
    }

    if (lower.includes("bar") || lower.includes("banheiro")) {
      return "Bares e banheiros entram como objetos operacionais. Melhor posicionar nas laterais ou no fundo para não bloquear visão do palco.";
    }

    if (lower.includes("vip") || lower.includes("camarote") || lower.includes("diamante")) {
      return "Setores premium funcionam melhor próximos ao palco ou nas laterais com boa visão. Desenhe formatos quebrados com a caneta para encaixar no espaço real.";
    }

    return "Posso ajudar com layout, capacidade, corredores, palco, setores premium e objetos operacionais. Para aplicar uma proposta no mapa, escreva a descrição e clique em 'Gerar sugestão no mapa'.";
  }

  function renderObject(object: EventMapObject) {
    const active = selectedObjectId === object.localId;
    const points = absolutePoints(object);
    const hasPoints = points.length >= 3;

    return (
      <g key={object.localId}>
        {renderStaticObject({
          object,
          sectors,
          active,
          onPointerDown: (event) => startObjectDrag(event, object),
        })}

        {active ? (
          <g className="pointer-events-none">
            <rect
              x={object.x}
              y={object.y}
              width={object.width}
              height={object.height}
              fill="none"
              stroke="#38bdf8"
              strokeWidth={2}
              strokeDasharray="8 8"
            />
            {([
              ["nw", object.x, object.y],
              ["n", object.x + object.width / 2, object.y],
              ["ne", object.x + object.width, object.y],
              ["e", object.x + object.width, object.y + object.height / 2],
              ["se", object.x + object.width, object.y + object.height],
              ["s", object.x + object.width / 2, object.y + object.height],
              ["sw", object.x, object.y + object.height],
              ["w", object.x, object.y + object.height / 2],
            ] as [ResizeHandle, number, number][]).map(([handle, x, y]) => (
              <rect
                key={`${object.localId}-resize-${handle}`}
                x={x - 8}
                y={y - 8}
                width={16}
                height={16}
                rx={4}
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth={3}
                className="pointer-events-auto cursor-nwse-resize"
                onPointerDown={(event) => startResizeDrag(event, object, handle)}
              />
            ))}
          </g>
        ) : null}

        {active && hasPoints
          ? points.map((point, index) => {
              const localPoint = object.metadata?.points?.[index];
              const previous = points[index - 1] || points[points.length - 1];

              return (
                <g key={`${object.localId}-edit-${index}`}>
                  {localPoint?.curve && point.cx !== undefined && point.cy !== undefined ? (
                    <>
                      <line
                        x1={previous.x}
                        y1={previous.y}
                        x2={point.cx}
                        y2={point.cy}
                        stroke="#38bdf8"
                        strokeWidth={2}
                        strokeDasharray="6 6"
                      />
                      <line
                        x1={point.cx}
                        y1={point.cy}
                        x2={point.x}
                        y2={point.y}
                        stroke="#38bdf8"
                        strokeWidth={2}
                        strokeDasharray="6 6"
                      />
                      <circle
                        cx={point.cx}
                        cy={point.cy}
                        r={8}
                        fill="#38bdf8"
                        stroke="#ffffff"
                        strokeWidth={3}
                        className="cursor-grab"
                        onPointerDown={(event) =>
                          startCurveControlDrag(event, object, index)
                        }
                      />
                    </>
                  ) : null}

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={9}
                    fill="#ffffff"
                    stroke="#0ea5e9"
                    strokeWidth={4}
                    className="cursor-grab"
                    onPointerDown={(event) => startPointDrag(event, object, index)}
                  />
                </g>
              );
            })
          : null}
      </g>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex h-screen max-h-screen flex-col overflow-hidden bg-slate-950 text-white">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-slate-950 px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-black text-white">
            MAPA
          </div>
          <div>
            <p className="text-sm font-black">Criador de mapa do evento <span className="ml-2 rounded-lg bg-emerald-500 px-2 py-1 text-[10px] text-white">v30</span></p>
            <p className="text-xs font-semibold text-slate-400">
              Tudo editável: arraste objetos, use alças azuis para redimensionar, pontos brancos para formas e painel lateral para campos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLeftPanelOpen((current) => !current)}
            className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-black text-slate-100 hover:bg-white/10"
          >
            {leftPanelOpen ? "Ocultar biblioteca" : "Biblioteca / setores"}
          </button>
          <button
            type="button"
            onClick={() => setAssistantOpen((current) => !current)}
            className="rounded-2xl border border-sky-400/60 bg-sky-500/10 px-4 py-3 text-xs font-black text-sky-100 hover:bg-sky-500/20"
          >
            Assistente IA
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-2xl border border-white/15 px-4 py-3 text-xs font-black text-slate-200 hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => onSave(objects)}
            className="rounded-2xl bg-emerald-500 px-5 py-3 text-xs font-black text-white hover:bg-emerald-400"
          >
            Salvar mapa e voltar
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px]">
        {leftPanelOpen ? (
        <aside className="fixed bottom-4 left-4 top-20 z-[10020] w-[320px] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-900/98 p-4 shadow-2xl backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Biblioteca
            </p>
            <button
              type="button"
              onClick={() => setLeftPanelOpen(false)}
              className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/20"
            >
              Fechar
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {(PRIMARY_TOOLS as Tool[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setTool(item);
                  setDrawingPoints([]);
                }}
                className={`rounded-2xl px-4 py-3 text-left text-xs font-black transition ${
                  tool === item
                    ? "bg-sky-500 text-white"
                    : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                {TOOL_LABELS[item]}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Setores
            </p>
            <div className="grid gap-2">
              {availableSectors.map((sector) => (
                <div
                  key={sector.localId}
                  className={`rounded-2xl border p-3 ${
                    selectedSectorId === sector.localId
                      ? "border-sky-400 bg-sky-400/10"
                      : "border-white/10 bg-white/5"
                  } ${sector.unavailable ? "opacity-55" : ""}`}
                >
                  <button
                    type="button"
                    disabled={sector.unavailable}
                    onClick={() => setSelectedSectorId(sector.localId)}
                    className="w-full text-left text-xs font-black text-white disabled:cursor-not-allowed"
                  >
                    <span
                      className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                      style={{ backgroundColor: sector.color || "#2563eb" }}
                    />
                    {sector.name}
                    {sector.usedCount > 0 ? ` (${sector.usedCount})` : ""}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleMultiSpace(sector.localId)}
                    className={`mt-2 rounded-xl px-2 py-1 text-[10px] font-black ${
                      sector.canRepeat
                        ? "bg-sky-500 text-white"
                        : "bg-white/10 text-slate-300"
                    }`}
                  >
                    Permitir +1 espaço
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Ações rápidas
            </p>
            <div className="grid gap-2">
              <button
                type="button"
                onClick={addRectangleForSelectedSector}
                className="rounded-2xl bg-sky-600 px-4 py-3 text-xs font-black text-white hover:bg-sky-500"
              >
                + Bloco do setor
              </button>
              <button
                type="button"
                onClick={addBlockedArea}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-xs font-black text-white hover:bg-rose-500"
              >
                + Área bloqueada
              </button>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Palco real
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => addStagePreset("RECT")} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">Retangular</button>
              <button type="button" onClick={() => addStagePreset("T")} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">Em T</button>
              <button type="button" onClick={() => addStagePreset("RUNWAY")} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">Passarela</button>
              <button type="button" onClick={() => addStagePreset("CIRCLE")} className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950">Circular</button>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Corredores
            </p>
            <div className="grid gap-2">
              <button type="button" onClick={() => addAislePreset("STRAIGHT")} className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-black text-white">Corredor reto</button>
              <button type="button" onClick={() => addAislePreset("L")} className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-black text-white">Corredor em L</button>
              <button type="button" onClick={() => addAislePreset("CURVE")} className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-black text-white">Corredor curvo</button>
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Operacional
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "BAR",
                  "RESTROOM",
                  "ENTRANCE",
                  "EXIT",
                  "EMERGENCY",
                  "ACCESSIBILITY",
                ] as OperationalType[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => addOperationalObject(item)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-100 hover:bg-white/10"
                >
                  + {OPERATIONAL_LABELS[item]}
                </button>
              ))}
            </div>
          </div>
        </aside>
        ) : null}

        <main className="relative min-h-0 overflow-hidden bg-slate-950 p-4">
          <div className="absolute left-4 right-4 top-4 z-30 rounded-[24px] border border-sky-400/30 bg-slate-900/98 p-3 shadow-2xl shadow-sky-950/40 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-black text-white">
                Ferramentas v30
              </div>
              <div className="flex rounded-2xl border border-white/10 bg-slate-950 p-1">
                {PRIMARY_TOOLS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setTool(item);
                      setDrawingPoints([]);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                      tool === item
                        ? "bg-sky-500 text-white"
                        : "text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {TOOL_LABELS[item]}
                  </button>
                ))}
              </div>

              <div className="h-8 w-px bg-white/10" />

              <label className="flex items-center gap-2 text-xs font-black text-slate-300">
                Criar
                <select
                  value={drawRole}
                  onChange={(event) => {
                    setDrawRole(event.target.value as DrawRole);
                    setDrawingPoints([]);
                  }}
                  className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black text-white outline-none"
                >
                  {(Object.keys(DRAW_ROLE_LABELS) as DrawRole[]).map((role) => (
                    <option key={role} value={role}>
                      {DRAW_ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>

              {drawRole === "SECTOR" ? (
                <label className="flex min-w-[260px] flex-1 items-center gap-2 text-xs font-black text-slate-300">
                  Setor
                  <select
                    value={selectedSectorId}
                    onChange={(event) => setSelectedSectorId(event.target.value)}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs font-black text-white outline-none"
                  >
                    {availableSectors.map((sector) => (
                      <option
                        key={sector.localId}
                        value={sector.localId}
                        disabled={sector.unavailable}
                      >
                        {sector.name}{sector.usedCount > 0 ? ` (${sector.usedCount})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addStagePreset("T")}
                  className="rounded-xl bg-amber-400 px-3 py-2 text-xs font-black text-slate-950"
                >
                  Palco T
                </button>
                <button
                  type="button"
                  onClick={() => addAislePreset("STRAIGHT")}
                  className="rounded-xl bg-slate-600 px-3 py-2 text-xs font-black text-white"
                >
                  Corredor
                </button>
                <button
                  type="button"
                  onClick={addBlockedArea}
                  className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white"
                >
                  Bloqueio
                </button>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 right-6 z-30 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur">
            <button
              type="button"
              onClick={zoomIn}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20"
              title="Zoom in"
            >
              +
            </button>
            <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-[11px] font-black text-sky-100">
              {Math.round(zoom * 100)}%
            </div>
            <button
              type="button"
              onClick={zoomOut}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20"
              title="Zoom out"
            >
              -
            </button>
            <button
              type="button"
              onClick={fitAllObjects}
              className="rounded-xl bg-sky-600 px-3 py-2 text-[10px] font-black text-white hover:bg-sky-500"
              title="Encaixar objetos"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={centerCanvas}
              className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/20"
              title="Centralizar mapa"
            >
              Centro
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-xl bg-white/10 px-3 py-2 text-[10px] font-black text-white hover:bg-white/20"
              title="Resetar zoom"
            >
              100
            </button>
          </div>

          {drawingPoints.length > 0 ? (
            <div className="absolute left-6 top-28 z-20 rounded-2xl border border-sky-300/40 bg-sky-950/90 p-4 text-sm font-bold text-sky-50 shadow-2xl">
              Pontos: {drawingPoints.length}. Clique perto do primeiro ponto ou feche pelo botão.
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={closeCurrentDrawing}
                  className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-black text-white"
                >
                  Fechar forma
                </button>
                <button
                  type="button"
                  onClick={() => setDrawingPoints([])}
                  className="rounded-xl bg-white px-3 py-2 text-xs font-black text-sky-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {notice ? (
            <div className="absolute bottom-6 left-6 z-20 max-w-xl rounded-2xl border border-amber-300/40 bg-amber-950/90 p-4 text-sm font-black text-amber-50 shadow-2xl">
              {notice}
            </div>
          ) : null}

          <svg
            ref={svgRef}
            viewBox={`${getVisibleViewBox().x} ${getVisibleViewBox().y} ${getVisibleViewBox().width} ${getVisibleViewBox().height}`}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handleCanvasMove}
            onPointerUp={() => {
              setDragState(null);
              setIsPanning(false);
            }}
            onPointerLeave={() => {
              setDragState(null);
              setIsPanning(false);
            }}
            onWheel={(event) => {
              event.preventDefault();
              if (event.deltaY < 0) {
                zoomIn();
              } else {
                zoomOut();
              }
            }}
            className={`h-full w-full rounded-[28px] border border-white/10 bg-[linear-gradient(rgba(255,255,255,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.055)_1px,transparent_1px)] bg-[length:40px_40px] ${isPanning ? "cursor-grabbing" : tool === "select" || spacePressed ? "cursor-grab" : ""}`}
          >
            <rect width={width} height={height} fill="transparent" />

            {objects.map(renderObject)}

            {drawingPoints.length > 0 ? (
              <g>
                <path
                  d={pathFromPoints(drawingPoints, false)}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth={4}
                  strokeDasharray="10 10"
                />
                {drawingPoints.map((point, index) => (
                  <circle
                    key={`draw-${index}`}
                    cx={point.x}
                    cy={point.y}
                    r={index === 0 ? 12 : 8}
                    fill={index === 0 ? "#facc15" : "#ffffff"}
                    stroke="#38bdf8"
                    strokeWidth={4}
                  />
                ))}
              </g>
            ) : null}
          </svg>
        </main>

        <aside className="min-h-0 overflow-y-auto border-l border-white/10 bg-slate-900 p-4">
          {assistantOpen ? (
            <div className="mb-4 rounded-[28px] border border-sky-400/30 bg-sky-500/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-black text-sky-100">Assistente IA</p>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="rounded-xl bg-white/10 px-2 py-1 text-xs font-black text-sky-100"
                >
                  fechar
                </button>
              </div>

              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
                {assistantMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-2xl p-3 text-xs font-semibold leading-5 ${
                      message.role === "assistant"
                        ? "bg-white/10 text-sky-50"
                        : "bg-sky-500 text-white"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>

              <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950 p-3">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  Imagem de referência
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-400">
                  Opcional. Envie uma planta/foto para a IA analisar antes de montar o mapa.
                </p>

                {assistantReferenceImage ? (
                  <div className="mt-3 flex items-center gap-3">
                    <img
                      src={assistantReferenceImage.dataUrl}
                      alt="Referência do mapa"
                      className="h-16 w-20 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-white">
                        {assistantReferenceImage.name}
                      </p>
                      <button
                        type="button"
                        onClick={() => setAssistantReferenceImage(null)}
                        className="mt-2 rounded-lg bg-rose-500/20 px-2 py-1 text-[10px] font-black text-rose-100 hover:bg-rose-500/30"
                      >
                        Remover imagem
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="mt-3 block cursor-pointer rounded-xl border border-dashed border-sky-400/40 bg-sky-500/10 px-3 py-3 text-center text-xs font-black text-sky-100 hover:bg-sky-500/20">
                    Escolher imagem
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];

                        if (!file) return;

                        try {
                          const resized = await resizeReferenceImage(file);
                          setAssistantReferenceImage(resized);
                          setNotice("Imagem de referência adicionada.");
                        } catch (error) {
                          setNotice(
                            error instanceof Error
                              ? error.message
                              : "Não consegui carregar a imagem.",
                          );
                        } finally {
                          event.target.value = "";
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <textarea
                value={assistantPrompt}
                onChange={(event) => setAssistantPrompt(event.target.value)}
                placeholder="Pergunte ou descreva o mapa..."
                className="mt-3 min-h-[110px] w-full rounded-2xl border border-white/10 bg-slate-950 p-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500 focus:ring-4 focus:ring-sky-500/20"
              />

              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={askAssistant}
                  className="rounded-2xl bg-sky-500 px-4 py-3 text-xs font-black text-white hover:bg-sky-400"
                >
                  Perguntar
                </button>
                <p className="mb-2 rounded-xl bg-slate-950/80 px-3 py-2 text-[11px] font-semibold text-sky-100">
                  Dica: se você já clicou em Perguntar, o botão Gerar sugestão usa a última mensagem enviada.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    const prompt = getPromptForGeneration();

                    if (!prompt || assistantLoading) {
                      setNotice("Descreva o mapa no campo da IA ou use uma mensagem já enviada.");
                      return;
                    }

                    const alreadySentAsLastMessage =
                      assistantMessages[assistantMessages.length - 1]?.role === "user" &&
                      assistantMessages[assistantMessages.length - 1]?.content === prompt;

                    if (!alreadySentAsLastMessage) {
                      setAssistantMessages((current) => [
                        ...current,
                        { role: "user", content: prompt },
                      ]);
                    }

                    setAssistantPrompt("");
                    setAssistantLoading(true);
                    setNotice("Gerando mapa com IA real...");

                    try {
                      const result = await callRealMapAi("generate", prompt);

                      if (result.action === "append_objects") {
                        setObjects((current) => [...current, ...(result.objects || [])]);
                      } else if (result.action === "replace_map") {
                        setObjects(result.objects || []);
                      } else if (result.objects?.length) {
                        setObjects(result.objects);
                      }

                      setAssistantMessages((current) => [
                        ...current,
                        {
                          role: "assistant",
                          content: [
                            result.message || "Sugestão aplicada ao mapa.",
                            ...(result.warnings || []).map((warning) => `Atenção: ${warning}`),
                            ...(result.suggestions || []).map((suggestion) => `Sugestão: ${suggestion}`),
                          ].join("\n"),
                        },
                      ]);
                      setNotice("Sugestão de IA aplicada. Revise e clique em salvar mapa.");
                    } catch (error) {
                      const errorMessage =
                        error instanceof Error
                          ? error.message
                          : "Não consegui gerar a sugestão agora.";

                      setAssistantMessages((current) => [
                        ...current,
                        {
                          role: "assistant",
                          content: errorMessage,
                        },
                      ]);
                      setNotice(errorMessage);
                    } finally {
                      setAssistantLoading(false);
                    }
                  }}
                  className="rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-black text-white hover:bg-emerald-400"
                >
                  Gerar sugestão no mapa
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAssistantOpen(true)}
              className="mb-4 w-full rounded-[28px] border border-sky-400/30 bg-sky-500/10 p-4 text-left text-sm font-black text-sky-100 hover:bg-sky-500/20"
            >
              Abrir assistente IA
              <span className="mt-1 block text-xs font-semibold text-sky-200/80">
                Peça ajuda, tire dúvidas ou gere uma sugestão de mapa.
              </span>
            </button>
          )}

          <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-black text-white">Objeto selecionado</p>

            {selectedObject ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs font-black leading-5 text-emerald-100">
                  Tudo que aparece no mapa é editável: arraste para mover, use as alças azuis para redimensionar, ou ajuste os campos abaixo.
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Nome
                  </span>
                  <input
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                    value={selectedObject.label}
                    onChange={(event) =>
                      updateObject(selectedObject.localId, {
                        label: event.target.value,
                      })
                    }
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Código
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={selectedObject.code}
                      onChange={(event) =>
                        updateObject(selectedObject.localId, {
                          code: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Status
                    </span>
                    <select
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={selectedObject.status || "AVAILABLE"}
                      onChange={(event) =>
                        updateObject(selectedObject.localId, {
                          status: event.target.value,
                        })
                      }
                    >
                      {STATUS_OPTIONS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Tipo visual
                    </span>
                    <select
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={selectedObject.type}
                      onChange={(event) =>
                        updateObject(selectedObject.localId, {
                          type: event.target.value as EventMapObjectType,
                        })
                      }
                    >
                      {(["AREA", "TABLE", "SEAT", "STAGE", "AISLE", "BOOTH", "BLOCKED_SPACE"] as EventMapObjectType[]).map(
                        (item) => (
                          <option key={item} value={item}>
                            {typeLabel(item)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Papel
                    </span>
                    <select
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={selectedObject.metadata?.role || "SECTOR"}
                      onChange={(event) =>
                        updateObjectMetadata(selectedObject, {
                          role: event.target.value as MapRole,
                        })
                      }
                    >
                      {(Object.keys(ROLE_LABELS) as MapRole[]).map((item) => (
                        <option key={item} value={item}>
                          {ROLE_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {(selectedObject.metadata?.role || "SECTOR") === "OPERATIONAL" ? (
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Tipo operacional
                    </span>
                    <select
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={selectedObject.metadata?.operationalType || "ACCESSIBILITY"}
                      onChange={(event) =>
                        updateObjectMetadata(selectedObject, {
                          operationalType: event.target.value as OperationalType,
                        })
                      }
                    >
                      {(Object.keys(OPERATIONAL_LABELS) as OperationalType[]).map((item) => (
                        <option key={item} value={item}>
                          {OPERATIONAL_LABELS[item]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Setor vinculado
                  </span>
                  <select
                    className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                    value={selectedObject.venueSectorLocalId}
                    onChange={(event) =>
                      updateObject(selectedObject.localId, {
                        venueSectorLocalId: event.target.value,
                      })
                    }
                  >
                    <option value="">Sem setor</option>
                    {sectors.map((sector) => (
                      <option key={sector.localId} value={sector.localId}>
                        {sector.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-[11px] font-semibold leading-4 text-slate-500">
                    Use setor vinculado somente para áreas de venda. Praça, bar, banheiro, entrada e corredores devem ficar sem setor.
                  </p>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Capacidade
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={selectedObject.capacity}
                      onChange={(event) =>
                        updateObject(selectedObject.localId, {
                          capacity: event.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Cor manual
                    </span>
                    <input
                      type="color"
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-2 py-2 outline-none"
                      value={selectedObject.metadata?.customColor || objectColor(selectedObject, sectors.find((item) => item.localId === selectedObject.venueSectorLocalId))}
                      onChange={(event) =>
                        updateObjectMetadata(selectedObject, {
                          customColor: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                {selectedObject.metadata?.customColor ? (
                  <button
                    type="button"
                    onClick={() =>
                      updateObjectMetadata(selectedObject, {
                        customColor: undefined,
                      })
                    }
                    className="w-full rounded-xl bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/20"
                  >
                    Usar cor original do setor/tipo
                  </button>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      X
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={String(selectedObject.x)}
                      onChange={(event) => updateSelectedObjectNumber(selectedObject, "x", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Y
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={String(selectedObject.y)}
                      onChange={(event) => updateSelectedObjectNumber(selectedObject, "y", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Largura
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={String(selectedObject.width)}
                      onChange={(event) => updateSelectedObjectNumber(selectedObject, "width", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Altura
                    </span>
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={String(selectedObject.height)}
                      onChange={(event) => updateSelectedObjectNumber(selectedObject, "height", event.target.value)}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Rotação em graus
                  </p>
                  <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-sky-500/20"
                      value={String(selectedObject.rotation || 0)}
                      onChange={(event) => setSelectedObjectRotation(event.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedObjectRotation("0")}
                      className="rounded-2xl bg-white/10 px-4 py-2 text-xs font-black text-white hover:bg-white/20"
                    >
                      0°
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => rotateSelectedObject(-45)} className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white">-45°</button>
                    <button type="button" onClick={() => rotateSelectedObject(-15)} className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white">-15°</button>
                    <button type="button" onClick={() => rotateSelectedObject(15)} className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white">+15°</button>
                    <button type="button" onClick={() => rotateSelectedObject(45)} className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white">+45°</button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950 p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    Forma e camadas
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={focusSelectedObject}
                      className="rounded-xl bg-emerald-600 px-2 py-2 text-[10px] font-black text-white hover:bg-emerald-500"
                    >
                      Focar
                    </button>
                    <button
                      type="button"
                      onClick={fitAllObjects}
                      className="rounded-xl bg-sky-600 px-2 py-2 text-[10px] font-black text-white hover:bg-sky-500"
                    >
                      Ver todos
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateObject(selectedObject)}
                      className="rounded-xl bg-violet-600 px-2 py-2 text-[10px] font-black text-white hover:bg-violet-500"
                    >
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={convertSelectedShapeToPoints}
                      className="rounded-xl bg-sky-600 px-2 py-2 text-[10px] font-black text-white hover:bg-sky-500"
                    >
                      Editar pontos
                    </button>
                    <button
                      type="button"
                      onClick={straightenSelectedShape}
                      className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white hover:bg-white/20"
                    >
                      Linhas retas
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedLayer("front")}
                      className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white hover:bg-white/20"
                    >
                      Frente
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedLayer("back")}
                      className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white hover:bg-white/20"
                    >
                      Fundo
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedLayer("up")}
                      className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white hover:bg-white/20"
                    >
                      Subir
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSelectedLayer("down")}
                      className="rounded-xl bg-white/10 px-2 py-2 text-[10px] font-black text-white hover:bg-white/20"
                    >
                      Descer
                    </button>
                  </div>
                </div>

                {selectedObject.metadata?.points?.length ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950 p-3">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                      Pontos da forma
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Arraste pontos brancos. Ative curva e arraste a alça azul.
                    </p>
                    <div className="mt-3 grid gap-2">
                      {selectedObject.metadata.points.map((point, index) => (
                        <div
                          key={`point-tools-${index}`}
                          className="rounded-xl border border-white/10 p-2"
                        >
                          <p className="text-xs font-black text-slate-200">
                            Ponto {index + 1}: {point.curve ? "curvo" : "reto"}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                              className="h-9 rounded-lg border border-white/10 bg-slate-900 px-2 text-[11px] font-bold text-white outline-none"
                              value={String(point.x)}
                              onChange={(event) => {
                                const points = [...(selectedObject.metadata?.points || [])];
                                points[index] = {
                                  ...points[index],
                                  x: Number(event.target.value) || 0,
                                };
                                updateObjectMetadata(selectedObject, { points });
                              }}
                            />
                            <input
                              className="h-9 rounded-lg border border-white/10 bg-slate-900 px-2 text-[11px] font-bold text-white outline-none"
                              value={String(point.y)}
                              onChange={(event) => {
                                const points = [...(selectedObject.metadata?.points || [])];
                                points[index] = {
                                  ...points[index],
                                  y: Number(event.target.value) || 0,
                                };
                                updateObjectMetadata(selectedObject, { points });
                              }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => toggleSelectedPointCurve(index)}
                              className="rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black text-white"
                            >
                              {point.curve ? "Virar reto" : "Virar curva"}
                            </button>
                            <button
                              type="button"
                              onClick={() => insertPointAfter(index)}
                              className="rounded-lg bg-sky-600 px-2 py-1 text-[10px] font-black text-white"
                            >
                              + ponto
                            </button>
                            <button
                              type="button"
                              onClick={() => removePoint(index)}
                              className="rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-black text-white"
                            >
                              remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => removeObject(selectedObject.localId)}
                  className="w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-black text-rose-100 hover:bg-rose-500/20"
                >
                  Remover objeto
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-2xl bg-slate-950 p-4 text-sm font-semibold leading-6 text-slate-400">
                Selecione algo no mapa para editar. No modo caneta, clique no mapa para criar pontos.
              </p>
            )}
          </div>

          <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Camadas
            </p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {objects.length > 0 ? (
                objects.map((object) => (
                  <button
                    key={object.localId}
                    type="button"
                    onClick={() => setSelectedObjectId(object.localId)}
                    className={`w-full rounded-2xl border px-3 py-2 text-left text-xs font-black ${
                      selectedObjectId === object.localId
                        ? "border-sky-400 bg-sky-500/20 text-sky-100"
                        : "border-white/10 bg-slate-950 text-slate-300"
                    }`}
                  >
                    {object.label}
                    <span className="block text-[10px] font-semibold text-slate-500">
                      {typeLabel(object.type)}
                    </span>
                  </button>
                ))
              ) : (
                <p className="rounded-2xl bg-slate-950 p-3 text-xs font-semibold text-slate-500">
                  Nenhuma camada ainda.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
