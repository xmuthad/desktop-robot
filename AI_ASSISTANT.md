# AI 自动响应 - 使用指南

## 功能说明

AI 助手模块可以自动检测终端中的问题并自动回复，让 Claude CLI 能够长时间自动运行。

## 快速开始

### 1. 启动应用
```bash
cd /Users/holgerhou/holger/dev/desktop-robot
npm start
```

### 2. 配置 AI 助手
1. 打开应用，点击左侧菜单的 **设置**
2. 找到 **AI 自动响应** 部分
3. 配置以下选项：
   - **启用自动响应**: 勾选
   - **回复策略**: 选择"总是确认"或"智能判断"
   - **检查间隔**: 建议 2 秒
   - **终端日志路径**: 输入 `~/.zsh_history` (macOS 默认)

### 3. 开始监听
点击 **开始监听** 按钮，状态会显示"监听中..."

## 工作原理

### 问题检测
AI 助手会检测以下模式的问题：
- `Would you like to...?`
- `Do you want to...?`
- `Should I...?`
- `Confirm...?`
- `Continue...?`
- `[Y/n]` 或 `(Y/n)` 等确认提示
- 以 `?` 或 `:` 结尾的句子

### 自动回复
根据选择的策略自动回复：
- **总是确认**: 回复 `yes`
- **继续执行**: 回复 `continue`
- **智能判断**: 根据问题类型选择合适的回复

## 使用方法

### 方法 1: 后台监听（推荐）
1. 启动桌面机器人应用
2. 启用 AI 自动响应
3. 在另一个终端运行 Claude CLI：
   ```bash
   claude
   ```
4. AI 助手会自动检测并回答问题

### 方法 2: 使用工作流
创建一个包含以下步骤的工作流：

1. **打开应用**: `Terminal`
2. **等待**: 2 秒
3. **输入文本**: `claude`
4. **发送快捷键**: `Enter`
5. **自定义指令**: `启用 AI 助手`

### 方法 3: 终端日志监听
设置终端将输出记录到文件：

```bash
# 在 ~/.zshrc 中添加
export PROMPT_COMMAND='echo "$(date): $(history 1)" >> ~/.terminal_log'
```

然后在 AI 助手设置中设置日志路径为 `~/.terminal_log`

## 自定义回复

在设置中可以自定义回复内容，例如：
- `好的，继续`
- `yes, proceed`
- `确认执行`

多个回复用逗号分隔，AI 会随机选择一个使用。

## 注意事项

1. **权限**: 应用需要辅助功能权限才能模拟键盘输入
   - macOS: 系统设置 > 隐私与安全性 > 辅助功能

2. **终端兼容**: 不同终端的历史记录位置不同：
   - macOS (zsh): `~/.zsh_history`
   - macOS (bash): `~/.bash_history`
   - Linux (bash): `~/.bash_history`
   - Linux (zsh): `~/.zsh_history`

3. **Claude CLI 会话**: 对于长时间的编程任务，建议使用 `tmux` 或 `screen` 保持会话

## 高级用法

### 使用会话记录
```javascript
// 开始记录会话
await ipcRenderer.invoke('start-session-recording');

// 添加会话内容
await ipcRenderer.invoke('add-to-session', '用户输入的内容');

// 获取会话日志
const log = await ipcRenderer.invoke('get-session-log');
```

### 创建自动编程工作流
1. 打开终端
2. 启动 Claude CLI
3. 启用 AI 助手
4. 输入初始提示词
5. AI 助手会自动回答后续问题

## 故障排除

### AI 助手没有响应
1. 检查是否启用了自动响应
2. 确认终端日志路径正确
3. 检查日志是否有读取权限
4. 尝试手动触发"测试检测"

### 回复不正确
1. 调整回复策略
2. 自定义回复内容
3. 检查问题模式是否匹配

### 应用崩溃
1. 检查是否有辅助功能权限
2. 尝试重启应用
3. 查看控制台错误信息

## 相关文件

- `src/ai-assistant.js` - AI 助手主模块
- `src/main.js` - IPC 处理器（添加了终端日志读取）
- `src/renderer.js` - 渲染进程（初始化 AI 助手）
- `src/index.html` - UI 界面（添加了 AI 设置面板）
