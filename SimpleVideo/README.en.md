# Simple Video Player

### Introduction

Learn how to implement a simple video player based on ArkUI to support video carousel, video playback, and more.

![](screenshots/device/video.en.gif)

### Concepts

- Swiper: a component that is used to display child components in carousel mode.
- List: a component that provides a series of list items with the same width. It supports presentations of the same type of data in a multiple and coherent row style, for example, images or text.
- Video: a component that is used to play a video and control its playback.
- ForEach: a component that performs loop rendering based on array data.

### Permissions

Network permission: **ohos.permission.INTERNET**.

### How to Use

1. On the app home page, tap an image on the carousel, which will redirect to the video playback page.
2. When the network is connected, tap an image of another module list on the home page, which will redirect to the video playback page. For specific steps, please refer to step 5.
3. On the video playback page, tap the icon in the lower left corner to play or pause a video.
4. On the video playback page, tap or drag the progress bar to control the video playback progress.
5. To verify the network video playback function, you need to modify the NET field in the '/entry/src/main/ets/common/constants/CommonConstants.ets' and change the NET field value to the actual available network video address (with. mp4 as the suffix).

### Constraints

1. The sample is only supported on Huawei phones with standard systems.

2. HarmonyOS: HarmonyOS 5.0.5 Release or later.

3. DevEco Studio: DevEco Studio 6.0.2 Release or later.

4. HarmonyOS SDK: DevEco Studio 6.0.2 Release SDK or later.
