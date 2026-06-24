# 大小屏适配 + 自由流转 设计规格

**项目**: 溢彩画 (Flood-It) HarmonyOS 游戏
**日期**: 2026-06-23
**状态**: 待实现
**API Level**: HarmonyOS 5.0.5+ / DevEco Studio 6.0.2+

---

## 1. 目标

1. **大小屏适配**: 手机竖屏/横屏、折叠屏折叠/展开、平板横屏，自动切换布局，游戏不中断
2. **自由流转**: 跨设备迁移（Continuation），完整游戏状态从设备 A 接续到设备 B

---

## 2. 架构变更

```
entry/src/main/ets/
├── common/
│   ├── Constants.ts            ✏️ 新增断点常量、迁移状态键
│   └── ResponsiveLayout.ts     ✨ 新增：断点监听 + 布局参数
├── models/
│   └── GameStateSerializer.ts  ✨ 新增：游戏状态 → want 参数 序列化
├── entryability/
│   └── EntryAbility.ets        ✏️ 移除硬编码横屏 + onContinue/onNewWant
├── pages/
│   └── GamePage.ets            ✏️ 响应式布局 + restoreState 恢复入口
├── components/
│   └── ColorPalette.ets        ✏️ 竖屏模式支持单行横排
```

---

## 3. 大小屏适配

### 3.1 断点定义

| 断点 | 宽度范围 (vp) | 典型设备 | 布局模式 | 方向 |
|------|-------------|----------|---------|------|
| **SM** | 320 – 600 | 手机竖屏 | Column 上下堆叠 | 竖向 |
| **MD** | 600 – 840 | 手机横屏 / 折叠屏折叠态 | Row 左右并排 | 横向 |
| **LG** | 840+ | 平板 / 折叠屏展开态 | Row 左右并排 + 放缩 | 横向 |

### 3.2 ResponsiveLayout 模块

封装 `@ohos.mediaquery` 断点监听，导出响应式参数：

```typescript
class ResponsiveLayout {
  breakpoint: Breakpoint;   // 当前断点
  isLandscape: boolean;     // 宽高比 > 1

  isHorizontal(): boolean;      // MD/LG → true
  boardFlexRatio(): number;     // SM: 6, MD: 6, LG: 6.5
  paletteFlexRatio(): number;   // SM: 4, MD: 4, LG: 3.5
  hudHeight(): number;          // SM: 60, MD: 80, LG: 96
  paletteColumns(): number;     // SM: 5 (单行), 其他: 3 (竖列)
}
```

**关键行为**: 监听 `mediaquery` 的 `on('change')` 回调，断点变化时自动更新 `breakpoint`（响应式变量），触发 UI 重排。折叠屏展开/折叠由系统自动触发断点切换。

### 3.3 GamePage 布局结构

```
if isHorizontal()            // MD / LG ─ 左右并排
  Row {
    Column { HUD + Board }   // boardFlexRatio
    Divider.vertical
    Column { Palette }        // paletteFlexRatio
  }

else                         // SM ─ 上下堆叠
  Column {
    GameHud                  // 固定高度 60vp
    GameBoard                // layoutWeight(1) 撑满
    ColorPalette (horizontal) // 固定高度底部，单行 5 色
  }
```

### 3.4 ColorPalette 竖屏适配

SM 模式下调色板改为水平单行排列，通过新增 `direction` 参数控制：
- `direction: 'column'` → 现有竖排 3 列 Grid（MD/LG）
- `direction: 'row'` → 横排单行（SM）

### 3.5 EntryAbility 改动

移除 `mainWindow.setPreferredOrientation(window.Orientation.LANDSCAPE)`，允许系统自动旋转。

---

## 4. 自由流转（跨设备迁移）

### 4.1 流程

```
设备A（手机）                   设备B（平板）
    │                               │
    │ onContinue()                   │
    │ → GameStateSerializer          │
    │   .serialize(gameState)       │
    │ → 写入 wantParam               │
    │                               │
    │ ═══════ 系统传输 ═══════════ │
    │                               │
    │                         onNewWant(want)
    │                         → 检查 gameMode 参数
    │                         → gameState.restoreState(params)
    │                         → 完全接续游戏
```

### 4.2 GameStateSerializer

序列化全部游戏状态为 `Record<string, string>`（want.parameters 限制为 string 值）。

**迁移字段**:

| 字段 | 类型 | 说明 |
|------|------|------|
| `gameMode` | number→str | MODE_LEVEL / MODE_INFINITE |
| `currentLevel` | number→str | 关卡索引 |
| `infiniteLevel` | number→str | 无尽通关计数 |
| `grid` | JSON string | 二维颜色数字数组 |
| `gridSize` | number→str | 棋盘尺寸 N |
| `activeColorCount` | number→str | 可用颜色数 |
| `steps` | number→str | 当前步数 |
| `originColor` | number→str | 原点颜色 |
| `optimalSteps` | number→str | 最优解步数 |
| `stars` | number→str | 当前星级 |
| `floodedMask` | JSON string | 淹没状态 |
| `initialGrid` | JSON string | 初始棋盘（用于重置） |
| `undoStack` | JSON string | 撤销栈（最多 50 步） |

**排除字段**（不迁移，源设备丢弃）：动画状态、选中颜色、提示高亮、定时器。

### 4.3 EntryAbility 回调

```typescript
onContinue(wantParam): OnContinueResult {
  序列化全部状态 → 写入 wantParam → 返回 AGREE
}

onNewWant(want): void {
  if (params 含 'gameMode') → restoreState(params)
}

onCreate(want): void {
  if (want 含迁移参数) → 标记 launchReason = 'continuation'
}
```

### 4.4 GamePage.restoreState()

接收 `Record<string, Object>`，逐字段反序列化并赋值 `@State`，调用 `gridVersion++` 和 `refreshLabels()` 触发 UI 重绘。恢复后玩家在原设备上的操作（撤消/重做）在新设备上完全可用。

### 4.5 module.json5 配置

```json5
{
  "deviceTypes": ["phone", "tablet", "2in1"],
  "continuable": true,
  "abilities": [{
    "continuable": true,
    // ...
  }]
}
```

---

## 5. 修改文件清单

| 文件 | 操作 | 要点 |
|------|------|------|
| `common/Constants.ts` | 修改 | 新增 Breakpoint 枚举、SM/MD/LG 参数常量、迁移键名常量 |
| `common/ResponsiveLayout.ts` | 新增 | 断点监听类，暴露响应式布局参数 |
| `models/GameStateSerializer.ts` | 新增 | serialize() / deserialize()，与 want.parameters 互转 |
| `entryability/EntryAbility.ets` | 修改 | 移除硬编码横屏；新增 onContinue/onNewWant/onCreate 逻辑 |
| `pages/GamePage.ets` | 修改 | 响应式布局分支；新增 restoreState()；集成 ResponsiveLayout |
| `components/ColorPalette.ets` | 修改 | 新增 direction 参数，SM 模式水平排列 |
| `entry/src/main/module.json5` | 修改 | deviceTypes 加 "tablet"/"2in1"，加 continuable: true |
| `resources/base/element/string.json` | 修改 | 新增流转相关字符串（可选） |

## 6. 测试验证

| 场景 | 预期行为 |
|------|---------|
| 手机竖屏启动 | SM 布局，上下堆叠，调色板底部横排 |
| 手机旋转横屏 | 无缝切换到 MD 布局，左右并排 |
| 折叠屏折叠→展开 | 断点 MD→LG，布局保持横排，棋盘/调色板比例调整 |
| 折叠屏展开→折叠 | 断点 LG→MD，布局保持横排，比例回退，游戏无缝继续 |
| 平板横屏 | LG 布局，棋盘占 65%，调色板 35% |
| 手机→平板迁移 | 平板冷启动恢复手机完整局面（含棋盘、步数、撤销栈） |
| 平板→手机迁移 | 手机恢复完整局面，SM 竖屏或 MD 横屏按方向显示 |
| 迁移后继续操作 | 染色、撤销、提示、新游戏均正常 |

---

## 7. 风险与约束

1. **Solver 跨设备一致性**: 迁移后异步求解的最优步数会被覆盖为估算值，但会在 setTimeout 中重新精确计算。可接受。
2. **undoStack 体积**: 50 步快照 × (81 格 × 4B + 开销) ≈ 20KB，want 传输上限远大于此，安全。
3. **continuable 兼容性**: `continuable: true` 要求 API 8+，项目 API 5.0.5(17) 满足。
4. **折叠屏模拟**: DevEco Studio 模拟器支持折叠屏预览，真机测试需要 Mate X 系列设备。
