/**
 * 游戏棋盘组件 - 左侧 N×N 彩色网格
 * 每个格子是独立的 @Component，@Prop 原语触发可靠重绘
 * 点击格子 → 将该格同色连通区染为已选颜色
 */

import {
  GAME_COLORS,
} from '../common/Constants';

/** 单个格子组件 —— @Prop 原语确保颜色变化必定重绘 */
@Component
struct CellView {
  @Prop color: number = 0;
  @Prop cellSize: number = 40;
  @Prop cellRadius: number = 4;
  @Prop cellGap: number = 2;
  @Prop isOrigin: boolean = false;
  @Prop isFlooded: boolean = false;
  @Prop isAnimating: boolean = false;
  @Prop isHinted: boolean = false;
  @Prop isSelected: boolean = false;
  @Prop disabled: boolean = false;
  onCellClick?: () => void;

  build() {
    Column() {
      if (this.isOrigin) {
        Text('★')
          .fontSize(Math.max(8, this.cellSize / 4))
          .fontColor('#FFFFFF')
      }
    }
    .width(this.cellSize)
    .height(this.cellSize)
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .backgroundColor(GAME_COLORS[this.color])
    .borderRadius(this.cellRadius)
    .margin(this.cellGap)
    .opacity(this.isFlooded ? 1.0 : 0.7)
    .scale({
      x: this.isAnimating ? 0.85 : 1.0,
      y: this.isAnimating ? 0.85 : 1.0,
    })
    .border(this.calcBorder())
    .animation({
      duration: 200,
      curve: Curve.EaseInOut,
    })
    .onClick(() => {
      if (!this.disabled && this.onCellClick) {
        this.onCellClick();
      }
    })
  }

  private calcBorder(): BorderOptions {
    if (this.isHinted) {
      const opt: BorderOptions = { width: 1.5, color: '#FFFFFFCC' };
      return opt;
    }
    if (this.isSelected) {
      const opt: BorderOptions = { width: 1.5, color: '#FFD700CC' };
      return opt;
    }
    const opt: BorderOptions = { width: 0 };
    return opt;
  }
}

// ── 主板组件 ──

@Component
export struct GameBoard {
  @Prop grid: number[][] = [];
  @Prop boardSize: number = 6;
  @Prop gridVersion: number = 0;
  @Prop floodedMask: boolean[][] = [];
  @Prop animatingCells: string[] = [];
  @Prop hintHighlightColor: number = -1;
  @Prop selectedColor: number = -1;
  @Prop disabled: boolean = false;
  onCellClick?: (row: number, col: number) => void;
  @State containerDim: number = 200;

  build() {
    Column() {
      Column() {
        Column() {
          ForEach(this.grid, (row: number[], rowIndex: number) => {
            Row() {
              ForEach(row, (cellColor: number, colIndex: number) => {
                CellView({
                  color: cellColor,
                  cellSize: this.computedCellSize(),
                  cellRadius: this.computedCellRadius(),
                  cellGap: this.computedCellGap(),
                  isOrigin: rowIndex === 0 && colIndex === 0,
                  isFlooded: this.checkFlooded(rowIndex, colIndex),
                  isAnimating: this.checkAnimating(rowIndex, colIndex),
                  isHinted: this.checkHinted(cellColor, rowIndex, colIndex),
                  isSelected: this.checkSelected(cellColor),
                  disabled: this.disabled,
                  onCellClick: () => {
                    if (this.onCellClick) {
                      this.onCellClick(rowIndex, colIndex);
                    }
                  },
                })
              }, (cellColor: number, colIndex: number): string =>
                `v${this.gridVersion}-${rowIndex}-${colIndex}`)
            }
          }, (row: number[], rowIndex: number): string =>
            `v${this.gridVersion}-row-${rowIndex}`)
        }
      }
      .padding(4)
      .backgroundColor($r('app.color.bg_secondary'))
      .borderRadius(12)
      .shadow({ radius: 8, color: '#00000040', offsetY: 4 })
    }
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .alignItems(HorizontalAlign.Center)
    .onAreaChange((oldArea: Area, newArea: Area) => {
      const w: number = newArea.width as number;
      const h: number = newArea.height as number;
      const minDim: number = Math.floor(Math.min(w, h) * 0.94);
      this.containerDim = minDim;
    })
  }

  private computedCellSize(): number {
    const gap: number = this.computedCellGap();
    const totalGap: number = gap * 2 * this.boardSize;
    return Math.floor((this.containerDim - totalGap) / this.boardSize);
  }

  private computedCellGap(): number {
    return this.boardSize <= 6 ? 2 : 1;
  }

  private computedCellRadius(): number {
    return Math.max(2, Math.floor(this.computedCellSize() / 8));
  }

  private checkAnimating(row: number, col: number): boolean {
    const key: string = `${row},${col}`;
    return this.animatingCells.indexOf(key) >= 0;
  }

  private checkFlooded(row: number, col: number): boolean {
    if (this.floodedMask.length === 0) return false;
    if (row >= this.floodedMask.length) return false;
    const rowData: boolean[] | undefined = this.floodedMask[row];
    if (rowData === undefined) return false;
    return rowData[col] === true;
  }

  private checkHinted(cellColor: number, row: number, col: number): boolean {
    return this.hintHighlightColor >= 0 &&
      this.hintHighlightColor === cellColor &&
      !this.checkFlooded(row, col);
  }

  private checkSelected(cellColor: number): boolean {
    return this.selectedColor >= 0 && cellColor === this.selectedColor;
  }
}
