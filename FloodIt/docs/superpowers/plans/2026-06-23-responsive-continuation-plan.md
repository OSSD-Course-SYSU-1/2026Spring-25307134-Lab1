# 大小屏适配 + 自由流转 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为溢彩画 HarmonyOS 游戏添加断点驱动的响应式布局（手机/平板/折叠屏）和跨设备迁移接续（Continuation）能力。

**Architecture:** 新增 `GameStateBridge`（模块级状态桥）和响应式布局常量；修改 `GamePage` 支持 SM/MD/LG 三种断点布局、`ColorPalette` 支持横竖排列、`EntryAbility` 移除硬编码横屏并添加 onContinue/onNewWant 迁移回调；`module.json5` 扩展设备类型并开启 continuable。

**Tech Stack:** HarmonyOS 5.0.5+, ArkTS, @kit.AbilityKit (UIAbility/continuation), @kit.ArkUI (onAreaChange/breakpoint)

---

### Task 1: Constants.ts — 新增响应式布局和迁移常量

**Files:**
- Modify: `entry/src/main/ets/common/Constants.ts`

- [ ] **Step 1: 在文件末尾追加断点和布局常量**

```typescript
// ── 响应式断点 ──
export const BP_SM: number = 0;
export const BP_MD: number = 1;
export const BP_LG: number = 2;
export const BP_SM_MAX: number = 600;  // < 600vp → SM
export const BP_MD_MAX: number = 840;  // < 840vp → MD, ≥ 840vp → LG

// ── 断点参数 ──
export function hudHeightForBp(bp: number): number {
  if (bp === BP_SM) return 60;
  if (bp === BP_MD) return 80;
  return 96;
}

export function boardFlexForBp(bp: number): number {
  if (bp === BP_LG) return 6.5;
  return 6;
}

export function paletteFlexForBp(bp: number): number {
  if (bp === BP_LG) return 3.5;
  return 4;
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
export const CONT_DATA_MARKER: string = 'fc_gamemode'; // 用于检测迁移数据是否存在
```

- [ ] **Step 2: 验证编译**

Run DevEco Studio build or check no syntax errors.

- [ ] **Step 3: Commit**

```bash
git add entry/src/main/ets/common/Constants.ts
git commit -m "feat: add responsive breakpoint and continuation constants"
```

---

### Task 2: GameStateBridge.ts — 创建跨模块状态桥

**Files:**
- Create: `entry/src/main/ets/models/GameStateBridge.ts`

- [ ] **Step 1: 创建 GameStateBridge 模块**

```typescript
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
    const undoSnapshots = s.undoStack.slice(-50); // 最多保留50步
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
```

- [ ] **Step 2: 验证文件语法**

确保 `GameSnapshot` 导入路径正确，所有 `CONT_KEY_*` 常量在 `Constants.ts` 中已定义。

- [ ] **Step 3: Commit**

```bash
git add entry/src/main/ets/models/GameStateBridge.ts
git commit -m "feat: add GameStateBridge for cross-device continuation"
```

---

### Task 3: EntryAbility.ets — 移除硬编码横屏 + 迁移回调

**Files:**
- Modify: `entry/src/main/ets/entryability/EntryAbility.ets`

- [ ] **Step 1: 修改 EntryAbility.ets**

将以下完整内容替换现有文件：

```typescript
/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * ...
 */

import { UIAbility, Want, AbilityConstant } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { GameStateBridge } from '../models/GameStateBridge';

export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onCreate');
    // 检查是否从跨设备迁移冷启动
    const params = want.parameters as Record<string, Object>;
    if (params) {
      GameStateBridge.loadFromParams(params);
    }
  }

  onDestroy(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageCreate');

    // 不再强制横屏 — 由系统根据设备传感器自动决定方向
    windowStage.loadContent('pages/GamePage', (err, data) => {
      if (err.code) {
        hilog.error(0x0000, 'testTag', 'Failed to load content: %{public}s', JSON.stringify(err) ?? '');
        return;
      }
      hilog.info(0x0000, 'testTag', 'Succeeded in loading content: %{public}s', JSON.stringify(data) ?? '');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onWindowStageDestroy');
  }

  onForeground(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onForeground');
  }

  onBackground(): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onBackground');
  }

  // ── 跨设备迁移 ──

  onContinue(wantParam: Record<string, Object>): AbilityConstant.OnContinueResult {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onContinue');
    GameStateBridge.writeToWantParam(wantParam);
    return AbilityConstant.OnContinueResult.AGREE;
  }

  onNewWant(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(0x0000, 'testTag', '%{public}s', 'Ability onNewWant');
    const params = want.parameters as Record<string, Object>;
    if (params) {
      GameStateBridge.loadFromParams(params);
    }
    // 通知 GamePage 恢复状态（通过 GameStateBridge.pendingRestore）
    // GamePage 在 pageShow 或下次 build 时检测
  }
}
```

- [ ] **Step 2: 验证 — 检查导入无误**

确认 `GameStateBridge` 导入路径 `../models/GameStateBridge` 正确，`Want` 类型从 `@kit.AbilityKit` 正确导入。

- [ ] **Step 3: Commit**

```bash
git add entry/src/main/ets/entryability/EntryAbility.ets
git commit -m "feat: remove forced landscape, add continuation callbacks"
```

---

### Task 4: ColorPalette.ets — 支持横排方向

**Files:**
- Modify: `entry/src/main/ets/components/ColorPalette.ets`

- [ ] **Step 1: 添加 `direction` prop 和横排布局**

将以下完整内容替换现有文件：

```typescript
/**
 * 调色板组件 - 右侧颜色按钮面板
 * direction: VERTICAL → 竖排 3 列 (MD/LG), HORIZONTAL → 横排单行 (SM)
 */

import { GAME_COLORS, PALETTE_DIR_VERTICAL, PALETTE_DIR_HORIZONTAL } from '../common/Constants';

@Component
export struct ColorPalette {
  @Prop colorCount: number = 5;
  @Prop originColor: number = 0;
  @Prop selectedColor: number = -1;
  @Prop disabled: boolean = false;
  @Prop direction: number = PALETTE_DIR_VERTICAL;
  onColorSelect?: (colorIndex: number) => void;

  build() {
    Column() {
      // 标题
      Text($r('app.string.game_title'))
        .fontSize(22)
        .fontColor($r('app.color.text_primary'))
        .fontWeight(FontWeight.Bold)
        .margin({ top: 12 })

      // 提示文字
      Text(this.selectedColor >= 0 ? '← 点棋盘格子染色' : '选择一种颜色')
        .fontSize(12)
        .fontColor($r('app.color.text_secondary'))
        .margin({ top: 4, bottom: 12 })

      // 颜色按钮
      if (this.direction === PALETTE_DIR_HORIZONTAL) {
        // ── SM 横排单行 ──
        Row({ space: 12 }) {
          ForEach(this.getColorIndices(), (colorIndex: number) => {
            this.ColorButton(colorIndex)
          }, (item: number): string => `palette-h-${item}`)
        }
        .width('100%')
        .justifyContent(FlexAlign.Center)
        .padding({ left: 8, right: 8 })
      } else {
        // ── MD/LG 竖排 3 列 Grid ──
        Grid() {
          ForEach(this.getColorIndices(), (colorIndex: number) => {
            GridItem() {
              this.ColorButton(colorIndex)
            }
          }, (item: number): string => `palette-v-${item}`)
        }
        .columnsTemplate('1fr 1fr 1fr')
        .rowsGap(14)
        .columnsGap(10)
        .width('100%')
        .padding({ left: 8, right: 8 })
      }

      Blank()
        .height(8)
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
  }

  @Builder
  ColorButton(colorIndex: number) {
    Button() {}
      .width(52)
      .height(52)
      .borderRadius(26)
      .backgroundColor(GAME_COLORS[colorIndex])
      .enabled(!this.disabled)
      .opacity(this.disabled ? 0.35 : 1.0)
      .border({
        width: this.selectedColor === colorIndex ? 4 : 0,
        color: '#FFD700',
        style: BorderStyle.Solid,
      })
      .shadow({
        radius: this.selectedColor === colorIndex ? 14 : 6,
        color: this.selectedColor === colorIndex
          ? GAME_COLORS[colorIndex] + 'CC'
          : '#00000050',
        offsetY: 2,
      })
      .onClick(() => {
        if (this.onColorSelect && !this.disabled) {
          this.onColorSelect(colorIndex);
        }
      })
      .animation({
        duration: 120,
        curve: Curve.EaseOut,
      })
  }

  private getColorIndices(): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.colorCount; i++) {
      indices.push(i);
    }
    return indices;
  }
}
```

- [ ] **Step 2: 验证 — 确认 PALETTE_DIR_VERTICAL/HORIZONTAL 从 Constants 正确导出**

检查 `Constants.ts` 中 `PALETTE_DIR_VERTICAL` 和 `PALETTE_DIR_HORIZONTAL` 的值（分别为 0 和 1）。

- [ ] **Step 3: Commit**

```bash
git add entry/src/main/ets/components/ColorPalette.ets
git commit -m "feat: add horizontal palette direction for SM layout"
```

---

### Task 5: GamePage.ets — 响应式布局 + 状态桥 + 迁移恢复

**Files:**
- Modify: `entry/src/main/ets/pages/GamePage.ets`

这是本计划最核心的改动。分 5 个子步完成。

- [ ] **Step 1: 更新 import 声明**

在现有 import 块末尾追加：

```typescript
import { GameStateBridge, ContinuationState } from '../models/GameStateBridge';
```

并在 Constants 导入中追加新增的常量：

```typescript
import {
  // ... 现有导入保持不变 ...
  // 新增以下：
  BP_SM,
  BP_MD,
  BP_LG,
  BP_SM_MAX,
  BP_MD_MAX,
  hudHeightForBp,
  boardFlexForBp,
  paletteFlexForBp,
  PALETTE_DIR_VERTICAL,
  PALETTE_DIR_HORIZONTAL,
} from '../common/Constants';
```

具体做法：找到 `import {` 到 `} from '../common/Constants'` 这段，在 `}` 前追加以上 10 个新导入项。

- [ ] **Step 2: 添加 `@State currentBreakpoint` 和 `@State paletteDirection`**

在 GamePage struct 的状态区域（约第 46 行 `@State stars: number = 0;` 之后）追加：

```typescript
  // ── 响应式布局 ──
  @State currentBreakpoint: number = BP_MD;
  @State paletteDirection: number = PALETTE_DIR_VERTICAL;
```

- [ ] **Step 3: 在 `aboutToAppear()` 末尾追加迁移恢复逻辑**

```typescript
  aboutToAppear(): void {
    this.setupLevel();
    this.loadProgress();

    // ── 跨设备迁移恢复 ──
    const restored = GameStateBridge.consumePendingRestore();
    if (restored) {
      this.restoreState(restored);
    }
  }
```

- [ ] **Step 4: 添加 `onPageShow()` 生命周期回调**

（在 `aboutToDisappear()` 之后追加）

```typescript
  onPageShow(): void {
    // 处理热迁移恢复（onNewWant 触发的场景）
    const restored = GameStateBridge.consumePendingRestore();
    if (restored) {
      this.restoreState(restored);
    }
  }
```

- [ ] **Step 5: 修改 `build()` 方法 — 断点驱动的响应式布局**

将当前 `build()` 中的 `Stack() { Row() { ... } ... }` 主体替换为：

```typescript
  build() {
    Stack() {
      if (this.currentBreakpoint === BP_SM) {
        // ═══ SM 竖屏布局：上下堆叠 ═══
        Column() {
          GameHud({
            steps: this.steps,
            optimalSteps: this.optimalSteps,
            stars: this.stars,
            gameMode: this.gameMode,
            levelLabel: this.levelLabel,
            stepsLabel: this.stepsLabel,
            optimalLabel: this.optimalLabel,
            canUndo: this.undoStack.length > 0,
            soundEnabled: this.soundEnabled,
            onUndo: () => this.handleUndo(),
            onReset: () => this.handleReset(),
            onHint: () => this.handleHint(),
            onToggleSound: () => this.handleToggleSound(),
          })
            .width('100%')
            .height(hudHeightForBp(this.currentBreakpoint))

          GameBoard({
            grid: this.grid,
            boardSize: this.gridSize,
            gridVersion: this.gridVersion,
            floodedMask: this.floodedMask,
            animatingCells: this.animatingCells,
            hintHighlightColor: this.hintColor,
            selectedColor: this.selectedColor,
            disabled: this.isAnimating,
            onCellClick: (row: number, col: number) =>
              this.handleCellClick(row, col),
          })
            .width('100%')
            .layoutWeight(1)

          Divider()
            .strokeWidth(1)
            .color($r('app.color.text_secondary'))
            .width('100%')

          ColorPalette({
            colorCount: this.activeColorCount,
            originColor: this.originColor,
            selectedColor: this.selectedColor,
            disabled: this.isAnimating,
            direction: PALETTE_DIR_HORIZONTAL,
            onColorSelect: (colorIndex: number) =>
              this.handleColorSelect(colorIndex),
          })
            .width('100%')
            .height(100)

          // 模式切换按钮
          Row({ space: 8 }) {
            Button($r('app.string.level_mode'))
              .fontSize(11)
              .type(this.gameMode === MODE_LEVEL ? ButtonType.Capsule : ButtonType.Normal)
              .backgroundColor(this.gameMode === MODE_LEVEL ? $r('app.color.accent') : $r('app.color.bg_card'))
              .fontColor(Color.White)
              .onClick(() => this.switchMode(MODE_LEVEL))

            Button($r('app.string.infinite_mode'))
              .fontSize(11)
              .type(this.gameMode === MODE_INFINITE ? ButtonType.Capsule : ButtonType.Normal)
              .backgroundColor(this.gameMode === MODE_INFINITE ? $r('app.color.accent') : $r('app.color.bg_card'))
              .fontColor(Color.White)
              .onClick(() => this.switchMode(MODE_INFINITE))

            Button($r('app.string.btn_new_game'))
              .fontSize(11)
              .backgroundColor($r('app.color.bg_card'))
              .fontColor($r('app.color.text_primary'))
              .onClick(() => this.handleNewGame())
          }
          .width('100%')
          .padding({ bottom: 8, left: 8, right: 8 })
          .justifyContent(FlexAlign.Center)
        }
        .width('100%')
        .height('100%')
        .backgroundColor($r('app.color.bg_primary'))
      } else {
        // ═══ MD / LG 横屏布局：左右并排（现有布局） ═══
        Row() {
          Column() {
            GameHud({
              steps: this.steps,
              optimalSteps: this.optimalSteps,
              stars: this.stars,
              gameMode: this.gameMode,
              levelLabel: this.levelLabel,
              stepsLabel: this.stepsLabel,
              optimalLabel: this.optimalLabel,
              canUndo: this.undoStack.length > 0,
              soundEnabled: this.soundEnabled,
              onUndo: () => this.handleUndo(),
              onReset: () => this.handleReset(),
              onHint: () => this.handleHint(),
              onToggleSound: () => this.handleToggleSound(),
            })
              .width('100%')
              .height(hudHeightForBp(this.currentBreakpoint))

            GameBoard({
              grid: this.grid,
              boardSize: this.gridSize,
              gridVersion: this.gridVersion,
              floodedMask: this.floodedMask,
              animatingCells: this.animatingCells,
              hintHighlightColor: this.hintColor,
              selectedColor: this.selectedColor,
              disabled: this.isAnimating,
              onCellClick: (row: number, col: number) =>
                this.handleCellClick(row, col),
            })
              .width('100%')
              .layoutWeight(1)
          }
          .width(`${boardFlexForBp(this.currentBreakpoint) * 10}%`)
          .height('100%')
          .backgroundColor($r('app.color.bg_primary'))
          .padding(8)

          Divider()
            .vertical(true)
            .strokeWidth(1)
            .color($r('app.color.text_secondary'))
            .height('100%')

          Column() {
            ColorPalette({
              colorCount: this.activeColorCount,
              originColor: this.originColor,
              selectedColor: this.selectedColor,
              disabled: this.isAnimating,
              direction: PALETTE_DIR_VERTICAL,
              onColorSelect: (colorIndex: number) =>
                this.handleColorSelect(colorIndex),
            })
              .width('100%')
              .layoutWeight(1)

            Column({ space: 8 }) {
              Row({ space: 8 }) {
                Button($r('app.string.level_mode'))
                  .fontSize(12)
                  .type(this.gameMode === MODE_LEVEL ? ButtonType.Capsule : ButtonType.Normal)
                  .backgroundColor(this.gameMode === MODE_LEVEL ? $r('app.color.accent') : $r('app.color.bg_card'))
                  .fontColor(Color.White)
                  .onClick(() => this.switchMode(MODE_LEVEL))

                Button($r('app.string.infinite_mode'))
                  .fontSize(12)
                  .type(this.gameMode === MODE_INFINITE ? ButtonType.Capsule : ButtonType.Normal)
                  .backgroundColor(this.gameMode === MODE_INFINITE ? $r('app.color.accent') : $r('app.color.bg_card'))
                  .fontColor(Color.White)
                  .onClick(() => this.switchMode(MODE_INFINITE))
              }

              Button($r('app.string.btn_new_game'))
                .fontSize(12)
                .backgroundColor($r('app.color.bg_card'))
                .fontColor($r('app.color.text_primary'))
                .onClick(() => this.handleNewGame())
            }
            .width('100%')
            .padding({ bottom: 16, left: 16, right: 16 })
          }
          .width(`${paletteFlexForBp(this.currentBreakpoint) * 10}%`)
          .height('100%')
          .backgroundColor($r('app.color.bg_primary'))
        }
        .width('100%')
        .height('100%')
      }

      // ═══ 胜利弹窗覆盖层（两种布局共用） ═══
      VictoryDialog({
        show: this.showVictory,
        stars: this.stars,
        steps: this.steps,
        optimalSteps: this.optimalSteps,
        gameMode: this.gameMode,
        isLastLevel: this.currentLevel >= getLevelCount() - 1,
        yourStepsLabel: this.yourStepsLabel,
        optimalLabel: this.optimalLabel,
        onNextLevel: () => this.handleNextLevel(),
        onReplay: () => this.handleReset(),
        onBackToMenu: () => this.handleBackToMenu(),
      })
    }
    .width('100%')
    .height('100%')
    .backgroundColor($r('app.color.bg_primary'))
    .onAreaChange((oldArea: Area, newArea: Area) => {
      const w: number = newArea.width as number;
      const bp: number = this.computeBreakpoint(w);
      if (bp !== this.currentBreakpoint) {
        this.currentBreakpoint = bp;
        this.paletteDirection = bp === BP_SM
          ? PALETTE_DIR_HORIZONTAL
          : PALETTE_DIR_VERTICAL;
      }
    })
  }
```

- [ ] **Step 6: 添加 `computeBreakpoint()` 和 `restoreState()` 方法**

在 `switchMode()` 方法之后追加：

```typescript
  // ── 响应式断点计算 ──

  private computeBreakpoint(width: number): number {
    if (width < BP_SM_MAX) return BP_SM;
    if (width < BP_MD_MAX) return BP_MD;
    return BP_LG;
  }

  // ── 跨设备迁移恢复 ──

  restoreState(saved: ContinuationState): void {
    this.gameMode = saved.gameMode;
    this.currentLevel = saved.currentLevel;
    this.infiniteLevel = saved.infiniteLevel;
    this.grid = saved.grid;
    this.gridSize = saved.gridSize;
    this.activeColorCount = saved.activeColorCount;
    this.steps = saved.steps;
    this.originColor = saved.originColor;
    this.optimalSteps = saved.optimalSteps;
    this.stars = saved.stars;
    this.floodedMask = saved.floodedMask;
    this.initialGrid = saved.initialGrid;
    this.undoStack = saved.undoStack;
    this.redoStack = [];
    this.gridVersion++;
    this.showVictory = false;
    this.isAnimating = false;
    this.hintColor = -1;
    this.selectedColor = -1;
    this.animatingCells = [];
    this.refreshLabels();
  }
```

- [ ] **Step 7: 添加 `syncBridge()` 方法 — 在状态变化后调用**

在 `refreshLabels()` 方法末尾追加对 `syncBridge()` 的调用。修改 `refreshLabels()`：

```typescript
  refreshLabels(): void {
    if (this.gameMode === MODE_LEVEL) {
      this.levelLabel = '第' + (this.currentLevel + 1).toString() + '关';
    } else {
      this.levelLabel = '无尽模式 第' + this.infiniteLevel.toString() + '关';
    }
    this.stepsLabel = '步数: ' + this.steps.toString();
    this.optimalLabel = '最优: ' + this.optimalSteps.toString();
    this.yourStepsLabel = '你的步数: ' + this.steps.toString();
    this.syncBridge();
  }
```

然后在 `restoreState()` 方法之后追加 `syncBridge()`：

```typescript
  /**
   * 同步当前状态到 GameStateBridge，供 EntryAbility.onContinue 使用
   */
  private syncBridge(): void {
    GameStateBridge.save({
      gameMode: this.gameMode,
      currentLevel: this.currentLevel,
      infiniteLevel: this.infiniteLevel,
      grid: GameEngine.cloneGrid(this.grid),
      gridSize: this.gridSize,
      activeColorCount: this.activeColorCount,
      steps: this.steps,
      originColor: this.originColor,
      optimalSteps: this.optimalSteps,
      stars: this.stars,
      floodedMask: this.floodedMask,
      initialGrid: GameEngine.cloneGrid(this.initialGrid),
      undoStack: this.undoStack,
    });
  }
```

- [ ] **Step 8: 移除旧的 `BOARD_CONTAINER_FLEX` / `PALETTE_CONTAINER_FLEX` 引用**

确认 `build()` 中不再直接使用 `BOARD_CONTAINER_FLEX` 和 `PALETTE_CONTAINER_FLEX` 硬编码常量，已全部替换为 `boardFlexForBp(currentBreakpoint)` 和 `paletteFlexForBp(currentBreakpoint)` 动态调用。这两个常量保留在 Constants.ts 中供其他地方使用。

- [ ] **Step 9: 验证完整文件**

确保：
- 所有 `ForEach` key 仍带 `gridVersion` 前缀
- SM 和 MD/LG 分支中 GameHud 的 `height` 使用 `hudHeightForBp(this.currentBreakpoint)` 而不是硬编码 `80`
- ColorPalette 的 `direction` 在 SM 分支为 `PALETTE_DIR_HORIZONTAL`，MD/LG 分支为 `PALETTE_DIR_VERTICAL`
- VictoryDialog 在两个分支中相同（不重复定义）
- `onAreaChange` 绑定在根 `Stack` 上

- [ ] **Step 10: Commit**

```bash
git add entry/src/main/ets/pages/GamePage.ets
git commit -m "feat: responsive layout with breakpoints, state bridge sync, continuation restore"
```

---

### Task 6: module.json5 — 扩展设备类型并开启迁移

**Files:**
- Modify: `entry/src/main/module.json5`

- [ ] **Step 1: 修改 module.json5**

将 `deviceTypes` 从 `["phone"]` 改为 `["phone", "tablet", "2in1"]`，并在 `module` 层级和 `abilities[0]` 层级各添加 `"continuable": true`。

修改后的完整内容：

```json5
{
  "module": {
    "name": "entry",
    "type": "entry",
    "description": "$string:module_desc",
    "mainElement": "EntryAbility",
    "deviceTypes": [
      "phone",
      "tablet",
      "2in1"
    ],
    "deliveryWithInstall": true,
    "installationFree": false,
    "continuable": true,
    "pages": "$profile:main_pages",
    "abilities": [
      {
        "name": "EntryAbility",
        "srcEntry": "./ets/entryability/EntryAbility.ets",
        "description": "$string:EntryAbility_desc",
        "icon": "$media:icon",
        "label": "$string:EntryAbility_label",
        "startWindowIcon": "$media:icon",
        "startWindowBackground": "$color:start_window_background",
        "exported": true,
        "continuable": true,
        "skills": [
          {
            "entities": [
              "entity.system.home"
            ],
            "actions": [
              "action.system.home"
            ]
          }
        ]
      }
    ],
    "requestPermissions": []
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add entry/src/main/module.json5
git commit -m "feat: add tablet/2in1 device support and enable continuation"
```

---

### Task 7: 验证与收尾

**Files:**
- 全部已修改文件

- [ ] **Step 1: 全局编译检查**

在 DevEco Studio 中执行 Build → Build HAP(s)，确认无编译错误。

- [ ] **Step 2: 快速检查关键点**

在 DevEco Studio 预览器中：
1. 切换到手机竖屏（360×780）→ 应显示 SM 上下堆叠布局
2. 切换到手机横屏（780×360）→ 应显示 MD 左右并排布局
3. 切换到平板横屏（1024×768）→ 应显示 LG 左右并排布局
4. 确认调色板在 SM 模式为底部横排单行，MD/LG 为右侧竖排 3 列

- [ ] **Step 3: 手动验证清单**

| 场景 | 预期 |
|------|------|
| 手机竖屏启动 | SM 布局，上下堆叠，调色板底部横排 |
| 旋转至横屏 | 无缝切换 MD 布局，左右并排，游戏继续 |
| 折叠屏展开 | MD→LG，比例调整，游戏不中断 |
| 调色板按钮点击 | 选中后高亮，SM 模式横向排列正常 |
| 胜利弹窗 | 两种布局下均居中弹出，按钮可用 |
| 无尽模式标签 | HUD 显示"无尽模式 第N关" |

- [ ] **Step 4: Commit any remaining changes**

```bash
git status
git add -A
git commit -m "chore: final adjustments for responsive layout and continuation"
```
