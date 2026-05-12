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
        model: 'rodeio-festival-v3-strict-sectors',
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
    const normalizedPrompt = normalizeText(prompt);

    if (mode === 'chat') return null;

    const wantsRodeioTemplate = includesAny(normalizedPrompt, [
      'jaguariuna',
      'rodeio',
      'festival',
      'sertanejo',
      'arena',
      'camarote brahma',
      'super bull',
      'superbull',
    ]);

    if (!wantsRodeioTemplate) return null;

    return this.createRodeioFestivalTemplate({
      prompt,
      mapWidth,
      mapHeight,
      sectors,
      currentObjects,
    });
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
    const usedSectorIds = new Set<string>();

    const sectorPistaPremium = findSectorByTerms(sectors, [
      'pista premium',
      'premium',
      'diamante',
    ]);
    if (sectorPistaPremium) usedSectorIds.add(sectorPistaPremium.localId);

    const sectorArena = findSectorByTerms(sectors, ['arena', 'pista', 'geral']);
    if (sectorArena) usedSectorIds.add(sectorArena.localId);

    const sectorOuro = findSectorByTerms(sectors, ['ouro']);
    if (sectorOuro && !usedSectorIds.has(sectorOuro.localId)) {
      usedSectorIds.add(sectorOuro.localId);
    }

    const sectorPrata = findSectorByTerms(sectors, ['prata']);
    if (sectorPrata && !usedSectorIds.has(sectorPrata.localId)) {
      usedSectorIds.add(sectorPrata.localId);
    }

    const sectorBronze = findSectorByTerms(sectors, ['bronze']);
    if (sectorBronze && !usedSectorIds.has(sectorBronze.localId)) {
      usedSectorIds.add(sectorBronze.localId);
    }

    const sectorBrahma = findSectorByTerms(sectors, ['camarote brahma', 'brahma']);
    if (sectorBrahma && !usedSectorIds.has(sectorBrahma.localId)) {
      usedSectorIds.add(sectorBrahma.localId);
    }

    const sectorRancho = findSectorByTerms(sectors, ['rancho']);
    if (sectorRancho && !usedSectorIds.has(sectorRancho.localId)) {
      usedSectorIds.add(sectorRancho.localId);
    }

    const sectorReceptivo = findSectorByTerms(sectors, ['receptivo']);
    if (sectorReceptivo && !usedSectorIds.has(sectorReceptivo.localId)) {
      usedSectorIds.add(sectorReceptivo.localId);
    }

    const sectorCorporativo = findSectorByTerms(sectors, ['corporativo']);
    if (sectorCorporativo && !usedSectorIds.has(sectorCorporativo.localId)) {
      usedSectorIds.add(sectorCorporativo.localId);
    }

    const sectorSuperBull = findSectorByTerms(sectors, [
      'camarote super bull',
      'camarote superbull',
    ]);
    if (sectorSuperBull && !usedSectorIds.has(sectorSuperBull.localId)) {
      usedSectorIds.add(sectorSuperBull.localId);
    }

    const sectorSbOpen = findSectorByTerms(sectors, ['sb open', 'open']);
    if (sectorSbOpen && !usedSectorIds.has(sectorSbOpen.localId)) {
      usedSectorIds.add(sectorSbOpen.localId);
    }

    const sectorSuperBullCandidate = findSectorByTerms(sectors, [
      'super bull',
      'superbull',
    ]);
    const sectorSuperBullBox =
      sectorSuperBullCandidate?.localId === sectorSuperBull?.localId
        ? undefined
        : sectorSuperBullCandidate;
    if (sectorSuperBullBox && !usedSectorIds.has(sectorSuperBullBox.localId)) {
      usedSectorIds.add(sectorSuperBullBox.localId);
    }

    const sectorFood = findSectorByTerms(sectors, ['praca', 'alimentacao', 'food']);
    if (sectorFood && !usedSectorIds.has(sectorFood.localId)) {
      usedSectorIds.add(sectorFood.localId);
    }

    const scaleX = mapWidth / 1280;
    const scaleY = mapHeight / 900;

    const sx = (value: number) => Math.round(value * scaleX);
    const sy = (value: number) => Math.round(value * scaleY);

    const objects: EventMapAiObject[] = [
      createObject({
        localId: 'stage-main-t',
        code: 'STAGE-T',
        label: 'Palco em T',
        type: 'STAGE',
        x: sx(500),
        y: sy(35),
        width: sx(280),
        height: sy(170),
        role: 'STAGE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(430), y: sy(35) },
          { x: sx(850), y: sy(35) },
          { x: sx(850), y: sy(115) },
          { x: sx(705), y: sy(115) },
          { x: sx(705), y: sy(205) },
          { x: sx(575), y: sy(205) },
          { x: sx(575), y: sy(115) },
          { x: sx(430), y: sy(115) },
        ],
      }),

      createObject({
        localId: 'aisle-front-stage',
        code: 'AISLE-FRONT',
        label: 'Corredor frontal do palco',
        type: 'AISLE',
        x: sx(310),
        y: sy(205),
        width: sx(660),
        height: sy(34),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(300), y: sy(210) },
          { x: sx(980), y: sy(210) },
          { x: sx(960), y: sy(245) },
          { x: sx(320), y: sy(245) },
        ],
      }),

      createObject({
        localId: 'sector-pista-premium',
        sector: sectorPistaPremium,
        code: 'PISTA-PREMIUM',
        label: sectorPistaPremium?.name || 'Pista Premium',
        type: 'AREA',
        capacity: sectorPistaPremium?.capacity || '8000',
        x: sx(350),
        y: sy(245),
        width: sx(580),
        height: sy(165),
        role: 'SECTOR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(335), y: sy(250) },
          { x: sx(945), y: sy(240) },
          { x: sx(915), y: sy(410) },
          { x: sx(365), y: sy(420) },
        ],
      }),

      ...(sectorOuro
        ? [
            createObject({
              localId: 'sector-mesas-ouro',
              sector: sectorOuro,
              code: 'MESAS-OURO',
              label: sectorOuro.name,
              type: 'AREA',
              capacity: sectorOuro.capacity || '1',
              x: sx(300),
              y: sy(300),
              width: sx(135),
              height: sy(140),
              role: 'SECTOR',
              prompt,
              shape: 'POLYGON',
              points: [
                { x: sx(260), y: sy(285) },
                { x: sx(405), y: sy(270) },
                { x: sx(430), y: sy(420) },
                { x: sx(285), y: sy(445) },
              ],
            }),
          ]
        : []),

      ...(sectorPrata
        ? [
            createObject({
              localId: 'sector-mesas-prata',
              sector: sectorPrata,
              code: 'MESAS-PRATA',
              label: sectorPrata.name,
              type: 'AREA',
              capacity: sectorPrata.capacity || '1',
              x: sx(875),
              y: sy(300),
              width: sx(135),
              height: sy(140),
              role: 'SECTOR',
              prompt,
              shape: 'POLYGON',
              points: [
                { x: sx(875), y: sy(275) },
                { x: sx(1010), y: sy(295) },
                { x: sx(995), y: sy(445) },
                { x: sx(850), y: sy(420) },
              ],
            }),
          ]
        : []),

      ...(sectorBronze
        ? [
            createObject({
              localId: 'sector-mesas-bronze',
              sector: sectorBronze,
              code: 'MESAS-BRONZE',
              label: sectorBronze.name,
              type: 'AREA',
              capacity: sectorBronze.capacity || '1',
              x: sx(310),
              y: sy(575),
              width: sx(130),
              height: sy(120),
              role: 'SECTOR',
              prompt,
              shape: 'POLYGON',
              points: [
                { x: sx(300), y: sy(575) },
                { x: sx(435), y: sy(560) },
                { x: sx(455), y: sy(680) },
                { x: sx(320), y: sy(700) },
              ],
            }),
          ]
        : []),

      createObject({
        localId: 'sector-arena',
        sector: sectorArena,
        code: 'ARENA',
        label: sectorArena?.name || 'Arena',
        type: 'AREA',
        capacity: sectorArena?.capacity || '30000',
        x: sx(325),
        y: sy(435),
        width: sx(625),
        height: sy(260),
        role: 'SECTOR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(300), y: sy(445) },
          { x: sx(975), y: sy(430) },
          { x: sx(1010), y: sy(660) },
          { x: sx(915), y: sy(725) },
          { x: sx(370), y: sy(715) },
          { x: sx(275), y: sy(660) },
        ],
      }),

      createObject({
        localId: 'sector-camarote-brahma',
        sector: sectorBrahma,
        code: 'CAM-BRAHMA',
        label: sectorBrahma?.name || 'Camarote Brahma',
        type: 'BOOTH',
        capacity: sectorBrahma?.capacity || '5000',
        x: sx(60),
        y: sy(100),
        width: sx(260),
        height: sy(285),
        role: 'SECTOR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(45), y: sy(125) },
          { x: sx(300), y: sy(85) },
          { x: sx(330), y: sy(365) },
          { x: sx(120), y: sy(405) },
          { x: sx(55), y: sy(300) },
        ],
      }),

      createObject({
        localId: 'sector-rancho-brahma',
        sector: sectorRancho,
        code: 'RANCHO-BRAHMA',
        label: sectorRancho?.name || 'Rancho Brahma',
        type: 'BOOTH',
        capacity: sectorRancho?.capacity || '1000',
        x: sx(20),
        y: sy(150),
        width: sx(85),
        height: sy(230),
        role: sectorRancho ? 'SECTOR' : 'OPERATIONAL',
        operationalType: sectorRancho ? undefined : 'ACCESSIBILITY',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(20), y: sy(150) },
          { x: sx(95), y: sy(140) },
          { x: sx(110), y: sy(365) },
          { x: sx(45), y: sy(390) },
        ],
      }),

      createObject({
        localId: 'sector-receptivo-brahma',
        sector: sectorReceptivo,
        code: 'RECEPTIVO-BRAHMA',
        label: sectorReceptivo?.name || 'Receptivo Brahma',
        type: 'BOOTH',
        capacity: sectorReceptivo?.capacity || '1500',
        x: sx(70),
        y: sy(425),
        width: sx(210),
        height: sy(125),
        role: sectorReceptivo ? 'SECTOR' : 'OPERATIONAL',
        operationalType: sectorReceptivo ? undefined : 'ACCESSIBILITY',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(65), y: sy(430) },
          { x: sx(275), y: sy(420) },
          { x: sx(285), y: sy(545) },
          { x: sx(90), y: sy(565) },
        ],
      }),

      createObject({
        localId: 'sector-corporativo',
        sector: sectorCorporativo,
        code: 'CORPORATIVO',
        label: sectorCorporativo?.name || 'Corporativo',
        type: 'BOOTH',
        capacity: sectorCorporativo?.capacity || '1000',
        x: sx(80),
        y: sy(575),
        width: sx(210),
        height: sy(110),
        role: sectorCorporativo ? 'SECTOR' : 'OPERATIONAL',
        operationalType: sectorCorporativo ? undefined : 'ACCESSIBILITY',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(85), y: sy(575) },
          { x: sx(290), y: sy(560) },
          { x: sx(300), y: sy(675) },
          { x: sx(95), y: sy(690) },
        ],
      }),

      createObject({
        localId: 'sector-camarote-superbull',
        sector: sectorSuperBull,
        code: 'CAM-SUPERBULL',
        label: sectorSuperBull?.name || 'Camarote Super Bull',
        type: 'BOOTH',
        capacity: sectorSuperBull?.capacity || '4000',
        x: sx(965),
        y: sy(95),
        width: sx(260),
        height: sy(270),
        role: 'SECTOR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(960), y: sy(90) },
          { x: sx(1210), y: sy(125) },
          { x: sx(1225), y: sy(360) },
          { x: sx(990), y: sy(395) },
          { x: sx(950), y: sy(245) },
        ],
      }),

      createObject({
        localId: 'sector-sb-open',
        sector: sectorSbOpen,
        code: 'SB-OPEN',
        label: sectorSbOpen?.name || 'SB Open',
        type: 'AREA',
        capacity: sectorSbOpen?.capacity || '2500',
        x: sx(980),
        y: sy(420),
        width: sx(150),
        height: sy(175),
        role: sectorSbOpen ? 'SECTOR' : 'OPERATIONAL',
        operationalType: sectorSbOpen ? undefined : 'ACCESSIBILITY',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(980), y: sy(420) },
          { x: sx(1130), y: sy(405) },
          { x: sx(1150), y: sy(585) },
          { x: sx(995), y: sy(610) },
        ],
      }),

      createObject({
        localId: 'sector-superbull',
        sector: sectorSuperBullBox,
        code: 'SUPERBULL',
        label: sectorSuperBullBox?.name || 'Super Bull',
        type: 'BOOTH',
        capacity: sectorSuperBullBox?.capacity || '2000',
        x: sx(1135),
        y: sy(420),
        width: sx(115),
        height: sy(185),
        role: sectorSuperBullBox ? 'SECTOR' : 'OPERATIONAL',
        operationalType: sectorSuperBullBox ? undefined : 'ACCESSIBILITY',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(1135), y: sy(415) },
          { x: sx(1255), y: sy(425) },
          { x: sx(1245), y: sy(605) },
          { x: sx(1150), y: sy(590) },
        ],
      }),

      createObject({
        localId: 'aisle-left-main',
        code: 'AISLE-LEFT',
        label: 'Corredor lateral esquerdo',
        type: 'AISLE',
        x: sx(285),
        y: sy(250),
        width: sx(55),
        height: sy(455),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(275), y: sy(245) },
          { x: sx(335), y: sy(250) },
          { x: sx(330), y: sy(700) },
          { x: sx(270), y: sy(690) },
        ],
      }),

      createObject({
        localId: 'aisle-right-main',
        code: 'AISLE-RIGHT',
        label: 'Corredor lateral direito',
        type: 'AISLE',
        x: sx(945),
        y: sy(250),
        width: sx(55),
        height: sy(465),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(945), y: sy(245) },
          { x: sx(1000), y: sy(250) },
          { x: sx(1020), y: sy(705) },
          { x: sx(960), y: sy(715) },
        ],
      }),

      createObject({
        localId: 'aisle-bottom-main',
        code: 'AISLE-BOTTOM',
        label: 'Corredor inferior',
        type: 'AISLE',
        x: sx(180),
        y: sy(725),
        width: sx(820),
        height: sy(70),
        role: 'AISLE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(170), y: sy(720) },
          { x: sx(1045), y: sy(720) },
          { x: sx(1060), y: sy(790) },
          { x: sx(150), y: sy(800) },
        ],
      }),

      createObject({
        localId: 'operational-entrada-principal',
        code: 'ENTRADA-PRINCIPAL',
        label: 'Entrada Principal',
        type: 'AREA',
        x: sx(15),
        y: sy(690),
        width: sx(170),
        height: sy(180),
        role: 'OPERATIONAL',
        operationalType: 'ENTRANCE',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(15), y: sy(700) },
          { x: sx(165), y: sy(680) },
          { x: sx(185), y: sy(840) },
          { x: sx(35), y: sy(875) },
        ],
      }),

      createObject({
        localId: 'sector-praca-alimentacao',
        sector: sectorFood,
        code: 'PRACA-ALIMENTACAO',
        label: sectorFood?.name || 'Praça de Alimentação',
        type: 'AREA',
        capacity: sectorFood?.capacity || '3000',
        x: sx(980),
        y: sy(700),
        width: sx(270),
        height: sy(160),
        role: 'SECTOR',
        prompt,
        shape: 'POLYGON',
        points: [
          { x: sx(985), y: sy(710) },
          { x: sx(1240), y: sy(685) },
          { x: sx(1260), y: sy(845) },
          { x: sx(1010), y: sy(870) },
        ],
      }),

      createObject({
        localId: 'operational-bar-food',
        code: 'BAR-FOOD',
        label: 'Bar Praça',
        type: 'AREA',
        x: sx(1100),
        y: sy(760),
        width: sx(120),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
      }),

      createObject({
        localId: 'operational-bar-vip',
        code: 'BAR-VIP',
        label: 'Bar VIP',
        type: 'AREA',
        x: sx(1040),
        y: sy(340),
        width: sx(120),
        height: sy(55),
        role: 'OPERATIONAL',
        operationalType: 'BAR',
        prompt,
      }),

      createObject({
        localId: 'operational-restroom-food',
        code: 'WC-FOOD',
        label: 'Banheiros Praça',
        type: 'AREA',
        x: sx(1080),
        y: sy(835),
        width: sx(150),
        height: sy(50),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
        prompt,
      }),

      createObject({
        localId: 'operational-restroom-left',
        code: 'WC-LEFT',
        label: 'Banheiros Esquerda',
        type: 'AREA',
        x: sx(35),
        y: sy(560),
        width: sx(150),
        height: sy(50),
        role: 'OPERATIONAL',
        operationalType: 'RESTROOM',
        prompt,
      }),

      createObject({
        localId: 'operational-exit-left',
        code: 'EXIT-LEFT',
        label: 'Saída Emergência E',
        type: 'AREA',
        x: sx(5),
        y: sy(430),
        width: sx(130),
        height: sy(45),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
        prompt,
      }),

      createObject({
        localId: 'operational-exit-right',
        code: 'EXIT-RIGHT',
        label: 'Saída Emergência D',
        type: 'AREA',
        x: sx(1145),
        y: sy(620),
        width: sx(130),
        height: sy(45),
        role: 'OPERATIONAL',
        operationalType: 'EMERGENCY',
        prompt,
      }),
    ];

    const strictObjects = objects.filter(
      (object) => object.metadata?.role !== 'SECTOR' || Boolean(object.venueSectorLocalId),
    );

    const skippedCount = objects.length - strictObjects.length;

    return {
      message:
        'Mapa base premium de rodeio/festival criado com regra rígida de setores existentes.',
      action: 'replace_map',
      objects: strictObjects,
      warnings: skippedCount
        ? [
            `${skippedCount} área(s) pedida(s) não foram criadas como setor porque não existem em Setores/áreas.`,
          ]
        : [],
      suggestions: [
        'Use as camadas para colocar áreas premium por cima dos camarotes quando necessário.',
        'Use zoom e arraste o canvas para ajustar pontos e formatos.',
        'Depois teste pedir: "aproxime o Diamante do palco" ou "aumente a Arena".',
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
