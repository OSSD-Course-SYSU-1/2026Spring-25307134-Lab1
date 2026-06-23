/**
 * 游戏状态桥 —— 模块级单例
 * 桥接 GamePage (UI 线程) 和 EntryAbility (生命周期) 之间的游戏状态
 * 用于跨设备迁移 (Continuation)
 */

import { GameSnapshot } from './GameEngine';
import {
  CONT_KEY_GAME_MODE,
  CONT_KEY_CURRENT_LEVEL,
  CONT_KEY_INFINITE_LEVEL,
  CONT_KEY_GRID,
  CONT_KEY_GRID_SIZE,
  CONT_KEY_COLOR_COUNT,
  CONT_KEY_STEPS,
  CONT_KEY_ORIGIN_COLOR,
  CONT_KEY_OPTIMAL_STEPS,
  CONT_KEY_STARS,
  CONT_KEY_FLOODED_MASK,
  CONT_KEY_INITIAL_GRID,
  CONT_KEY_UNDO_STACK,
  CONT_DATA_MARKER,
} from '../common/Constants';

export interface ContinuationState {
  gameMode: number;
  currentLevel: number;
  infiniteLevel: number;
  grid: number[][];
  gridSize: number;
  activeColorCount: number;
  steps: number;
  originColor: number;
  optimalSteps: number;
  stars: number;
  floodedMask: boolean[][];
  initialGrid: number[][];
  undoStack: GameSnapshot[];
}

const MAX_UNDO_SNAPSHOTS = 50;

/** 安全地从 want params 取值并转为字符串 */
function paramStr(params: Record<string, Object>, key: string): string {
  const v = params[key];
  if (typeof v === 'string') return v;
  if (v === undefined || v === null) return '';
  return String(v);
}

/** 安全解析整数，非法值返回 NaN（由调用方验证） */
function paramInt(params: Record<string, Object>, key: string): number {
  return parseInt(paramStr(params, key));
}

export const GameStateBridge = {
  current: null as ContinuationState | null,
  pendingRestore: null as ContinuationState | null,

  /** GamePage 每次状态变化后调用，保存当前快照 */
  save(state: ContinuationState): void {
    this.current = state;
  },

  /** EntryAbility.onContinue 调用：将当前状态写入 wantParam */
  writeToWantParam(wantParam: Record<string, Object>): void {
    const s = this.current;
    if (!s) return;
    wantParam[CONT_KEY_GAME_MODE] = s.gameMode.toString();
    wantParam[CONT_KEY_CURRENT_LEVEL] = s.currentLevel.toString();
    wantParam[CONT_KEY_INFINITE_LEVEL] = s.infiniteLevel.toString();
    wantParam[CONT_KEY_GRID] = JSON.stringify(s.grid);
    wantParam[CONT_KEY_GRID_SIZE] = s.gridSize.toString();
    wantParam[CONT_KEY_COLOR_COUNT] = s.activeColorCount.toString();
    wantParam[CONT_KEY_STEPS] = s.steps.toString();
    wantParam[CONT_KEY_ORIGIN_COLOR] = s.originColor.toString();
    wantParam[CONT_KEY_OPTIMAL_STEPS] = s.optimalSteps.toString();
    wantParam[CONT_KEY_STARS] = s.stars.toString();
    wantParam[CONT_KEY_FLOODED_MASK] = JSON.stringify(s.floodedMask);
    wantParam[CONT_KEY_INITIAL_GRID] = JSON.stringify(s.initialGrid);
    wantParam[CONT_KEY_UNDO_STACK] = JSON.stringify(s.undoStack.slice(-MAX_UNDO_SNAPSHOTS));
  },

  /** EntryAbility 启动时调用：从 want.parameters 解析迁移数据 */
  loadFromParams(params: Record<string, Object>): void {
    if (!params || params[CONT_DATA_MARKER] === undefined) return;
    try {
      const gameMode = paramInt(params, CONT_KEY_GAME_MODE);
      const currentLevel = paramInt(params, CONT_KEY_CURRENT_LEVEL);
      const infiniteLevel = paramInt(params, CONT_KEY_INFINITE_LEVEL);
      const gridSize = paramInt(params, CONT_KEY_GRID_SIZE);
      const activeColorCount = paramInt(params, CONT_KEY_COLOR_COUNT);
      const steps = paramInt(params, CONT_KEY_STEPS);
      const originColor = paramInt(params, CONT_KEY_ORIGIN_COLOR);
      const optimalSteps = paramInt(params, CONT_KEY_OPTIMAL_STEPS);
      const stars = paramInt(params, CONT_KEY_STARS);

      // 验证所有整数解析有效
      const ints = [gameMode, currentLevel, infiniteLevel, gridSize,
                    activeColorCount, steps, originColor, optimalSteps, stars];
      if (ints.some((n: number) => !Number.isFinite(n))) {
        this.pendingRestore = null;
        return;
      }

      const grid = JSON.parse(paramStr(params, CONT_KEY_GRID));
      const floodedMask = JSON.parse(paramStr(params, CONT_KEY_FLOODED_MASK));
      const initialGrid = JSON.parse(paramStr(params, CONT_KEY_INITIAL_GRID));
      const undoStack = JSON.parse(paramStr(params, CONT_KEY_UNDO_STACK));

      // 基本形状验证
      if (!Array.isArray(grid) || !Array.isArray(floodedMask) ||
          !Array.isArray(initialGrid) || !Array.isArray(undoStack)) {
        this.pendingRestore = null;
        return;
      }

      this.pendingRestore = {
        gameMode: gameMode,
        currentLevel: currentLevel,
        infiniteLevel: infiniteLevel,
        grid: grid,
        gridSize: gridSize,
        activeColorCount: activeColorCount,
        steps: steps,
        originColor: originColor,
        optimalSteps: optimalSteps,
        stars: stars,
        floodedMask: floodedMask,
        initialGrid: initialGrid,
        undoStack: undoStack,
      };
    } catch (e) {
      this.pendingRestore = null;
    }
  },

  /** GamePage.aboutToAppear 调用：获取待恢复的状态 */
  consumePendingRestore(): ContinuationState | null {
    const s = this.pendingRestore;
    this.pendingRestore = null;
    return s;
  },

  hasPendingRestore(): boolean {
    return this.pendingRestore !== null;
  },
};
