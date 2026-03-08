# 桌面机器人 (Desktop Robot) v1.3.0

一个功能强大的桌面自动化机器人，带有图形界面，可以模拟鼠标和键盘操作来控制电脑桌面。

![Version](https://img.shields.io/badge/version-1.3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌟 最新版本 (v1.3.0)

### 新增系统工具面板
- 💻 系统信息查看
- 📋 进程管理
- 🌐 网络信息
- 🔊 音量控制
- 📁 文件操作
- 💻 Shell 命令执行

### 新增工具库
- 🍞 Toast 通知系统
- 🧰 Utils 工具函数库
- ⚡ QuickActions 快捷操作
- 📋 命令历史导航
- 🔀 工作流模板

## 功能特点

### 基础功能
- 🖱️ **鼠标控制** - 移动、点击、双击、右键、拖拽、滚轮
- ⌨️ **键盘控制** - 按键输入、文本输入、快捷键组合
- 📋 **剪贴板管理** - 读取、写入、清空剪贴板
- 🖼️ **屏幕截图** - 截取屏幕并保存
- 🎨 **颜色检测** - 获取鼠标位置的像素颜色

### 高级功能
- 📜 **脚本功能** - 录制和批量执行指令序列
- 🔴 **实时录制** - 录制你的操作并保存为脚本
- ⏰ **定时任务** - 设置定时自动执行脚本
- 🎯 **精准定位** - 通过坐标控制鼠标位置
- 🖱️ **连点器** - 自动连续点击工具
- ⚡ **键盘宏** - 绑定复杂操作到功能键
- 🔍 **快速命令** - Spotlight 风格的命令搜索
- 📊 **执行统计** - 记录成功率和执行历史

### 系统工具 (v1.3.0 新增)
- 💻 系统信息、进程管理、网络信息
- 🔊 音量控制、系统通知
- 📁 文件操作、Shell 命令

### 快捷操作
- 🌐 **浏览器控制** - 打开浏览器、访问网址、标签管理
- 🪟 **窗口管理** - 最小化、最大化、关闭窗口
- ⌨️ **常用快捷键** - 复制、粘贴、全选、撤销、保存等

## 界面预览

### 八个主要面板

1. **指令** - 快捷指令和键盘宏
2. **工作流** - 可视化自动化流程
3. **模板库** - 预设模板
4. **高级** - 剪贴板、截图、连点器等
5. **脚本** - 脚本管理
6. **录制** - 录制操作
7. **定时** - 定时任务
8. **设置** - 应用设置、执行统计
9. **工具** - 系统工具 (v1.3.0 新增)

## 快速开始

```bash
# 安装
npm install

# 启动
npm start

# 开发模式
npm run dev
```

## 键盘宏

### 预设宏模板

| 快捷键 | 功能 |
|--------|------|
| F1 | 复制粘贴工作流 |
| F2 | 保存全部 |
| F3 | 打开开发环境 |
| F4 | 快速问候语 |
| F5 | 关闭所有窗口 |

## 快捷键大全

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+K` / `Cmd+K` | 打开快速命令面板 |
| `Escape` | 关闭快速命令面板 |
| `F6` | 运行当前脚本 |
| `F7` | 开始/停止录制 |
| `F1-F12` | 执行绑定的宏 |
| `↑` / `↓` | 命令历史导航 |

## 新增工具库 (v1.3.0)

### Toast 通知系统
```javascript
Toast.success('操作成功')
Toast.error('操作失败')
Toast.info('提示信息')
Toast.warning('警告信息')
```

### Utils 工具库
```javascript
Utils.debounce(func, 1000)  // 防抖
Utils.throttle(func, 1000)  // 节流
Utils.sleep(1000)           // 休眠
Utils.formatFileSize(1024)  // 格式化文件大小
Utils.formatTime(new Date()) // 格式化时间
```

### 工作流模板
```javascript
WorkflowTemplates.applyTemplate('browserAutomation')
```

## 项目结构

```
desktop-robot/
├── src/
│   ├── main.js          # Electron 主进程
│   ├── index.html       # 主界面 HTML
│   ├── styles.css       # 样式文件
│   ├── renderer.js      # 渲染进程（UI 逻辑）
│   ├── workflow.js      # 工作流模块
│   ├── templates.js     # 模板库模块
│   └── ai-assistant.js  # AI 助手模块
├── package.json         # 项目配置
├── README.md            # 说明文档
├── USER_GUIDE.md        # 使用指南
├── FEATURES.md          # 功能详情
└── CHANGELOG.md         # 更新日志
```

## 打包发布

```bash
# 构建应用
npm run build

# 输出位置
# macOS: dist/Desktop Robot.dmg
# Windows: dist/Desktop Robot Setup.exe
# Linux: dist/Desktop Robot.AppImage
```

## 依赖说明

| 依赖 | 说明 |
|------|------|
| electron | 跨平台桌面应用框架 |
| robotjs | 跨平台鼠标键盘模拟库 |

## 文档

- [USER_GUIDE.md](USER_GUIDE.md) - 完整使用指南
- [FEATURES.md](FEATURES.md) - 功能详情说明
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 安全提示

- ⚠️ 运行脚本前请确保了解其操作
- ⚠️ 建议在测试环境中先试用
- ⚠️ 不要运行来源不明的脚本
- ⚠️ Shell 命令执行需谨慎

## 常见问题

### Q: 应用无法控制鼠标键盘？
A: macOS 需要在 **系统偏好设置 > 安全性与隐私 > 隐私 > 辅助功能** 中授予权限。

### Q: 系统工具功能不可用？
A: 部分系统工具功能仅支持 macOS。

### Q: 如何备份我的宏和脚本？
A: 在「设置」面板中点击「导出数据」保存备份文件。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
