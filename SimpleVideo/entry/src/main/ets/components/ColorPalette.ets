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
