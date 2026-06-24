/**
 * 溢彩画关卡数据定义
 * 10 关 MVP，难度梯度递增，最大 9×9
 */

export interface LevelConfig {
  id: number;        // 关卡 ID (1-10)
  gridSize: number;  // 棋盘尺寸 (6-9)
  colorCount: number; // 颜色数量 (4-6)
  optimalSteps: number; // 预计算最优步数（Solver 产出后覆盖）
}

/**
 * 10 关配置（optimalSteps 为占位估算值）
 */
export const LEVELS: LevelConfig[] = [
  { id: 1,  gridSize: 6, colorCount: 4, optimalSteps: 5 },
  { id: 2,  gridSize: 6, colorCount: 4, optimalSteps: 6 },
  { id: 3,  gridSize: 6, colorCount: 5, optimalSteps: 7 },
  { id: 4,  gridSize: 7, colorCount: 5, optimalSteps: 8 },
  { id: 5,  gridSize: 7, colorCount: 5, optimalSteps: 9 },
  { id: 6,  gridSize: 8, colorCount: 5, optimalSteps: 10 },
  { id: 7,  gridSize: 8, colorCount: 6, optimalSteps: 10 },
  { id: 8,  gridSize: 9, colorCount: 6, optimalSteps: 12 },
  { id: 9,  gridSize: 9, colorCount: 6, optimalSteps: 13 },
  { id: 10, gridSize: 9, colorCount: 6, optimalSteps: 14 },
];

export function getLevel(index: number): LevelConfig {
  if (index < 0 || index >= LEVELS.length) {
    return LEVELS[0];
  }
  return LEVELS[index];
}

export function getLevelCount(): number {
  return LEVELS.length;
}
