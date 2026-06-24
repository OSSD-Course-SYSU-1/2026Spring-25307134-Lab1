/**
 * 溢彩画棋盘生成器
 * 几何图案 + 均匀颜色分布 + 反向扰动保证可解性
 * 最大支持 9×9
 */

import { GameEngine, Cell } from './GameEngine';
import { Solver } from './Solver';

/** 伪随机数生成器（Mulberry32） */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  nextInt(max: number): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.abs(((t ^ (t >>> 14)) >>> 0) % max);
  }
}

interface Placement {
  shapeIdx: number;
  baseR: number;
  baseC: number;
  cells: Cell[];
}

export class BoardGenerator {
  static generate(
    size: number,
    colorCount: number,
    seed: number
  ): { grid: number[][]; optimalSteps: number } {
    const grid = BoardGenerator.buildGrid(size, colorCount, seed);

    let optimalSteps: number;
    try {
      optimalSteps = Solver.solveOptimal(grid, size, colorCount);
    } catch (e) {
      optimalSteps = Math.ceil(size * 1.2 + colorCount);
    }

    return { grid, optimalSteps };
  }

  static generateQuick(
    size: number,
    colorCount: number,
    seed: number
  ): { grid: number[][] } {
    const grid = BoardGenerator.buildGrid(size, colorCount, seed);
    return { grid };
  }

  // ── 主生成流程 ──

  private static buildGrid(
    size: number,
    colorCount: number,
    seed: number
  ): number[][] {
    const rng = new SeededRandom(seed);
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Step 1: 生成几何图案（俄罗斯方块图案占 ~80%）
      const rawType = (seed + attempt * 13) % 10;
      const patternType = rawType < 8 ? 7 : rawType - 8;
      const isTetris = (patternType === 7);
      const grid = BoardGenerator.createPattern(size, colorCount, patternType, rng);

      // Tetris 模式：保证每区域恰好 4 格，跳过均衡化/合并/扰动
      if (!isTetris) {
        BoardGenerator.balanceColors(grid, size, colorCount, rng);
        BoardGenerator.mergeIsolated(grid, size);
        BoardGenerator.scramble(grid, size, colorCount, rng);
      }

      // Step 4: 验证
      if (GameEngine.isComplete(grid)) continue;

      const distinctColors = new Set<number>();
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          distinctColors.add(grid[r][c]);
        }
      }
      if (distinctColors.size < colorCount) continue;

      // 确保每个颜色至少占 8%
      const minRatio = 0.08;
      const minCells = Math.floor(size * size * minRatio);
      const counts = new Array<number>(colorCount).fill(0);
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          counts[grid[r][c]]++;
        }
      }
      const allPresent = counts.every((n: number) => n >= minCells);
      if (!allPresent) continue;

      // 单格色块 ≤ 3（孤立格：四邻没有同色）
      const isolatedCount = BoardGenerator.countIsolated(grid, size);
      if (isolatedCount > 3) continue;

      return grid;
    }

    // Fallback: 均匀随机
    return BoardGenerator.randomBalanced(size, colorCount, rng);
  }

  // ── 几何图案生成 ──

  private static createPattern(
    size: number,
    colorCount: number,
    patternType: number,
    rng: SeededRandom
  ): number[][] {
    const grid: number[][] = [];
    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        row.push(0);
      }
      grid.push(row);
    }

    switch (patternType) {
      case 0: BoardGenerator.patternStripesH(grid, size, colorCount, rng); break;
      case 1: BoardGenerator.patternStripesV(grid, size, colorCount, rng); break;
      case 2: BoardGenerator.patternDiagonal(grid, size, colorCount, rng); break;
      case 3: BoardGenerator.patternQuadrants(grid, size, colorCount, rng); break;
      case 4: BoardGenerator.patternChecker(grid, size, colorCount, rng); break;
      case 5: BoardGenerator.patternFrames(grid, size, colorCount, rng); break;
      case 6: BoardGenerator.patternBlocks(grid, size, colorCount, rng); break;
      default: BoardGenerator.patternTetris(grid, size, colorCount, rng); break;
    }

    return grid;
  }

  /** 水平条纹 */
  private static patternStripesH(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const stripeHeight = Math.ceil(size / colorCount);
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    for (let r = 0; r < size; r++) {
      const colorIdx = Math.floor(r / stripeHeight);
      const color = order[Math.min(colorIdx, colorCount - 1)];
      for (let c = 0; c < size; c++) {
        grid[r][c] = color;
      }
    }
  }

  /** 垂直条纹 */
  private static patternStripesV(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const stripeWidth = Math.ceil(size / colorCount);
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    for (let c = 0; c < size; c++) {
      const colorIdx = Math.floor(c / stripeWidth);
      const color = order[Math.min(colorIdx, colorCount - 1)];
      for (let r = 0; r < size; r++) {
        grid[r][c] = color;
      }
    }
  }

  /** 对角线 / 斜条纹 */
  private static patternDiagonal(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    const bandWidth = Math.ceil((size * 2 - 1) / colorCount);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const diag = r + c; // 或 r - c + (size - 1) 变化方向
        const colorIdx = Math.floor(diag / bandWidth);
        grid[r][c] = order[Math.min(colorIdx, colorCount - 1)];
      }
    }
  }

  /** 象限分块 */
  private static patternQuadrants(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    const midR = Math.floor(size / 2);
    const midC = Math.floor(size / 2);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (colorCount <= 4) {
          // 4 象限 + 可能额外颜色
          const idx = (r < midR ? 0 : 2) + (c < midC ? 0 : 1);
          grid[r][c] = order[Math.min(idx, colorCount - 1)];
        } else if (colorCount === 5) {
          const idx = (r < midR ? 0 : 2) + (c < midC ? 0 : 1);
          // 中间十字用第5色
          if (r === midR || c === midC) {
            grid[r][c] = order[4];
          } else {
            grid[r][c] = order[idx];
          }
        } else {
          // 6色：3×3 网格
          const rowThird = Math.floor(r / Math.ceil(size / 3));
          const colThird = Math.floor(c / Math.ceil(size / 2));
          const idx = rowThird * 2 + colThird;
          grid[r][c] = order[Math.min(idx, colorCount - 1)];
        }
      }
    }
  }

  /** 棋盘格 */
  private static patternChecker(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    // 用 (r+c) 的奇偶决定基础色，再用大块棋盘
    const blockSize = Math.max(2, Math.floor(size / 4));
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const br = Math.floor(r / blockSize);
        const bc = Math.floor(c / blockSize);
        const idx = (br + bc) % colorCount;
        grid[r][c] = order[idx];
      }
    }
  }

  /** 同心框 */
  private static patternFrames(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    const mid = Math.floor(size / 2);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // 到边界的距离决定层
        const distToEdge = Math.min(r, c, size - 1 - r, size - 1 - c);
        const layerIdx = Math.min(distToEdge, colorCount - 1);
        grid[r][c] = order[layerIdx];
      }
    }
  }

  /** 大色块 */
  private static patternBlocks(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const order: number[] = BoardGenerator.shuffledColors(colorCount, rng);
    // 用 Voronoi-like 分块：几个种子点，按最近距离分配
    const seeds: Cell[] = [];
    for (let i = 0; i < colorCount; i++) {
      const sr = rng.nextInt(size);
      const sc = rng.nextInt(size);
      const seed: Cell = { row: sr, col: sc };
      seeds.push(seed);
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < colorCount; i++) {
          const dr = r - seeds[i].row;
          const dc = c - seeds[i].col;
          const dist = dr * dr + dc * dc;
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        }
        grid[r][c] = order[bestIdx];
      }
    }
  }

  /** 俄罗斯方块经典形状（严格四格连块） */
  private static patternTetris(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    // 尝试完美平铺（最多 200 次随机打乱重试）
    const TETROMINOES = BoardGenerator.getTetrominoShapes();
    const totalCells = size * size;
    const maxTetris = Math.floor(totalCells / 4);

    let bestRegions: Cell[][] = [];
    let bestCovered = 0;

    for (let retry = 0; retry < 200; retry++) {
      // 初始化空棋盘
      const tempGrid: number[][] = [];
      for (let r = 0; r < size; r++) {
        const row: number[] = [];
        for (let c = 0; c < size; c++) {
          row.push(-1);
        }
        tempGrid.push(row);
      }

      // 收集 + 打乱所有合法放置
      const placements = BoardGenerator.collectPlacements(TETROMINOES, size);
      BoardGenerator.shufflePlacements(placements, rng);

      // 贪心放置
      const regions: Cell[][] = [];
      for (const p of placements) {
        let allFree = true;
        for (const cell of p.cells) {
          if (tempGrid[cell.row][cell.col] !== -1) { allFree = false; break; }
        }
        if (!allFree) continue;

        const region: Cell[] = [];
        for (const cell of p.cells) {
          tempGrid[cell.row][cell.col] = -2;
          const c: Cell = { row: cell.row, col: cell.col };
          region.push(c);
        }
        regions.push(region);
      }

      const covered = regions.length * 4;
      if (covered > bestCovered) {
        bestCovered = covered;
        bestRegions = regions;
        // 完美平铺 → 停止
        if (covered === maxTetris * 4) break;
      }
    }

    // 处理剩余未覆盖格子（拼接为 2×1 或 2×2，尽量避免孤立）
    const remainGrid: number[][] = [];
    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        row.push(-1);
      }
      remainGrid.push(row);
    }
    for (const region of bestRegions) {
      for (const cell of region) {
        remainGrid[cell.row][cell.col] = 1; // 已占用
      }
    }
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (remainGrid[r][c] === -1) {
          // 尝试组成 2×1 或 1×2 对
          if (c + 1 < size && remainGrid[r][c + 1] === -1) {
            const pair: Cell[] = [
              { row: r, col: c } as Cell,
              { row: r, col: c + 1 } as Cell,
            ];
            bestRegions.push(pair);
            remainGrid[r][c] = 1;
            remainGrid[r][c + 1] = 1;
          } else if (r + 1 < size && remainGrid[r + 1][c] === -1) {
            const pair: Cell[] = [
              { row: r, col: c } as Cell,
              { row: r + 1, col: c } as Cell,
            ];
            bestRegions.push(pair);
            remainGrid[r][c] = 1;
            remainGrid[r + 1][c] = 1;
          } else {
            const single: Cell[] = [{ row: r, col: c } as Cell];
            bestRegions.push(single);
            remainGrid[r][c] = 1;
          }
        }
      }
    }

    // 构建区域邻接图
    const regionAdj: Set<number>[] = [];
    const cellRegion: number[][] = [];
    for (let r = 0; r < size; r++) {
      const row: number[] = new Array(size).fill(-1);
      cellRegion.push(row);
    }
    for (let i = 0; i < bestRegions.length; i++) {
      regionAdj.push(new Set<number>());
      for (const cell of bestRegions[i]) {
        cellRegion[cell.row][cell.col] = i;
      }
    }

    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const myReg = cellRegion[r][c];
        for (const dir of DIRS) {
          const nr = r + dir.row;
          const nc = c + dir.col;
          if (GameEngine.isValidCell(nr, nc, size)) {
            const nbReg = cellRegion[nr][nc];
            if (nbReg !== myReg) {
              regionAdj[myReg].add(nbReg);
              regionAdj[nbReg].add(myReg);
            }
          }
        }
      }
    }

    // 严格贪心图着色：邻接 = 不同色
    const regionColor: number[] = new Array(bestRegions.length).fill(-1);
    const colorCounts: number[] = new Array(colorCount).fill(0);
    const totalCellsActual = size * size;
    const targetPerColor = Math.floor(totalCellsActual / colorCount);

    // 按区域大小降序着色
    const order: number[] = [];
    for (let i = 0; i < bestRegions.length; i++) {
      order.push(i);
    }
    order.sort((a: number, b: number) => bestRegions[b].length - bestRegions[a].length);

    for (const ri of order) {
      const forbidden = new Set<number>();
      for (const adj of regionAdj[ri]) {
        if (regionColor[adj] >= 0) {
          forbidden.add(regionColor[adj]);
        }
      }

      const candidates: number[] = [];
      for (let col = 0; col < colorCount; col++) {
        if (!forbidden.has(col)) {
          candidates.push(col);
        }
      }

      let chosen: number;
      if (candidates.length > 0) {
        // 选数量最少的候选色（均衡）
        chosen = candidates[0];
        for (const col of candidates) {
          if (colorCounts[col] < colorCounts[chosen]) chosen = col;
        }
      } else {
        // 理论上不应出现（色数≥邻度数），兜底：选数量最少的
        chosen = 0;
        for (let col = 1; col < colorCount; col++) {
          if (colorCounts[col] < colorCounts[chosen]) chosen = col;
        }
      }
      regionColor[ri] = chosen;
      colorCounts[chosen] += bestRegions[ri].length;
    }

    // 写入棋盘
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        grid[r][c] = 0;
      }
    }
    for (let i = 0; i < bestRegions.length; i++) {
      for (const cell of bestRegions[i]) {
        grid[cell.row][cell.col] = regionColor[i];
      }
    }
  }

  private static getTetrominoShapes(): number[][][] {
    return [
      [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[0,3]],
      [[0,0],[1,0],[0,1],[1,1]],
      [[0,0],[1,0],[2,0],[1,1]], [[0,0],[0,1],[0,2],[1,1]],
      [[0,1],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[1,2]],
      [[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[1,1],[1,2]],
      [[0,0],[1,0],[1,1],[2,1]], [[1,0],[0,1],[1,1],[0,2]],
      [[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[0,1],[0,2]],
      [[0,0],[1,0],[2,0],[2,1]], [[1,0],[1,1],[0,2],[1,2]],
      [[2,0],[0,1],[1,1],[2,1]], [[0,0],[0,1],[0,2],[1,0]],
      [[0,0],[1,0],[2,0],[0,1]], [[0,2],[1,0],[1,1],[1,2]],
    ];
  }

  private static collectPlacements(shapes: number[][][], size: number): Placement[] {
    const all: Placement[] = [];
    for (let s = 0; s < shapes.length; s++) {
      const shape = shapes[s];
      let maxDr = 0;
      let maxDc = 0;
      for (const cell of shape) {
        if (cell[0] > maxDr) maxDr = cell[0];
        if (cell[1] > maxDc) maxDc = cell[1];
      }
      for (let r = 0; r <= size - 1 - maxDr; r++) {
        for (let c = 0; c <= size - 1 - maxDc; c++) {
          const cells: Cell[] = [];
          for (const offset of shape) {
            const cell: Cell = { row: r + offset[0], col: c + offset[1] };
            cells.push(cell);
          }
          const placement: Placement = { shapeIdx: s, baseR: r, baseC: c, cells: cells };
          all.push(placement);
        }
      }
    }
    return all;
  }

  private static shufflePlacements(arr: Placement[], rng: SeededRandom): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  // ── 颜色均匀化 ──

  private static balanceColors(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const total = size * size;
    const target = Math.floor(total / colorCount);
    const tolerance = Math.ceil(target * 0.3);

    // 统计
    const counts = new Array<number>(colorCount).fill(0);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        counts[grid[r][c]]++;
      }
    }

    // 过少的颜色从过多的颜色中"偷"格子
    const maxIterations = total * 2;
    for (let iter = 0; iter < maxIterations; iter++) {
      let minColor = 0;
      let maxColor = 0;
      for (let i = 1; i < colorCount; i++) {
        if (counts[i] < counts[minColor]) minColor = i;
        if (counts[i] > counts[maxColor]) maxColor = i;
      }

      if (counts[maxColor] - counts[minColor] <= tolerance) break;
      if (maxColor === minColor) break;

      // 从 maxColor 区域边缘找一个格子改成 minColor
      const candidates: Cell[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c] === maxColor) {
            // 检查是否有不同颜色的邻居（边界格）
            let hasDiff = false;
            if (r > 0 && grid[r - 1][c] !== maxColor) hasDiff = true;
            if (r < size - 1 && grid[r + 1][c] !== maxColor) hasDiff = true;
            if (c > 0 && grid[r][c - 1] !== maxColor) hasDiff = true;
            if (c < size - 1 && grid[r][c + 1] !== maxColor) hasDiff = true;
            if (hasDiff) {
              const cell: Cell = { row: r, col: c };
              candidates.push(cell);
            }
          }
        }
      }

      if (candidates.length === 0) break;

      const pick = candidates[rng.nextInt(candidates.length)];
      grid[pick.row][pick.col] = minColor;
      counts[maxColor]--;
      counts[minColor]++;
    }
  }

  // ── 反向扰动 ──

  private static scramble(
    grid: number[][], size: number, colorCount: number, rng: SeededRandom
  ): void {
    const steps = size + rng.nextInt(size);
    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    for (let step = 0; step < steps; step++) {
      // 随机选一个不在 flooded 区的格子
      const flooded = GameEngine.computeFloodedMask(grid, size);
      const nonFlooded: Cell[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!flooded[r][c]) {
            const cell: Cell = { row: r, col: c };
            nonFlooded.push(cell);
          }
        }
      }
      if (nonFlooded.length === 0) break;

      const start = nonFlooded[rng.nextInt(nonFlooded.length)];
      const currentColor = grid[start.row][start.col];

      // 选一个相邻区域的颜色作为新颜色
      const adjColors: number[] = [];
      for (const dir of DIRS) {
        const nr = start.row + dir.row;
        const nc = start.col + dir.col;
        if (GameEngine.isValidCell(nr, nc, size)) {
          const adjColor = grid[nr][nc];
          if (adjColor !== currentColor && adjColors.indexOf(adjColor) < 0) {
            adjColors.push(adjColor);
          }
        }
      }
      if (adjColors.length === 0) continue;

      const newColor = adjColors[rng.nextInt(adjColors.length)];
      BoardGenerator.floodRegion(grid, size, start.row, start.col, newColor);
    }
  }

  // ── flood 单个区域 ──

  private static floodRegion(
    grid: number[][], size: number, startRow: number, startCol: number,
    newColor: number
  ): void {
    const targetColor = grid[startRow][startCol];
    if (targetColor === newColor) return;

    const visited: boolean[][] = GameEngine.createBoolGrid(size, false);
    const startCell: Cell = { row: startRow, col: startCol };
    const queue: Cell[] = [startCell];
    visited[startRow][startCol] = true;

    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    while (queue.length > 0) {
      const cur: Cell = queue.shift()!;
      grid[cur.row][cur.col] = newColor;

      for (const dir of DIRS) {
        const nr = cur.row + dir.row;
        const nc = cur.col + dir.col;
        if (
          GameEngine.isValidCell(nr, nc, size) &&
          !visited[nr][nc] &&
          grid[nr][nc] === targetColor
        ) {
          visited[nr][nc] = true;
          const nextCell: Cell = { row: nr, col: nc };
          queue.push(nextCell);
        }
      }
    }
  }

  // ── Fallback: 均匀随机 ──

  private static randomBalanced(
    size: number, colorCount: number, rng: SeededRandom
  ): number[][] {
    const total = size * size;
    const targetPerColor = Math.floor(total / colorCount);
    const colors: number[] = [];
    for (let i = 0; i < colorCount; i++) {
      for (let j = 0; j < targetPerColor; j++) {
        colors.push(i);
      }
    }
    // 补足余数
    while (colors.length < total) {
      colors.push(rng.nextInt(colorCount));
    }
    // Fisher-Yates 洗牌
    for (let i = colors.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      const tmp = colors[i];
      colors[i] = colors[j];
      colors[j] = tmp;
    }

    const grid: number[][] = [];
    let idx = 0;
    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        row.push(colors[idx++]);
      }
      grid.push(row);
    }

    if (GameEngine.isComplete(grid)) {
      // 交换两个格子来打破
      const tmp = grid[0][1];
      grid[0][1] = grid[1][0];
      grid[1][0] = tmp;
    }

    return grid;
  }

  /** 合并所有孤立格到邻接区域，消除单格色块 */
  private static mergeIsolated(grid: number[][], size: number): void {
    const maxPasses = size * 2;
    for (let pass = 0; pass < maxPasses; pass++) {
      const isolated: Cell[] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const color = grid[r][c];
          let hasSame = false;
          if (r > 0 && grid[r - 1][c] === color) hasSame = true;
          if (r < size - 1 && grid[r + 1][c] === color) hasSame = true;
          if (c > 0 && grid[r][c - 1] === color) hasSame = true;
          if (c < size - 1 && grid[r][c + 1] === color) hasSame = true;
          if (!hasSame) {
            const cell: Cell = { row: r, col: c };
            isolated.push(cell);
          }
        }
      }

      if (isolated.length === 0) break;

      // 每个孤立格合并到邻接最多的颜色
      for (const cell of isolated) {
        const neighborColors = new Map<number, number>();
        const r = cell.row;
        const c = cell.col;
        const addColor = (color: number) => {
          const prev = neighborColors.get(color);
          neighborColors.set(color, (prev ?? 0) + 1);
        };
        if (r > 0) addColor(grid[r - 1][c]);
        if (r < size - 1) addColor(grid[r + 1][c]);
        if (c > 0) addColor(grid[r][c - 1]);
        if (c < size - 1) addColor(grid[r][c + 1]);

        let bestColor = grid[r][c];
        let bestCount = 0;
        neighborColors.forEach((count: number, color: number) => {
          if (count > bestCount) {
            bestCount = count;
            bestColor = color;
          }
        });
        // 如果所有邻居都是同一种不同色 → 合并到那个颜色
        if (bestCount > 0 && bestColor !== grid[r][c]) {
          grid[r][c] = bestColor;
        }
      }
    }
  }

  /** 统计单格色块（四邻没有同色的孤立格） */
  private static countIsolated(grid: number[][], size: number): number {
    let count = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const color = grid[r][c];
        let hasSameNeighbor = false;
        if (r > 0 && grid[r - 1][c] === color) hasSameNeighbor = true;
        if (r < size - 1 && grid[r + 1][c] === color) hasSameNeighbor = true;
        if (c > 0 && grid[r][c - 1] === color) hasSameNeighbor = true;
        if (c < size - 1 && grid[r][c + 1] === color) hasSameNeighbor = true;
        if (!hasSameNeighbor) count++;
      }
    }
    return count;
  }

  // ── 工具 ──

  private static shuffledColors(colorCount: number, rng: SeededRandom): number[] {
    const arr: number[] = [];
    for (let i = 0; i < colorCount; i++) {
      arr.push(i);
    }
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rng.nextInt(i + 1);
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  // 保留旧接口兼容
  static generateRandom(
    size: number, colorCount: number, seed: number
  ): number[][] {
    const rng = new SeededRandom(seed);
    return BoardGenerator.randomBalanced(size, colorCount, rng);
  }
}
