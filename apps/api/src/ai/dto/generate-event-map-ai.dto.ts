import { Allow, IsIn, IsOptional, IsString } from 'class-validator';

export type EventMapAiMode = 'chat' | 'generate';

export type EventMapAiPoint = {
  x: number;
  y: number;
  curve?: boolean;
  cx?: number;
  cy?: number;
};

export type EventMapAiSector = {
  localId: string;
  name: string;
  color?: string;
  kind?: string;
  capacity?: string;
  allowMultipleSpaces?: boolean;
};

export type EventMapAiObject = {
  localId?: string;
  venueSectorLocalId?: string;
  code?: string;
  label?: string;
  type?: string;
  capacity?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  status?: string;
  metadata?: {
    shape?: string;
    points?: EventMapAiPoint[];
    role?: string;
    operationalType?: string;
    generatedBy?: string;
    prompt?: string;
  };
};

export type EventMapAiMap = {
  width?: number;
  height?: number;
};

export class GenerateEventMapAiDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsIn(['chat', 'generate'])
  mode?: EventMapAiMode;

  @Allow()
  map?: EventMapAiMap;

  @Allow()
  sectors?: EventMapAiSector[];

  @Allow()
  currentObjects?: EventMapAiObject[];
}
