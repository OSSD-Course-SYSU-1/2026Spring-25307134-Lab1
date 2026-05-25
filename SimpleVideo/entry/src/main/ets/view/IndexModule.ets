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

import { HORIZONTAL_VIDEOS } from '../viewmodel/VideoData';
import { MARGIN_FONT_SIZE, STRING_PERCENT, NET } from '../common/constants/CommonConstants';
import { HorizontalVideoItem } from '../viewmodel/HorizontalVideoItem';
import { ParamItem } from '../viewmodel/ParamItem';

/**
 * The modules in index
 */
@Component
export struct VideoModule {
  @StorageLink('source') source: ResourceStr = '';
  private pathStack: NavPathStack = new NavPathStack();
  private moduleName: string = '';

  build() {
    Column() {
      Flex({ direction: FlexDirection.Row }) {
        Text(this.moduleName)
          .fontSize(MARGIN_FONT_SIZE.THIRD_MARGIN)
          .fontWeight(FontWeight.Bolder)
      }
      .margin({
        left: STRING_PERCENT.INDEX_SWIPER_LEFT_RIGHT_MARGIN,
        bottom: MARGIN_FONT_SIZE.FIRST_MARGIN,
        top: MARGIN_FONT_SIZE.FIRST_MARGIN
      })

      List({ space: MARGIN_FONT_SIZE.FIRST_MARGIN }) {
        ForEach(HORIZONTAL_VIDEOS, (item: HorizontalVideoItem) => {
          ListItem() {
            HorizontalItem({
              pathStack: this.pathStack,
              imageSrc: item.image,
              videoName: item.name
            })
          }
        }, (item: HorizontalVideoItem) => JSON.stringify(item))
      }
      .listDirection(Axis.Horizontal)
    }
    .margin({
      left: STRING_PERCENT.INDEX_SWIPER_LEFT_RIGHT_MARGIN,
      right: STRING_PERCENT.INDEX_SWIPER_LEFT_RIGHT_MARGIN
    })
    .width(STRING_PERCENT.INDEX_COMPONENT_WITH_PERCENT)
    .justifyContent(FlexAlign.Center)
    .borderRadius(MARGIN_FONT_SIZE.FOURTH_MARGIN)
    .borderStyle(BorderStyle.Solid)
    .borderColor(Color.White)
    .backgroundColor($r('app.color.white'))
  }
}

@Component
struct HorizontalItem {
  @StorageLink('source') source: ResourceStr = '';
  private pathStack: NavPathStack = new NavPathStack();
  private imageSrc: Resource = $r('app.string.empty');
  private videoName: ResourceStr = '';
  private param: ParamItem = new ParamItem();

  aboutToAppear(): void {
    this.param.source = this.source;
  }

  build() {
    Column() {
      Image(this.imageSrc)
        .width(MARGIN_FONT_SIZE.SEVENTH_MARGIN)
        .height(MARGIN_FONT_SIZE.SIXTH_MARGIN)
        .onClick(() => {
          this.source = NET;
          this.pathStack.pushPathByName('VideoPlayerPage', this.param);
        })
      Text(this.videoName)
        .margin({
          top: MARGIN_FONT_SIZE.FIRST_MARGIN,
          bottom: MARGIN_FONT_SIZE.FIRST_MARGIN
        })
        .textAlign(TextAlign.Center)
        .fontSize(MARGIN_FONT_SIZE.SECOND_MARGIN)
    }
    .justifyContent(FlexAlign.Center)
  }
}