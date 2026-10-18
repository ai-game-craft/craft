export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 128;
export const RENDER_DISTANCE = 6;
export const WORLD_SEED = 42;

export enum BlockId {
  Air = 0,
  Grass = 1,
  Dirt = 2,
  Stone = 3,
  Sand = 4,
  Water = 5,
  Wood = 6,
  Leaves = 7,
  Glass = 8,
  Cobblestone = 9,
  Planks = 10,
  Gravel = 11,
  CoalOre = 12,
  IronOre = 13,
  GoldOre = 14,
  Tnt = 15,
  Brick = 16,
  Glowstone = 17,
  Ice = 18,
  Snow = 19,
  Obsidian = 20,
}

export interface BlockDef {
  id: BlockId;
  name: string;
  solid: boolean;
  transparent: boolean;
  /** Relative hardness — drives break sound pitch and (later) break time. */
  hardness: number;
  /** Texture index in atlas for each face: [top, bottom, sides] */
  textures: [number, number, number];
}

const T = (n: number): [number, number, number] => [n, n, n];

export const BLOCKS: Record<BlockId, BlockDef> = {
  [BlockId.Air]: { id: BlockId.Air, name: 'Air', solid: false, transparent: true, hardness: 0, textures: T(0) },
  [BlockId.Grass]: { id: BlockId.Grass, name: 'Grass', solid: true, transparent: false, hardness: 0.4, textures: [0, 1, 2] },
  [BlockId.Dirt]: { id: BlockId.Dirt, name: 'Dirt', solid: true, transparent: false, hardness: 0.4, textures: T(1) },
  [BlockId.Stone]: { id: BlockId.Stone, name: 'Stone', solid: true, transparent: false, hardness: 1.2, textures: T(3) },
  [BlockId.Sand]: { id: BlockId.Sand, name: 'Sand', solid: true, transparent: false, hardness: 0.35, textures: T(4) },
  [BlockId.Water]: { id: BlockId.Water, name: 'Water', solid: false, transparent: true, hardness: 0, textures: T(5) },
  [BlockId.Wood]: { id: BlockId.Wood, name: 'Log', solid: true, transparent: false, hardness: 0.9, textures: [6, 6, 7] },
  [BlockId.Leaves]: { id: BlockId.Leaves, name: 'Leaves', solid: true, transparent: true, hardness: 0.2, textures: T(8) },
  [BlockId.Glass]: { id: BlockId.Glass, name: 'Glass', solid: true, transparent: true, hardness: 0.3, textures: T(9) },
  [BlockId.Cobblestone]: { id: BlockId.Cobblestone, name: 'Cobble', solid: true, transparent: false, hardness: 1.2, textures: T(10) },
  [BlockId.Planks]: { id: BlockId.Planks, name: 'Planks', solid: true, transparent: false, hardness: 0.8, textures: T(11) },
  [BlockId.Gravel]: { id: BlockId.Gravel, name: 'Gravel', solid: true, transparent: false, hardness: 0.5, textures: T(12) },
  [BlockId.CoalOre]: { id: BlockId.CoalOre, name: 'Coal', solid: true, transparent: false, hardness: 1.4, textures: T(13) },
  [BlockId.IronOre]: { id: BlockId.IronOre, name: 'Iron', solid: true, transparent: false, hardness: 1.8, textures: T(14) },
  [BlockId.GoldOre]: { id: BlockId.GoldOre, name: 'Gold', solid: true, transparent: false, hardness: 2.2, textures: T(15) },
  [BlockId.Tnt]: { id: BlockId.Tnt, name: 'TNT', solid: true, transparent: false, hardness: 0.3, textures: [17, 18, 16] },
  [BlockId.Brick]: { id: BlockId.Brick, name: 'Brick', solid: true, transparent: false, hardness: 1.5, textures: T(19) },
  [BlockId.Glowstone]: { id: BlockId.Glowstone, name: 'Glow', solid: true, transparent: false, hardness: 0.6, textures: T(20) },
  [BlockId.Ice]: { id: BlockId.Ice, name: 'Ice', solid: true, transparent: true, hardness: 0.5, textures: T(21) },
  [BlockId.Snow]: { id: BlockId.Snow, name: 'Snow', solid: true, transparent: false, hardness: 0.3, textures: T(22) },
  [BlockId.Obsidian]: { id: BlockId.Obsidian, name: 'Obsidian', solid: true, transparent: false, hardness: 4, textures: T(24) },
};

/** Hotbar order — first nine are reachable with number keys 1-9. */
export const PLACEABLE_BLOCKS: BlockId[] = [
  BlockId.Grass,
  BlockId.Dirt,
  BlockId.Stone,
  BlockId.Cobblestone,
  BlockId.Planks,
  BlockId.Wood,
  BlockId.Leaves,
  BlockId.Glass,
  BlockId.Brick,
  BlockId.Sand,
  BlockId.Gravel,
  BlockId.Ice,
  BlockId.Glowstone,
  BlockId.Snow,
  BlockId.CoalOre,
  BlockId.IronOre,
  BlockId.GoldOre,
  BlockId.Obsidian,
  BlockId.Tnt,
];

export function getBlock(id: number): BlockDef {
  return BLOCKS[id as BlockId] ?? BLOCKS[BlockId.Air];
}

export function isSolid(id: number): boolean {
  return getBlock(id).solid;
}

export function isTransparent(id: number): boolean {
  return getBlock(id).transparent;
}
