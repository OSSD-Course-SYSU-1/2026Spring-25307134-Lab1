/**
 * 游戏 HUD 组件 - 顶部信息栏 + 控制按钮
 */

import {
  MODE_LEVEL,
} from '../common/Constants';

const STAR_INDICES: number[] = [1, 2, 3];

@Component
export struct GameHud {
  @Prop steps: number = 0;
  @Prop optimalSteps: number = 0;
  @Prop stars: number = 0; // 0=未评级, 1-3
  @Prop gameMode: number = MODE_LEVEL;
  @Prop levelLabel: string = '';
  @Prop stepsLabel: string = '';
  @Prop optimalLabel: string = '';
  @Prop canUndo: boolean = false;
  @Prop soundEnabled: boolean = true;

  onUndo?: () => void;
  onReset?: () => void;
  onHint?: () => void;
  onToggleSound?: () => void;

  build() {
    Column() {
      // 第1行：关卡名 + 星级
      Row() {
        Text(this.levelLabel)
          .fontSize($r('app.integer.hud_font_size'))
          .fontColor($r('app.color.text_primary'))
          .fontWeight(FontWeight.Medium)

        Blank()

        // 星级显示
        Row({ space: 2 }) {
          ForEach(STAR_INDICES, (starIndex: number) => {
            Text('★')
              .fontSize(18)
              .fontColor(
                starIndex <= this.stars
                  ? $r('app.color.star_filled')
                  : $r('app.color.star_empty')
              )
          }, (item: number): string => item.toString())
        }
      }
      .width('100%')

      // 第2行：步数统计
      Row() {
        Text(this.stepsLabel)
          .fontSize($r('app.integer.hud_font_size'))
          .fontColor($r('app.color.text_secondary'))
        Blank()
        Text(this.optimalLabel)
          .fontSize($r('app.integer.hud_font_size'))
          .fontColor($r('app.color.text_secondary'))
      }
      .width('100%')
      .margin({ top: 6, bottom: 8 })

      // 第3行：控制按钮
      Row({ space: 6 }) {
        this.ControlButton($r('app.string.btn_undo'), this.canUndo, () => {
          if (this.onUndo) this.onUndo();
        })
        this.ControlButton($r('app.string.btn_hint'), true, () => {
          if (this.onHint) this.onHint();
        })
        this.ControlButton($r('app.string.btn_reset'), true, () => {
          if (this.onReset) this.onReset();
        })
        this.ControlButton(
          this.soundEnabled ? $r('app.string.sound_on') : $r('app.string.sound_off'),
          true,
          () => {
            if (this.onToggleSound) this.onToggleSound();
          }
        )
      }
      .width('100%')
      .flexShrink(0)
    }
    .width('100%')
    .padding({ left: 12, right: 12, top: 8, bottom: 4 })
  }

  @Builder
  ControlButton(label: ResourceStr, enabled: boolean, onClick: () => void) {
    Button(label)
      .fontSize(12)
      .height($r('app.integer.button_height'))
      .borderRadius($r('app.integer.button_radius'))
      .enabled(enabled)
      .opacity(enabled ? 1.0 : 0.4)
      .backgroundColor($r('app.color.bg_card'))
      .fontColor($r('app.color.text_primary'))
      .padding({ left: 10, right: 10 })
      .onClick(() => {
        if (enabled) onClick();
      })
  }
}
