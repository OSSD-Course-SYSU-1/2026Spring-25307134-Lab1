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
