import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EventMapAiObject,
  EventMapAiPoint,
  EventMapAiSector,
  GenerateEventMapAiDto,
  EventMapAiReferenceImage,
} from './dto/generate-event-map-ai.dto';

type MapAiAction = 'advice' | 'replace_map' | 'append_objects';

type MapAiProvider = 'template' | 'ollama' | 'openai';

type MapAiResponse = {
  message: string;
  action: MapAiAction;
  objects: EventMapAiObject[];
  warnings: string[];
  suggestions: string[];
};

type NormalizedReferenceImage = {
  name?: string;
  mimeType?: string;
  base64: string;
};

type CreateObjectInput = {
  localId: string;
  sector?: EventMapAiSector;
  code: string;
  label: string;
  type: string;
  capacity?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  role: string;
  shape?: string;
  points?: EventMapAiPoint[];
  operationalType?: string;
  prompt: string;
};

type LayoutFlow =
  | 'TOP_FAN'
  | 'CENTRAL_RING'
  | 'LEFT_STAGE'
  | 'RIGHT_STAGE'
  | 'BOTTOM_STAGE'
  | 'GRID_EXPO'
  | 'SPLIT_SIDES'
  | 'HORSESHOE'
  | 'LANES'
  | 'ISLANDS'
  | 'DIAGONAL'
  | 'STADIUM'
  | 'BANQUET'
  | 'AUDITORIUM'
  | 'OPEN_AIR'
  | 'DOUBLE_STAGE'
  | 'CORNER_STAGE'
  | 'MULTI_ROOM'
  | 'PROMENADE'
  | 'AMPHITHEATER';

type StagePosition =
  | 'TOP'
  | 'CENTER'
  | 'LEFT'
  | 'RIGHT'
  | 'BOTTOM'
  | 'TOP_LEFT'
  | 'TOP_RIGHT'
  | 'DOUBLE'
  | 'NONE';

type OpsProfile =
  | 'FESTIVAL'
  | 'RODEIO'
  | 'THEATER'
  | 'CONGRESS'
  | 'SPORTS'
  | 'GASTRO'
  | 'NIGHTCLUB'
  | 'EXPO'
  | 'OUTDOOR'
  | 'FAMILY';

type LayoutTemplateDefinition = {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  flow: LayoutFlow;
  stage: StagePosition;
  opsProfile: OpsProfile;
  priority?: number;
};

const LAYOUT_TEMPLATES: LayoutTemplateDefinition[] = [
  {
    id: 'festival-palco-frontal',
    name: 'Festival com palco frontal',
    category: 'festival',
    flow: 'TOP_FAN',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['festival', 'show', 'palco frontal', 'palco em cima', 'pista', 'open air'],
    priority: 9,
  },
  {
    id: 'rodeio-jaguariuna-classico',
    name: 'Rodeio/Jaguariúna clássico',
    category: 'rodeio',
    flow: 'TOP_FAN',
    stage: 'TOP',
    opsProfile: 'RODEIO',
    keywords: ['jaguariuna', 'jaguariúna', 'rodeio', 'sertanejo', 'arena', 'camarote brahma', 'super bull'],
    priority: 11,
  },
  {
    id: 'palco-central-360',
    name: 'Palco central 360',
    category: '360',
    flow: 'CENTRAL_RING',
    stage: 'CENTER',
    opsProfile: 'FESTIVAL',
    keywords: ['palco central', '360', 'setores ao redor', 'ao redor do palco', 'palco no meio'],
    priority: 12,
  },
  {
    id: 'arena-circular',
    name: 'Arena circular',
    category: 'arena',
    flow: 'CENTRAL_RING',
    stage: 'CENTER',
    opsProfile: 'SPORTS',
    keywords: ['arena circular', 'circular', 'anel', 'ringue', 'octogono', 'octógono', 'centro'],
    priority: 10,
  },
  {
    id: 'teatro-italiano',
    name: 'Teatro italiano',
    category: 'teatro',
    flow: 'AUDITORIUM',
    stage: 'TOP',
    opsProfile: 'THEATER',
    keywords: ['teatro', 'plateia', 'palco italiano', 'fileiras', 'cadeiras numeradas'],
    priority: 10,
  },
  {
    id: 'auditorio-congresso',
    name: 'Auditório de congresso',
    category: 'congresso',
    flow: 'AUDITORIUM',
    stage: 'TOP',
    opsProfile: 'CONGRESS',
    keywords: ['congresso', 'auditorio', 'auditório', 'palestra', 'palco palestra', 'credenciamento'],
    priority: 10,
  },
  {
    id: 'congresso-multissalas',
    name: 'Congresso com múltiplas salas',
    category: 'congresso',
    flow: 'MULTI_ROOM',
    stage: 'NONE',
    opsProfile: 'CONGRESS',
    keywords: ['multissalas', 'multi salas', 'salas simultaneas', 'salas simultâneas', 'workshop', 'trilhas'],
    priority: 10,
  },
  {
    id: 'expo-feira-corredores',
    name: 'Expo/feira com corredores',
    category: 'expo',
    flow: 'GRID_EXPO',
    stage: 'NONE',
    opsProfile: 'EXPO',
    keywords: ['expo', 'feira', 'estandes', 'stands', 'corredores', 'pavilhao', 'pavilhão'],
    priority: 10,
  },
  {
    id: 'balada-pista-central',
    name: 'Balada com pista central',
    category: 'balada',
    flow: 'CENTRAL_RING',
    stage: 'TOP',
    opsProfile: 'NIGHTCLUB',
    keywords: ['balada', 'dj', 'pista central', 'camarotes ao redor', 'open bar', 'boate'],
    priority: 9,
  },
  {
    id: 'gastro-praca-alimentacao',
    name: 'Gastronomia com praça central',
    category: 'gastronomia',
    flow: 'ISLANDS',
    stage: 'NONE',
    opsProfile: 'GASTRO',
    keywords: ['gastronomia', 'bar', 'restaurante', 'food park', 'praca de alimentacao', 'praça de alimentação'],
    priority: 9,
  },
  {
    id: 'show-palco-esquerdo',
    name: 'Show com palco à esquerda',
    category: 'show',
    flow: 'LEFT_STAGE',
    stage: 'LEFT',
    opsProfile: 'FESTIVAL',
    keywords: ['palco esquerdo', 'palco na esquerda', 'entrada lateral direita'],
  },
  {
    id: 'show-palco-direito',
    name: 'Show com palco à direita',
    category: 'show',
    flow: 'RIGHT_STAGE',
    stage: 'RIGHT',
    opsProfile: 'FESTIVAL',
    keywords: ['palco direito', 'palco na direita', 'entrada lateral esquerda'],
  },
  {
    id: 'show-palco-inferior',
    name: 'Show com palco inferior',
    category: 'show',
    flow: 'BOTTOM_STAGE',
    stage: 'BOTTOM',
    opsProfile: 'FESTIVAL',
    keywords: ['palco embaixo', 'palco inferior', 'palco no fundo inferior'],
  },
  {
    id: 'palco-canto-superior-esquerdo',
    name: 'Palco no canto superior esquerdo',
    category: 'show',
    flow: 'CORNER_STAGE',
    stage: 'TOP_LEFT',
    opsProfile: 'FESTIVAL',
    keywords: ['palco canto esquerdo', 'canto superior esquerdo', 'diagonal para direita'],
  },
  {
    id: 'palco-canto-superior-direito',
    name: 'Palco no canto superior direito',
    category: 'show',
    flow: 'CORNER_STAGE',
    stage: 'TOP_RIGHT',
    opsProfile: 'FESTIVAL',
    keywords: ['palco canto direito', 'canto superior direito', 'diagonal para esquerda'],
  },
  {
    id: 'dois-palcos',
    name: 'Dois palcos',
    category: 'festival',
    flow: 'DOUBLE_STAGE',
    stage: 'DOUBLE',
    opsProfile: 'FESTIVAL',
    keywords: ['dois palcos', 'palco a', 'palco b', 'palcos alternados', 'festival grande'],
    priority: 10,
  },
  {
    id: 'setores-em-leque',
    name: 'Setores em leque',
    category: 'show',
    flow: 'TOP_FAN',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['leque', 'fan', 'setores em leque', 'aberto em leque'],
  },
  {
    id: 'setores-em-grade',
    name: 'Setores em grade',
    category: 'geral',
    flow: 'GRID_EXPO',
    stage: 'TOP',
    opsProfile: 'OUTDOOR',
    keywords: ['grade', 'grid', 'quadrantes', 'setores em blocos'],
  },
  {
    id: 'setores-em-ilhas',
    name: 'Setores em ilhas',
    category: 'geral',
    flow: 'ISLANDS',
    stage: 'TOP',
    opsProfile: 'OUTDOOR',
    keywords: ['ilhas', 'setores separados', 'ilhas de mesas', 'areas independentes', 'áreas independentes'],
  },
  {
    id: 'corredor-central',
    name: 'Corredor central',
    category: 'geral',
    flow: 'SPLIT_SIDES',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['corredor central', 'setores dos lados', 'dividir ao meio'],
  },
  {
    id: 'pista-com-camarotes-laterais',
    name: 'Pista com camarotes laterais',
    category: 'festival',
    flow: 'SPLIT_SIDES',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['camarotes laterais', 'pista no meio', 'vip lateral', 'laterais'],
    priority: 9,
  },
  {
    id: 'ferradura-premium',
    name: 'Ferradura premium',
    category: 'premium',
    flow: 'HORSESHOE',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['ferradura', 'u shape', 'formato u', 'setores em u'],
  },
  {
    id: 'anfiteatro',
    name: 'Anfiteatro',
    category: 'teatro',
    flow: 'AMPHITHEATER',
    stage: 'TOP',
    opsProfile: 'THEATER',
    keywords: ['anfiteatro', 'arquibancada curva', 'meia lua', 'semicircular'],
  },
  {
    id: 'estadio-retangular',
    name: 'Estádio retangular',
    category: 'esporte',
    flow: 'STADIUM',
    stage: 'NONE',
    opsProfile: 'SPORTS',
    keywords: ['estadio', 'estádio', 'campo', 'quadra', 'esporte', 'arquibancada'],
  },
  {
    id: 'quadra-show',
    name: 'Quadra com show',
    category: 'esporte',
    flow: 'STADIUM',
    stage: 'TOP',
    opsProfile: 'SPORTS',
    keywords: ['quadra show', 'ginasio', 'ginásio', 'arena esportiva com palco'],
  },
  {
    id: 'mesa-gala',
    name: 'Gala com mesas',
    category: 'mesas',
    flow: 'BANQUET',
    stage: 'TOP',
    opsProfile: 'GASTRO',
    keywords: ['gala', 'jantar', 'mesas redondas', 'banquete', 'formatura'],
  },
  {
    id: 'casamento-festa',
    name: 'Casamento/festa com pista',
    category: 'mesas',
    flow: 'BANQUET',
    stage: 'LEFT',
    opsProfile: 'GASTRO',
    keywords: ['casamento', 'festa', 'pista de danca', 'pista de dança', 'mesas e pista'],
  },
  {
    id: 'corporativo-coffee',
    name: 'Corporativo com coffee break',
    category: 'corporativo',
    flow: 'MULTI_ROOM',
    stage: 'TOP',
    opsProfile: 'CONGRESS',
    keywords: ['corporativo', 'coffee break', 'networking', 'credenciamento'],
  },
  {
    id: 'infantil-praca',
    name: 'Infantil com áreas abertas',
    category: 'infantil',
    flow: 'ISLANDS',
    stage: 'TOP',
    opsProfile: 'FAMILY',
    keywords: ['infantil', 'familia', 'família', 'kids', 'brinquedos', 'criancas', 'crianças'],
  },
  {
    id: 'parque-open-air',
    name: 'Parque open air',
    category: 'outdoor',
    flow: 'OPEN_AIR',
    stage: 'TOP',
    opsProfile: 'OUTDOOR',
    keywords: ['parque', 'open air', 'gramado', 'ao ar livre', 'outdoor'],
  },
  {
    id: 'praia-palco',
    name: 'Praia/beach club',
    category: 'outdoor',
    flow: 'OPEN_AIR',
    stage: 'LEFT',
    opsProfile: 'OUTDOOR',
    keywords: ['praia', 'beach club', 'areia', 'lounge praia'],
  },
  {
    id: 'boate-camarotes',
    name: 'Boate com camarotes',
    category: 'balada',
    flow: 'SPLIT_SIDES',
    stage: 'TOP',
    opsProfile: 'NIGHTCLUB',
    keywords: ['boate', 'camarotes', 'pista dance', 'vip superior'],
  },
  {
    id: 'lounge-ilhas',
    name: 'Lounge em ilhas',
    category: 'premium',
    flow: 'ISLANDS',
    stage: 'CENTER',
    opsProfile: 'NIGHTCLUB',
    keywords: ['lounge', 'ilhas vip', 'bistro', 'bistrô'],
  },
  {
    id: 'passarela-moda',
    name: 'Desfile/passarela',
    category: 'moda',
    flow: 'LANES',
    stage: 'CENTER',
    opsProfile: 'THEATER',
    keywords: ['desfile', 'passarela', 'moda', 'runway'],
  },
  {
    id: 'corredores-longitudinais',
    name: 'Corredores longitudinais',
    category: 'expo',
    flow: 'LANES',
    stage: 'NONE',
    opsProfile: 'EXPO',
    keywords: ['corredores longos', 'longitudinal', 'fileiras de estandes'],
  },
  {
    id: 'mapa-diagonal',
    name: 'Mapa diagonal',
    category: 'criativo',
    flow: 'DIAGONAL',
    stage: 'TOP_LEFT',
    opsProfile: 'FESTIVAL',
    keywords: ['diagonal', 'inclinado', 'setores diagonais'],
  },
  {
    id: 'mapa-zig-zag',
    name: 'Mapa em zig-zag',
    category: 'criativo',
    flow: 'DIAGONAL',
    stage: 'TOP_RIGHT',
    opsProfile: 'OUTDOOR',
    keywords: ['zig zag', 'zig-zag', 'quebrado', 'irregular'],
  },
  {
    id: 'entrada-em-funil',
    name: 'Entrada em funil',
    category: 'operacional',
    flow: 'TOP_FAN',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['funil', 'controle de acesso', 'entrada em funil'],
  },
  {
    id: 'saida-rapida',
    name: 'Mapa com evacuação rápida',
    category: 'operacional',
    flow: 'SPLIT_SIDES',
    stage: 'TOP',
    opsProfile: 'OUTDOOR',
    keywords: ['evacuacao', 'evacuação', 'saidas grandes', 'saídas grandes', 'seguranca', 'segurança'],
  },
  {
    id: 'vip-frontal',
    name: 'VIP frontal',
    category: 'premium',
    flow: 'TOP_FAN',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['vip frontal', 'premium frontal', 'diamante na frente'],
  },
  {
    id: 'vip-laterais',
    name: 'VIP nas laterais',
    category: 'premium',
    flow: 'SPLIT_SIDES',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['vip laterais', 'premium lateral', 'camarote dos lados'],
  },
  {
    id: 'familia-setorizado',
    name: 'Família setorizado',
    category: 'familia',
    flow: 'GRID_EXPO',
    stage: 'TOP',
    opsProfile: 'FAMILY',
    keywords: ['familia', 'família', 'setores tranquilos', 'area kids', 'área kids'],
  },
  {
    id: 'tour-passeio',
    name: 'Passeio/tour com fluxo',
    category: 'tour',
    flow: 'PROMENADE',
    stage: 'NONE',
    opsProfile: 'OUTDOOR',
    keywords: ['tour', 'passeio', 'circuito', 'fluxo unico', 'fluxo único'],
  },
  {
    id: 'museu-exposicao',
    name: 'Museu/exposição',
    category: 'expo',
    flow: 'PROMENADE',
    stage: 'NONE',
    opsProfile: 'EXPO',
    keywords: ['museu', 'exposicao', 'exposição', 'galeria', 'percurso'],
  },
  {
    id: 'food-festival',
    name: 'Food festival',
    category: 'gastronomia',
    flow: 'GRID_EXPO',
    stage: 'BOTTOM',
    opsProfile: 'GASTRO',
    keywords: ['food festival', 'comida', 'bebida', 'bares em volta'],
  },
  {
    id: 'multi-entradas',
    name: 'Múltiplas entradas',
    category: 'operacional',
    flow: 'ISLANDS',
    stage: 'TOP',
    opsProfile: 'OUTDOOR',
    keywords: ['varias entradas', 'várias entradas', 'entrada norte', 'entrada sul'],
  },
  {
    id: 'setores-por-preco',
    name: 'Setores por preço',
    category: 'comercial',
    flow: 'TOP_FAN',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['preco', 'preço', 'categorias', 'lotes', 'setores por valor'],
  },
  {
    id: 'mapa-compacto',
    name: 'Mapa compacto',
    category: 'compacto',
    flow: 'GRID_EXPO',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['compacto', 'pequeno', 'pouco espaco', 'pouco espaço'],
  },
  {
    id: 'mapa-grande-premium',
    name: 'Mapa grande premium',
    category: 'grande',
    flow: 'OPEN_AIR',
    stage: 'TOP',
    opsProfile: 'FESTIVAL',
    keywords: ['grande', 'mega evento', 'premium', 'muitos setores'],
  },
  {
    id: 'mapa-simples',
    name: 'Mapa simples',
    category: 'simples',
    flow: 'GRID_EXPO',
    stage: 'TOP',
    opsProfile: 'OUTDOOR',
    keywords: ['simples', 'basico', 'básico', 'rapido', 'rápido'],
  },
];

const OBJECT_TYPES = new Set([
  'AREA',
  'TABLE',
  'SEAT',
  'STAGE',
  'AISLE',
  'BOOTH',
  'BLOCKED_SPACE',
]);

const ROLES = new Set(['SECTOR', 'STAGE', 'AISLE', 'BLOCKED', 'OPERATIONAL']);

const OPERATIONAL_TYPES = new Set([
  'BAR',
  'RESTROOM',
  'ENTRANCE',
  'EXIT',
  'EMERGENCY',
  'ACCESSIBILITY',
]);

const SHAPES = new Set(['RECT', 'ELLIPSE', 'POLYGON', 'PATH']);

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    message: { type: 'string' },
    action: {
      type: 'string',
      enum: ['advice', 'replace_map', 'append_objects'],
    },
    objects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: true,
      },
    },
    warnings: {
      type: 'array',
      items: { type: 'string' },
    },
    suggestions: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['message', 'action', 'objects', 'warnings', 'suggestions'],
};

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function cleanPoint(point: EventMapAiPoint, width: number, height: number) {
  const x = clamp(Math.round(toNumber(point?.x, 0)), -width, width * 2);
  const y = clamp(Math.round(toNumber(point?.y, 0)), -height, height * 2);
  const cx =
    point?.cx === undefined
      ? undefined
      : clamp(Math.round(toNumber(point.cx, x)), -width, width * 2);
  const cy =
    point?.cy === undefined
      ? undefined
      : clamp(Math.round(toNumber(point.cy, y)), -height, height * 2);

  return {
    x,
    y,
    curve: Boolean(point?.curve),
    cx,
    cy,
  };
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function findSectorByTerms(sectors: EventMapAiSector[], terms: string[]) {
  return sectors.find((sector) => {
    const name = normalizeText(sector.name || '');
    const kind = normalizeText(sector.kind || '');

    return terms.some((term) => {
      const normalizedTerm = normalizeText(term);
      return name.includes(normalizedTerm) || kind.includes(normalizedTerm);
    });
  });
}

function findFirstUnusedSector(
  sectors: EventMapAiSector[],
  usedSectorIds: Set<string>,
) {
  return sectors.find((sector) => !usedSectorIds.has(sector.localId));
}

function getSectorColor(sector: EventMapAiSector | undefined, fallback: string) {
  return sector?.color || fallback;
}

function absolutePolygon(x: number, y: number, points: EventMapAiPoint[]) {
  return points.map((point) => ({
    ...point,
    x: point.x - x,
    y: point.y - y,
    cx: point.cx === undefined ? undefined : point.cx - x,
    cy: point.cy === undefined ? undefined : point.cy - y,
  }));
}

function boundsFromAbsolutePoints(points: EventMapAiPoint[]) {
  const xs = points.flatMap((point) =>
    point.cx === undefined ? [point.x] : [point.x, point.cx],
  );
  const ys = points.flatMap((point) =>
    point.cy === undefined ? [point.y] : [point.y, point.cy],
  );

  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x,
    y,
    width: Math.max(1, maxX - x),
    height: Math.max(1, maxY - y),
  };
}

function createObject(input: CreateObjectInput): EventMapAiObject {
  const hasPoints = Array.isArray(input.points) && input.points.length >= 3;
  const bounds = hasPoints
    ? boundsFromAbsolutePoints(input.points || [])
    : {
        x: input.x,
        y: input.y,
        width: input.width,
        height: input.height,
      };

  const points = hasPoints
    ? absolutePolygon(bounds.x, bounds.y, input.points || [])
    : undefined;

  return {
    localId: input.localId,
    venueSectorLocalId: input.role === 'SECTOR' ? input.sector?.localId || '' : '',
    code: input.code,
    label: input.label,
    type: input.type,
    capacity:
      input.capacity ||
      (input.role === 'SECTOR' ? input.sector?.capacity || '1' : '1'),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.round(bounds.width),
    height: Math.round(bounds.height),
    rotation: input.rotation || 0,
    status: 'AVAILABLE',
    metadata: {
      shape: input.shape || (hasPoints ? 'POLYGON' : 'RECT'),
      points,
      role: input.role,
      operationalType: input.operationalType,
      generatedBy: 'assistant',
      prompt: input.prompt,
    },
  };
}

function getOpenAiOutputText(response: Record<string, any>) {
  if (typeof response.output_text === 'string') {
    return response.output_text;
  }

  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    const content = Array.isArray(item?.content) ? item.content : [];

    for (const part of content) {
      if (part?.type === 'output_text' && typeof part.text === 'string') {
        return part.text;
      }

      if (typeof part?.text === 'string') {
        return part.text;
      }
    }
  }

  return '';
}

function buildSystemPrompt() {
  return [
    'Você é uma IA especializada em criar plantas visuais para eventos no Brasil.',
    'Responda sempre em português do Brasil.',
    'Você deve respeitar os setores enviados pelo sistema.',
    'REGRA CRÍTICA: crie objetos com metadata.role=SECTOR somente para setores existentes no array sectors.',
    'Se o usuário pedir um setor que não existe no array sectors, não crie esse setor. Explique em warnings.',
    'Não invente setor de venda novo quando houver setores fornecidos. Use venueSectorLocalId para vincular cada setor.',
    'Palcos, corredores, bloqueios, bares, banheiros, entradas e saídas podem existir sem venueSectorLocalId.',
    'Use coordenadas dentro do mapa. O canto superior esquerdo é x=0, y=0.',
    'Crie mapas claros, com palco normalmente no topo, setores premium próximos ao palco e corredores de acesso.',
    'Quando o usuário pedir ajuste, preserve o máximo possível dos objetos atuais e altere só o necessário.',
    'Para formatos quebrados, use metadata.shape POLYGON ou PATH com metadata.points.',
    'Para curvas, use point.curve=true com cx/cy.',
    'Objetos operacionais devem usar metadata.role=OPERATIONAL e operationalType BAR, RESTROOM, ENTRANCE, EXIT, EMERGENCY ou ACCESSIBILITY.',
    'Se mode=chat, dê principalmente conselho e use action=advice, exceto se o usuário pedir explicitamente para gerar/aplicar mapa.',
    'Se mode=generate, devolva objetos prontos para aplicar no mapa.',
    'IMPORTANTE: devolva SOMENTE JSON válido no formato pedido, sem markdown e sem texto fora do JSON.',
  ].join('\n');
}

function buildUserPayload({
  mode,
  prompt,
  mapWidth,
  mapHeight,
  sectors,
  currentObjects,
  referenceImageDescription,
}: {
  mode: string;
  prompt: string;
  mapWidth: number;
  mapHeight: number;
  sectors: EventMapAiSector[];
  currentObjects: EventMapAiObject[];
  referenceImageDescription?: string;
}) {
  return JSON.stringify({
    mode,
    prompt,
    referenceImageDescription,
    hardRules: [
      'HardRule V102: apenas um palco principal por padrÃ£o; crie segundo palco somente se o usuÃ¡rio pedir explicitamente.',
      'HardRule V102: setores de mesas devem carregar metadata.tableCount e metadata.seatsPerTable quando a quantidade for conhecida.',
      'HardRule V102: nÃ£o inventar PALCO duplicado se jÃ¡ existir palco operacional.',
      'Somente setores presentes em sectors podem virar metadata.role=SECTOR.',
      'Nunca use venueSectorLocalId que não exista em sectors.',
      'Se algo pedido não existir como setor, coloque em warnings ou como OPERATIONAL se fizer sentido.',
    ],
    map: {
      width: mapWidth,
      height: mapHeight,
    },
    sectors,
    currentObjects,
    expectedResponse: {
      message: 'string',
      action: 'advice | replace_map | append_objects',
      objects: [
        {
          localId: 'string opcional',
          venueSectorLocalId: 'string vazio para objeto sem setor',
          code: 'string',
          label: 'string',
          type: 'AREA | TABLE | SEAT | STAGE | AISLE | BOOTH | BLOCKED_SPACE',
          capacity: 'string numerica',
          x: 'number',
          y: 'number',
          width: 'number',
          height: 'number',
          rotation: 'number',
          status: 'AVAILABLE',
          metadata: {
            shape: 'RECT | ELLIPSE | POLYGON | PATH',
            role: 'SECTOR | STAGE | AISLE | BLOCKED | OPERATIONAL',
            operationalType:
              'BAR | RESTROOM | ENTRANCE | EXIT | EMERGENCY | ACCESSIBILITY',
            points: [{ x: 0, y: 0, curve: false, cx: 0, cy: 0 }],
            generatedBy: 'assistant',
            prompt: 'prompt original',
          },
        },
      ],
      warnings: ['string'],
      suggestions: ['string'],
    },
  });
}

@Injectable()
export class EventMapAiService {
  constructor(private readonly config: ConfigService) {}

  async generate(body: GenerateEventMapAiDto) {
    const prompt = body.prompt?.trim();

    if (!prompt) {
      throw new BadRequestException('Informe uma descrição ou pergunta para a IA.');
    }

    const mode = body.mode || 'generate';
    const mapWidth = Math.round(toNumber(body.map?.width, 1280));
    const mapHeight = Math.round(toNumber(body.map?.height, 900));
    const sectors = Array.isArray(body.sectors) ? body.sectors : [];
    const currentObjects = Array.isArray(body.currentObjects)
      ? body.currentObjects
      : [];

    const normalizedReferenceImage = this.normalizeReferenceImage(
      body.referenceImage,
    );
    const referenceWarnings: string[] = [];
    let referenceImageDescription = '';

    if (normalizedReferenceImage) {
      try {
        referenceImageDescription = await this.describeReferenceImageWithOllama({
          prompt,
          referenceImage: normalizedReferenceImage,
        });
      } catch (error) {
        referenceWarnings.push(
          error instanceof Error
            ? `Não consegui analisar a imagem de referência: ${error.message}`
            : 'Não consegui analisar a imagem de referência.',
        );
      }
    }

    const promptWithReference = referenceImageDescription
      ? `${prompt}\n\nAnálise da imagem de referência:\n${referenceImageDescription}`
      : prompt;

    const templateResponse = this.tryTemplateLayout({
      mode,
      prompt: promptWithReference,
      mapWidth,
      mapHeight,
      sectors,
      currentObjects,
    });

    if (templateResponse) {
      return {
        provider: 'template',
        model: 'layout-catalog-v32-50-templates',
        message: templateResponse.message,
        action: templateResponse.action,
        objects: templateResponse.objects,
        warnings: [...referenceWarnings, ...templateResponse.warnings],
        suggestions: templateResponse.suggestions,
        referenceImageDescription,
      };
    }

    const provider = this.resolveProvider();

    const parsed =
      provider === 'ollama'
        ? await this.callOllama({
            mode,
            prompt: promptWithReference,
            mapWidth,
            mapHeight,
            sectors,
            currentObjects,
            referenceImage: normalizedReferenceImage,
            referenceImageDescription,
          })
        : await this.callOpenAi({
            mode,
            prompt: promptWithReference,
            mapWidth,
            mapHeight,
            sectors,
            currentObjects,
            referenceImageDescription,
          });

    const sanitizedObjects =
      parsed.action === 'advice'
        ? []
        : this.sanitizeObjects({
            objects: parsed.objects || [],
            sectors,
            prompt,
            mapWidth,
            mapHeight,
          });

    return {
      provider,
      model:
        provider === 'ollama'
          ? this.getOllamaModel()
          : this.config.get<string>('OPENAI_MODEL') || 'gpt-4.1-mini',
      message: cleanString(parsed.message, 'Sugestão gerada.'),
      action: parsed.action || (mode === 'chat' ? 'advice' : 'replace_map'),
      objects: sanitizedObjects,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  }

  private normalizeReferenceImage(
    referenceImage?: EventMapAiReferenceImage,
  ): NormalizedReferenceImage | null {
    const rawBase64 = referenceImage?.base64 || referenceImage?.dataUrl;

    if (!rawBase64 || typeof rawBase64 !== 'string') return null;

    const dataUrlMatch = rawBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    const mimeType =
      referenceImage?.mimeType || dataUrlMatch?.[1] || 'image/png';
    const base64 = (dataUrlMatch?.[2] || rawBase64).trim();

    if (!base64) return null;

    const approxBytes = Math.ceil((base64.length * 3) / 4);

    if (approxBytes > 8 * 1024 * 1024) {
      throw new BadRequestException(
        'Imagem de referência muito grande. Use uma imagem menor que 8MB.',
      );
    }

    return {
      name: referenceImage?.name,
      mimeType,
      base64,
    };
  }

  private getOllamaVisionModel() {
    return (
      this.config.get<string>('OLLAMA_VISION_MODEL') ||
      this.config.get<string>('AI_VISION_MODEL') ||
      'llava:7b'
    );
  }

  private async describeReferenceImageWithOllama({
    prompt,
    referenceImage,
  }: {
    prompt: string;
    referenceImage: NormalizedReferenceImage;
  }) {
    const baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';
    const model = this.getOllamaVisionModel();

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        keep_alive: '10m',
        options: {
          temperature: 0.1,
          num_predict: 1200,
        },
        messages: [
          {
            role: 'user',
            content: [
              'Analise esta imagem como referência para criar um mapa editável de evento.',
              'Descreva posição relativa dos setores, palco, corredores, entradas, banheiros, bares e áreas de apoio.',
              'Não invente setores de venda. Foque em geometria, localização e composição visual.',
              `Pedido do usuário: ${prompt}`,
            ].join('\n'),
            images: [referenceImage.base64],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');

      throw new InternalServerErrorException(
        errorText ||
          `Erro ao analisar imagem com Ollama Vision em ${baseUrl}. Baixe um modelo de visão, por exemplo: ollama pull llava:7b`,
      );
    }

    if (!response.body) {
      throw new InternalServerErrorException(
        'Ollama Vision não retornou stream de resposta.',
      );
    }

    return this.readOllamaStreamText(response);
  }

  private async readOllamaStreamText(response: Response) {
    if (!response.body) return '';

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();

        if (!trimmed) continue;

        let parsed: Record<string, any>;

        try {
          parsed = JSON.parse(trimmed) as Record<string, any>;
        } catch {
          continue;
        }

        if (parsed.error) {
          throw new InternalServerErrorException(String(parsed.error));
        }

        if (typeof parsed.message?.content === 'string') {
          content += parsed.message.content;
        }

        if (typeof parsed.response === 'string') {
          content += parsed.response;
        }
      }
    }

    const finalChunk = buffer.trim();

    if (finalChunk) {
      const parsed = JSON.parse(finalChunk) as Record<string, any>;

      if (parsed.error) {
        throw new InternalServerErrorException(String(parsed.error));
      }

      if (typeof parsed.message?.content === 'string') {
        content += parsed.message.content;
      }

      if (typeof parsed.response === 'string') {
        content += parsed.response;
      }
    }

    return content.trim();
  }

  private tryTemplateLayout({
    mode,
    prompt,
    mapWidth,
    mapHeight,
    sectors,
    currentObjects,
  }: {
    mode: string;
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
  }): MapAiResponse | null {
    if (mode === 'chat') return null;

    const template = this.selectLayoutTemplate(prompt);

    if (!template) return null;

    return this.createCatalogLayoutTemplate({
      prompt,
      mapWidth,
      mapHeight,
      sectors,
      currentObjects,
      template,
    });
  }

  private selectLayoutTemplate(prompt: string) {
    const normalizedPrompt = normalizeText(prompt);

    let bestTemplate: LayoutTemplateDefinition | null = null;
    let bestScore = 0;

    for (const template of LAYOUT_TEMPLATES) {
      let score = template.priority || 0;

      for (const keyword of template.keywords) {
        const normalizedKeyword = normalizeText(keyword);

        if (normalizedPrompt.includes(normalizedKeyword)) {
          score += normalizedKeyword.length > 8 ? 10 : 6;
        }
      }

      if (normalizedPrompt.includes(normalizeText(template.name))) {
        score += 14;
      }

      if (normalizedPrompt.includes(normalizeText(template.category))) {
        score += 4;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTemplate = template;
      }
    }

    if (bestTemplate && bestScore >= 8) {
      return bestTemplate;
    }

    const looksLikeMapRequest = includesAny(normalizedPrompt, [
      'mapa',
      'layout',
      'planta',
      'evento',
      'setor',
      'setores',
      'palco',
      'entrada',
      'banheiro',
      'corredor',
      'crie',
      'gerar',
    ]);

    if (!looksLikeMapRequest) return null;

    return (
      LAYOUT_TEMPLATES.find((template) => template.id === 'festival-palco-frontal') ||
      LAYOUT_TEMPLATES[0]
    );
  }

  private createCatalogLayoutTemplate({
    prompt,
    mapWidth,
    mapHeight,
    sectors,
    template,
  }: {
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
    template: LayoutTemplateDefinition;
  }): MapAiResponse {
    const scaleX = mapWidth / 1280;
    const scaleY = mapHeight / 900;
    const sx = (value: number) => Math.round(value * scaleX);
    const sy = (value: number) => Math.round(value * scaleY);

    const validSectors = sectors.filter((sector) => sector?.localId && sector?.name);
    const warnings: string[] = [];

    if (validSectors.length === 0) {
      warnings.push('Nenhum setor foi enviado. Criei apenas estrutura operacional.');
    }

    const sectorRegions = this.buildSectorRegions({
      template,
      count: validSectors.length,
      sx,
      sy,
    });

    const sectorObjects = validSectors.map((sector, index) => {
      const region =
        sectorRegions[index] ||
        this.createRegion(sx(180 + (index % 4) * 230), sy(250 + Math.floor(index / 4) * 135), sx(190), sy(100), 10);

      return createObject({
        localId: `template-${template.id}-sector-${sector.localId}`,
        sector,
        code: `TPL-${index + 1}`,
        label: sector.name,
        type: this.getSectorVisualType(sector),
        capacity: sector.capacity || '1',
        x: region.x,
        y: region.y,
        width: region.width,
        height: region.height,
        role: 'SECTOR',
        shape: 'POLYGON',
        points: region.points,
        prompt,
      });
    });

    const operationalObjects = this.buildOperationalObjects({
      template,
      prompt,
      sx,
      sy,
    });

    const orderedObjects = this.orderTemplateObjects({
      template,
      sectorObjects,
      operationalObjects,
    });

    return {
      message: `Template aplicado: ${template.name}. Usei somente os setores existentes e completei com palco, corredores, entradas, saídas, bares e banheiros.`,
      action: 'replace_map',
      objects: orderedObjects,
      warnings,
      suggestions: [
        `Template escolhido automaticamente: ${template.name}.`,
        'Para forçar outro desenho, escreva termos como palco central, teatro, congresso, expo, ferradura, diagonal, estádio ou food festival.',
        'Se algum setor esperado não apareceu, crie-o primeiro em Setores/áreas.',
      ],
    };
  }

  private getSectorVisualType(sector: EventMapAiSector): string {
    const text = normalizeText(`${sector.name || ''} ${sector.kind || ''}`);

    if (includesAny(text, ['camarote', 'booth', 'vip', 'lounge'])) {
      return 'BOOTH';
    }

    return 'AREA';
  }

  private createRegion(
    x: number,
    y: number,
    width: number,
    height: number,
    skew = 0,
  ) {
    return {
      x,
      y,
      width,
      height,
      points: [
        { x: x + skew, y },
        { x: x + width, y: y + Math.round(skew * 0.35) },
        { x: x + width - skew, y: y + height },
        { x, y: y + height - Math.round(skew * 0.35) },
      ],
    };
  }

  private buildSectorRegions({
    template,
    count,
    sx,
    sy,
  }: {
    template: LayoutTemplateDefinition;
    count: number;
    sx: (value: number) => number;
    sy: (value: number) => number;
  }) {
    const regions: ReturnType<EventMapAiService['createRegion']>[] = [];

    if (count <= 0) return regions;

    const push = (x: number, y: number, width: number, height: number, skew = 0) => {
      regions.push(this.createRegion(sx(x), sy(y), sx(width), sy(height), sx(skew)));
    };

    const grid = (startX: number, startY: number, columns: number, cellW: number, cellH: number, gapX: number, gapY: number, maxRows = 10) => {
      for (let index = 0; index < count; index += 1) {
        const col = index % columns;
        const row = Math.floor(index / columns) % maxRows;
        push(startX + col * (cellW + gapX), startY + row * (cellH + gapY), cellW, cellH, index % 2 === 0 ? 12 : -10);
      }
    };

    switch (template.flow) {
      case 'CENTRAL_RING': {
        const centerX = 640;
        const centerY = 435;
        const radiusX = 365;
        const radiusY = 250;

        for (let index = 0; index < count; index += 1) {
          const angle = (-90 + (360 / count) * index) * (Math.PI / 180);
          const sectorWidth = index === 0 ? 245 : 205;
          const sectorHeight = index === 0 ? 110 : 100;
          const x = centerX + Math.cos(angle) * radiusX - sectorWidth / 2;
          const y = centerY + Math.sin(angle) * radiusY - sectorHeight / 2;

          push(x, y, sectorWidth, sectorHeight, index % 2 === 0 ? 18 : -14);
        }
        break;
      }

      case 'TOP_FAN':
      case 'AUDITORIUM':
      case 'AMPHITHEATER': {
        const rows = Math.ceil(count / 3);
        let index = 0;

        for (let row = 0; row < rows; row += 1) {
          const remaining = count - index;
          const columns = Math.min(3, remaining);
          const totalWidth = columns === 1 ? 520 : columns === 2 ? 680 : 850;
          const cellW = Math.floor((totalWidth - (columns - 1) * 24) / columns);
          const y = 250 + row * 128;
          const xStart = 640 - totalWidth / 2;

          for (let col = 0; col < columns; col += 1) {
            if (index >= count) break;
            push(xStart + col * (cellW + 24), y, cellW, 105, col % 2 === 0 ? 15 : -12);
            index += 1;
          }
        }
        break;
      }

      case 'LEFT_STAGE':
        grid(300, 170, 3, 235, 118, 28, 28);
        break;

      case 'RIGHT_STAGE':
        grid(155, 170, 3, 235, 118, 28, 28);
        break;

      case 'BOTTOM_STAGE':
        grid(185, 120, 3, 270, 118, 26, 28);
        break;

      case 'GRID_EXPO':
      case 'MULTI_ROOM':
        grid(170, 170, 4, 210, 110, 28, 28);
        break;

      case 'SPLIT_SIDES': {
        if (count === 1) {
          push(405, 300, 470, 210, 10);
          break;
        }

        push(405, 270, 470, 190, 12);

        for (let index = 1; index < count; index += 1) {
          const side = index % 2 === 1 ? 0 : 1;
          const row = Math.floor((index - 1) / 2);
          const x = side === 0 ? 145 : 930;
          const y = 220 + row * 135;

          push(x, y, 230, 115, side === 0 ? -15 : 15);
        }
        break;
      }

      case 'HORSESHOE': {
        const positions = [
          [410, 235, 460, 110, 10],
          [185, 300, 230, 145, -16],
          [865, 300, 230, 145, 16],
          [235, 505, 250, 120, -10],
          [795, 505, 250, 120, 10],
          [500, 620, 280, 110, 0],
        ];

        for (let index = 0; index < count; index += 1) {
          const item = positions[index % positions.length];
          const cycle = Math.floor(index / positions.length);
          push(item[0] + cycle * 18, item[1] + cycle * 18, item[2], item[3], item[4]);
        }
        break;
      }

      case 'LANES':
      case 'PROMENADE': {
        for (let index = 0; index < count; index += 1) {
          push(190, 180 + index * 90, 900, 70, index % 2 === 0 ? 18 : -18);
        }
        break;
      }

      case 'ISLANDS':
      case 'OPEN_AIR':
      case 'BANQUET': {
        const positions = [
          [420, 230, 240, 120, 15],
          [690, 230, 240, 120, -12],
          [280, 390, 230, 130, -15],
          [530, 405, 230, 130, 10],
          [780, 390, 230, 130, 15],
          [405, 570, 250, 120, -10],
          [680, 570, 250, 120, 12],
          [155, 245, 210, 110, -10],
          [920, 245, 210, 110, 10],
        ];

        for (let index = 0; index < count; index += 1) {
          const item = positions[index % positions.length];
          const cycle = Math.floor(index / positions.length);
          push(item[0] + cycle * 20, item[1] + cycle * 18, item[2], item[3], item[4]);
        }
        break;
      }

      case 'DIAGONAL': {
        for (let index = 0; index < count; index += 1) {
          const row = Math.floor(index / 3);
          const col = index % 3;
          push(220 + col * 285 + row * 55, 180 + row * 140 + col * 25, 250, 105, 24);
        }
        break;
      }

      case 'STADIUM': {
        const positions = [
          [440, 145, 400, 95, 8],
          [440, 655, 400, 95, -8],
          [150, 300, 230, 250, -16],
          [900, 300, 230, 250, 16],
          [415, 280, 450, 110, 10],
          [415, 510, 450, 110, -10],
        ];

        for (let index = 0; index < count; index += 1) {
          const item = positions[index % positions.length];
          const cycle = Math.floor(index / positions.length);
          push(item[0] + cycle * 16, item[1] + cycle * 16, item[2], item[3], item[4]);
        }
        break;
      }

      case 'DOUBLE_STAGE': {
        grid(195, 250, 3, 270, 115, 28, 28);
        break;
      }

      case 'CORNER_STAGE': {
        for (let index = 0; index < count; index += 1) {
          const row = Math.floor(index / 3);
          const col = index % 3;
          push(330 + col * 250, 230 + row * 130, 220, 105, template.stage === 'TOP_LEFT' ? 18 : -18);
        }
        break;
      }

      default:
        grid(180, 230, 3, 265, 115, 28, 28);
        break;
    }

    return regions.slice(0, count);
  }

  private buildOperationalObjects({
    template,
    prompt,
    sx,
    sy,
  }: {
    template: LayoutTemplateDefinition;
    prompt: string;
    sx: (value: number) => number;
    sy: (value: number) => number;
  }) {
    const objects: EventMapAiObject[] = [];
    const make = (input: Omit<CreateObjectInput, 'prompt'>) =>
      createObject({
        ...input,
        prompt,
      });

    const addStage = () => {
      if (template.stage === 'NONE') return;

      if (template.stage === 'CENTER') {
        objects.push(
          make({
            localId: 'op-stage-center',
            code: 'STAGE-CENTER',
            label: 'Palco Central',
            type: 'STAGE',
            x: sx(540),
            y: sy(355),
            width: sx(200),
            height: sy(155),
            role: 'STAGE',
            shape: 'POLYGON',
            points: [
              { x: sx(540), y: sy(380) },
              { x: sx(585), y: sy(340) },
              { x: sx(700), y: sy(340) },
              { x: sx(745), y: sy(380) },
              { x: sx(745), y: sy(485) },
              { x: sx(700), y: sy(525) },
              { x: sx(585), y: sy(525) },
              { x: sx(540), y: sy(485) },
            ],
          }),
        );
        return;
      }

      if (template.stage === 'LEFT') {
        objects.push(
          make({
            localId: 'op-stage-left',
            code: 'STAGE-LEFT',
            label: 'Palco',
            type: 'STAGE',
            x: sx(35),
            y: sy(250),
            width: sx(210),
            height: sy(270),
            role: 'STAGE',
          }),
        );
        return;
      }

      if (template.stage === 'RIGHT') {
        objects.push(
          make({
            localId: 'op-stage-right',
            code: 'STAGE-RIGHT',
            label: 'Palco',
            type: 'STAGE',
            x: sx(1035),
            y: sy(250),
            width: sx(210),
            height: sy(270),
            role: 'STAGE',
          }),
        );
        return;
      }

      if (template.stage === 'BOTTOM') {
        objects.push(
          make({
            localId: 'op-stage-bottom',
            code: 'STAGE-BOTTOM',
            label: 'Palco',
            type: 'STAGE',
            x: sx(420),
            y: sy(720),
            width: sx(440),
            height: sy(105),
            role: 'STAGE',
          }),
        );
        return;
      }

      if (template.stage === 'DOUBLE') {
        objects.push(
          make({
            localId: 'op-stage-a',
            code: 'STAGE-A',
            label: 'Palco A',
            type: 'STAGE',
            x: sx(220),
            y: sy(65),
            width: sx(315),
            height: sy(90),
            role: 'STAGE',
          }),
          make({
            localId: 'op-stage-b',
            code: 'STAGE-B',
            label: 'Palco B',
            type: 'STAGE',
            x: sx(745),
            y: sy(65),
            width: sx(315),
            height: sy(90),
            role: 'STAGE',
          }),
        );
        return;
      }

      if (template.stage === 'TOP_LEFT') {
        objects.push(
          make({
            localId: 'op-stage-top-left',
            code: 'STAGE-TL',
            label: 'Palco',
            type: 'STAGE',
            x: sx(70),
            y: sy(70),
            width: sx(330),
            height: sy(95),
            role: 'STAGE',
          }),
        );
        return;
      }

      if (template.stage === 'TOP_RIGHT') {
        objects.push(
          make({
            localId: 'op-stage-top-right',
            code: 'STAGE-TR',
            label: 'Palco',
            type: 'STAGE',
            x: sx(880),
            y: sy(70),
            width: sx(330),
            height: sy(95),
            role: 'STAGE',
          }),
        );
        return;
      }

      objects.push(
        make({
          localId: 'op-stage-top',
          code: 'STAGE-TOP',
          label: 'Palco',
          type: 'STAGE',
          x: sx(420),
          y: sy(60),
          width: sx(440),
          height: sy(105),
          role: 'STAGE',
        }),
      );
    };

    addStage();

    if (template.flow === 'CENTRAL_RING') {
      objects.push(
        make({
          localId: 'op-aisle-ring',
          code: 'AISLE-RING',
          label: 'Anel circulação',
          type: 'AISLE',
          x: sx(390),
          y: sy(250),
          width: sx(500),
          height: sy(370),
          role: 'AISLE',
          shape: 'POLYGON',
          points: [
            { x: sx(390), y: sy(300) },
            { x: sx(475), y: sy(235) },
            { x: sx(805), y: sy(235) },
            { x: sx(890), y: sy(300) },
            { x: sx(900), y: sy(465) },
            { x: sx(820), y: sy(625) },
            { x: sx(460), y: sy(625) },
            { x: sx(380), y: sy(465) },
          ],
        }),
        make({
          localId: 'op-aisle-cross-v',
          code: 'AISLE-CROSS-V',
          label: 'Eixo vertical',
          type: 'AISLE',
          x: sx(595),
          y: sy(160),
          width: sx(90),
          height: sy(610),
          role: 'AISLE',
        }),
        make({
          localId: 'op-aisle-cross-h',
          code: 'AISLE-CROSS-H',
          label: 'Eixo horizontal',
          type: 'AISLE',
          x: sx(205),
          y: sy(400),
          width: sx(870),
          height: sy(80),
          role: 'AISLE',
        }),
      );
    } else if (template.flow === 'GRID_EXPO' || template.flow === 'MULTI_ROOM') {
      objects.push(
        make({
          localId: 'op-aisle-main-grid',
          code: 'AISLE-MAIN',
          label: 'Corredor principal',
          type: 'AISLE',
          x: sx(120),
          y: sy(420),
          width: sx(1040),
          height: sy(70),
          role: 'AISLE',
        }),
        make({
          localId: 'op-aisle-grid-v',
          code: 'AISLE-V',
          label: 'Corredor vertical',
          type: 'AISLE',
          x: sx(600),
          y: sy(145),
          width: sx(75),
          height: sy(590),
          role: 'AISLE',
        }),
      );
    } else if (template.flow === 'LANES' || template.flow === 'PROMENADE') {
      objects.push(
        make({
          localId: 'op-flow-main',
          code: 'FLOW-MAIN',
          label: 'Fluxo principal',
          type: 'AISLE',
          x: sx(120),
          y: sy(110),
          width: sx(1040),
          height: sy(70),
          role: 'AISLE',
        }),
        make({
          localId: 'op-flow-return',
          code: 'FLOW-RETURN',
          label: 'Retorno',
          type: 'AISLE',
          x: sx(120),
          y: sy(735),
          width: sx(1040),
          height: sy(70),
          role: 'AISLE',
        }),
      );
    } else {
      objects.push(
        make({
          localId: 'op-aisle-left',
          code: 'AISLE-LEFT',
          label: 'Corredor esquerdo',
          type: 'AISLE',
          x: sx(125),
          y: sy(210),
          width: sx(70),
          height: sy(520),
          role: 'AISLE',
        }),
        make({
          localId: 'op-aisle-right',
          code: 'AISLE-RIGHT',
          label: 'Corredor direito',
          type: 'AISLE',
          x: sx(1085),
          y: sy(210),
          width: sx(70),
          height: sy(520),
          role: 'AISLE',
        }),
        make({
          localId: 'op-aisle-bottom',
          code: 'AISLE-BOTTOM',
          label: 'Corredor inferior',
          type: 'AISLE',
          x: sx(220),
          y: sy(735),
          width: sx(840),
          height: sy(65),
          role: 'AISLE',
        }),
      );
    }

    objects.push(
      make({
        localId: 'op-entry-main',
        code: 'ENTRY-MAIN',
        label: 'Entrada Principal',
        type: 'AREA',
        x: sx(525),
        y: sy(805),
        width: sx(230),
        height: sy(62),
        role: 'OPERATIONAL',
        operationalType: 'ENTRANCE',
      }),
      make({
        localId: 'op-exit-left',
        code: 'EXIT-LEFT',
        label: 'Saída E',
        type: 'AREA',
        x: sx(60),
        y: sy(450),
        width: sx(130),
        height: sy(52),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
      }),
      make({
        localId: 'op-exit-right',
        code: 'EXIT-RIGHT',
        label: 'Saída D',
        type: 'AREA',
        x: sx(1090),
        y: sy(450),
        width: sx(130),
        height: sy(52),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
      }),
      make({
        localId: 'op-restroom-left',
        code: 'WC-LEFT',
        label: 'Banheiros E',
        type: 'AREA',
        x: sx(60),
        y: sy(610),
        width: sx(150),
        height: sy(52),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
      }),
      make({
        localId: 'op-restroom-right',
        code: 'WC-RIGHT',
        label: 'Banheiros D',
        type: 'AREA',
        x: sx(1070),
        y: sy(610),
        width: sx(150),
        height: sy(52),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
      }),
      make({
        localId: 'op-bar-left',
        code: 'BAR-LEFT',
        label: 'Bar E',
        type: 'AREA',
        x: sx(60),
        y: sy(675),
        width: sx(130),
        height: sy(52),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
      }),
      make({
        localId: 'op-bar-right',
        code: 'BAR-RIGHT',
        label: 'Bar D',
        type: 'AREA',
        x: sx(1090),
        y: sy(675),
        width: sx(130),
        height: sy(52),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
      }),
      make({
        localId: 'op-food',
        code: 'FOOD',
        label: 'Praça Alimentação',
        type: 'AREA',
        x: sx(930),
        y: sy(760),
        width: sx(260),
        height: sy(80),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        shape: 'POLYGON',
        points: [
          { x: sx(930), y: sy(765) },
          { x: sx(1190), y: sy(745) },
          { x: sx(1205), y: sy(830) },
          { x: sx(945), y: sy(850) },
        ],
      }),
    );

    return objects;
  }

  private orderTemplateObjects({
    sectorObjects,
    operationalObjects,
  }: {
    template: LayoutTemplateDefinition;
    sectorObjects: EventMapAiObject[];
    operationalObjects: EventMapAiObject[];
  }) {
    const aisles = operationalObjects.filter((object) => object.type === 'AISLE');
    const nonAisleOperational = operationalObjects.filter(
      (object) => object.type !== 'AISLE' && object.metadata?.role !== 'STAGE',
    );
    const stages = operationalObjects.filter((object) => object.metadata?.role === 'STAGE');

    const largeSectors = sectorObjects.filter(
      (object) => Number(object.width || 0) * Number(object.height || 0) > 70000,
    );
    const smallSectors = sectorObjects.filter(
      (object) => Number(object.width || 0) * Number(object.height || 0) <= 70000,
    );

    return [...largeSectors, ...aisles, ...smallSectors, ...stages, ...nonAisleOperational];
  }

  private createCentralStageTemplate({
    prompt,
    mapWidth,
    mapHeight,
    sectors,
  }: {
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
  }): MapAiResponse {
    const skippedVisualAreas: string[] = [];

    const sectorDiamante = findSectorByTerms(sectors, [
      'mesas diamante',
      'diamante',
      'premium',
    ]);
    const sectorOuro = findSectorByTerms(sectors, ['mesas ouro', 'ouro']);
    const sectorPrata = findSectorByTerms(sectors, ['mesas prata', 'prata']);
    const sectorBronze = findSectorByTerms(sectors, ['mesas bronze', 'bronze']);
    const sectorPista = findSectorByTerms(sectors, [
      'pista',
      'arena',
      'geral',
      'open',
    ]);
    const sectorBrahma = findSectorByTerms(sectors, [
      'camarote brahma',
      'brahma',
    ]);
    const sectorSuperBull = findSectorByTerms(sectors, [
      'camarote super bull',
      'camarote superbull',
      'super bull',
      'superbull',
    ]);

    const scaleX = mapWidth / 1280;
    const scaleY = mapHeight / 900;
    const sx = (value: number) => Math.round(value * scaleX);
    const sy = (value: number) => Math.round(value * scaleY);

    const sectorObjects: EventMapAiObject[] = [];

    function pushSector(
      sector: EventMapAiSector | undefined,
      fallbackName: string,
      createInput: Omit<CreateObjectInput, 'sector' | 'prompt' | 'role' | 'label'>,
    ) {
      if (!sector) {
        skippedVisualAreas.push(fallbackName);
        return;
      }

      sectorObjects.push(
        createObject({
          ...createInput,
          sector,
          label: sector.name,
          role: 'SECTOR',
          prompt,
        }),
      );
    }

    const operationalObjects: EventMapAiObject[] = [
      createObject({
        localId: 'central-stage',
        code: 'STAGE-CENTRAL',
        label: 'Palco Central',
        type: 'STAGE',
        x: sx(540),
        y: sy(355),
        width: sx(210),
        height: sy(160),
        role: 'STAGE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(540), y: sy(380) },
          { x: sx(585), y: sy(340) },
          { x: sx(705), y: sy(340) },
          { x: sx(750), y: sy(380) },
          { x: sx(750), y: sy(490) },
          { x: sx(705), y: sy(530) },
          { x: sx(585), y: sy(530) },
          { x: sx(540), y: sy(490) },
        ],
      }),

      createObject({
        localId: 'central-ring-aisle',
        code: 'AISLE-RING',
        label: 'Anel de circulação',
        type: 'AISLE',
        x: sx(420),
        y: sy(260),
        width: sx(440),
        height: sy(360),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(410), y: sy(300) },
          { x: sx(480), y: sy(240) },
          { x: sx(800), y: sy(240) },
          { x: sx(870), y: sy(300) },
          { x: sx(890), y: sy(450) },
          { x: sx(830), y: sy(620) },
          { x: sx(465), y: sy(620) },
          { x: sx(390), y: sy(450) },
        ],
      }),

      createObject({
        localId: 'aisle-north',
        code: 'AISLE-NORTH',
        label: 'Acesso Norte',
        type: 'AISLE',
        x: sx(585),
        y: sy(115),
        width: sx(115),
        height: sy(155),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(585), y: sy(115) },
          { x: sx(700), y: sy(115) },
          { x: sx(700), y: sy(275) },
          { x: sx(585), y: sy(275) },
        ],
      }),

      createObject({
        localId: 'aisle-south',
        code: 'AISLE-SOUTH',
        label: 'Acesso Sul',
        type: 'AISLE',
        x: sx(585),
        y: sy(615),
        width: sx(115),
        height: sy(165),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(585), y: sy(615) },
          { x: sx(700), y: sy(615) },
          { x: sx(700), y: sy(785) },
          { x: sx(585), y: sy(785) },
        ],
      }),

      createObject({
        localId: 'aisle-west',
        code: 'AISLE-WEST',
        label: 'Acesso Oeste',
        type: 'AISLE',
        x: sx(245),
        y: sy(390),
        width: sx(170),
        height: sy(95),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(245), y: sy(390) },
          { x: sx(425), y: sy(390) },
          { x: sx(425), y: sy(485) },
          { x: sx(245), y: sy(485) },
        ],
      }),

      createObject({
        localId: 'aisle-east',
        code: 'AISLE-EAST',
        label: 'Acesso Leste',
        type: 'AISLE',
        x: sx(860),
        y: sy(390),
        width: sx(175),
        height: sy(95),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(860), y: sy(390) },
          { x: sx(1035), y: sy(390) },
          { x: sx(1035), y: sy(485) },
          { x: sx(860), y: sy(485) },
        ],
      }),

      createObject({
        localId: 'operational-main-entry',
        code: 'ENTRADA-PRINCIPAL',
        label: 'Entrada Principal',
        type: 'AREA',
        x: sx(555),
        y: sy(790),
        width: sx(170),
        height: sy(70),
        role: 'OPERATIONAL',
        operationalType: 'ENTRANCE',
        prompt,
      }),

      createObject({
        localId: 'operational-food',
        code: 'PRACA-ALIMENTACAO',
        label: 'Praça de Alimentação',
        type: 'AREA',
        x: sx(980),
        y: sy(700),
        width: sx(230),
        height: sy(115),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(985), y: sy(705) },
          { x: sx(1205), y: sy(680) },
          { x: sx(1220), y: sy(805) },
          { x: sx(1000), y: sy(830) },
        ],
      }),

      createObject({
        localId: 'operational-bar-1',
        code: 'BAR-1',
        label: 'Bar Oeste',
        type: 'AREA',
        x: sx(95),
        y: sy(585),
        width: sx(130),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
      }),

      createObject({
        localId: 'operational-bar-2',
        code: 'BAR-2',
        label: 'Bar Leste',
        type: 'AREA',
        x: sx(1060),
        y: sy(585),
        width: sx(130),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
      }),

      createObject({
        localId: 'operational-restroom-west',
        code: 'WC-WEST',
        label: 'Banheiros Oeste',
        type: 'AREA',
        x: sx(90),
        y: sy(670),
        width: sx(155),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
        prompt,
      }),

      createObject({
        localId: 'operational-restroom-east',
        code: 'WC-EAST',
        label: 'Banheiros Leste',
        type: 'AREA',
        x: sx(1045),
        y: sy(670),
        width: sx(155),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
        prompt,
      }),

      createObject({
        localId: 'operational-exit-west',
        code: 'EXIT-WEST',
        label: 'Saída Oeste',
        type: 'AREA',
        x: sx(60),
        y: sy(390),
        width: sx(145),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
        prompt,
      }),

      createObject({
        localId: 'operational-exit-east',
        code: 'EXIT-EAST',
        label: 'Saída Leste',
        type: 'AREA',
        x: sx(1075),
        y: sy(390),
        width: sx(145),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
        prompt,
      }),
    ];

    pushSector(sectorDiamante, 'Mesas Diamante', {
      localId: 'sector-central-diamante',
      code: 'MESAS-DIAMANTE',
      type: 'AREA',
      capacity: sectorDiamante?.capacity || '1',
      x: sx(485),
      y: sy(245),
      width: sx(310),
      height: sy(100),
      shape: 'POLYGON',
      points: [
        { x: sx(480), y: sy(245) },
        { x: sx(800), y: sy(245) },
        { x: sx(765), y: sy(345) },
        { x: sx(515), y: sy(345) },
      ],
    });

    pushSector(sectorOuro, 'Mesas Ouro', {
      localId: 'sector-central-ouro',
      code: 'MESAS-OURO',
      type: 'AREA',
      capacity: sectorOuro?.capacity || '1',
      x: sx(360),
      y: sy(340),
      width: sx(155),
      height: sy(185),
      shape: 'POLYGON',
      points: [
        { x: sx(350), y: sy(335) },
        { x: sx(520), y: sy(365) },
        { x: sx(510), y: sy(520) },
        { x: sx(345), y: sy(545) },
      ],
    });

    pushSector(sectorPrata, 'Mesas Prata', {
      localId: 'sector-central-prata',
      code: 'MESAS-PRATA',
      type: 'AREA',
      capacity: sectorPrata?.capacity || '1',
      x: sx(765),
      y: sy(340),
      width: sx(155),
      height: sy(185),
      shape: 'POLYGON',
      points: [
        { x: sx(765), y: sy(365) },
        { x: sx(930), y: sy(335) },
        { x: sx(935), y: sy(545) },
        { x: sx(770), y: sy(520) },
      ],
    });

    pushSector(sectorBronze, 'Mesas Bronze', {
      localId: 'sector-central-bronze',
      code: 'MESAS-BRONZE',
      type: 'AREA',
      capacity: sectorBronze?.capacity || '1',
      x: sx(480),
      y: sy(535),
      width: sx(320),
      height: sy(105),
      shape: 'POLYGON',
      points: [
        { x: sx(515), y: sy(530) },
        { x: sx(765), y: sy(530) },
        { x: sx(805), y: sy(635) },
        { x: sx(475), y: sy(635) },
      ],
    });

    pushSector(sectorPista, 'Pista', {
      localId: 'sector-central-pista',
      code: 'PISTA',
      type: 'AREA',
      capacity: sectorPista?.capacity || '1',
      x: sx(315),
      y: sy(205),
      width: sx(650),
      height: sy(485),
      shape: 'POLYGON',
      points: [
        { x: sx(315), y: sy(215) },
        { x: sx(965), y: sy(215) },
        { x: sx(1040), y: sy(360) },
        { x: sx(1005), y: sy(575) },
        { x: sx(850), y: sy(705) },
        { x: sx(430), y: sy(705) },
        { x: sx(275), y: sy(575) },
        { x: sx(240), y: sy(360) },
      ],
    });

    pushSector(sectorBrahma, 'Camarote Brahma', {
      localId: 'sector-central-brahma',
      code: 'CAM-BRAHMA',
      type: 'BOOTH',
      capacity: sectorBrahma?.capacity || '1',
      x: sx(80),
      y: sy(170),
      width: sx(210),
      height: sy(260),
      shape: 'POLYGON',
      points: [
        { x: sx(80), y: sy(180) },
        { x: sx(270), y: sy(150) },
        { x: sx(300), y: sy(390) },
        { x: sx(120), y: sy(445) },
      ],
    });

    pushSector(sectorSuperBull, 'Camarote SuperBull', {
      localId: 'sector-central-superbull',
      code: 'CAM-SUPERBULL',
      type: 'BOOTH',
      capacity: sectorSuperBull?.capacity || '1',
      x: sx(990),
      y: sy(170),
      width: sx(210),
      height: sy(260),
      shape: 'POLYGON',
      points: [
        { x: sx(1010), y: sy(150) },
        { x: sx(1200), y: sy(180) },
        { x: sx(1160), y: sy(445) },
        { x: sx(980), y: sy(390) },
      ],
    });

    const objects = [
      ...sectorObjects.filter((item) => item.localId === 'sector-central-pista'),
      ...operationalObjects.filter((item) =>
        [
          'central-ring-aisle',
          'aisle-north',
          'aisle-south',
          'aisle-west',
          'aisle-east',
        ].includes(item.localId || ''),
      ),
      ...sectorObjects.filter((item) => item.localId !== 'sector-central-pista'),
      ...operationalObjects.filter((item) => item.localId === 'central-stage'),
      ...operationalObjects.filter(
        (item) =>
          ![
            'central-ring-aisle',
            'aisle-north',
            'aisle-south',
            'aisle-west',
            'aisle-east',
            'central-stage',
          ].includes(item.localId || ''),
      ),
    ];

    const warnings = skippedVisualAreas.length
      ? [
          `Não criei como setor: ${skippedVisualAreas.join(', ')}. Esses nomes não existem em Setores/áreas.`,
        ]
      : [];

    return {
      message:
        'Mapa com palco central criado usando somente os setores existentes e setores distribuídos ao redor.',
      action: 'replace_map',
      objects,
      warnings,
      suggestions: [
        'Use o botão Centro/Fit para enquadrar a planta.',
        'Use alças azuis para ajustar o tamanho dos setores.',
        'Se quiser um formato mais circular, peça: deixe os setores em anel 360 graus.',
      ],
    };
  }

  private createRodeioFestivalTemplate({
    prompt,
    mapWidth,
    mapHeight,
    sectors,
  }: {
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
  }): MapAiResponse {
    const normalizedPrompt = normalizeText(prompt);
    const skippedVisualAreas: string[] = [];

    const sectorDiamante = findSectorByTerms(sectors, [
      'mesas diamante',
      'diamante',
      'pista premium',
      'premium',
    ]);

    const sectorOuro = findSectorByTerms(sectors, ['mesas ouro', 'ouro']);
    const sectorPrata = findSectorByTerms(sectors, ['mesas prata', 'prata']);
    const sectorBronze = findSectorByTerms(sectors, ['mesas bronze', 'bronze']);

    const sectorPista = findSectorByTerms(sectors, [
      'pista',
      'arena',
      'geral',
      'open',
    ]);

    const sectorBrahma = findSectorByTerms(sectors, [
      'camarote brahma',
      'brahma',
    ]);

    const sectorSuperBull = findSectorByTerms(sectors, [
      'camarote super bull',
      'camarote superbull',
      'super bull',
      'superbull',
    ]);

    const existingSectorObjects: EventMapAiObject[] = [];

    const scaleX = mapWidth / 1280;
    const scaleY = mapHeight / 900;

    const sx = (value: number) => Math.round(value * scaleX);
    const sy = (value: number) => Math.round(value * scaleY);

    function pushSector(
      sector: EventMapAiSector | undefined,
      fallbackName: string,
      createInput: Omit<CreateObjectInput, 'sector' | 'prompt' | 'role' | 'label'>,
    ) {
      if (!sector) {
        skippedVisualAreas.push(fallbackName);
        return;
      }

      existingSectorObjects.push(
        createObject({
          ...createInput,
          sector,
          label: sector.name,
          role: 'SECTOR',
          prompt,
        }),
      );
    }

    const baseObjects: EventMapAiObject[] = [
      createObject({
        localId: 'stage-main-t',
        code: 'STAGE-T',
        label: 'Palco em T',
        type: 'STAGE',
        x: sx(455),
        y: sy(40),
        width: sx(370),
        height: sy(170),
        role: 'STAGE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(410), y: sy(45) },
          { x: sx(870), y: sy(45) },
          { x: sx(870), y: sy(108) },
          { x: sx(705), y: sy(108) },
          { x: sx(705), y: sy(205) },
          { x: sx(575), y: sy(205) },
          { x: sx(575), y: sy(108) },
          { x: sx(410), y: sy(108) },
        ],
      }),

      createObject({
        localId: 'aisle-front-stage',
        code: 'AISLE-FRONT-STAGE',
        label: 'Corredor técnico',
        type: 'AISLE',
        x: sx(280),
        y: sy(205),
        width: sx(720),
        height: sy(42),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(260), y: sy(210) },
          { x: sx(1020), y: sy(210) },
          { x: sx(1000), y: sy(252) },
          { x: sx(280), y: sy(252) },
        ],
      }),

      createObject({
        localId: 'aisle-left-main',
        code: 'AISLE-LEFT',
        label: 'Corredor esquerdo',
        type: 'AISLE',
        x: sx(265),
        y: sy(260),
        width: sx(55),
        height: sy(520),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(265), y: sy(255) },
          { x: sx(320), y: sy(265) },
          { x: sx(320), y: sy(770) },
          { x: sx(260), y: sy(760) },
        ],
      }),

      createObject({
        localId: 'aisle-right-main',
        code: 'AISLE-RIGHT',
        label: 'Corredor direito',
        type: 'AISLE',
        x: sx(955),
        y: sy(260),
        width: sx(55),
        height: sy(520),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(960), y: sy(265) },
          { x: sx(1018), y: sy(255) },
          { x: sx(1025), y: sy(760) },
          { x: sx(965), y: sy(780) },
        ],
      }),

      createObject({
        localId: 'aisle-bottom-main',
        code: 'AISLE-BOTTOM',
        label: 'Corredor inferior',
        type: 'AISLE',
        x: sx(230),
        y: sy(760),
        width: sx(820),
        height: sy(70),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(210), y: sy(760) },
          { x: sx(1055), y: sy(760) },
          { x: sx(1070), y: sy(825) },
          { x: sx(190), y: sy(832) },
        ],
      }),

      createObject({
        localId: 'operational-entrada-principal',
        code: 'ENTRADA-PRINCIPAL',
        label: 'Entrada Principal',
        type: 'AREA',
        x: sx(55),
        y: sy(715),
        width: sx(160),
        height: sy(160),
        role: 'OPERATIONAL',
        operationalType: 'ENTRANCE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(55), y: sy(730) },
          { x: sx(200), y: sy(710) },
          { x: sx(215), y: sy(860) },
          { x: sx(75), y: sy(875) },
        ],
      }),

      createObject({
        localId: 'operational-praca-alimentacao',
        code: 'PRACA-ALIMENTACAO',
        label: 'Praça de Alimentação',
        type: 'AREA',
        x: sx(1030),
        y: sy(735),
        width: sx(210),
        height: sy(120),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(1030), y: sy(742) },
          { x: sx(1235), y: sy(718) },
          { x: sx(1250), y: sy(845) },
          { x: sx(1050), y: sy(870) },
        ],
      }),

      createObject({
        localId: 'operational-bar-food',
        code: 'BAR-FOOD',
        label: 'Bar Praça',
        type: 'AREA',
        x: sx(1110),
        y: sy(785),
        width: sx(118),
        height: sy(48),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
      }),

      createObject({
        localId: 'operational-bar-vip',
        code: 'BAR-VIP',
        label: 'Bar VIP',
        type: 'AREA',
        x: sx(1035),
        y: sy(360),
        width: sx(116),
        height: sy(48),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
      }),

      createObject({
        localId: 'operational-restroom-food',
        code: 'WC-FOOD',
        label: 'Banheiros Praça',
        type: 'AREA',
        x: sx(1078),
        y: sy(852),
        width: sx(158),
        height: sy(44),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
        prompt,
      }),

      createObject({
        localId: 'operational-restroom-left',
        code: 'WC-LEFT',
        label: 'Banheiros Esquerda',
        type: 'AREA',
        x: sx(56),
        y: sy(615),
        width: sx(160),
        height: sy(48),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
        prompt,
      }),

      createObject({
        localId: 'operational-exit-left',
        code: 'EXIT-LEFT',
        label: 'Saída Emergência E',
        type: 'AREA',
        x: sx(55),
        y: sy(510),
        width: sx(155),
        height: sy(44),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
        prompt,
      }),

      createObject({
        localId: 'operational-exit-right',
        code: 'EXIT-RIGHT',
        label: 'Saída Emergência D',
        type: 'AREA',
        x: sx(1065),
        y: sy(610),
        width: sx(155),
        height: sy(44),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
        prompt,
      }),
    ];

    pushSector(sectorDiamante, 'Mesas Diamante / Pista Premium', {
      localId: 'sector-diamante-premium',
      code: 'SETOR-DIAMANTE',
      type: 'AREA',
      capacity: sectorDiamante?.capacity || '1',
      x: sx(360),
      y: sy(270),
      width: sx(560),
      height: sy(160),
      shape: 'POLYGON',
      points: [
        { x: sx(350), y: sy(275) },
        { x: sx(935), y: sy(260) },
        { x: sx(910), y: sy(425) },
        { x: sx(375), y: sy(430) },
      ],
    });

    pushSector(sectorOuro, 'Mesas Ouro', {
      localId: 'sector-mesas-ouro',
      code: 'MESAS-OURO',
      type: 'AREA',
      capacity: sectorOuro?.capacity || '1',
      x: sx(330),
      y: sy(455),
      width: sx(170),
      height: sy(88),
      shape: 'POLYGON',
      points: [
        { x: sx(340), y: sy(455) },
        { x: sx(515), y: sy(448) },
        { x: sx(525), y: sy(535) },
        { x: sx(350), y: sy(545) },
      ],
    });

    pushSector(sectorPrata, 'Mesas Prata', {
      localId: 'sector-mesas-prata',
      code: 'MESAS-PRATA',
      type: 'AREA',
      capacity: sectorPrata?.capacity || '1',
      x: sx(770),
      y: sy(455),
      width: sx(170),
      height: sy(88),
      shape: 'POLYGON',
      points: [
        { x: sx(755), y: sy(448) },
        { x: sx(930), y: sy(455) },
        { x: sx(920), y: sy(545) },
        { x: sx(745), y: sy(535) },
      ],
    });

    pushSector(sectorBronze, 'Mesas Bronze', {
      localId: 'sector-mesas-bronze',
      code: 'MESAS-BRONZE',
      type: 'AREA',
      capacity: sectorBronze?.capacity || '1',
      x: sx(510),
      y: sy(565),
      width: sx(250),
      height: sy(72),
      shape: 'POLYGON',
      points: [
        { x: sx(505), y: sy(555) },
        { x: sx(775), y: sy(548) },
        { x: sx(785), y: sy(620) },
        { x: sx(515), y: sy(628) },
      ],
    });

    pushSector(sectorPista, 'Pista / Arena', {
      localId: 'sector-pista-arena',
      code: 'PISTA-ARENA',
      type: 'AREA',
      capacity: sectorPista?.capacity || '1',
      x: sx(350),
      y: sy(450),
      width: sx(570),
      height: sy(140),
      shape: 'POLYGON',
      points: [
        { x: sx(340), y: sy(635) },
        { x: sx(930), y: sy(625) },
        { x: sx(950), y: sy(735) },
        { x: sx(885), y: sy(775) },
        { x: sx(380), y: sy(770) },
        { x: sx(330), y: sy(735) },
      ],
    });

    pushSector(sectorBrahma, 'Camarote Brahma', {
      localId: 'sector-camarote-brahma',
      code: 'CAM-BRAHMA',
      type: 'BOOTH',
      capacity: sectorBrahma?.capacity || '1',
      x: sx(92),
      y: sy(145),
      width: sx(220),
      height: sy(310),
      shape: 'POLYGON',
      points: [
        { x: sx(85), y: sy(155) },
        { x: sx(295), y: sy(125) },
        { x: sx(325), y: sy(430) },
        { x: sx(145), y: sy(470) },
        { x: sx(100), y: sy(360) },
      ],
    });

    pushSector(sectorSuperBull, 'Camarote SuperBull', {
      localId: 'sector-camarote-superbull',
      code: 'CAM-SUPERBULL',
      type: 'BOOTH',
      capacity: sectorSuperBull?.capacity || '1',
      x: sx(970),
      y: sy(145),
      width: sx(220),
      height: sy(310),
      shape: 'POLYGON',
      points: [
        { x: sx(975), y: sy(125) },
        { x: sx(1195), y: sy(155) },
        { x: sx(1185), y: sy(455) },
        { x: sx(1005), y: sy(470) },
        { x: sx(950), y: sy(360) },
      ],
    });

    const objects = [
      ...baseObjects.slice(0, 2),
      ...existingSectorObjects.filter((object) =>
        ['sector-diamante-premium'].includes(object.localId || ''),
      ),
      ...baseObjects.slice(2, 5),
      ...existingSectorObjects.filter((object) =>
        [
          'sector-camarote-brahma',
          'sector-camarote-superbull',
          'sector-pista-arena',
          'sector-mesas-ouro',
          'sector-mesas-prata',
          'sector-mesas-bronze',
        ].includes(object.localId || ''),
      ),
      ...baseObjects.slice(5),
    ];

    const warnings = skippedVisualAreas.length
      ? [
          `Não criei como setor: ${skippedVisualAreas.join(', ')}. Esses nomes não existem em Setores/áreas.`,
        ]
      : [];

    if (
      includesAny(normalizedPrompt, ['sb open', 'rancho', 'receptivo', 'corporativo'])
    ) {
      warnings.push(
        'Subáreas como SB Open, Rancho, Receptivo e Corporativo só aparecem se existirem como setor real em Setores/áreas.',
      );
    }

    if (
      includesAny(normalizedPrompt, ['praca de alimentacao', 'praça de alimentação'])
    ) {
      warnings.push(
        'Praça de Alimentação foi criada como área operacional/visual, não como setor de venda.',
      );
    }

    return {
      message:
        'Mapa de rodeio/festival criado com setores rígidos, mesas fora dos corredores e pista sem sobrepor mesas.',
      action: 'replace_map',
      objects,
      warnings,
      suggestions: [
        'Crie SB Open, Rancho, Receptivo ou Corporativo em Setores/áreas se quiser vendê-los como setores.',
        'Use camadas e edição de pontos para refinar o desenho final.',
        'Use a imagem de referência para orientar a composição, mas a venda fica limitada aos setores existentes.',
      ],
    };
  }

  private resolveProvider(): MapAiProvider {
    const provider = cleanString(this.config.get<string>('AI_PROVIDER'), '').toLowerCase();

    if (provider === 'openai' || provider === 'ollama') {
      return provider;
    }

    return this.config.get<string>('OPENAI_API_KEY') ? 'openai' : 'ollama';
  }

  private getOllamaModel() {
    return (
      this.config.get<string>('OLLAMA_MODEL') ||
      this.config.get<string>('AI_MODEL') ||
      'qwen2.5:7b-instruct'
    );
  }

  private async callOllama({
    mode,
    prompt,
    mapWidth,
    mapHeight,
    sectors,
    currentObjects,
    referenceImage,
    referenceImageDescription,
  }: {
    mode: string;
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
    referenceImage?: NormalizedReferenceImage | null;
    referenceImageDescription?: string;
  }): Promise<MapAiResponse> {
    const baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';

    const model = referenceImage ? this.getOllamaVisionModel() : this.getOllamaModel();

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        format: RESPONSE_SCHEMA,
        keep_alive: '10m',
        options: {
          temperature: 0.15,
          num_predict: 4500,
        },
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(),
          },
          {
            role: 'user',
            content: buildUserPayload({
              mode,
              prompt,
              mapWidth,
              mapHeight,
              sectors,
              currentObjects,
              referenceImageDescription,
            }),
            ...(referenceImage ? { images: [referenceImage.base64] } : {}),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');

      throw new InternalServerErrorException(
        errorText ||
          `Erro ao consultar Ollama em ${baseUrl}. Verifique se o Ollama está aberto e se o modelo ${model} foi baixado.`,
      );
    }

    if (!response.body) {
      throw new InternalServerErrorException(
        'Ollama não retornou stream de resposta.',
      );
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) continue;

          let parsed: Record<string, any>;

          try {
            parsed = JSON.parse(trimmed) as Record<string, any>;
          } catch {
            continue;
          }

          if (parsed.error) {
            throw new InternalServerErrorException(String(parsed.error));
          }

          if (typeof parsed.message?.content === 'string') {
            content += parsed.message.content;
          }

          if (typeof parsed.response === 'string') {
            content += parsed.response;
          }
        }
      }

      const finalChunk = buffer.trim();

      if (finalChunk) {
        const parsed = JSON.parse(finalChunk) as Record<string, any>;

        if (parsed.error) {
          throw new InternalServerErrorException(String(parsed.error));
        }

        if (typeof parsed.message?.content === 'string') {
          content += parsed.message.content;
        }

        if (typeof parsed.response === 'string') {
          content += parsed.response;
        }
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Erro ao ler resposta do Ollama.',
      );
    }

    if (!content.trim()) {
      throw new InternalServerErrorException(
        'Ollama não retornou conteúdo utilizável.',
      );
    }

    try {
      return JSON.parse(content) as MapAiResponse;
    } catch {
      throw new InternalServerErrorException(
        'Ollama retornou um formato inválido. Tente novamente ou use um modelo maior.',
      );
    }
  }

  private async callOpenAi({
    mode,
    prompt,
    mapWidth,
    mapHeight,
    sectors,
    currentObjects,
    referenceImageDescription,
  }: {
    mode: string;
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
    referenceImageDescription?: string;
  }): Promise<MapAiResponse> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new BadRequestException(
        'OPENAI_API_KEY não configurada no .env da API.',
      );
    }

    const model = this.config.get<string>('OPENAI_MODEL') || 'gpt-4.1-mini';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        instructions: buildSystemPrompt(),
        input: buildUserPayload({
          mode,
          prompt,
          mapWidth,
          mapHeight,
          sectors,
          currentObjects,
          referenceImageDescription,
        }),
        text: {
          format: {
            type: 'json_schema',
            name: 'event_map_ai_response',
            strict: false,
            schema: RESPONSE_SCHEMA,
          },
        },
        max_output_tokens: 6000,
      }),
    });

    const result = (await response.json().catch(() => null)) as Record<
      string,
      any
    > | null;

    if (!response.ok || !result) {
      const message =
        result?.error?.message ||
        result?.message ||
        'Erro ao consultar OpenAI.';

      throw new InternalServerErrorException(message);
    }

    const outputText = getOpenAiOutputText(result);

    if (!outputText) {
      throw new InternalServerErrorException(
        'A IA não retornou conteúdo utilizável.',
      );
    }

    try {
      return JSON.parse(outputText) as MapAiResponse;
    } catch {
      throw new InternalServerErrorException(
        'A IA retornou um formato inválido. Tente novamente.',
      );
    }
  }

  private sanitizeObjects({
    objects,
    sectors,
    prompt,
    mapWidth,
    mapHeight,
  }: {
    objects: EventMapAiObject[];
    sectors: EventMapAiSector[];
    prompt: string;
    mapWidth: number;
    mapHeight: number;
  }) {
    return objects
      .filter((object) => object && typeof object === 'object')
      .filter((object) => {
        const rawRole = String(object.metadata?.role || '');
        const rawType = String(object.type || '');
        const inferredRole = ROLES.has(rawRole)
          ? rawRole
          : rawType === 'STAGE'
            ? 'STAGE'
            : rawType === 'AISLE'
              ? 'AISLE'
              : rawType === 'BLOCKED_SPACE'
                ? 'BLOCKED'
                : 'SECTOR';

        if (inferredRole !== 'SECTOR') return true;

        return sectors.some((sector) => sector.localId === object.venueSectorLocalId);
      })
      .map((object, index) => {
        const type = OBJECT_TYPES.has(String(object.type))
          ? String(object.type)
          : 'AREA';

        const role = ROLES.has(String(object.metadata?.role))
          ? String(object.metadata?.role)
          : type === 'STAGE'
            ? 'STAGE'
            : type === 'AISLE'
              ? 'AISLE'
              : type === 'BLOCKED_SPACE'
                ? 'BLOCKED'
                : 'SECTOR';

        const sector =
          role === 'SECTOR'
            ? sectors.find(
                (item) => item.localId === object.venueSectorLocalId,
              )
            : undefined;

        const venueSectorLocalId =
          role === 'SECTOR' ? sector?.localId || '' : '';

        const width = clamp(Math.round(toNumber(object.width, 220)), 20, mapWidth);
        const height = clamp(
          Math.round(toNumber(object.height, 120)),
          20,
          mapHeight,
        );

        const shape = SHAPES.has(String(object.metadata?.shape))
          ? String(object.metadata?.shape)
          : 'RECT';

        const points = Array.isArray(object.metadata?.points)
          ? object.metadata?.points
              ?.slice(0, 80)
              .map((point) => cleanPoint(point, mapWidth, mapHeight))
          : undefined;

        const operationalType = OPERATIONAL_TYPES.has(
          String(object.metadata?.operationalType),
        )
          ? String(object.metadata?.operationalType)
          : undefined;

        return {
          localId: cleanString(object.localId, makeId('ai-map')),
          venueSectorLocalId,
          code: cleanString(object.code, `${type}-${index + 1}`),
          label: cleanString(
            object.label,
            sector?.name ||
              operationalType ||
              (role === 'STAGE'
                ? 'Palco'
                : role === 'AISLE'
                  ? 'Corredor'
                  : role === 'BLOCKED'
                    ? 'Bloqueio'
                    : `Área ${index + 1}`),
          ),
          type,
          capacity: cleanString(
            object.capacity,
            sector?.capacity || (role === 'SECTOR' ? '1' : '1'),
          ),
          x: clamp(Math.round(toNumber(object.x, 80 + index * 30)), 0, mapWidth),
          y: clamp(Math.round(toNumber(object.y, 80 + index * 30)), 0, mapHeight),
          width,
          height,
          rotation: clamp(Math.round(toNumber(object.rotation, 0)), -360, 360),
          status: cleanString(object.status, 'AVAILABLE'),
          metadata: {
            shape,
            points,
            role,
            operationalType,
            generatedBy: 'assistant',
            prompt,
          },
        };
      });
  }
}
