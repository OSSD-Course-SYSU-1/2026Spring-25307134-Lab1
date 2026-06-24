# 基于Video组件实现视频播放的功能

### 简介

基于ArkUI框架，实现一个简单视频播放器，可支持海报轮播、视频播放等功能。

![](screenshots/device/video.gif)

### 相关概念

- Swiper组件：滑块视图容器，提供子组件滑动轮播显示的能力。
- List组件：列表包含一系列相同宽度的列表项。适合连续、多行呈现同类数据，例如图片和文本。
- Video组件：用于播放视频文件并控制其播放状态的组件。
- ForEach组件：ForEach基于数组类型数据执行循环渲染。

### 相关权限

网络权限：ohos.permission.INTERNET

### 使用说明

1. 在首页点击轮播图中的图片，跳转到视频播放界面，播放应用视频资源。
2. 在联网的前提下，在首页点击其他模块列表图片，跳转到视频播放界面，播放网络视频资源，具体操作步骤详见步骤5。
3. 在视频播放界面，可通过点击屏幕左下方的图标播放/暂停视频。
4. 在视频播放界面，可通过点击/拖动进度条来控制视频播放进度。
5. 如需验证网络视频播放功能，需要在/entry/src/main/ets/common/constants/CommonConstants文件下自行修改NET字段，将NET字段值改为真实可用的网络视频地址（以.mp4为后缀的网络视频地址）。

### 约束与限制

1. 本示例仅支持标准系统上运行，支持设备：华为手机。
2. HarmonyOS系统：HarmonyOS 5.0.5 Release及以上。
3. DevEco Studio版本：DevEco Studio 6.0.2 Release及以上。
4. HarmonyOS SDK版本：HarmonyOS 6.0.2 Release SDK及以上。
