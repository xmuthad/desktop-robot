# 更新日志

## [1.2.0] - 2026-03-06 - 增强版

### 新增功能

#### 📊 执行统计与历史记录
- 新增执行历史记录功能
  - 记录所有宏和脚本的执行情况
  - 显示执行时间、类型、成功/失败状态
  - 最多保留 100 条记录
- 新增执行统计面板
  - 总执行次数
  - 成功/失败次数
  - 成功率计算
- 支持清空历史和重置统计

#### 💾 宏导入导出
- 单个宏导出功能
- 批量导出所有宏
- 导入宏文件（JSON 格式）
- 宏文件备份

#### ⚡ 快速命令面板（类 Spotlight）
- 快捷键 `Ctrl+K` / `Cmd+K` 唤出
- 支持搜索：
  - 所有已保存的宏
  - 所有已保存的脚本
  - 常用快捷动作
- 支持键盘导航（↑↓选择，Enter 执行）
- 智能关键词匹配

#### 🎨 UI/UX 增强
- 宏列表增加删除按钮
- 按钮悬停动画效果增强
- 日志条目左侧彩色边框分类
- 新增加载状态动画
- 响应式布局优化

### 代码优化

#### renderer.js 新增函数
- `addExecutionHistory()` - 添加执行记录
- `saveExecutionHistory()` - 保存执行历史
- `loadExecutionHistory()` - 加载执行历史
- `renderExecutionHistory()` - 渲染执行历史
- `clearExecutionHistory()` - 清空执行历史
- `exportMacro()` - 导出单个宏
- `importMacro()` - 导入宏文件
- `exportAllMacros()` - 导出所有宏
- `handleMacroFileImport()` - 处理宏文件导入
- `renderMacroListWithDelete()` - 带删除按钮的宏列表
- `deleteMacro()` - 删除宏
- `initQuickCommandPalette()` - 初始化快速命令面板
- `initEnhancedFeatures()` - 初始化增强功能
- `renderExecutionStats()` - 渲染执行统计
- `injectStatsToSettings()` - 注入统计到设置面板

#### executionStats 对象
- `record()` - 记录执行
- `save()` - 保存统计
- `load()` - 加载统计
- `getSuccessRate()` - 获取成功率

#### quickCommandPalette 对象
- `show()` / `hide()` - 显示/隐藏
- `render()` - 渲染命令列表
- `search()` - 搜索命令
- `getAllCommands()` - 获取所有命令
- `execute()` - 执行命令
- `navigate()` - 键盘导航
- `executeActive()` - 执行选中项

### 样式增强

#### 新增 CSS 类
- `.history-item` - 历史记录项
- `.stats-grid` - 统计网格布局
- `.stat-item` - 统计项
- `.toast` - 提示框
- `.loading` - 加载状态
- 日志增强样式
- 按钮悬停效果
- 动画效果优化

### 快捷键更新
| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` / `Cmd+K` | 打开快速命令面板 |
| `Escape` | 关闭快速命令面板 |
| `↑` / `↓` | 在快速命令面板中导航 |
| `Enter` | 执行选中的命令 |

---

## [1.1.0] - 2026-03-06

### 新增功能

#### ⌨️ 键盘宏功能
- 宏创建、编辑、保存、删除
- 支持 F1-F12 快捷键绑定
- 支持多种动作类型
- 宏命令顺序调整
- 全局快捷键监听

#### 📋 预设宏模板
- 复制粘贴（F1）
- 保存全部（F2）
- 打开开发环境（F3）
- 问候语（F4）
- 关闭所有窗口（F5）

---

## [1.0.0] - 2026-03-05

### 初始版本
- 鼠标控制
- 键盘控制
- 剪贴板管理
- 屏幕截图
- 颜色检测
- 脚本录制和播放
- 定时任务
- 连点器
- 工作流编辑器
- 模板库
- AI 自动响应助手

---

## [1.3.0] - 2026-03-06 - 系统工具增强版

### 新增功能

#### 🛠️ 系统工具面板
- 系统信息查看
  - 平台/架构
  - 操作系统版本
  - Node.js 版本
  - CPU 核心数
  - 内存信息
  - 运行时间
- 进程管理
  - 查看进程列表
  - 进程 PID 显示
- 网络信息
  - 主机名
  - 网络接口
  - IP 地址
  - MAC 地址
  - 外网 IP
- 音量控制
  - 音量调节滑块
  - 静音切换
  - 实时音量显示
- 文件操作
  - 目录读取
  - 文件大小查询
  - 文件列表显示
- Shell 命令执行
  - 自定义 Shell 命令
  - 命令输出显示
  - 超时保护（30 秒）

#### 📦 新增 IPC 处理器（main.js）
- `get-system-info` - 获取系统信息
- `get-process-list` - 获取进程列表
- `kill-process` - 杀掉进程
- `get-file-size` - 获取文件大小
- `read-directory` - 读取目录
- `exec-shell-command` - 执行 Shell 命令
- `get-network-info` - 获取网络信息
- `get-battery-status` - 获取电池状态
- `get-active-window` - 获取活跃窗口
- `set-volume` - 设置音量
- `get-volume` - 获取音量
- `toggle-mute` - 切换静音
- `eject-disk` - 弹出磁盘
- `get-recent-files` - 获取最近文件
- `show-notification` - 显示系统通知

#### 🎨 Toast 通知系统
- 支持 4 种类型：success, error, info, warning
- 自动消失动画
- 可自定义显示时长
- 全局 Toast 对象

#### 🧰 工具函数库（Utils）
- `debounce` - 防抖函数
- `throttle` - 节流函数
- `sleep` - 休眠函数
- `formatTime` - 格式化时间
- `formatFileSize` - 格式化文件大小
- `generateId` - 生成随机 ID
- `copyToClipboard` - 复制到剪贴板
- `deepClone` - 深拷贝
- `getStorage` / `setStorage` - localStorage 封装
- `uniqueArray` - 数组去重
- `sortBy` - 数组排序
- `groupBy` - 数组分组
- `showLoading` / `hideLoading` - 加载状态

#### ⚡ 快捷操作增强（QuickActions）
- `copyWindowTitle` - 复制窗口标题
- `quickScreenshotAndCopy` - 快速截图
- `showMousePosition` - 显示鼠标位置
- `highlightMouse` - 高亮鼠标

#### 📋 命令历史导航
- 上下键浏览历史命令
- 最多保留 50 条历史
- 持久化存储

#### 🔀 工作流模板（WorkflowTemplates）
- 浏览器自动化模板
- 文档处理模板
- 数据录入模板
- 一键应用模板

#### 📦 批量操作（BatchOperations）
- 批量执行脚本
- 批量删除脚本
- 批量导出脚本

### UI 增强

#### 新增面板
- 系统工具面板（第 8 个面板）
- 侧边栏新增「工具」菜单

#### 新增 CSS 类
- `.tools-grid` - 工具网格布局
- `.tool-card` - 工具卡片
- `.volume-control` - 音量控制
- `.shell-command` - Shell 命令
- `.shell-output` - 命令输出
- `.info-item` - 信息项
- `.process-item` - 进程项
- `.file-item` - 文件项

### 快捷键扩展

| 快捷键 | 功能 |
|--------|------|
| `↑` (命令输入框) | 上一条历史命令 |
| `↓` (命令输入框) | 下一条历史命令 |

### 代码统计

- 总代码：7,344 行
- renderer.js: 3,060 行
- main.js: 795 行
- styles.css: 1,659 行
- index.html: 704 行

### 全局对象

```javascript
window.Toast      // Toast 通知
window.Utils      // 工具函数
window.QuickActions  // 快捷操作
window.WorkflowTemplates  // 工作流模板
window.BatchOperations  // 批量操作
```

### 兼容性说明

- 系统工具功能主要支持 macOS
- Windows/Linux 部分功能可能不可用
- 电池状态、音量控制等功能仅限 macOS


---

## [1.4.0] - 2026-03-06 - 高级功能增强版

### 新增功能

#### 💾 自动保存系统
- 每 30 秒自动保存所有数据
- 支持手动开关
- 保存状态指示器
- 保存宏、脚本、任务、工作流

#### 🎨 主题系统
- 4 种预设主题
  - 深色（默认）
  - 浅色
  - 蓝色
  - 绿色
- 一键切换主题
- 主题偏好持久化

#### 🌐 国际化支持
- 支持 3 种语言
  - 简体中文 (zh-CN)
  - 英文 (en-US)
  - 日文 (ja-JP)
- 语言偏好持久化
- 14+ 翻译键值

#### 📊 性能监控
- FPS 显示
- 运行时间统计
- 内存使用监控（支持时）
- 性能统计面板

#### ⭐ 收藏夹功能
- 收藏常用宏和脚本
- 快速运行收藏项
- 收藏列表管理

#### 🧠 智能推荐
- 记录使用频率
- 自动推荐常用项目
- 使用统计持久化

#### 📦 增强数据导出
- 完整备份功能
- 导出所有数据
  - 宏、脚本、任务、工作流
  - 收藏夹、使用统计
  - 主题、语言设置
- 一键导入恢复

#### 🎉 欢迎引导
- 首次使用引导
- 功能快速入门
- 可标记为已显示

### 新增全局对象

```javascript
window.AutoSave           // 自动保存
window.PerformanceMonitor // 性能监控
window.ThemeManager       // 主题管理
window.i18n               // 国际化
window.Favorites          // 收藏夹
window.SmartRecommendations // 智能推荐
window.DataExporter       // 数据导出
window.WelcomeGuide       // 欢迎引导
```

### 新增 CSS 类

- `.theme-selector` - 主题选择器
- `.theme-btn` - 主题按钮
- `.lang-selector` - 语言选择器
- `.lang-btn` - 语言按钮
- `.auto-save-status` - 自动保存状态
- `.recommendation-item` - 推荐项
- `.favorite-item` - 收藏项
- `.perf-stats` - 性能统计
- `.guide-step` - 引导步骤

### 更新

- 设置面板新增 4 个区域
- 新增欢迎引导模态框
- 增强数据导入导出

### 代码统计

- 总代码：8,180 行
- renderer.js: 约 4,200 行

