/**
 * 胜利弹窗组件 - 通关后的星级评价和操作按钮
 */

import { MODE_LEVEL, MODE_INFINITE } from '../common/Constants';

const STAR_INDICES: number[] = [1, 2, 3];

@Component
export struct VictoryDialog {
  @Prop show: boolean = false;
  @Prop stars: number = 0; // 1-3
  @Prop steps: number = 0;
  @Prop optimalSteps: number = 0;
  @Prop gameMode: number = MODE_LEVEL;
  @Prop isLastLevel: boolean = false;
  @Prop yourStepsLabel: string = '';
  @Prop optimalLabel: string = '';

  onNextLevel?: () => void;
  onReplay?: () => void;
  onBackToMenu?: () => void;

  build() {
    if (this.show) {
      Stack() {
        // 半透明遮罩
        Column()
          .width('100%')
          .height('100%')
          .backgroundColor('#000000AA')
          .onClick(() => {
            // 点击遮罩不关闭
          })

        // 弹窗卡片
        Column({ space: 12 }) {
          // 标题
          Text($r('app.string.victory_title'))
            .fontSize(28)
            .fontColor($r('app.color.accent'))
            .fontWeight(FontWeight.Bold)

          // 星星
          Row({ space: 12 }) {
            ForEach(STAR_INDICES, (starIndex: number) => {
              Text('★')
                .fontSize(48)
                .fontColor(
                  starIndex <= this.stars
                    ? $r('app.color.star_filled')
                    : $r('app.color.star_empty')
                )
                .scale({ x: starIndex <= this.stars ? 1.0 : 0.7, y: starIndex <= this.stars ? 1.0 : 0.7 })
                .animation({
                  duration: 400,
                  curve: Curve.EaseOut,
                })
            }, (item: number): string => item.toString())
          }
          .margin({ bottom: 8 })

          // 步数统计
          Text(this.yourStepsLabel)
            .fontSize(18)
            .fontColor($r('app.color.text_secondary'))

          Text(this.optimalLabel)
            .fontSize(18)
            .fontColor($r('app.color.text_secondary'))

          // 按钮区
          Row({ space: 12 }) {
            Button($r('app.string.btn_replay'))
              .fontSize(14)
              .backgroundColor($r('app.color.bg_card'))
              .fontColor($r('app.color.text_primary'))
              .borderRadius($r('app.integer.button_radius'))
              .height(44)
              .onClick(() => {
                if (this.onReplay) this.onReplay();
              })

            if (this.gameMode === MODE_INFINITE || (this.gameMode === MODE_LEVEL && !this.isLastLevel)) {
              Button($r('app.string.btn_next_level'))
                .fontSize(14)
                .backgroundColor($r('app.color.accent'))
                .fontColor(Color.White)
                .borderRadius($r('app.integer.button_radius'))
                .height(44)
                .onClick(() => {
                  if (this.onNextLevel) this.onNextLevel();
                })
            }

            Button($r('app.string.btn_back_menu'))
              .fontSize(14)
              .backgroundColor($r('app.color.bg_card'))
              .fontColor($r('app.color.text_primary'))
              .borderRadius($r('app.integer.button_radius'))
              .height(44)
              .onClick(() => {
                if (this.onBackToMenu) this.onBackToMenu();
              })
          }
          .margin({ top: 8 })
        }
        .padding(32)
        .backgroundColor($r('app.color.bg_secondary'))
        .borderRadius(16)
        .shadow({ radius: 16, color: '#00000080' })
        .width('75%')
      }
      .width('100%')
      .height('100%')
      .zIndex(100)
      .position({ x: 0, y: 0 })
    }
  }
}
