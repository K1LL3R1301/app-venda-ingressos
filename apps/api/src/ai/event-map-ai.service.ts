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
} from './dto/generate-event-map-ai.dto';

type MapAiAction = 'advice' | 'replace_map' | 'append_objects';

type MapAiProvider = 'ollama' | 'openai';

type MapAiResponse = {
  message: string;
  action: MapAiAction;
  objects: EventMapAiObject[];
  warnings: string[];
  suggestions: string[];
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

function findSector(sectors: EventMapAiSector[], sectorId?: string) {
  if (!sectorId) return undefined;
  return sectors.find((sector) => sector.localId === sectorId);
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
}: {
  mode: string;
  prompt: string;
  mapWidth: number;
  mapHeight: number;
  sectors: EventMapAiSector[];
  currentObjects: EventMapAiObject[];
}) {
  return JSON.stringify({
    mode,
    prompt,
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

    const provider = this.resolveProvider();

    const parsed =
      provider === 'ollama'
        ? await this.callOllama({
            mode,
            prompt,
            mapWidth,
            mapHeight,
            sectors,
            currentObjects,
          })
        : await this.callOpenAi({
            mode,
            prompt,
            mapWidth,
            mapHeight,
            sectors,
            currentObjects,
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
  }: {
    mode: string;
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
  }): Promise<MapAiResponse> {
    const baseUrl =
      this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';

    const model = this.getOllamaModel();

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: false,
        format: RESPONSE_SCHEMA,
        options: {
          temperature: 0.2,
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
            }),
          },
        ],
      }),
    });

    const result = (await response.json().catch(() => null)) as Record<
      string,
      any
    > | null;

    if (!response.ok || !result) {
      throw new InternalServerErrorException(
        result?.error ||
          result?.message ||
          `Erro ao consultar Ollama em ${baseUrl}. Verifique se o Ollama está aberto e se o modelo ${model} foi baixado.`,
      );
    }

    const content = result?.message?.content || result?.response || '';

    if (!content) {
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
  }: {
    mode: string;
    prompt: string;
    mapWidth: number;
    mapHeight: number;
    sectors: EventMapAiSector[];
    currentObjects: EventMapAiObject[];
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
            ? findSector(sectors, object.venueSectorLocalId)
            : undefined;

        const venueSectorLocalId =
          role === 'SECTOR' ? sector?.localId || sectors[0]?.localId || '' : '';

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
