/*
 * Copyright (c) 2023 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { VideoPlayer } from '../view/VideoPlayer';
import {
  MARGIN_FONT_SIZE,
  COMMON_NUM_FONT_WEIGHT,
  ALL_PERCENT,
  STACK_STYLE
} from '../common/constants/CommonConstants';
import { VideoPlayerModel } from '../model/VideoPlayerModel';

@Builder
export function VideoPlayerPageBuilder() {
  VideoPlayerPage()
}

/**
 * Second page.
 */
@Component
export struct VideoPlayerPage {
  private startIconResource: Resource = $r('app.media.ic_public_play');
  private backIconResource: Resource = $r('app.media.ic_back');
  @Provide videoPlayerModel: VideoPlayerModel = new VideoPlayerModel();
  private pathStack: NavPathStack = new NavPathStack();
  @StorageLink('source') source: ResourceStr = '';

  onPageHide() {
    this.videoPlayerModel.controller.pause();
  }

  build() {
    NavDestination() {
      Row() {
        Image(this.backIconResource)
          .width(MARGIN_FONT_SIZE.FOURTH_MARGIN)
          .height(MARGIN_FONT_SIZE.FOURTH_MARGIN)
          .margin({ left: MARGIN_FONT_SIZE.FOURTH_MARGIN })
          .onClick(() => {
            this.pathStack.pop();
          })
        Text($r('app.string.back'))
          .fontColor(Color.White)
          .fontSize(MARGIN_FONT_SIZE.FOURTH_MARGIN)
          .fontWeight(COMMON_NUM_FONT_WEIGHT)
          .margin({ left: MARGIN_FONT_SIZE.FIRST_MARGIN })
      }
      .width(ALL_PERCENT)
      .margin({
        left: MARGIN_FONT_SIZE.FIRST_MARGIN,
        top: MARGIN_FONT_SIZE.FIRST_MARGIN
      })
      .justifyContent(FlexAlign.Start)

      Stack() {
        if (!this.videoPlayerModel.isPlay && !this.videoPlayerModel.isLoading) {
          Image(this.startIconResource)
            .width(MARGIN_FONT_SIZE.FIFTH_MARGIN)
            .height(MARGIN_FONT_SIZE.FIFTH_MARGIN)
            .zIndex(STACK_STYLE.IMAGE_Z_INDEX)
        }
        if (this.videoPlayerModel.isLoading) {
          Progress({
            value: STACK_STYLE.PROGRESS_VALUE,
            total: STACK_STYLE.PROGRESS_TOTAL,
            type: ProgressType.ScaleRing
          })
            .color(Color.Grey)
            .value(this.videoPlayerModel.progressVal)
            .width(STACK_STYLE.PROGRESS_WIDTH)
            .style({
              strokeWidth: STACK_STYLE.PROGRESS_STROKE_WIDTH,
              scaleCount: STACK_STYLE.PROGRESS_SCALE_COUNT,
              scaleWidth: STACK_STYLE.PROGRESS_SCALE_WIDTH
            })
            .zIndex(STACK_STYLE.PROGRESS_Z_INDEX)
        }
        VideoPlayer({
          source: this.source
        })
          .zIndex(0)

      }
    }
    .hideTitleBar(true)
    .hideToolBar(true)
    .height(ALL_PERCENT)
    .backgroundColor(Color.Black)
    .onReady((context: NavDestinationContext) => {
      this.pathStack = context.pathStack;
    })
  }
}