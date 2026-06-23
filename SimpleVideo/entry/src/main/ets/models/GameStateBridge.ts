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
    const undoSnapshots = s.undoStack.slice(-50);
    wantParam[CONT_KEY_UNDO_STACK] = JSON.stringify(undoSnapshots);
  },

  /** EntryAbility 启动时调用：从 want.parameters 解析迁移数据 */
  loadFromParams(params: Record<string, Object>): void {
    if (!params || params[CONT_DATA_MARKER] === undefined) return;
    try {
      this.pendingRestore = {
        gameMode: parseInt(params[CONT_KEY_GAME_MODE] as string),
        currentLevel: parseInt(params[CONT_KEY_CURRENT_LEVEL] as string),
        infiniteLevel: parseInt(params[CONT_KEY_INFINITE_LEVEL] as string),
        grid: JSON.parse(params[CONT_KEY_GRID] as string),
        gridSize: parseInt(params[CONT_KEY_GRID_SIZE] as string),
        activeColorCount: parseInt(params[CONT_KEY_COLOR_COUNT] as string),
        steps: parseInt(params[CONT_KEY_STEPS] as string),
        originColor: parseInt(params[CONT_KEY_ORIGIN_COLOR] as string),
        optimalSteps: parseInt(params[CONT_KEY_OPTIMAL_STEPS] as string),
        stars: parseInt(params[CONT_KEY_STARS] as string),
        floodedMask: JSON.parse(params[CONT_KEY_FLOODED_MASK] as string),
        initialGrid: JSON.parse(params[CONT_KEY_INITIAL_GRID] as string),
        undoStack: JSON.parse(params[CONT_KEY_UNDO_STACK] as string),
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
