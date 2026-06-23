/**
 * 溢彩画 (Flood-It) 游戏全局常量
 */

// ── 颜色调色板 ──
export const GAME_COLORS: string[] = [
  '#FF4B5C', // 0: 红 Red
  '#FFD93D', // 1: 黄 Yellow
  '#6BCB77', // 2: 绿 Green
  '#4D96FF', // 3: 蓝 Blue
  '#9B59B6', // 4: 紫 Purple
  '#FF8C42', // 5: 橙 Orange
];

export const COLOR_NAMES_ZH: string[] = ['红', '黄', '绿', '蓝', '紫', '橙'];
export const COLOR_NAMES_EN: string[] = ['Red', 'Yellow', 'Green', 'Blue', 'Purple', 'Orange'];

// ── 棋盘尺寸 ──
export const BOARD_CONTAINER_FLEX: number = 6; // 左面板占 60%
export const PALETTE_CONTAINER_FLEX: number = 4; // 右面板占 40%

/**
 * 根据棋盘大小动态计算格子尺寸 (vp)
 * 确保整个棋盘适配屏幕
 */
export function dynamicCellSize(gridSize: number): number {
  if (gridSize <= 6) return 48;
  if (gridSize <= 8) return 38;
  if (gridSize <= 10) return 32;
  return 28; // 12×12
}

// ── 游戏模式 ──
export const MODE_LEVEL: number = 0;
export const MODE_INFINITE: number = 1;

// ── 星级评定阈值 ──
export const STAR3_FACTOR: number = 1.0; // steps <= optimal → 3★
export const STAR2_FACTOR: number = 1.5; // steps <= optimal*1.5 → 2★

// ── 动画参数 ──
export const FLOOD_LAYER_DELAY_MS: number = 80; // BFS 层间延迟
export const CELL_TRANSITION_MS: number = 200; // 单格过渡时间
export const HINT_DISPLAY_MS: number = 2000; // 提示高亮持续

// ── 求解器限制 ──
export const BFS_BOARD_SIZE_LIMIT: number = 9; // ≤9×9 用 BFS
export const SOLVER_TIMEOUT_MS: number = 5000; // 求解超时

// ── 无尽模式默认 ──
export const INFINITE_DEFAULT_SIZE: number = 8;
export const INFINITE_DEFAULT_COLORS: number = 5;

// ── Preferences 键 ──
export const PREF_NAME: string = 'floodit_game_data';
export const KEY_CURRENT_LEVEL: string = 'current_level';
export const KEY_LEVEL_STARS_PREFIX: string = 'level_stars_';
export const KEY_INFINITE_BEST: string = 'infinite_best';
export const KEY_SOUND_ENABLED: string = 'sound_enabled';

// ── 响应式断点 ──
export const BP_SM: number = 0;
export const BP_MD: number = 1;
export const BP_LG: number = 2;
export const BP_SM_MAX: number = 600;  // < 600vp → SM
export const BP_MD_MAX: number = 840;  // < 840vp → MD, ≥ 840vp → LG

// ── 断点参数 ──
export function hudHeightForBp(bp: number): number {
  if (bp === BP_SM) return 60;
  if (bp === BP_LG) return 96;
  return 80; // MD 兜底
}

export function boardFlexForBp(bp: number): number {
  if (bp === BP_LG) return 6.5;
  if (bp === BP_SM) return 6;
  return 6; // MD 兜底
}

export function paletteFlexForBp(bp: number): number {
  if (bp === BP_LG) return 3.5;
  if (bp === BP_SM) return 4;
  return 4; // MD 兜底
}

// ── 调色板排列方向 ──
export const PALETTE_DIR_VERTICAL: number = 0;
export const PALETTE_DIR_HORIZONTAL: number = 1;

// ── 跨设备迁移 ──
export const CONT_KEY_GAME_MODE: string = 'fc_gamemode';
export const CONT_KEY_CURRENT_LEVEL: string = 'fc_curlevel';
export const CONT_KEY_INFINITE_LEVEL: string = 'fc_inflevel';
export const CONT_KEY_GRID: string = 'fc_grid';
export const CONT_KEY_GRID_SIZE: string = 'fc_gridsize';
export const CONT_KEY_COLOR_COUNT: string = 'fc_colors';
export const CONT_KEY_STEPS: string = 'fc_steps';
export const CONT_KEY_ORIGIN_COLOR: string = 'fc_origincolor';
export const CONT_KEY_OPTIMAL_STEPS: string = 'fc_optsteps';
export const CONT_KEY_STARS: string = 'fc_stars';
export const CONT_KEY_FLOODED_MASK: string = 'fc_mask';
export const CONT_KEY_INITIAL_GRID: string = 'fc_initgrid';
export const CONT_KEY_UNDO_STACK: string = 'fc_undo';
export const CONT_DATA_MARKER: string = 'fc_data_exists'; // 用于检测迁移数据是否存在
