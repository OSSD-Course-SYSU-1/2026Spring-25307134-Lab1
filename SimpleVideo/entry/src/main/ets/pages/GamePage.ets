/**
 * 溢彩画主游戏页面
 * 横屏布局：左棋盘 + 右调色板
 * 管理全部游戏状态和逻辑编排
 */

import { preferences } from '@kit.ArkData';
import { GameEngine, GameSnapshot } from '../models/GameEngine';
import { BoardGenerator } from '../models/BoardGenerator';
import { Solver } from '../models/Solver';
import { getLevel, getLevelCount, LevelConfig } from '../models/LevelData';
import { GameBoard } from '../components/GameBoard';
import { ColorPalette } from '../components/ColorPalette';
import { GameHud } from '../components/GameHud';
import { VictoryDialog } from '../components/VictoryDialog';
import {
  BOARD_CONTAINER_FLEX,
  PALETTE_CONTAINER_FLEX,
  MODE_LEVEL,
  MODE_INFINITE,
  FLOOD_LAYER_DELAY_MS,
  HINT_DISPLAY_MS,
  PREF_NAME,
  KEY_CURRENT_LEVEL,
  KEY_LEVEL_STARS_PREFIX,
  KEY_INFINITE_BEST,
  KEY_SOUND_ENABLED,
  INFINITE_DEFAULT_SIZE,
  INFINITE_DEFAULT_COLORS,
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
import { GameStateBridge, ContinuationState } from '../models/GameStateBridge';

@Entry
@Component
struct GamePage {
  // ── 核心游戏状态 ──
  @State grid: number[][] = [];
  @State floodedMask: boolean[][] = [];
  @State gridSize: number = 6;
  @State activeColorCount: number = 4;
  @State steps: number = 0;
  @State originColor: number = 0;

  // ── 模式与关卡 ──
  @State gameMode: number = MODE_LEVEL;
  @State currentLevel: number = 0;
  @State infiniteLevel: number = 1; // 无尽模式通关计数
  @State optimalSteps: number = 6;
  @State stars: number = 0;

  // ── 响应式布局 ──
  @State currentBreakpoint: number = BP_MD;
  @State paletteDirection: number = PALETTE_DIR_VERTICAL;

  // ── 强制渲染版本（ForEach key 带版本号，确保数据更新必定重绘） ──
  @State gridVersion: number = 0;

  // ── UI 状态 ──
  @State showVictory: boolean = false;
  @State isAnimating: boolean = false;
  @State hintColor: number = -1;
  @State animatingCells: string[] = [];
  @State soundEnabled: boolean = true;
  @State selectedColor: number = -1; // 当前选中的调色盘颜色，-1=未选

  // ── 标签字符串（避免子组件使用已废弃的 getContext） ──
  @State levelLabel: string = '第1关';
  @State stepsLabel: string = '步数: 0';
  @State optimalLabel: string = '最优: 0';
  @State yourStepsLabel: string = '你的步数: 0';

  // ── 撤销/重做栈 ──
  private undoStack: GameSnapshot[] = [];
  private redoStack: GameSnapshot[] = [];

  // ── 初始棋盘（用于重置） ──
  private initialGrid: number[][] = [];
  private initialSteps: number = 0;

  // ── Preferences ──
  private dataPreferences?: preferences.Preferences;

  // ── 提示定时器 ──
  private hintTimer?: number;

  aboutToAppear(): void {
    // 先同步初始化棋盘，确保首次 build() 有完整数据
    this.setupLevel();
    // 异步加载存档（不影响首帧渲染）
    this.loadProgress();
    // ── 跨设备迁移恢复 ──
    const restored = GameStateBridge.consumePendingRestore();
    if (restored) {
      this.restoreState(restored);
    }
  }

  aboutToDisappear(): void {
    this.clearHintTimer();
  }

  onPageShow(): void {
    // 处理热迁移恢复（onNewWant 触发的场景）
    const restored = GameStateBridge.consumePendingRestore();
    if (restored) {
      this.restoreState(restored);
    }
  }

  // ── 初始化 ──

  async loadProgress(): Promise<void> {
    try {
      this.dataPreferences = await preferences.getPreferences(
        getContext(this),
        PREF_NAME
      );
      const levelVal = await this.dataPreferences.get(KEY_CURRENT_LEVEL, 0);
      this.currentLevel = levelVal as number;
      const soundVal = await this.dataPreferences.get(KEY_SOUND_ENABLED, true);
      this.soundEnabled = soundVal as boolean;
    } catch (e) {
      // 首次运行，使用默认值
    }
  }

  async saveProgress(): Promise<void> {
    if (!this.dataPreferences) return;
    try {
      await this.dataPreferences.put(KEY_CURRENT_LEVEL, this.currentLevel);
      await this.dataPreferences.put(
        KEY_LEVEL_STARS_PREFIX + this.currentLevel.toString(),
        this.stars
      );
      await this.dataPreferences.put(KEY_SOUND_ENABLED, this.soundEnabled);
      await this.dataPreferences.flush();
    } catch (e) {
      // 静默失败
    }
  }

  setupLevel(): void {
    if (this.gameMode === MODE_LEVEL) {
      const config: LevelConfig = getLevel(this.currentLevel);
      this.gridSize = config.gridSize;
      this.activeColorCount = config.colorCount;

      // 生成棋盘（跳过 Solver，首帧快速渲染）
      const result = BoardGenerator.generateQuick(
        this.gridSize,
        this.activeColorCount,
        config.id * 31337
      );
      this.grid = result.grid;
      this.gridVersion++;
      // 先用关卡预设值，Solver 异步计算精确值
      this.optimalSteps = config.optimalSteps;
    } else {
      // 无尽模式：每关用不同种子，确保棋盘不重复
      this.gridSize = INFINITE_DEFAULT_SIZE;
      this.activeColorCount = INFINITE_DEFAULT_COLORS;
      const seed = (Math.floor(Date.now() / 1000) + this.infiniteLevel * 31337) % 100000;
      const result = BoardGenerator.generateQuick(
        this.gridSize,
        this.activeColorCount,
        seed
      );
      this.grid = result.grid;
      this.gridVersion++;
      this.optimalSteps = Math.ceil(this.gridSize * 1.5);
    }

    // 保存初始状态用于重置
    this.initialGrid = GameEngine.cloneGrid(this.grid);
    this.initialSteps = 0;

    // 重置游戏状态
    this.floodedMask = GameEngine.computeFloodedMask(this.grid, this.gridSize);
    this.steps = 0;
    this.originColor = this.grid[0][0];
    this.stars = 0;
    this.showVictory = false;
    this.isAnimating = false;
    this.hintColor = -1;
    this.selectedColor = -1;
    this.animatingCells = [];
    this.undoStack = [];
    this.redoStack = [];
    this.refreshLabels();

    // 异步精确求解最优步数（不阻塞首帧）
    setTimeout(() => {
      try {
        const exact = Solver.solveOptimal(
          this.grid,
          this.gridSize,
          this.activeColorCount
        );
        this.optimalSteps = exact;
        this.refreshLabels();
      } catch (e) {
        // 保留估算值
      }
    }, 200);
  }

  /**
   * 刷新所有 HUD 和弹窗的文本标签
   */
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

  // ── 布局 ──

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
        // ═══ MD / LG 横屏布局：左右并排 ═══
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

  // ── 交互处理 ──

  /**
   * 调色板选色：只记录选中颜色，不执行染色
   * 玩家之后点击棋盘格子时才执行染色
   */
  handleColorSelect(colorIndex: number): void {
    if (this.isAnimating) return;
    // 点击已选中的颜色 → 取消选择
    if (this.selectedColor === colorIndex) {
      this.selectedColor = -1;
      return;
    }
    this.selectedColor = colorIndex;
    this.playClickSound();
  }

  /**
   * 点击棋盘格子：从该格出发 flood 为已选中的颜色
   */
  handleCellClick(row: number, col: number): void {
    if (this.isAnimating) return;
    if (this.selectedColor < 0) return;
    const clickedColor = this.grid[row][col];
    if (clickedColor === this.selectedColor) return;

    this.playClickSound();

    // 保存 Undo 快照
    this.undoStack.push({
      grid: GameEngine.cloneGrid(this.grid),
      steps: this.steps,
      originColor: this.originColor,
    });
    this.redoStack = [];

    // 从点击格执行染色
    const newGrid = GameEngine.applyMoveAt(
      this.grid,
      this.gridSize,
      row,
      col,
      this.selectedColor
    );

    // 立即应用新状态（颜色先变）
    this.grid = newGrid;
    this.gridVersion++;
    this.floodedMask = GameEngine.computeFloodedMask(this.grid, this.gridSize);
    this.steps++;
    this.originColor = this.grid[0][0];
    this.hintColor = -1;
    this.refreshLabels();

    // ── 涟漪动画：从点击格 BFS 分层向外扩散 ──
    this.isAnimating = true;

    // 变化区域在 newGrid 上的 BFS 分层（从点击格出发）
    const floodedAfter = GameEngine.computeFloodedMaskAt(newGrid, this.gridSize, row, col);
    const allLayers = GameEngine.computeFloodLayersAt(newGrid, this.gridSize, row, col, floodedAfter);

    // 转为 string[] 分层
    const rippleLayers: string[][] = [];
    for (let li = 0; li < allLayers.length; li++) {
      const layerKeys: string[] = [];
      for (const cell of allLayers[li]) {
        layerKeys.push(`${cell.row},${cell.col}`);
      }
      if (layerKeys.length > 0) {
        rippleLayers.push(layerKeys);
      }
    }

    // 回调链逐层激活缩放动画（每层延迟 FLOOD_LAYER_DELAY_MS）
    let layerIdx = 0;
    const showNextLayer = () => {
      if (layerIdx < rippleLayers.length) {
        this.animatingCells = rippleLayers[layerIdx];
        layerIdx++;
        setTimeout(showNextLayer, FLOOD_LAYER_DELAY_MS);
      } else {
        // 涟漪完成
        this.animatingCells = [];
        this.isAnimating = false;
        if (GameEngine.isComplete(this.grid)) {
          this.handleVictory();
        }
      }
    };
    showNextLayer();
  }

  // ── 控制操作 ──

  handleUndo(): void {
    if (this.undoStack.length === 0) return;

    // 当前状态压入 redo
    this.redoStack.push({
      grid: GameEngine.cloneGrid(this.grid),
      steps: this.steps,
      originColor: this.originColor,
    });

    const snap = this.undoStack.pop()!;
    this.grid = snap.grid;
    this.gridVersion++;
    this.steps = snap.steps;
    this.originColor = snap.originColor;
    this.floodedMask = GameEngine.computeFloodedMask(this.grid, this.gridSize);
    this.stars = 0;
    this.showVictory = false;
    this.hintColor = -1;
    this.selectedColor = -1;
    this.refreshLabels();
  }

  handleReset(): void {
    this.grid = GameEngine.cloneGrid(this.initialGrid);
    this.gridVersion++;
    this.steps = 0;
    this.originColor = this.grid[0][0];
    this.floodedMask = GameEngine.computeFloodedMask(this.grid, this.gridSize);
    this.stars = 0;
    this.showVictory = false;
    this.isAnimating = false;
    this.hintColor = -1;
    this.selectedColor = -1;
    this.animatingCells = [];
    this.undoStack = [];
    this.redoStack = [];
    this.refreshLabels();
  }

  handleHint(): void {
    if (this.isAnimating) return;
    this.hintColor = GameEngine.greedyHint(
      this.grid,
      this.gridSize,
      this.activeColorCount,
      this.floodedMask
    );

    // 自动清除提示
    this.clearHintTimer();
    this.hintTimer = setTimeout(() => {
      this.hintColor = -1;
    }, HINT_DISPLAY_MS);
  }

  handleToggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
  }

  handleNewGame(): void {
    // 统一回到最低难度第1关
    this.gameMode = MODE_LEVEL;
    this.currentLevel = 0;
    this.infiniteLevel = 1;
    this.showVictory = false;
    this.setupLevel();
  }

  handleBackToMenu(): void {
    // 回到第1关
    this.gameMode = MODE_LEVEL;
    this.currentLevel = 0;
    this.infiniteLevel = 1;
    this.showVictory = false;
    this.handleReset();
  }

  handleNextLevel(): void {
    if (this.gameMode === MODE_INFINITE) {
      // 无尽模式：计数+1，生成新棋盘
      this.infiniteLevel++;
      this.showVictory = false;
      this.setupLevel();
    } else if (this.currentLevel < getLevelCount() - 1) {
      this.currentLevel++;
      this.showVictory = false;
      this.setupLevel();
      this.saveProgress();
    } else {
      // 全部通关，回到第1关循环
      this.currentLevel = 0;
      this.showVictory = false;
      this.setupLevel();
      this.saveProgress();
    }
  }

  switchMode(mode: number): void {
    this.gameMode = mode;
    this.infiniteLevel = 1;
    this.setupLevel();
  }

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

  // ── 通关处理 ──

  handleVictory(): void {
    this.stars = GameEngine.computeStars(this.steps, this.optimalSteps);
    this.showVictory = true;
    this.saveProgress();

    // 无尽模式：更新最佳记录
    if (this.gameMode === MODE_INFINITE) {
      this.checkAndSaveInfiniteBest();
    }
  }

  async checkAndSaveInfiniteBest(): Promise<void> {
    if (!this.dataPreferences) return;
    try {
      const prevBest = (await this.dataPreferences.get(
        KEY_INFINITE_BEST,
        -1
      )) as number;
      if (prevBest < 0 || this.steps < prevBest) {
        await this.dataPreferences.put(KEY_INFINITE_BEST, this.steps);
        await this.dataPreferences.flush();
      }
    } catch (e) {
      // 静默失败
    }
  }

  // ── 声音占位 ──

  private playClickSound(): void {
    if (!this.soundEnabled) return;
    // TODO: 集成 @ohos.multimedia.sound SoundPool
    // SoundManager.playClick();
  }

  private clearHintTimer(): void {
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = undefined;
    }
  }
}
