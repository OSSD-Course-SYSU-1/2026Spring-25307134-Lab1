/**
 * 溢彩画核心游戏引擎
 * 所有方法均为纯函数，不修改输入参数，返回新的数据结构。
 */

import { STAR3_FACTOR, STAR2_FACTOR } from '../common/Constants';

export interface GameSnapshot {
  grid: number[][];
  steps: number;
  originColor: number;
}

/**
 * 棋盘状态
 */
export interface BoardState {
  grid: number[][]; // row-major, 值为颜色索引 0..colorCount-1
  size: number;
}

/**
 * 坐标点
 */
export interface Cell {
  row: number;
  col: number;
}

export class GameEngine {
  // ── 工具函数 ──

  /** 判断坐标是否在棋盘范围内 */
  static isValidCell(row: number, col: number, size: number): boolean {
    return row >= 0 && row < size && col >= 0 && col < size;
  }

  /** 深拷贝二维数组 */
  static cloneGrid(grid: number[][]): number[][] {
    return grid.map(row => [...row]);
  }

  /** 创建空二维布尔数组 */
  static createBoolGrid(size: number, defaultValue: boolean = false): boolean[][] {
    const grid: boolean[][] = [];
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        row.push(defaultValue);
      }
      grid.push(row);
    }
    return grid;
  }

  /** 计算 floodedMask 中为 true 的格子数 */
  static countFloodedCells(floodedMask: boolean[][]): number {
    let count = 0;
    for (const row of floodedMask) {
      for (const cell of row) {
        if (cell) count++;
      }
    }
    return count;
  }

  // ── 核心算法 ──

  /**
   * BFS 从原点 (0,0) 出发，找到所有同色连通格
   * @returns 布尔矩阵，true = 在连通区域内
   */
  static computeFloodedMask(grid: number[][], size: number): boolean[][] {
    const floodedMask: boolean[][] = GameEngine.createBoolGrid(size, false);
    const originColor = grid[0][0];
    const queue: Cell[] = [];

    floodedMask[0][0] = true;
    const originCell: Cell = { row: 0, col: 0 };
    queue.push(originCell);

    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    while (queue.length > 0) {
      const current: Cell = queue.shift()!;
      for (const dir of DIRS) {
        const nr: number = current.row + dir.row;
        const nc: number = current.col + dir.col;
        if (
          GameEngine.isValidCell(nr, nc, size) &&
          !floodedMask[nr][nc] &&
          grid[nr][nc] === originColor
        ) {
          floodedMask[nr][nc] = true;
          const nextCell: Cell = { row: nr, col: nc };
          queue.push(nextCell);
        }
      }
    }

    return floodedMask;
  }

  /**
   * 执行一次染色操作
   * @returns 新的棋盘（不修改输入）
   */
  static applyMove(
    grid: number[][],
    size: number,
    newColor: number
  ): number[][] {
    const floodedMask = GameEngine.computeFloodedMask(grid, size);
    const newGrid = GameEngine.cloneGrid(grid);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (floodedMask[r][c]) {
          newGrid[r][c] = newColor;
        }
      }
    }
    return newGrid;
  }

  /**
   * BFS 从任意起点 (startRow, startCol) 出发，找到所有同色连通格
   * @returns 布尔矩阵，true = 在连通区域内
   */
  static computeFloodedMaskAt(
    grid: number[][],
    size: number,
    startRow: number,
    startCol: number
  ): boolean[][] {
    const floodedMask: boolean[][] = GameEngine.createBoolGrid(size, false);
    const targetColor = grid[startRow][startCol];
    const queue: Cell[] = [];

    floodedMask[startRow][startCol] = true;
    const startCell: Cell = { row: startRow, col: startCol };
    queue.push(startCell);

    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    while (queue.length > 0) {
      const current: Cell = queue.shift()!;
      for (const dir of DIRS) {
        const nr: number = current.row + dir.row;
        const nc: number = current.col + dir.col;
        if (
          GameEngine.isValidCell(nr, nc, size) &&
          !floodedMask[nr][nc] &&
          grid[nr][nc] === targetColor
        ) {
          floodedMask[nr][nc] = true;
          const nextCell: Cell = { row: nr, col: nc };
          queue.push(nextCell);
        }
      }
    }

    return floodedMask;
  }

  /**
   * 从任意起点 (startRow, startCol) 执行一次染色操作
   * @returns 新的棋盘（不修改输入）
   */
  static applyMoveAt(
    grid: number[][],
    size: number,
    startRow: number,
    startCol: number,
    newColor: number
  ): number[][] {
    const floodedMask = GameEngine.computeFloodedMaskAt(grid, size, startRow, startCol);
    const newGrid = GameEngine.cloneGrid(grid);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (floodedMask[r][c]) {
          newGrid[r][c] = newColor;
        }
      }
    }
    return newGrid;
  }

  /**
   * 判断棋盘是否全部同色（通关条件）
   */
  static isComplete(grid: number[][]): boolean {
    const targetColor = grid[0][0];
    for (const row of grid) {
      for (const cell of row) {
        if (cell !== targetColor) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * 计算星级评定
   * @param steps 玩家实际步数
   * @param optimalSteps 最优步数
   * @returns 1-3 星
   */
  static computeStars(steps: number, optimalSteps: number): number {
    if (steps <= optimalSteps * STAR3_FACTOR) return 3;
    if (steps <= optimalSteps * STAR2_FACTOR) return 2;
    return 1;
  }

  // ── 贪心提示 ──

  /**
   * 贪心策略：选择能最大扩展连通区域的颜色
   * 对每个可用颜色模拟染色，返回吞噬格子最多的颜色索引
   * @returns 推荐的颜色索引
   */
  static greedyHint(
    grid: number[][],
    size: number,
    colorCount: number,
    floodedMask: boolean[][]
  ): number {
    const originColor = grid[0][0];
    const currentFlooded = GameEngine.countFloodedCells(floodedMask);
    let bestColor = -1;
    let bestGain = -1;

    for (let color = 0; color < colorCount; color++) {
      if (color === originColor) continue;

      // 模拟染色
      const newGrid = GameEngine.applyMove(grid, size, color);
      const newMask = GameEngine.computeFloodedMask(newGrid, size);
      const newFlooded = GameEngine.countFloodedCells(newMask);
      const gain = newFlooded - currentFlooded;

      if (gain > bestGain) {
        bestGain = gain;
        bestColor = color;
      }
    }

    // 如果所有颜色都无增益（不应出现），返回第一个不同于原点的颜色
    return bestColor >= 0 ? bestColor : (originColor + 1) % colorCount;
  }

  // ── 动画分层 ──

  /**
   * 计算 BFS 距离分层（仅限 floodedMask 内）
   * 用于波纹扩散动画——按距离原点远近分组
   * @returns 按距离分层的格子数组，第0层=[(0,0)], 第1层=[(0,1),(1,0)], ...
   */
  static computeFloodLayers(
    grid: number[][],
    size: number,
    floodedMask: boolean[][]
  ): Cell[][] {
    const layers: Cell[][] = [];
    const visited: boolean[][] = GameEngine.createBoolGrid(size, false);
    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    // 从原点开始
    const originCell: Cell = { row: 0, col: 0 };
    let currentLayer: Cell[] = [originCell];
    visited[0][0] = true;

    while (currentLayer.length > 0) {
      layers.push([...currentLayer]); // 保存当前层
      const nextLayer: Cell[] = [];

      for (const cell of currentLayer) {
        for (const dir of DIRS) {
          const nr: number = cell.row + dir.row;
          const nc: number = cell.col + dir.col;
          if (
            GameEngine.isValidCell(nr, nc, size) &&
            !visited[nr][nc] &&
            floodedMask[nr][nc]
          ) {
            visited[nr][nc] = true;
            const nextCell: Cell = { row: nr, col: nc };
            nextLayer.push(nextCell);
          }
        }
      }
      currentLayer = nextLayer;
    }

    return layers;
  }

  /**
   * 计算从任意起点的 BFS 距离分层（仅限 floodedMask 内）
   * 用于点击格子的波纹扩散动画
   */
  static computeFloodLayersAt(
    grid: number[][],
    size: number,
    startRow: number,
    startCol: number,
    floodedMask: boolean[][]
  ): Cell[][] {
    const layers: Cell[][] = [];
    const visited: boolean[][] = GameEngine.createBoolGrid(size, false);
    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    const startCell: Cell = { row: startRow, col: startCol };
    let currentLayer: Cell[] = [startCell];
    visited[startRow][startCol] = true;

    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);
      const nextLayer: Cell[] = [];

      for (const cell of currentLayer) {
        for (const dir of DIRS) {
          const nr: number = cell.row + dir.row;
          const nc: number = cell.col + dir.col;
          if (
            GameEngine.isValidCell(nr, nc, size) &&
            !visited[nr][nc] &&
            floodedMask[nr][nc]
          ) {
            visited[nr][nc] = true;
            const nextCell: Cell = { row: nr, col: nc };
            nextLayer.push(nextCell);
          }
        }
      }
      currentLayer = nextLayer;
    }

    return layers;
  }

  // ── 颜色统计（用于 Solver 启发式） ──

  /**
   * 统计 floodedMask 之外出现的不同颜色种类数
   * 用作 IDA* 的可采纳启发式
   */
  static countDistinctColors(
    grid: number[][],
    size: number,
    floodedMask: boolean[][]
  ): number {
    const colors = new Set<number>();
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!floodedMask[r][c]) {
          colors.add(grid[r][c]);
        }
      }
    }
    return colors.size;
  }
}
