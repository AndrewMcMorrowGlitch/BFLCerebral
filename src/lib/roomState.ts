import { v4 as uuidv4 } from 'uuid';

export interface RoomObject {
  id: string;
  type: string;
  position: { x: number; y: number; z: number };
  size: { w: number; h: number; d: number };
  material: { color: string };
}

export interface RoomState {
  camera: { fov: number; angle: string };
  objects: RoomObject[];
  styleReferenceImages: string[];
}

const DEFAULT_COLOR = '#d6d6d6';

export const INITIAL_ROOM_STATE: RoomState = {
  camera: {
    fov: 45,
    angle: 'corner-left',
  },
  objects: [
    {
      id: 'floor',
      type: 'floor',
      position: { x: 0, y: 0, z: 0 },
      size: { w: 10, h: 0.1, d: 10 },
      material: { color: '#ededed' },
    },
    {
      id: 'wall_back',
      type: 'wall',
      position: { x: 0, y: 2.5, z: -5 },
      size: { w: 10, h: 5, d: 0.1 },
      material: { color: '#f2f2f2' },
    },
    {
      id: 'wall_left',
      type: 'wall',
      position: { x: -5, y: 2.5, z: 0 },
      size: { w: 0.1, h: 5, d: 10 },
      material: { color: '#f2f2f2' },
    },
    {
      id: 'sofa',
      type: 'sofa',
      position: { x: 0, y: 0.5, z: -2 },
      size: { w: 3, h: 1, d: 1.4 },
      material: { color: '#666666' },
    },
    {
      id: 'lamp',
      type: 'lamp',
      position: { x: 2.2, y: 0.75, z: -1.4 },
      size: { w: 0.6, h: 1.5, d: 0.6 },
      material: { color: '#888888' },
    },
    {
      id: 'artwork',
      type: 'artwork',
      position: { x: 0, y: 2, z: -4.9 },
      size: { w: 2, h: 1.2, d: 0.1 },
      material: { color: '#cccccc' },
    },
  ],
  styleReferenceImages: [],
};

export function createObject(type: string): RoomObject {
  const presets: Record<string, RoomObject> = {
    sofa: {
      id: uuidv4(),
      type: 'sofa',
      position: { x: 0, y: 0.5, z: 0 },
      size: { w: 2.4, h: 1, d: 1.2 },
      material: { color: DEFAULT_COLOR },
    },
    table: {
      id: uuidv4(),
      type: 'table',
      position: { x: 0.5, y: 0.45, z: 0.5 },
      size: { w: 1.4, h: 0.9, d: 0.8 },
      material: { color: DEFAULT_COLOR },
    },
    chair: {
      id: uuidv4(),
      type: 'chair',
      position: { x: -1, y: 0.5, z: 1 },
      size: { w: 0.8, h: 1, d: 0.8 },
      material: { color: DEFAULT_COLOR },
    },
    shelf: {
      id: uuidv4(),
      type: 'shelf',
      position: { x: 3, y: 1.5, z: -4.5 },
      size: { w: 1.5, h: 3, d: 0.5 },
      material: { color: '#a0a0a0' },
    },
    rug: {
      id: uuidv4(),
      type: 'rug',
      position: { x: 0, y: 0.06, z: 0 },
      size: { w: 4, h: 0.02, d: 3 },
      material: { color: '#d0d0d0' },
    },
    plant: {
      id: uuidv4(),
      type: 'plant',
      position: { x: -1.5, y: 0.6, z: 0.8 },
      size: { w: 0.8, h: 1.2, d: 0.8 },
      material: { color: '#7aa176' },
    },
    decor: {
      id: uuidv4(),
      type: 'decor',
      position: { x: 0, y: 1.8, z: -4.8 },
      size: { w: 1, h: 1, d: 0.1 },
      material: { color: '#b0b0b0' },
    },
  };

  return presets[type] ?? {
    id: uuidv4(),
    type,
    position: { x: 0, y: 0.5, z: 0 },
    size: { w: 1, h: 1, d: 1 },
    material: { color: DEFAULT_COLOR },
  };
}
