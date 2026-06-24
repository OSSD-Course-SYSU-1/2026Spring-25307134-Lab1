/**
 * 溢彩画最优解求解器
 * 小棋盘 (≤8×8)：区域压缩 + BFS 在组件图上搜索
 * 大棋盘 (>8×8)：IDA* + 色数启发式
 */

import { GameEngine, Cell } from './GameEngine';
import { BFS_BOARD_SIZE_LIMIT, SOLVER_TIMEOUT_MS } from '../common/Constants';

/**
 * 区域压缩结果
 */
interface CompressedGraph {
  nodeColors: number[]; // 每个组件的颜色
  adjList: number[][]; // 邻接表（Set 去重后展开为数组）
  originNode: number; // 原点 (0,0) 所属的组件索引
  nodeCount: number; // 总组件数
}

export class Solver {
  /**
   * 计算将棋盘全部染成同色所需的最少步数
   */
  static solveOptimal(
    grid: number[][],
    size: number,
    colorCount: number
  ): number {
    // 已经是同色，0 步
    if (GameEngine.isComplete(grid)) return 0;

    // 小棋盘 → BFS 精确解
    if (size <= BFS_BOARD_SIZE_LIMIT) {
      return Solver.bfsComponentSolver(grid, size, colorCount);
    }

    // 大棋盘 → IDA* 近似解
    return Solver.idaStarSolve(grid, size, colorCount);
  }

  /**
   * 返回最优解的颜色序列（用于高级提示系统）
   */
  static solveOptimalPath(
    grid: number[][],
    size: number,
    colorCount: number
  ): number[] {
    if (GameEngine.isComplete(grid)) return [];

    if (size <= BFS_BOARD_SIZE_LIMIT) {
      return Solver.bfsComponentPath(grid, size, colorCount);
    }
    return Solver.idaStarPath(grid, size, colorCount);
  }

  // ── 区域压缩 ──

  /**
   * 将网格压缩为组件邻接图
   * 每个同色连通区域 → 一个节点
   */
  static compressRegions(grid: number[][], size: number): CompressedGraph {
    const regionId: number[][] = [];
    for (let r = 0; r < size; r++) {
      const row: number[] = [];
      for (let c = 0; c < size; c++) {
        row.push(-1);
      }
      regionId.push(row);
    }
    const nodeColors: number[] = [];
    const adjSet: Set<number>[] = [];

    const DIRS: Cell[] = [
      { row: -1, col: 0 } as Cell,
      { row: 1, col: 0 } as Cell,
      { row: 0, col: -1 } as Cell,
      { row: 0, col: 1 } as Cell,
    ];

    // 第一遍：BFS 标记每个同色区域
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (regionId[r][c] !== -1) continue;

        const componentColor = grid[r][c];
        const componentIdx = nodeColors.length;
        nodeColors.push(componentColor);
        adjSet.push(new Set<number>());

        // BFS 遍历同色区域
        const startCell: Cell = { row: r, col: c };
        const queue: Cell[] = [startCell];
        regionId[r][c] = componentIdx;
        while (queue.length > 0) {
          const cur: Cell = queue.shift()!;
          for (const dir of DIRS) {
            const nr: number = cur.row + dir.row;
            const nc: number = cur.col + dir.col;
            if (
              GameEngine.isValidCell(nr, nc, size) &&
              regionId[nr][nc] === -1 &&
              grid[nr][nc] === componentColor
            ) {
              regionId[nr][nc] = componentIdx;
              const nextCell: Cell = { row: nr, col: nc };
              queue.push(nextCell);
            }
          }
        }
      }
    }

    // 第二遍：在区域边界扫描建立邻接关系
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const myRegion = regionId[r][c];
        for (const dir of DIRS) {
          const nr = r + dir.row;
          const nc = c + dir.col;
          if (GameEngine.isValidCell(nr, nc, size)) {
            const neighborRegion = regionId[nr][nc];
            if (neighborRegion !== myRegion) {
              adjSet[myRegion].add(neighborRegion);
            }
          }
        }
      }
    }

    // Set 转数组
    const adjList: number[][] = [];
    for (let i = 0; i < adjSet.length; i++) {
      const arr: number[] = [];
      adjSet[i].forEach((val: number) => arr.push(val));
      adjList.push(arr);
    }
    const originNode = regionId[0][0];

    return {
      nodeColors,
      adjList,
      originNode,
      nodeCount: nodeColors.length,
    };
  }

  // ── BFS 在组件图上 ──

  /**
   * BFS 在组件图上求解
   * 状态 = 已染色组件集合（bitmask）+ 当前原点颜色
   */
  private static bfsComponentSolver(
    grid: number[][],
    size: number,
    colorCount: number
  ): number {
    const graph = Solver.compressRegions(grid, size);
    const { nodeColors, adjList, originNode, nodeCount } = graph;
    const targetMask = (1 << nodeCount) - 1;

    // 初始状态
    const initialMask = 1 << originNode;

    interface BfsState {
      mask: number;
      steps: number;
    }

    const visited = new Map<number, number>(); // mask -> min steps
    const initialState: BfsState = { mask: initialMask, steps: 0 };
    const queue: BfsState[] = [initialState];
    visited.set(initialMask, 0);

    while (queue.length > 0) {
      const state = queue.shift()!;

      // 目标：全部组件染色
      if (state.mask === targetMask) {
        return state.steps;
      }

      const nextSteps = state.steps + 1;

      // 遍历每种颜色
      for (let color = 0; color < colorCount; color++) {
        // 计算新 mask：从已染色的组件出发，扩展到邻接的同色组件
        let newMask = state.mask;
        const toFlood: number[] = [];

        // 找到已染色组件中邻接但未染色的、颜色匹配的组件
        for (let node = 0; node < nodeCount; node++) {
          if ((state.mask >> node) & 1) {
            // 该组件已染色
            for (const adj of adjList[node]) {
              if (
                !((newMask >> adj) & 1) && // 邻接组件未染色
                nodeColors[adj] === color // 邻接组件颜色匹配
              ) {
                toFlood.push(adj);
                newMask |= 1 << adj;
              }
            }
          }
        }

        // BFS 传播：新加入的组件可能连锁带来更多同色邻接
        let ptr = 0;
        while (ptr < toFlood.length) {
          const node = toFlood[ptr++];
          for (const adj of adjList[node]) {
            if (!((newMask >> adj) & 1) && nodeColors[adj] === color) {
              toFlood.push(adj);
              newMask |= 1 << adj;
            }
          }
        }

        // 如果有变化且是更优的状态
        if (newMask !== state.mask) {
          const prevSteps = visited.get(newMask);
          if (prevSteps === undefined || nextSteps < prevSteps) {
            visited.set(newMask, nextSteps);
            const nextState: BfsState = { mask: newMask, steps: nextSteps };
            queue.push(nextState);
          }
        }
      }
    }

    return size * 2; // 不应到达，fallback
  }

  /**
   * BFS 返回最优颜色序列
   */
  private static bfsComponentPath(
    grid: number[][],
    size: number,
    colorCount: number
  ): number[] {
    const graph = Solver.compressRegions(grid, size);
    const { nodeColors, adjList, originNode, nodeCount } = graph;
    const targetMask = (1 << nodeCount) - 1;
    const initialMask = 1 << originNode;

    interface PathState {
      mask: number;
      steps: number;
      prevMask: number;
      prevColor: number;
    }

    const pathVisited = new Map<number, PathState>();
    const firstState: PathState = { mask: initialMask, steps: 0, prevMask: -1, prevColor: -1 };
    const queue: PathState[] = [firstState];
    pathVisited.set(initialMask, firstState);

    let finalState: PathState | undefined;

    while (queue.length > 0) {
      const state = queue.shift()!;

      if (state.mask === targetMask) {
        finalState = state;
        break;
      }

      const nextSteps = state.steps + 1;

      for (let color = 0; color < colorCount; color++) {
        if (color === nodeColors[originNode] && state.mask === initialMask)
          continue;

        let newMask = state.mask;
        const toFlood: number[] = [];

        for (let node = 0; node < nodeCount; node++) {
          if ((state.mask >> node) & 1) {
            for (const adj of adjList[node]) {
              if (!((newMask >> adj) & 1) && nodeColors[adj] === color) {
                toFlood.push(adj);
                newMask |= 1 << adj;
              }
            }
          }
        }

        let ptr = 0;
        while (ptr < toFlood.length) {
          const node = toFlood[ptr++];
          for (const adj of adjList[node]) {
            if (!((newMask >> adj) & 1) && nodeColors[adj] === color) {
              toFlood.push(adj);
              newMask |= 1 << adj;
            }
          }
        }

        if (newMask !== state.mask && !pathVisited.has(newMask)) {
          const next: PathState = {
            mask: newMask,
            steps: nextSteps,
            prevMask: state.mask,
            prevColor: color,
          };
          pathVisited.set(newMask, next);
          queue.push(next);
        }
      }
    }

    // 回溯路径
    if (!finalState) return [];

    const path: number[] = [];
    let current = finalState;
    while (current.prevMask >= 0) {
      path.push(current.prevColor);
      current = pathVisited.get(current.prevMask)!;
    }
    return path.reverse();
  }

  // ── IDA* 求解 ──

  /**
   * IDA* 搜索（大型棋盘）
   */
  private static idaStarSolve(
    initialGrid: number[][],
    size: number,
    colorCount: number
  ): number {
    const startTime = Date.now();
    const floodedMask = GameEngine.computeFloodedMask(initialGrid, size);
    let bound = GameEngine.countDistinctColors(initialGrid, size, floodedMask);

    while (bound < size * 3) {
      // 合理上界
      const result = Solver.idaSearch(
        initialGrid,
        size,
        colorCount,
        0,
        bound,
        floodedMask,
        startTime
      );
      if (result >= 0) return result; // 找到解
      if (result === -2) return bound; // 超时，返回当前 bound
      bound = Math.max(bound + 1, -result);
    }

    return bound;
  }

  /**
   * IDA* 深度受限 DFS
   * @returns 找到的解步数（>=0），或负的下界值
   */
  private static idaSearch(
    grid: number[][],
    size: number,
    colorCount: number,
    steps: number,
    bound: number,
    floodedMask: boolean[][],
    startTime: number
  ): number {
    // 检查超时
    if (Date.now() - startTime > SOLVER_TIMEOUT_MS) return -2;

    // 启发式：剩余颜色种类数
    const h = GameEngine.countDistinctColors(grid, size, floodedMask);
    const f = steps + h;
    if (f > bound) return -f; // 剪枝
    if (h === 0) return steps; // 通关！

    let min = Infinity;
    const originColor = grid[0][0];

    for (let color = 0; color < colorCount; color++) {
      if (color === originColor) continue;

      const newGrid = GameEngine.applyMove(grid, size, color);
      const newMask = GameEngine.computeFloodedMask(newGrid, size);

      const result = Solver.idaSearch(
        newGrid,
        size,
        colorCount,
        steps + 1,
        bound,
        newMask,
        startTime
      );

      if (result >= 0) return result; // 找到解
      if (result === -2) return -2; // 超时
      min = Math.min(min, -result);
    }

    return min === Infinity ? -bound - 1 : -min;
  }

  /**
   * IDA* 返回颜色序列
   */
  private static idaStarPath(
    initialGrid: number[][],
    size: number,
    colorCount: number
  ): number[] {
    // 简化实现：反复用贪婪策略得到序列（IDA* 路径回溯较复杂）
    const path: number[] = [];
    let grid = GameEngine.cloneGrid(initialGrid);

    while (!GameEngine.isComplete(grid)) {
      const floodedMask = GameEngine.computeFloodedMask(grid, size);
      const hint = GameEngine.greedyHint(
        grid,
        size,
        colorCount,
        floodedMask
      );
      path.push(hint);
      grid = GameEngine.applyMove(grid, size, hint);
    }

    return path;
  }
}
