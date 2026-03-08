const { ipcRenderer } = require('electron');

// 导出 ipcRenderer 到全局作用域，供其他模块使用
window.ipcRenderer = ipcRenderer;

// 全局错误监听
window.addEventListener('error', (e) => {
  console.error('全局错误:', e.error);
  console.error('位置:', e.filename, e.lineno, e.colno);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('未处理的 Promise 拒绝:', e.reason);
});

// 状态
let currentScript = null;
let recordedCommands = [];
let isRecording = false;
let scripts = [];
let tasks = [];
let clipboardHistory = [];
let autoclickerInterval = null;
let autoclickerCount = 0;
let macros = [];
let currentMacro = null;
let macroHotkeys = {};

// 设置
const settings = {
  mouseSpeed: 50,
  defaultDelay: 0.5,
  confirmExecution: false,
  logMaxLines: 200
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initTabs();
  initCommandButtons();
  initAdvancedFeatures();
  initScriptManagement();
  initRecorder();
  initScheduler();
  initSettings();
  initModals();

  // 绑定清空日志按钮
  const clearLogBtn = document.getElementById('clear-log-btn');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', clearLog);
  }

  // 绑定切换日志面板按钮
  const toggleLogBtn = document.getElementById('toggle-log-btn');
  const logPanel = document.getElementById('log-panel');
  if (toggleLogBtn && logPanel) {
    toggleLogBtn.addEventListener('click', () => {
      logPanel.classList.toggle('show');
    });
  }

  // 初始化工作流和模板模块
  if (typeof workflowModule !== 'undefined') {
    workflowModule.init();
  }
  if (typeof templatesModule !== 'undefined') {
    templatesModule.init();
  }
  // 初始化 AI 助手模块
  if (typeof aiAssistantModule !== 'undefined') {
    aiAssistantModule.init();
  }

  loadScriptsList();
  loadTasks();
  updateMousePosition();

  // 定时更新鼠标位置
  setInterval(updateMousePosition, 500);

  // 加载剪贴板历史
  loadClipboardHistory();

  // 全局快捷键
  document.addEventListener('keydown', handleGlobalKeydown);
});

// 日志功能
function log(message, type = 'info') {
  const logContent = document.getElementById('log-content');
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.innerHTML = `<span class="log-time">[${time}]</span>${message}`;
  logContent.appendChild(entry);

  // 限制日志行数
  const maxLines = settings.logMaxLines;
  while (logContent.children.length > maxLines) {
    logContent.removeChild(logContent.firstChild);
  }

  logContent.scrollTop = logContent.scrollHeight;
}

function clearLog() {
  document.getElementById('log-content').innerHTML = '';
  log('日志已清空', 'info');
}

function setStatus(text, type = 'ready') {
  document.getElementById('status-text').textContent = text;
  const dot = document.getElementById('status-dot');
  dot.style.background = type === 'running' ? 'var(--warning)' :
                          type === 'error' ? 'var(--danger)' : 'var(--success)';
}

// 标签页切换
function initTabs() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.panel');

  if (navItems.length === 0 || panels.length === 0) {
    console.warn('警告：未找到导航项或面板元素');
    return;
  }

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.dataset.tab;
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      panels.forEach(p => p.classList.remove('active'));
      const panel = document.getElementById(`${tab}-panel`);
      if (panel) {
        panel.classList.add('active');
      }

      if (tab === 'scripts') loadScriptsList();
      if (tab === 'scheduler') updateTaskScriptSelect();
    });
  });

  console.log(`标签页初始化完成 ✓ (找到 ${navItems.length} 个导航项，${panels.length} 个面板)`);
}

// 命令按钮
function initCommandButtons() {
  const cmdButtons = document.querySelectorAll('.cmd-btn');

  cmdButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const cmd = btn.dataset.cmd;
      const action = btn.dataset.action;

      if (action === 'get-mouse-pos') {
        const pos = await ipcRenderer.invoke('get-mouse-position');
        log(`鼠标位置：${pos.x}, ${pos.y}`, 'info');
        return;
      }

      if (action === 'move-center') {
        const size = await ipcRenderer.invoke('get-screen-size');
        await ipcRenderer.invoke('mouse-move', size.width / 2, size.height / 2);
        log('鼠标已移到屏幕中心', 'success');
        return;
      }

      if (action === 'open-url') {
        const modal = document.getElementById('open-url-modal');
        if (modal) modal.classList.remove('hidden');
        return;
      }

      if (action === 'maximize-window') {
        await ipcRenderer.invoke('maximize-window');
        log('切换窗口最大化', 'success');
        return;
      }

      if (cmd) {
        executeCommand(cmd);
      }
    });
  });

  // 自定义指令
  const executeBtn = document.getElementById('execute-btn');
  const customCommandInput = document.getElementById('custom-command');

  if (executeBtn && customCommandInput) {
    executeBtn.addEventListener('click', () => {
      const cmd = customCommandInput.value.trim();
      if (cmd) {
        executeCommand(cmd);
        customCommandInput.value = '';
      }
    });

    customCommandInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        executeBtn.click();
      }
    });
  }

  // 快速指令
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.text;
      if (customCommandInput) {
        customCommandInput.value = cmd;
      }
      executeCommand(cmd);
    });
  });

  console.log('命令按钮初始化完成 ✓');
}

async function executeCommand(cmd) {
  log(`执行指令：${cmd}`, 'info');
  setStatus('执行中...', 'running');

  try {
    // 鼠标命令
    if (cmd === '点击' || cmd === '点一下') {
      await ipcRenderer.invoke('mouse-click', 'left');
    } else if (cmd === '双击' || cmd === '点两下') {
      await ipcRenderer.invoke('mouse-double-click');
    } else if (cmd === '右键' || cmd === '右击') {
      await ipcRenderer.invoke('mouse-right-click');
    }
    // 键盘命令
    else if (cmd === '按回车' || cmd === '回车' || cmd === '确定') {
      await ipcRenderer.invoke('keyboard-press', 'enter');
    } else if (cmd === '复制') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'c']);
    } else if (cmd === '粘贴') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'v']);
    } else if (cmd === '全选') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'a']);
    } else if (cmd === '撤销') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'z']);
    } else if (cmd === '保存') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 's']);
    } else if (cmd === '新建标签') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 't']);
    } else if (cmd === '关闭标签') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'w']);
    } else if (cmd === '刷新') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'r']);
    }
    // 输入文本
    else if (cmd.startsWith('输入 ')) {
      const text = cmd.slice(3);
      await ipcRenderer.invoke('keyboard-type', text);
    }
    // 浏览器命令
    else if (cmd === '打开 chrome' || cmd === '启动 chrome') {
      await ipcRenderer.invoke('open-app', 'Google Chrome');
    } else if (cmd === '打开 safari' || cmd === '启动 safari') {
      await ipcRenderer.invoke('open-app', 'Safari');
    } else if (cmd === '打开 edge' || cmd === '启动 edge') {
      await ipcRenderer.invoke('open-app', 'Microsoft Edge');
    } else if (cmd.startsWith('访问 ')) {
      const url = cmd.slice(3).trim();
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      await ipcRenderer.invoke('open-url', fullUrl);
    }
    // 窗口命令
    else if (cmd === '关闭窗口' || cmd === '关闭') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'w']);
    } else if (cmd === '最小化') {
      await ipcRenderer.invoke('keyboard-hotkey', ['command', 'm']);
    } else if (cmd === '最大化' || cmd === '全屏') {
      await ipcRenderer.invoke('keyboard-hotkey', ['control', 'command', 'f']);
    }
    // 截图
    else if (cmd === '截图' || cmd === '截屏') {
      const result = await ipcRenderer.invoke('capture-screen');
      if (result.success) {
        log(`截图已保存：${result.path}`, 'success');
      } else {
        log(`截图失败：${result.error}`, 'error');
      }
      return;
    }
    // 其他
    else if (cmd === '鼠标位置') {
      const pos = await ipcRenderer.invoke('get-mouse-position');
      log(`鼠标位置：${pos.x}, ${pos.y}`, 'info');
      return;
    }
    // 剪贴板
    else if (cmd === '获取剪贴板') {
      const text = await ipcRenderer.invoke('clipboard-get');
      document.getElementById('clipboard-content').value = text;
      log('已获取剪贴板内容', 'success');
      return;
    } else if (cmd === '清空剪贴板') {
      await ipcRenderer.invoke('clipboard-clear');
      log('剪贴板已清空', 'success');
      return;
    }
    // 自定义指令
    else {
      await ipcRenderer.invoke('keyboard-type', cmd);
    }

    log(`✓ 执行成功`, 'success');
    setStatus('就绪', 'ready');
  } catch (err) {
    log(`✗ 执行失败：${err.message}`, 'error');
    setStatus('错误', 'error');
  }
}

// 鼠标位置更新
async function updateMousePosition() {
  try {
    const pos = await ipcRenderer.invoke('get-mouse-position');
    document.getElementById('mouse-position').textContent = `${pos.x}, ${pos.y}`;
  } catch (err) {
    // 忽略错误
  }
}

// ============ 高级功能 ============
function initAdvancedFeatures() {
  // 剪贴板管理
  document.getElementById('clipboard-get-btn').addEventListener('click', async () => {
    const text = await ipcRenderer.invoke('clipboard-get');
    document.getElementById('clipboard-content').value = text;
    log('已获取剪贴板内容', 'success');
  });

  document.getElementById('clipboard-clear-btn').addEventListener('click', async () => {
    await ipcRenderer.invoke('clipboard-clear');
    document.getElementById('clipboard-content').value = '';
    log('剪贴板已清空', 'success');
  });

  // 截图
  document.getElementById('capture-screen-btn').addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('capture-screen');
    if (result.success) {
      log(`截图已保存：${result.path}`, 'success');
      showScreenshot(result.path);
    } else {
      log(`截图失败：${result.error}`, 'error');
    }
  });

  // 坐标移动
  document.getElementById('move-to-coord-btn').addEventListener('click', async () => {
    const x = parseInt(document.getElementById('coord-x').value);
    const y = parseInt(document.getElementById('coord-y').value);
    await ipcRenderer.invoke('mouse-move', x, y);
    log(`鼠标已移动到 (${x}, ${y})`, 'success');
  });

  document.getElementById('click-at-coord-btn').addEventListener('click', async () => {
    const x = parseInt(document.getElementById('coord-x').value);
    const y = parseInt(document.getElementById('coord-y').value);
    await ipcRenderer.invoke('mouse-move', x, y);
    await ipcRenderer.invoke('mouse-click', 'left');
    log(`在 (${x}, ${y}) 点击`, 'success');
  });

  // 颜色检测
  document.getElementById('detect-color-btn').addEventListener('click', async () => {
    const pos = await ipcRenderer.invoke('get-mouse-position');
    const color = await ipcRenderer.invoke('get-screen-color', pos.x, pos.y);
    document.getElementById('color-preview').style.background = `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    document.getElementById('color-rgb').textContent = `RGB: (${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`;
    document.getElementById('color-hex').textContent = `HEX: #${color.hex}`;
    log(`颜色：RGB(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}) #${color.hex}`, 'info');
  });

  // 连点器
  document.getElementById('start-autoclicker-btn').addEventListener('click', () => {
    const interval = parseInt(document.getElementById('autoclicker-interval').value);
    const count = parseInt(document.getElementById('autoclicker-count').value);

    document.getElementById('start-autoclicker-btn').disabled = true;
    document.getElementById('stop-autoclicker-btn').disabled = false;
    autoclickerCount = count;

    autoclickerInterval = setInterval(async () => {
      await ipcRenderer.invoke('mouse-click', 'left');
      log('自动点击', 'info');

      if (count > 0) {
        autoclickerCount--;
        if (autoclickerCount <= 0) {
          stopAutoclicker();
        }
      }
    }, interval);

    log(`连点器已启动 (间隔：${interval}ms)`, 'info');
  });

  document.getElementById('stop-autoclicker-btn').addEventListener('click', stopAutoclicker);
}

function stopAutoclicker() {
  if (autoclickerInterval) {
    clearInterval(autoclickerInterval);
    autoclickerInterval = null;
  }
  document.getElementById('start-autoclicker-btn').disabled = false;
  document.getElementById('stop-autoclicker-btn').disabled = true;
  log('连点器已停止', 'info');
}

async function showScreenshot(path) {
  const preview = document.getElementById('screenshot-preview');
  preview.innerHTML = `<img src="file://${path}" alt="截图" style="max-width: 100%; max-height: 200px; border-radius: 8px;">`;
}

// ============ 脚本管理 ============
function initScriptManagement() {
  const newScriptBtn = document.getElementById('new-script-btn');
  if (newScriptBtn) {
    newScriptBtn.addEventListener('click', () => {
      currentScript = { name: '未命名', commands: [] };
      updateScriptEditor();
      log('新建脚本', 'info');
    });
  }

  const saveScriptBtn = document.getElementById('save-script-btn');
  if (saveScriptBtn) {
    saveScriptBtn.addEventListener('click', saveScript);
  }
  const importScriptBtn = document.getElementById('import-script-btn');
  if (importScriptBtn) {
    importScriptBtn.addEventListener('click', () => {
      document.getElementById('script-file-input').click();
    });
  }
  const exportScriptBtn = document.getElementById('export-script-btn');
  if (exportScriptBtn) {
    exportScriptBtn.addEventListener('click', exportScript);
  }

  const scriptFileInput = document.getElementById('script-file-input');
  if (scriptFileInput) {
    scriptFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            currentScript = data;
            updateScriptEditor();
            scripts.push(currentScript);
            saveScriptsToStorage();
            loadScriptsList();
            log(`已导入脚本：${data.name}`, 'success');
          } catch (err) {
            log('导入失败：文件格式错误', 'error');
          }
        };
        reader.readAsText(file);
      }
    });
  }

  const addCommandBtn = document.getElementById('add-command-btn');
  if (addCommandBtn) {
    addCommandBtn.addEventListener('click', showAddCommandModal);
  }
  const runScriptBtn = document.getElementById('run-script-btn');
  if (runScriptBtn) {
    runScriptBtn.addEventListener('click', runScript);
  }
  const stopScriptBtn = document.getElementById('stop-script-btn');
  if (stopScriptBtn) {
    stopScriptBtn.addEventListener('click', async () => {
      await ipcRenderer.invoke('stop-script');
      log('停止脚本执行', 'info');
      runScriptBtn.disabled = false;
      stopScriptBtn.disabled = true;
    });
  }
}

function updateScriptEditor() {
  const nameInput = document.getElementById('script-name');
  const commandsContainer = document.getElementById('script-commands');

  if (currentScript) {
    nameInput.value = currentScript.name;

    if (currentScript.commands.length === 0) {
      commandsContainer.innerHTML = '<p class="empty-hint">暂无命令，点击"添加命令"开始</p>';
    } else {
      commandsContainer.innerHTML = currentScript.commands.map((cmd, index) => `
        <div class="script-command-item">
          <span class="cmd-text">${index + 1}. ${cmd.command}</span>
          <span class="cmd-delay">${cmd.delay ? `[${cmd.delay}s]` : ''}</span>
          <div class="cmd-actions">
            <button class="btn-icon" onclick="moveCommand(${index}, -1)">↑</button>
            <button class="btn-icon" onclick="moveCommand(${index}, 1)">↓</button>
            <button class="btn-icon" style="color: var(--danger)" onclick="removeCommand(${index})">🗑️</button>
          </div>
        </div>
      `).join('');
    }
  }
}

async function saveScript() {
  if (!currentScript) {
    log('请先创建或加载脚本', 'error');
    return;
  }

  const name = document.getElementById('script-name').value.trim();
  if (!name) {
    log('请输入脚本名称', 'error');
    return;
  }

  currentScript.name = name;
  scripts.push(currentScript);
  saveScriptsToStorage();
  log(`脚本已保存：${name}`, 'success');
  loadScriptsList();
}

function saveScriptsToStorage() {
  localStorage.setItem('desktop-robot-scripts', JSON.stringify(scripts));
}

function loadScriptsList() {
  const listEl = document.getElementById('scripts-list');
  const saved = localStorage.getItem('desktop-robot-scripts');
  if (saved) scripts = JSON.parse(saved);

  if (scripts.length === 0) {
    listEl.innerHTML = '<li class="empty-hint">暂无脚本</li>';
    return;
  }

  listEl.innerHTML = scripts.map((script, index) => `
    <li data-index="${index}">
      📜 ${script.name}
      <span style="color: var(--text-secondary); font-size: 12px">(${script.commands.length}条)</span>
    </li>
  `).join('');

  listEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const index = parseInt(li.dataset.index);
      currentScript = scripts[index];
      updateScriptEditor();
      listEl.querySelectorAll('li').forEach(l => l.classList.remove('active'));
      li.classList.add('active');
      log(`加载脚本：${currentScript.name}`, 'info');
    });
  });
}

function exportScript() {
  if (!currentScript || currentScript.commands.length === 0) {
    log('没有可导出的脚本', 'error');
    return;
  }

  const dataStr = JSON.stringify(currentScript, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentScript.name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log(`脚本已导出：${currentScript.name}.json`, 'success');
}

window.moveCommand = function(index, direction) {
  if (!currentScript) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentScript.commands.length) return;
  [currentScript.commands[index], currentScript.commands[newIndex]] =
  [currentScript.commands[newIndex], currentScript.commands[index]];
  updateScriptEditor();
};

window.removeCommand = function(index) {
  if (!currentScript) return;
  currentScript.commands.splice(index, 1);
  updateScriptEditor();
};

async function runScript() {
  if (!currentScript || currentScript.commands.length === 0) {
    log('脚本为空', 'error');
    return;
  }

  document.getElementById('run-script-btn').disabled = true;
  document.getElementById('stop-script-btn').disabled = false;
  log(`开始执行脚本：${currentScript.name}`, 'info');

  const result = await ipcRenderer.invoke('run-script', currentScript.commands);
  document.getElementById('run-script-btn').disabled = false;
  document.getElementById('stop-script-btn').disabled = true;

  if (result.success) {
    const successCount = result.results.filter(r => r.success).length;
    log(`脚本执行完成：成功 ${successCount}/${result.results.length}`, 'success');
  } else {
    log(`脚本执行失败：${result.error}`, 'error');
  }
}

// ============ 录制功能 ============
function initRecorder() {
  document.getElementById('start-record-btn').addEventListener('click', startRecording);
  document.getElementById('stop-record-btn').addEventListener('click', stopRecording);
  document.getElementById('save-record-btn').addEventListener('click', saveRecordedScript);
}

function startRecording() {
  isRecording = true;
  recordedCommands = [];
  document.getElementById('start-record-btn').disabled = true;
  document.getElementById('stop-record-btn').disabled = false;
  document.getElementById('recorder-status').querySelector('.status-text').textContent = '正在录制...';
  document.getElementById('recorder-status').querySelector('.recording-indicator').classList.add('active');
  log('开始录制', 'info');
}

function stopRecording() {
  isRecording = false;
  document.getElementById('start-record-btn').disabled = false;
  document.getElementById('stop-record-btn').disabled = true;
  document.getElementById('recorder-status').querySelector('.status-text').textContent = '未录制';
  document.getElementById('recorder-status').querySelector('.recording-indicator').classList.remove('active');
  document.getElementById('save-record-btn').disabled = false;
  updateRecordedList();
  log(`停止录制，共 ${recordedCommands.length} 条命令`, 'info');
}

function addRecordedCommand(command, delay = 0.5) {
  if (!isRecording) return;
  recordedCommands.push({ command, delay });
  updateRecordedList();
}

function updateRecordedList() {
  const listEl = document.getElementById('recorded-list');
  if (recordedCommands.length === 0) {
    listEl.innerHTML = '<li class="empty-hint">暂无录制命令</li>';
    return;
  }
  listEl.innerHTML = recordedCommands.map((cmd, index) => `
    <li>
      <span>${index + 1}. ${cmd.command}</span>
      <span class="cmd-delay">${cmd.delay ? `[${cmd.delay}s]` : ''}</span>
    </li>
  `).join('');
}

function saveRecordedScript() {
  if (recordedCommands.length === 0) {
    log('没有录制的命令', 'error');
    return;
  }

  const name = document.getElementById('record-name').value.trim() || '录制的脚本';
  currentScript = { name, commands: recordedCommands };
  scripts.push(currentScript);
  saveScriptsToStorage();
  log(`脚本已保存：${name}`, 'success');

  document.getElementById('start-record-btn').disabled = false;
  document.getElementById('stop-record-btn').disabled = true;
  document.getElementById('save-record-btn').disabled = true;
  document.getElementById('recorder-status').querySelector('.status-text').textContent = '未录制';
  document.getElementById('recorder-status').querySelector('.recording-indicator').classList.remove('active');
  document.getElementById('record-name').value = '';
  recordedCommands = [];
  updateRecordedList();
}

// ============ 定时任务 ============
function initScheduler() {
  document.getElementById('add-task-btn').addEventListener('click', addTask);
  checkScheduledTasks();
  setInterval(checkScheduledTasks, 60000); // 每分钟检查一次
}

function loadTasks() {
  const saved = localStorage.getItem('desktop-robot-tasks');
  if (saved) tasks = JSON.parse(saved);
  updateTasksList();
}

function addTask() {
  const name = document.getElementById('task-name').value.trim();
  const scriptName = document.getElementById('task-script-select').value;
  const time = document.getElementById('task-time').value;
  const enabled = document.getElementById('task-enabled').checked;

  if (!name || !time) {
    log('请填写完整的任务信息', 'error');
    return;
  }

  tasks.push({
    id: Date.now(),
    name,
    scriptName,
    time,
    enabled,
    lastRun: null
  });

  localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
  updateTasksList();
  log(`定时任务已添加：${name}`, 'success');

  document.getElementById('task-name').value = '';
  document.getElementById('task-time').value = '';
}

function updateTasksList() {
  const listEl = document.getElementById('tasks-list');
  if (tasks.length === 0) {
    listEl.innerHTML = '<li class="empty-hint">暂无定时任务</li>';
    return;
  }

  listEl.innerHTML = tasks.map(task => `
    <li class="task-item ${task.enabled ? 'enabled' : 'disabled'}">
      <div class="task-info">
        <span class="task-name">${task.name}</span>
        <span class="task-script">📜 ${task.scriptName}</span>
        <span class="task-time">⏰ ${task.time}</span>
      </div>
      <div class="task-actions">
        <button class="btn-icon" onclick="toggleTask(${task.id})">${task.enabled ? '✅' : '⏸️'}</button>
        <button class="btn-icon" style="color: var(--danger)" onclick="deleteTask(${task.id})">🗑️</button>
      </div>
    </li>
  `).join('');
}

function updateTaskScriptSelect() {
  const select = document.getElementById('task-script-select');
  if (scripts.length === 0) {
    select.innerHTML = '<option value="">暂无脚本</option>';
    return;
  }
  select.innerHTML = scripts.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

window.toggleTask = function(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.enabled = !task.enabled;
    localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
    updateTasksList();
    log(`任务 ${task.enabled ? '已启用' : '已禁用'}: ${task.name}`, 'info');
  }
};

window.deleteTask = function(id) {
  tasks = tasks.filter(t => t.id !== id);
  localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
  updateTasksList();
  log('任务已删除', 'info');
};

async function checkScheduledTasks() {
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const task of tasks) {
    if (task.enabled && task.time === currentTime && task.lastRun !== now.toDateString()) {
      log(`执行定时任务：${task.name}`, 'info');
      const script = scripts.find(s => s.name === task.scriptName);
      if (script) {
        currentScript = script;
        updateScriptEditor();
        runScript();
      }
      task.lastRun = now.toDateString();
    }
  }
  localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
}

// ============ 设置 ============
function initSettings() {
  const mouseSpeedSlider = document.getElementById('mouse-speed');
  const mouseSpeedValue = document.getElementById('mouse-speed-value');

  mouseSpeedSlider.addEventListener('input', () => {
    mouseSpeedValue.textContent = mouseSpeedSlider.value;
    settings.mouseSpeed = mouseSpeedSlider.value;
  });

  document.getElementById('default-delay').addEventListener('change', (e) => {
    settings.defaultDelay = e.target.value;
  });

  document.getElementById('log-max-lines').addEventListener('change', (e) => {
    settings.logMaxLines = e.target.value;
  });

  // 数据管理
  document.getElementById('export-data-btn').addEventListener('click', exportAllData);
  document.getElementById('import-data-btn').addEventListener('click', importAllData);
  document.getElementById('clear-data-btn').addEventListener('click', clearAllData);
}

function loadSettings() {
  const saved = localStorage.getItem('desktop-robot-settings');
  if (saved) {
    const s = JSON.parse(saved);
    Object.assign(settings, s);
    document.getElementById('mouse-speed').value = settings.mouseSpeed;
    document.getElementById('mouse-speed-value').textContent = settings.mouseSpeed;
    document.getElementById('default-delay').value = settings.defaultDelay;
    document.getElementById('log-max-lines').value = settings.logMaxLines;
  }
}

function exportAllData() {
  const data = {
    scripts,
    tasks,
    settings,
    clipboardHistory
  };
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `desktop-robot-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log('数据已导出', 'success');
}

function importAllData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.scripts) scripts = data.scripts;
          if (data.tasks) tasks = data.tasks;
          if (data.settings) Object.assign(settings, data.settings);
          if (data.clipboardHistory) clipboardHistory = data.clipboardHistory;
          saveScriptsToStorage();
          localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
          localStorage.setItem('desktop-robot-settings', JSON.stringify(settings));
          loadScriptsList();
          updateTasksList();
          log('数据已导入', 'success');
        } catch (err) {
          log('导入失败：文件格式错误', 'error');
        }
      };
      reader.readAsText(file);
    }
  };
  input.click();
}

function clearAllData() {
  if (confirm('确定要清空所有数据吗？此操作不可恢复。')) {
    localStorage.clear();
    scripts = [];
    tasks = [];
    clipboardHistory = [];
    loadScriptsList();
    updateTasksList();
    log('所有数据已清空', 'warning');
  }
}

function loadClipboardHistory() {
  const saved = localStorage.getItem('desktop-robot-clipboard-history');
  if (saved) clipboardHistory = JSON.parse(saved);
}

// ============ 模态框 ============
function initModals() {
  document.getElementById('cancel-add-cmd').addEventListener('click', hideAddCommandModal);
  document.getElementById('confirm-add-cmd').addEventListener('click', confirmAddCommand);

  document.getElementById('command-type').addEventListener('change', (e) => {
    const valueContainer = document.getElementById('command-value-container');
    const valueLabel = document.getElementById('command-value-label');
    const valueInput = document.getElementById('command-value');

    if (['type', 'open-url', 'custom'].includes(e.target.value)) {
      valueContainer.classList.remove('hidden');
      valueLabel.textContent = e.target.value === 'type' ? '文本内容' : '网址';
      valueInput.placeholder = e.target.value === 'type' ? '输入要输入的文本' : '输入网址';
    } else {
      valueContainer.classList.add('hidden');
    }
  });

  document.getElementById('cancel-url-btn').addEventListener('click', () => {
    document.getElementById('open-url-modal').classList.add('hidden');
  });

  document.getElementById('confirm-url-btn').addEventListener('click', () => {
    const url = document.getElementById('url-input').value.trim();
    if (url) {
      executeCommand(`访问 ${url}`);
      document.getElementById('url-input').value = '';
      document.getElementById('open-url-modal').classList.add('hidden');
    }
  });
}

function showAddCommandModal() {
  document.getElementById('add-command-modal').classList.remove('hidden');
}

function hideAddCommandModal() {
  document.getElementById('add-command-modal').classList.add('hidden');
  document.getElementById('command-type').value = 'custom';
  document.getElementById('command-value-container').classList.add('hidden');
  document.getElementById('command-value').value = '';
}

function confirmAddCommand() {
  if (!currentScript) currentScript = { name: '未命名', commands: [] };

  const type = document.getElementById('command-type').value;
  const value = document.getElementById('command-value').value.trim();
  const delay = parseFloat(document.getElementById('command-delay').value) || 0.5;

  let command = '';
  switch (type) {
    case 'click': command = '点击'; break;
    case 'double-click': command = '双击'; break;
    case 'right-click': command = '右键'; break;
    case 'enter': command = '按回车'; break;
    case 'type': command = `输入 ${value}`; break;
    case 'copy': command = '复制'; break;
    case 'paste': command = '粘贴'; break;
    case 'save': command = '保存'; break;
    case 'undo': command = '撤销'; break;
    case 'new-tab': command = '新建标签'; break;
    case 'close-tab': command = '关闭标签'; break;
    case 'refresh': command = '刷新'; break;
    case 'open-chrome': command = '打开 chrome'; break;
    case 'open-safari': command = '打开 safari'; break;
    case 'open-url': command = `访问 ${value}`; break;
    case 'screenshot': command = '截图'; break;
    case 'custom': command = value || '点击'; break;
  }

  currentScript.commands.push({ command, delay });
  updateScriptEditor();
  hideAddCommandModal();
  log(`添加命令：${command}`, 'info');
}

// 全局快捷键
function handleGlobalKeydown(e) {
  // F6: 运行脚本
  if (e.key === 'F6') {
    e.preventDefault();
    if (currentScript && currentScript.commands.length > 0) {
      runScript();
    }
  }
  // F7: 快速录制
  if (e.key === 'F7') {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }
}

// 录制期间监听指令执行
const originalExecuteCommand = executeCommand;
executeCommand = function(cmd) {
  originalExecuteCommand(cmd);
  addRecordedCommand(cmd, 0.5);
};

// ============ 键盘宏功能 ============

/**
 * 加载宏列表
 */
function loadMacros() {
  const saved = localStorage.getItem('desktop-robot-macros');
  if (saved) {
    macros = JSON.parse(saved);
  }
  renderMacroList();
  initMacroUI();
}

/**
 * 保存宏到存储
 */
function saveMacros() {
  localStorage.setItem('desktop-robot-macros', JSON.stringify(macros));
}

/**
 * 渲染宏列表
 */
function renderMacroList() {
  const listEl = document.getElementById('macro-list');
  if (!listEl) return;
  
  if (macros.length === 0) {
    listEl.innerHTML = '<li class="empty-hint">暂无宏</li>';
    return;
  }
  
  listEl.innerHTML = macros.map((macro, index) => `
    <li data-index="${index}" class="${currentMacro && currentMacro.id === macro.id ? 'active' : ''}">
      <div style="font-weight: 600;">${macro.name}</div>
      <div style="font-size: 11px; color: var(--text-secondary);">
        ${macro.commands?.length || 0} 个命令 ${macro.hotkey ? `• ${macro.hotkey}` : ''}
      </div>
    </li>
  `).join('');
  
  listEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const index = parseInt(li.dataset.index);
      currentMacro = macros[index];
      renderMacroList();
      renderMacroEditor();
      log(`加载宏：${currentMacro.name}`, 'info');
    });
  });
}

/**
 * 渲染宏编辑器
 */
function renderMacroEditor() {
  if (!currentMacro) return;
  
  document.getElementById('macro-name').value = currentMacro.name || '';
  document.getElementById('macro-hotkey').value = currentMacro.hotkey || '';
  
  const container = document.getElementById('macro-commands');
  const commands = currentMacro.commands || [];
  
  if (commands.length === 0) {
    container.innerHTML = '<p class="empty-hint">暂无宏命令，点击"添加宏命令"开始</p>';
    return;
  }
  
  container.innerHTML = commands.map((cmd, index) => `
    <div class="macro-cmd-item">
      <span class="cmd-key">${cmd.key || '未知'}</span>
      <span class="cmd-action">${cmd.actionType || 'hotkey'}: ${cmd.actionValue || ''}</span>
      <span class="cmd-delay">${cmd.delay ? `[${cmd.delay}s]` : ''}</span>
      <div class="cmd-actions">
        <button class="btn-icon" onclick="moveMacroCommand(${index}, -1)">↑</button>
        <button class="btn-icon" onclick="moveMacroCommand(${index}, 1)">↓</button>
        <button class="btn-icon" style="color: var(--danger)" onclick="removeMacroCommand(${index})">🗑️</button>
      </div>
    </div>
  `).join('');
}

/**
 * 初始化宏 UI 事件
 */
function initMacroUI() {
  // 新建宏
  const newMacroBtn = document.getElementById('new-macro-btn');
  if (newMacroBtn) {
    newMacroBtn.addEventListener('click', () => {
      currentMacro = { id: Date.now(), name: '新宏', hotkey: '', commands: [] };
      renderMacroList();
      renderMacroEditor();
      log('新建宏', 'info');
    });
  }
  
  // 保存宏
  const saveMacroBtn = document.getElementById('save-macro-btn');
  if (saveMacroBtn) {
    saveMacroBtn.addEventListener('click', saveMacro);
  }
  
  // 添加宏命令
  const addMacroCmdBtn = document.getElementById('add-macro-cmd-btn');
  if (addMacroCmdBtn) {
    addMacroCmdBtn.addEventListener('click', showAddMacroCommandModal);
  }
  
  // 运行宏
  const runMacroBtn = document.getElementById('run-macro-btn');
  if (runMacroBtn) {
    runMacroBtn.addEventListener('click', runMacro);
  }
  
  // 宏名称变更
  const macroNameInput = document.getElementById('macro-name');
  if (macroNameInput) {
    macroNameInput.addEventListener('change', (e) => {
      if (currentMacro) {
        currentMacro.name = e.target.value.trim() || '未命名';
      }
    });
  }
  
  // 宏快捷键变更
  const macroHotkeySelect = document.getElementById('macro-hotkey');
  if (macroHotkeySelect) {
    macroHotkeySelect.addEventListener('change', (e) => {
      if (currentMacro) {
        currentMacro.hotkey = e.target.value;
        registerMacroHotkeys();
      }
    });
  }
  
  // 模态框事件
  document.getElementById('cancel-add-macro-cmd')?.addEventListener('click', hideAddMacroCommandModal);
  document.getElementById('confirm-add-macro-cmd')?.addEventListener('click', confirmAddMacroCommand);
  
  // 宏动作类型变更
  document.getElementById('macro-action-type')?.addEventListener('change', (e) => {
    const valueContainer = document.getElementById('macro-action-value-container');
    if (['type', 'custom'].includes(e.target.value)) {
      valueContainer.classList.remove('hidden');
      document.getElementById('macro-action-value').placeholder = e.target.value === 'type' ? '输入文本' : '自定义指令';
    } else {
      valueContainer.classList.add('hidden');
    }
  });
}

/**
 * 保存宏
 */
function saveMacro() {
  if (!currentMacro) {
    log('请先创建或加载宏', 'error');
    return;
  }
  
  const name = document.getElementById('macro-name').value.trim();
  if (!name) {
    log('请输入宏名称', 'error');
    return;
  }
  
  currentMacro.name = name;
  currentMacro.hotkey = document.getElementById('macro-hotkey').value;
  
  const existingIndex = macros.findIndex(m => m.id === currentMacro.id);
  if (existingIndex >= 0) {
    macros[existingIndex] = currentMacro;
  } else {
    macros.push(currentMacro);
  }
  
  saveMacros();
  renderMacroList();
  registerMacroHotkeys();
  log(`宏已保存：${name}`, 'success');
}

/**
 * 运行宏
 */
async function runMacro() {
  if (!currentMacro || !currentMacro.commands || currentMacro.commands.length === 0) {
    log('宏为空', 'error');
    return;
  }
  
  log(`开始运行宏：${currentMacro.name}`, 'info');
  setStatus('宏运行中...', 'running');
  
  for (const cmd of currentMacro.commands) {
    try {
      await executeMacroCommand(cmd);
      if (cmd.delay && cmd.delay > 0) {
        await sleep(cmd.delay * 1000);
      }
    } catch (err) {
      log(`宏命令执行失败：${err.message}`, 'error');
    }
  }
  
  setStatus('就绪', 'ready');
  log('宏运行完成', 'success');
}

/**
 * 执行单个宏命令
 */
async function executeMacroCommand(cmd) {
  switch (cmd.actionType) {
    case 'hotkey':
      // 解析快捷键
      const keys = parseKeyCombination(cmd.key);
      if (keys.length > 0) {
        await ipcRenderer.invoke('keyboard-hotkey', keys);
      }
      break;
    
    case 'type':
      if (cmd.actionValue) {
        await ipcRenderer.invoke('keyboard-type', cmd.actionValue);
      }
      break;
    
    case 'custom':
      if (cmd.actionValue) {
        await executeCommand(cmd.actionValue);
      }
      break;
  }
}

/**
 * 解析按键组合
 */
function parseKeyCombination(keyStr) {
  if (!keyStr) return [];
  
  const modifiers = [];
  const mainKey = [];
  const modifierMap = {
    'ctrl': 'control',
    'control': 'control',
    'cmd': 'command',
    'command': 'command',
    'alt': 'alt',
    'option': 'alt',
    'shift': 'shift'
  };
  
  const parts = keyStr.toLowerCase().split('+').map(k => k.trim());
  
  for (const part of parts) {
    if (modifierMap[part]) {
      modifiers.push(modifierMap[part]);
    } else {
      mainKey.push(part.toUpperCase());
    }
  }
  
  return [...modifiers, ...mainKey];
}

/**
 * 注册宏快捷键
 */
function registerMacroHotkeys() {
  // 清除旧的快捷键映射
  macroHotkeys = {};
  
  // 建立新的快捷键映射
  for (const macro of macros) {
    if (macro.hotkey && macro.commands && macro.commands.length > 0) {
      macroHotkeys[macro.hotkey] = macro;
    }
  }
  
  log(`已注册 ${Object.keys(macroHotkeys).length} 个宏快捷键`, 'info');
}

/**
 * 显示添加宏命令模态框
 */
function showAddMacroCommandModal() {
  document.getElementById('add-macro-cmd-modal')?.classList.remove('hidden');
}

/**
 * 隐藏添加宏命令模态框
 */
function hideAddMacroCommandModal() {
  document.getElementById('add-macro-cmd-modal')?.classList.add('hidden');
  document.getElementById('macro-key-input').value = '';
  document.getElementById('macro-action-value').value = '';
  document.getElementById('macro-action-type').value = 'hotkey';
  document.getElementById('macro-action-value-container')?.classList.add('hidden');
}

/**
 * 确认添加宏命令
 */
function confirmAddMacroCommand() {
  if (!currentMacro) {
    currentMacro = { id: Date.now(), name: '新宏', hotkey: '', commands: [] };
  }
  
  const key = document.getElementById('macro-key-input').value.trim();
  const actionType = document.getElementById('macro-action-type').value;
  const actionValue = document.getElementById('macro-action-value').value.trim();
  const delay = parseFloat(document.getElementById('macro-cmd-delay').value) || 0.1;
  
  if (!key && actionType === 'hotkey') {
    log('请输入按键', 'error');
    return;
  }
  
  currentMacro.commands.push({
    key: key || actionValue,
    actionType,
    actionValue: actionType === 'hotkey' ? key : actionValue,
    delay
  });
  
  renderMacroEditor();
  hideAddMacroCommandModal();
  log(`添加宏命令：${key}`, 'info');
}

/**
 * 移动宏命令位置
 */
window.moveMacroCommand = function(index, direction) {
  if (!currentMacro) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= currentMacro.commands.length) return;
  
  [currentMacro.commands[index], currentMacro.commands[newIndex]] =
  [currentMacro.commands[newIndex], currentMacro.commands[index]];
  renderMacroEditor();
};

/**
 * 删除宏命令
 */
window.removeMacroCommand = function(index) {
  if (!currentMacro) return;
  currentMacro.commands.splice(index, 1);
  renderMacroEditor();
};

/**
 * 处理宏快捷键
 */
function handleMacroKeydown(e) {
  // 检查是否匹配宏快捷键
  if (macroHotkeys[e.key]) {
    const macro = macroHotkeys[e.key];
    log(`触发宏快捷键：${e.key} -> ${macro.name}`, 'info');
    runMacro();
  }
}

// 重写全局快捷键处理函数，加入宏支持
const originalHandleGlobalKeydown = handleGlobalKeydown;
handleGlobalKeydown = function(e) {
  // 先处理宏快捷键
  handleMacroKeydown(e);
  
  // F6: 运行脚本
  if (e.key === 'F6') {
    e.preventDefault();
    if (currentScript && currentScript.commands.length > 0) {
      runScript();
    }
    return;
  }
  // F7: 快速录制
  if (e.key === 'F7') {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
    return;
  }
};

/**
 * 辅助函数：睡眠
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ 执行历史记录功能 ============

/**
 * 执行历史存储
 */
let executionHistory = [];

/**
 * 添加执行记录
 */
function addExecutionHistory(type, name, success = true) {
  const record = {
    id: Date.now(),
    type, // 'macro', 'script', 'workflow'
    name,
    success,
    timestamp: new Date().toISOString()
  };
  executionHistory.unshift(record);
  
  // 限制历史记录数量
  if (executionHistory.length > 100) {
    executionHistory = executionHistory.slice(0, 100);
  }
  
  saveExecutionHistory();
  renderExecutionHistory();
}

/**
 * 保存执行历史
 */
function saveExecutionHistory() {
  localStorage.setItem('desktop-robot-history', JSON.stringify(executionHistory));
}

/**
 * 加载执行历史
 */
function loadExecutionHistory() {
  const saved = localStorage.getItem('desktop-robot-history');
  if (saved) {
    executionHistory = JSON.parse(saved);
  }
  renderExecutionHistory();
}

/**
 * 渲染执行历史
 */
function renderExecutionHistory() {
  const historyEl = document.getElementById('execution-history');
  if (!historyEl) return;
  
  if (executionHistory.length === 0) {
    historyEl.innerHTML = '<p class="empty-hint">暂无执行记录</p>';
    return;
  }
  
  const typeIcons = {
    'macro': '⚡',
    'script': '📜',
    'workflow': '⚡'
  };
  
  historyEl.innerHTML = executionHistory.slice(0, 20).map(record => {
    const time = new Date(record.timestamp).toLocaleTimeString();
    const icon = typeIcons[record.type] || '📋';
    const statusColor = record.success ? 'var(--success)' : 'var(--danger)';
    return `
      <div class="history-item">
        <span class="history-icon">${icon}</span>
        <span class="history-name">${record.name}</span>
        <span class="history-time">${time}</span>
        <span class="history-status" style="color: ${statusColor}">
          ${record.success ? '✓' : '✗'}
        </span>
      </div>
    `;
  }).join('');
}

/**
 * 清空执行历史
 */
function clearExecutionHistory() {
  executionHistory = [];
  saveExecutionHistory();
  renderExecutionHistory();
  log('执行历史已清空', 'info');
}

// ============ 宏导入导出功能 ============

/**
 * 导出宏到文件
 */
window.exportMacro = function(index) {
  const macro = macros[index];
  if (!macro) return;

  const dataStr = JSON.stringify(macro, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `macro-${macro.name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log(`宏已导出：${macro.name}`, 'success');
}

/**
 * 导入宏文件
 */
function importMacro(file, callback) {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const macro = JSON.parse(event.target.result);
      if (!macro.name || !macro.commands) {
        throw new Error('无效的宏文件格式');
      }
      macro.id = Date.now();
      macros.push(macro);
      saveMacros();
      renderMacroList();
      registerMacroHotkeys();
      log(`宏已导入：${macro.name}`, 'success');
      if (callback) callback(macro);
    } catch (err) {
      log(`导入失败：${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

/**
 * 导出所有宏
 */
function exportAllMacros() {
  const dataStr = JSON.stringify(macros, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `desktop-robot-macros-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log(`所有宏已导出`, 'success');
}

/**
 * 导入宏文件（从文件输入）
 */
function handleMacroFileImport(file) {
  importMacro(file, (macro) => {
    currentMacro = macro;
    renderMacroList();
    renderMacroEditor();
  });
}

// ============ 快速命令面板（类似 Spotlight） ============

const quickCommandPalette = {
  visible: false,
  
  show() {
    const palette = document.getElementById('quick-command-palette');
    if (palette) {
      palette.classList.remove('hidden');
      document.getElementById('quick-command-input')?.focus();
      this.visible = true;
      this.render([]);
    }
  },
  
  hide() {
    const palette = document.getElementById('quick-command-palette');
    if (palette) {
      palette.classList.add('hidden');
      this.visible = false;
    }
  },
  
  render(commands) {
    const listEl = document.getElementById('quick-command-list');
    if (!listEl) return;
    
    if (commands.length === 0) {
      listEl.innerHTML = '<li class="empty-hint">输入关键词搜索命令</li>';
      return;
    }
    
    listEl.innerHTML = commands.map((cmd, index) => `
      <li data-index="${index}" class="quick-command-item ${index === 0 ? 'active' : ''}">
        <span class="quick-command-icon">${cmd.icon || '⚡'}</span>
        <span class="quick-command-name">${cmd.name}</span>
        <span class="quick-command-shortcut">${cmd.shortcut || ''}</span>
      </li>
    `).join('');
    
    listEl.querySelectorAll('.quick-command-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        this.execute(commands[index]);
      });
    });
  },
  
  search(query) {
    const allCommands = this.getAllCommands();
    const filtered = allCommands.filter(cmd => 
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.keywords?.some(k => k.includes(query.toLowerCase()))
    );
    this.render(filtered.slice(0, 10));
  },
  
  getAllCommands() {
    return [
      // 宏命令
      ...macros.map(m => ({
        type: 'macro',
        name: `宏：${m.name}`,
        icon: '⚡',
        shortcut: m.hotkey,
        data: m,
        keywords: ['宏', 'keyboard', 'fast']
      })),
      // 脚本命令
      ...scripts.map(s => ({
        type: 'script',
        name: `脚本：${s.name}`,
        icon: '📜',
        data: s,
        keywords: ['脚本', 'script']
      })),
      // 快捷指令
      {
        type: 'action',
        name: '截取屏幕',
        icon: '📸',
        action: () => executeCommand('截图'),
        keywords: ['截图', '屏幕', 'screenshot']
      },
      {
        type: 'action',
        name: '清空剪贴板',
        icon: '📋',
        action: () => executeCommand('清空剪贴板'),
        keywords: ['剪贴板', '清空', 'clipboard']
      },
      {
        type: 'action',
        name: '鼠标移到中心',
        icon: '🖱️',
        action: () => executeCommand('移到中心'),
        keywords: ['鼠标', '中心', 'mouse']
      },
      {
        type: 'action',
        name: '打开 Chrome',
        icon: '🌐',
        action: () => executeCommand('打开 chrome'),
        keywords: ['浏览器', 'chrome']
      }
    ];
  },
  
  async execute(command) {
    if (command.action) {
      command.action();
    } else if (command.type === 'macro') {
      currentMacro = command.data;
      runMacro();
      addExecutionHistory('macro', command.name);
    } else if (command.type === 'script') {
      currentScript = command.data;
      runScript();
      addExecutionHistory('script', command.name);
    }
    this.hide();
  },
  
  navigate(direction) {
    const listEl = document.getElementById('quick-command-list');
    if (!listEl) return;
    
    const items = listEl.querySelectorAll('.quick-command-item');
    const active = listEl.querySelector('.quick-command-item.active');
    let currentIndex = Array.from(items).indexOf(active);
    
    if (active) {
      active.classList.remove('active');
    }
    
    currentIndex += direction;
    if (currentIndex < 0) currentIndex = items.length - 1;
    if (currentIndex >= items.length) currentIndex = 0;
    
    if (items[currentIndex]) {
      items[currentIndex].classList.add('active');
    }
  },
  
  executeActive() {
    const listEl = document.getElementById('quick-command-list');
    if (!listEl) return;
    
    const active = listEl.querySelector('.quick-command-item.active');
    if (active) {
      active.click();
    }
  }
};

/**
 * 初始化快速命令面板
 */
function initQuickCommandPalette() {
  // 创建快速命令面板 HTML
  const paletteHTML = `
    <div id="quick-command-palette" class="quick-command-palette hidden">
      <div class="palette-content">
        <input type="text" id="quick-command-input" class="palette-input" placeholder="搜索命令...">
        <ul id="quick-command-list" class="quick-command-list"></ul>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', paletteHTML);
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .quick-command-palette {
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2000;
    }
    .quick-command-palette.hidden {
      display: none;
    }
    .palette-content {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      min-width: 400px;
      max-width: 600px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.4);
    }
    .palette-input {
      width: 100%;
      padding: 12px 16px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-primary);
      font-size: 16px;
      outline: none;
    }
    .palette-input:focus {
      border-color: var(--accent-primary);
    }
    .quick-command-list {
      list-style: none;
      margin-top: 12px;
      max-height: 300px;
      overflow-y: auto;
    }
    .quick-command-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .quick-command-item:hover,
    .quick-command-item.active {
      background: var(--bg-tertiary);
    }
    .quick-command-icon {
      font-size: 20px;
    }
    .quick-command-name {
      flex: 1;
      font-size: 14px;
    }
    .quick-command-shortcut {
      font-size: 12px;
      color: var(--text-secondary);
      background: var(--bg-secondary);
      padding: 2px 8px;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);
  
  // 绑定事件
  document.getElementById('quick-command-input')?.addEventListener('input', (e) => {
    quickCommandPalette.search(e.target.value);
  });
  
  document.getElementById('quick-command-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      quickCommandPalette.navigate(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      quickCommandPalette.navigate(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      quickCommandPalette.executeActive();
    } else if (e.key === 'Escape') {
      quickCommandPalette.hide();
    }
  });
  
  // 点击外部关闭
  document.addEventListener('click', (e) => {
    const palette = document.getElementById('quick-command-palette');
    if (palette && !palette.contains(e.target)) {
      quickCommandPalette.hide();
    }
  });
}

/**
 * 切换快速命令面板
 */
function toggleQuickCommandPalette() {
  if (quickCommandPalette.visible) {
    quickCommandPalette.hide();
  } else {
    quickCommandPalette.show();
  }
}

// ============ 执行统计功能 ============

const executionStats = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  macrosExecuted: 0,
  scriptsExecuted: 0,
  
  record(type, success) {
    this.totalExecutions++;
    if (success) {
      this.successfulExecutions++;
    } else {
      this.failedExecutions++;
    }
    if (type === 'macro') this.macrosExecuted++;
    if (type === 'script') this.scriptsExecuted++;
    this.save();
  },
  
  save() {
    localStorage.setItem('desktop-robot-stats', JSON.stringify(this));
  },
  
  load() {
    const saved = localStorage.getItem('desktop-robot-stats');
    if (saved) {
      const data = JSON.parse(saved);
      Object.assign(this, data);
    }
  },
  
  getSuccessRate() {
    if (this.totalExecutions === 0) return 100;
    return Math.round((this.successfulExecutions / this.totalExecutions) * 100);
  }
};

// ============ 增强的设置面板 ============

/**
 * 渲染执行统计
 */
function renderExecutionStats() {
  const statsEl = document.getElementById('execution-stats');
  if (!statsEl) return;
  
  statsEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-value">${executionStats.totalExecutions}</span>
        <span class="stat-label">总执行次数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${executionStats.successfulExecutions}</span>
        <span class="stat-label">成功次数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${executionStats.failedExecutions}</span>
        <span class="stat-label">失败次数</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">${executionStats.getSuccessRate()}%</span>
        <span class="stat-label">成功率</span>
      </div>
    </div>
  `;
}

/**
 * 添加统计显示到设置面板
 */
function injectStatsToSettings() {
  const settingsPanel = document.getElementById('settings-panel');
  if (!settingsPanel) return;
  
  const statsHTML = `
    <div class="settings-group">
      <h3>📊 执行统计</h3>
      <div id="execution-stats"></div>
      <div style="margin-top: 16px;">
        <button id="clear-stats-btn" class="btn">重置统计</button>
      </div>
    </div>
    <div class="settings-group">
      <h3>📜 执行历史</h3>
      <div id="execution-history" style="max-height: 300px; overflow-y: auto;"></div>
      <div style="margin-top: 12px;">
        <button id="clear-history-btn" class="btn">清空历史</button>
      </div>
    </div>
  `;
  
  const aboutGroup = settingsPanel.querySelector('.settings-group:last-child');
  if (aboutGroup) {
    aboutGroup.insertAdjacentHTML('beforebegin', statsHTML);
  }
  
  // 绑定事件
  document.getElementById('clear-stats-btn')?.addEventListener('click', () => {
    executionStats.totalExecutions = 0;
    executionStats.successfulExecutions = 0;
    executionStats.failedExecutions = 0;
    executionStats.macrosExecuted = 0;
    executionStats.scriptsExecuted = 0;
    executionStats.save();
    renderExecutionStats();
    log('统计已重置', 'info');
  });
  
  document.getElementById('clear-history-btn')?.addEventListener('click', clearExecutionHistory);
}

// ============ 宏导入导出 UI ============

/**
 * 添加宏导入导出按钮到宏工具栏
 */
function addMacroImportExport() {
  const toolbar = document.querySelector('.macro-toolbar');
  if (!toolbar) return;
  
  const importBtn = document.createElement('button');
  importBtn.id = 'import-macro-btn';
  importBtn.className = 'btn';
  importBtn.textContent = '📂 导入';
  
  const exportAllBtn = document.createElement('button');
  exportAllBtn.id = 'export-all-macros-btn';
  exportAllBtn.className = 'btn';
  exportAllBtn.textContent = '💾 导出全部';
  
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'macro-file-input';
  fileInput.accept = '.json';
  fileInput.style.display = 'none';
  
  toolbar.appendChild(importBtn);
  toolbar.appendChild(exportAllBtn);
  toolbar.appendChild(fileInput);
  
  // 绑定事件
  importBtn.addEventListener('click', () => {
    document.getElementById('macro-file-input').click();
  });
  
  exportAllBtn.addEventListener('click', exportAllMacros);
  
  document.getElementById('macro-file-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleMacroFileImport(file);
    }
    e.target.value = '';
  });
}

// ============ 在宏列表中添加删除按钮 ============

/**
 * 重写渲染宏列表，添加删除按钮
 */
function renderMacroListWithDelete() {
  const listEl = document.getElementById('macro-list');
  if (!listEl) return renderMacroList();
  
  if (macros.length === 0) {
    listEl.innerHTML = '<li class="empty-hint">暂无宏</li>';
    return;
  }
  
  listEl.innerHTML = macros.map((macro, index) => `
    <li data-index="${index}" class="${currentMacro && currentMacro.id === macro.id ? 'active' : ''}">
      <div style="flex: 1;">
        <div style="font-weight: 600;">${macro.name}</div>
        <div style="font-size: 11px; color: var(--text-secondary);">
          ${macro.commands?.length || 0} 个命令 ${macro.hotkey ? `• ${macro.hotkey}` : ''}
        </div>
      </div>
      <div class="workflow-list-actions">
        <button class="btn-icon" onclick="event.stopPropagation(); exportMacro(${index})">💾</button>
        <button class="btn-icon btn-delete" onclick="event.stopPropagation(); deleteMacro(${index})">🗑️</button>
      </div>
    </li>
  `).join('');
  
  listEl.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const index = parseInt(li.dataset.index);
      currentMacro = macros[index];
      renderMacroListWithDelete();
      renderMacroEditor();
      log(`加载宏：${currentMacro.name}`, 'info');
    });
  });
}

/**
 * 删除宏
 */
window.deleteMacro = function(index) {
  const macro = macros[index];
  macros.splice(index, 1);
  saveMacros();
  registerMacroHotkeys();
  renderMacroListWithDelete();
  if (currentMacro && currentMacro.id === macro.id) {
    currentMacro = null;
    renderMacroEditor();
  }
  log(`已删除宏：${macro.name}`, 'info');
};

// ============ 重写 saveMacro 使用新的渲染函数 ============

const originalSaveMacro = saveMacro;
saveMacro = function() {
  if (!currentMacro) {
    log('请先创建或加载宏', 'error');
    return;
  }
  
  const name = document.getElementById('macro-name').value.trim();
  if (!name) {
    log('请输入宏名称', 'error');
    return;
  }
  
  currentMacro.name = name;
  currentMacro.hotkey = document.getElementById('macro-hotkey').value;
  
  const existingIndex = macros.findIndex(m => m.id === currentMacro.id);
  if (existingIndex >= 0) {
    macros[existingIndex] = currentMacro;
  } else {
    macros.push(currentMacro);
  }
  
  saveMacros();
  renderMacroListWithDelete();
  registerMacroHotkeys();
  log(`宏已保存：${name}`, 'success');
};

// ============ 重写 runMacro 添加统计记录 ============

const originalRunMacro = runMacro;
runMacro = async function() {
  if (!currentMacro || !currentMacro.commands || currentMacro.commands.length === 0) {
    log('宏为空', 'error');
    return;
  }
  
  log(`开始运行宏：${currentMacro.name}`, 'info');
  setStatus('宏运行中...', 'running');
  
  let success = true;
  for (const cmd of currentMacro.commands) {
    try {
      await executeMacroCommand(cmd);
      if (cmd.delay && cmd.delay > 0) {
        await sleep(cmd.delay * 1000);
      }
    } catch (err) {
      log(`宏命令执行失败：${err.message}`, 'error');
      success = false;
    }
  }
  
  setStatus('就绪', 'ready');
  log('宏运行完成', 'success');
  
  executionStats.record('macro', success);
  addExecutionHistory('macro', currentMacro.name, success);
  renderExecutionStats();
};

// ============ 重写 runScript 添加统计记录 ============

const originalRunScript = runScript;
runScript = async function() {
  if (!currentScript || currentScript.commands.length === 0) {
    log('脚本为空', 'error');
    return;
  }
  
  document.getElementById('run-script-btn').disabled = true;
  document.getElementById('stop-script-btn').disabled = false;
  log(`开始执行脚本：${currentScript.name}`, 'info');
  
  const result = await ipcRenderer.invoke('run-script', currentScript.commands);
  document.getElementById('run-script-btn').disabled = false;
  document.getElementById('stop-script-btn').disabled = true;
  
  let success = false;
  if (result.success) {
    const successCount = result.results.filter(r => r.success).length;
    log(`脚本执行完成：成功 ${successCount}/${result.results.length}`, 'success');
    success = successCount === result.results.length;
  } else {
    log(`脚本执行失败：${result.error}`, 'error');
  }
  
  executionStats.record('script', success);
  addExecutionHistory('script', currentScript.name, success);
  renderExecutionStats();
};

// ============ 初始化增强功能 ============

/**
 * 初始化所有增强功能
 */
function initEnhancedFeatures() {
  // 加载执行历史
  loadExecutionHistory();
  
  // 加载统计
  executionStats.load();
  
  // 初始化快速命令面板
  initQuickCommandPalette();
  
  // 添加宏导入导出功能
  addMacroImportExport();
  
  // 注入统计到设置面板
  injectStatsToSettings();
  
  // 使用增强版的渲染函数
  renderMacroList = renderMacroListWithDelete;
  renderMacroListWithDelete();
  
  // 渲染统计
  renderExecutionStats();
  
  log('增强功能已初始化', 'success');
}

// 在 DOMContentLoaded 后调用
const originalDOMContentLoaded = document.addEventListener;
document.addEventListener('DOMContentLoaded', function originalInit() {
  // 原有初始化完成后执行增强功能
  setTimeout(() => {
    initEnhancedFeatures();
  }, 100);
});

// 全局快捷键 Ctrl+K 打开快速命令面板
const originalHandleGlobalKeydown2 = handleGlobalKeydown;
handleGlobalKeydown = function(e) {
  // Ctrl+K 或 Cmd+K 打开快速命令面板
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    toggleQuickCommandPalette();
    return;
  }
  
  // Esc 关闭快速命令面板
  if (e.key === 'Escape' && quickCommandPalette.visible) {
    quickCommandPalette.hide();
    return;
  }
  
  originalHandleGlobalKeydown2(e);
};

// ============ Toast 通知系统 ============

const Toast = {
  /**
   * 显示提示消息
   * @param {string} message - 消息内容
   * @param {string} type - 类型：success, error, info, warning
   * @param {number} duration - 显示时长（毫秒）
   */
  show(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${this.getIcon(type)}</span>
      <span class="toast-message">${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // 动画显示
    setTimeout(() => toast.style.opacity = '1', 10);
    
    // 自动消失
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
  },
  
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };
    return icons[type] || icons.info;
  },
  
  success(message) { return this.show(message, 'success'); },
  error(message) { return this.show(message, 'error'); },
  info(message) { return this.show(message, 'info'); },
  warning(message) { return this.show(message, 'warning'); }
};

// ============ 实用工具函数库 ============

const Utils = {
  /**
   * 防抖函数
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  
  /**
   * 节流函数
   */
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /**
   * 休眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * 格式化时间
   */
  formatTime(date) {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  },
  
  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },
  
  /**
   * 生成随机 ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },
  
  /**
   * 复制到剪贴板
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('复制失败:', err);
      return false;
    }
  },
  
  /**
   * 深拷贝对象
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  
  /**
   * 获取localStorage 对象
   */
  getStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      return null;
    }
  },
  
  /**
   * 设置 localStorage 对象
   */
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
  
  /**
   * 数组去重
   */
  uniqueArray(arr) {
    return [...new Set(arr)];
  },
  
  /**
   * 数组按属性排序
   */
  sortBy(arr, key, desc = false) {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      return desc ? bVal - aVal : aVal - bVal;
    });
  },
  
  /**
   * 分组数组
   */
  groupBy(arr, key) {
    return arr.reduce((groups, item) => {
      const group = item[key];
      if (!groups[group]) groups[group] = [];
      groups[group].push(item);
      return groups;
    }, {});
  },
  
  /**
   * 显示加载状态
   */
  showLoading(element, text = '加载中...') {
    if (!element) return;
    element.classList.add('loading');
    element.dataset.loadingText = text;
  },
  
  /**
   * 隐藏加载状态
   */
  hideLoading(element) {
    if (!element) return;
    element.classList.remove('loading');
  }
};

// ============ 增强的脚本执行 ============

/**
 * 顺序执行多个脚本
 */
async function runScriptSequence(scriptNames) {
  const scripts = Utils.getStorage('desktop-robot-scripts') || [];
  
  for (const name of scriptNames) {
    const script = scripts.find(s => s.name === name);
    if (script) {
      log(`执行脚本序列：${name}`, 'info');
      currentScript = script;
      await runScript();
      
      // 等待脚本执行完成
      await new Promise(resolve => {
        const checkInterval = setInterval(() => {
          if (!document.getElementById('run-script-btn')?.disabled) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
      });
      
      await Utils.sleep(500);
    }
  }
}

/**
 * 条件执行脚本
 */
async function runScriptIf(condition, scriptName) {
  if (condition) {
    const scripts = Utils.getStorage('desktop-robot-scripts') || [];
    const script = scripts.find(s => s.name === scriptName);
    if (script) {
      currentScript = script;
      runScript();
    }
  }
}

// ============ 快捷操作增强 ============

/**
 * 常用快捷操作集合
 */
const QuickActions = {
  /**
   * 复制当前窗口标题
   */
  async copyWindowTitle() {
    // 模拟 Alt+Tab 获取窗口信息（简化版）
    Toast.info('复制窗口标题功能需要额外权限');
  },
  
  /**
   * 快速截图并复制
   */
  async quickScreenshotAndCopy() {
    const result = await ipcRenderer.invoke('capture-screen');
    if (result.success) {
      Toast.success('截图已保存');
    }
    return result;
  },
  
  /**
   * 显示鼠标位置
   */
  async showMousePosition() {
    const pos = await ipcRenderer.invoke('get-mouse-position');
    Toast.info(`鼠标位置：(${pos.x}, ${pos.y})`);
    return pos;
  },
  
  /**
   * 高亮显示鼠标位置
   */
  async highlightMouse() {
    const pos = await ipcRenderer.invoke('get-mouse-position');
    
    // 创建高亮元素（需要在主进程中实现）
    Toast.info(`高亮位置：(${pos.x}, ${pos.y})`);
  }
};

// ============ 命令历史导航 ============

let commandHistory = [];
let commandHistoryIndex = -1;

/**
 * 添加命令到历史
 */
function addToCommandHistory(cmd) {
  if (!cmd || commandHistory[commandHistory.length - 1] === cmd) return;
  commandHistory.push(cmd);
  if (commandHistory.length > 50) {
    commandHistory.shift();
  }
  commandHistoryIndex = commandHistory.length;
  Utils.setStorage('desktop-robot-command-history', commandHistory);
}

/**
 * 加载命令历史
 */
function loadCommandHistory() {
  commandHistory = Utils.getStorage('desktop-robot-command-history') || [];
  commandHistoryIndex = commandHistory.length;
}

/**
 * 获取上一条历史命令
 */
function getPreviousCommand() {
  if (commandHistoryIndex > 0) {
    commandHistoryIndex--;
    return commandHistory[commandHistoryIndex];
  }
  return null;
}

/**
 * 获取下一条历史命令
 */
function getNextCommand() {
  if (commandHistoryIndex < commandHistory.length - 1) {
    commandHistoryIndex++;
    return commandHistory[commandHistoryIndex];
  }
  return null;
}

// ============ 增强的自定义命令输入 ============

function initEnhancedCommandInput() {
  const input = document.getElementById('custom-command');
  if (!input) return;
  
  loadCommandHistory();
  
  // 支持上下键浏览历史
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevCmd = getPreviousCommand();
      if (prevCmd) input.value = prevCmd;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextCmd = getNextCommand();
      if (nextCmd) {
        input.value = nextCmd;
      } else {
        input.value = '';
        commandHistoryIndex = commandHistory.length;
      }
    }
  });
  
  // 重写执行按钮，保存历史
  const executeBtn = document.getElementById('execute-btn');
  if (executeBtn) {
    const originalClick = executeBtn.onclick;
    executeBtn.addEventListener('click', () => {
      const cmd = input.value.trim();
      if (cmd) {
        addToCommandHistory(cmd);
      }
    });
  }
}

// ============ 工作流模板增强 ============

const WorkflowTemplates = {
  /**
   * 浏览器自动化模板
   */
  browserAutomation: {
    name: '浏览器自动化',
    steps: [
      { type: 'open-app', desc: '打开 Chrome', params: { app: 'Google Chrome' }, delay: 2 },
      { type: 'wait', desc: '等待加载', params: { seconds: 2 }, delay: 0 },
      { type: 'open-url', desc: '访问网站', params: { url: 'https://github.com' }, delay: 3 },
      { type: 'wait', desc: '等待页面', params: { seconds: 2 }, delay: 0 }
    ]
  },
  
  /**
   * 文档处理模板
   */
  documentProcessing: {
    name: '文档处理',
    steps: [
      { type: 'send-hotkey', desc: '全选', params: { modifiers: ['command'], key: 'a' }, delay: 0.3 },
      { type: 'send-hotkey', desc: '复制', params: { modifiers: ['command'], key: 'c' }, delay: 0.3 },
      { type: 'send-hotkey', desc: '新建窗口', params: { modifiers: ['command'], key: 'n' }, delay: 0.5 },
      { type: 'send-hotkey', desc: '粘贴', params: { modifiers: ['command'], key: 'v' }, delay: 0.3 },
      { type: 'send-hotkey', desc: '保存', params: { modifiers: ['command'], key: 's' }, delay: 0.3 }
    ]
  },
  
  /**
   * 数据录入模板
   */
  dataEntry: {
    name: '数据录入',
    steps: [
      { type: 'mouse-click', desc: '点击输入框', params: { type: 'left' }, delay: 0.5 },
      { type: 'type-text', desc: '输入数据', params: { text: '' }, delay: 0.5 },
      { type: 'send-hotkey', desc: '下一个字段', params: { modifiers: [], key: 'tab' }, delay: 0.3 }
    ]
  },
  
  /**
   * 应用模板到当前工作流
   */
  applyTemplate(templateKey) {
    const template = this[templateKey];
    if (!template) return false;
    
    if (!workflowModule.currentWorkflow) {
      workflowModule.createNew();
    }
    
    workflowModule.currentWorkflow.name = template.name;
    workflowModule.currentWorkflow.steps = JSON.parse(JSON.stringify(template.steps));
    workflowModule.renderEditor();
    
    Toast.success(`已应用模板：${template.name}`);
    return true;
  },
  
  /**
   * 获取所有模板列表
   */
  getTemplates() {
    return Object.keys(this)
      .filter(key => typeof this[key] === 'object' && this[key].steps)
      .map(key => ({ key, ...this[key] }));
  }
};

// ============ 批量操作功能 ============

const BatchOperations = {
  /**
   * 批量执行脚本
   */
  async runMultipleScripts(scriptNames, options = {}) {
    const { delayBetween = 1000, stopOnError = true } = options;
    const scripts = Utils.getStorage('desktop-robot-scripts') || [];
    const results = [];
    
    for (const name of scriptNames) {
      const script = scripts.find(s => s.name === name);
      if (script) {
        currentScript = script;
        log(`批量执行：${name}`, 'info');
        
        try {
          await runScript();
          results.push({ name, success: true });
          await Utils.sleep(delayBetween);
        } catch (err) {
          results.push({ name, success: false, error: err.message });
          if (stopOnError) break;
        }
      }
    }
    
    return results;
  },
  
  /**
   * 批量删除脚本
   */
  deleteMultipleScripts(scriptNames) {
    let scripts = Utils.getStorage('desktop-robot-scripts') || [];
    let deleted = 0;
    
    scripts = scripts.filter(s => {
      if (scriptNames.includes(s.name)) {
        deleted++;
        return false;
      }
      return true;
    });
    
    Utils.setStorage('desktop-robot-scripts', scripts);
    scripts = []; // 更新全局变量
    loadScriptsList();
    
    return deleted;
  },
  
  /**
   * 批量导出脚本
   */
  exportMultipleScripts(scriptNames) {
    const scripts = Utils.getStorage('desktop-robot-scripts') || [];
    const selectedScripts = scripts.filter(s => scriptNames.includes(s.name));
    
    const dataStr = JSON.stringify(selectedScripts, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scripts-batch-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    Toast.success(`已导出 ${selectedScripts.length} 个脚本`);
  }
};

// ============ 初始化增强的功能 ============

function initAllEnhancedFeatures() {
  // 初始化增强的命令输入
  initEnhancedCommandInput();
  
  // 添加模板应用到 UI
  this.addTemplateSelector();
  
  console.log('增强功能已初始化');
}

/**
 * 添加模板选择器到工作流面板
 */
function addTemplateSelector() {
  const workflowPanel = document.getElementById('workflow-panel');
  if (!workflowPanel) return;
  
  const templates = WorkflowTemplates.getTemplates();
  if (templates.length === 0) return;
  
  const templateHTML = `
    <div class="template-selector-container" style="margin-bottom: 16px;">
      <label style="font-size: 13px; color: var(--text-secondary);">快速应用模板：</label>
      <select id="workflow-template-select" class="select-input" style="margin-left: 8px;">
        <option value="">选择模板...</option>
        ${templates.map(t => `<option value="${t.key}">${t.name}</option>`).join('')}
      </select>
    </div>
  `;
  
  const toolbar = workflowPanel.querySelector('.workflow-toolbar');
  if (toolbar) {
    toolbar.insertAdjacentHTML('afterend', templateHTML);
    
    document.getElementById('workflow-template-select')?.addEventListener('change', (e) => {
      if (e.target.value) {
        WorkflowTemplates.applyTemplate(e.target.value);
        e.target.value = '';
      }
    });
  }
}

// 导出全局函数
window.Toast = Toast;
window.Utils = Utils;
window.QuickActions = QuickActions;
window.WorkflowTemplates = WorkflowTemplates;
window.BatchOperations = BatchOperations;
window.runScriptSequence = runScriptSequence;
window.runScriptIf = runScriptIf;

console.log('桌面机器人增强模块已加载 ✓');

// ============ 系统工具功能 ============

/**
 * 加载系统信息
 */
async function loadSystemInfo() {
  const container = document.getElementById('system-info');
  if (!container) return;
  
  container.innerHTML = '<p class="empty-hint">加载中...</p>';
  
  try {
    const info = await ipcRenderer.invoke('get-system-info');
    container.innerHTML = `
      <div class="info-item"><span>平台</span><span>${info.platform} ${info.arch}</span></div>
      <div class="info-item"><span>系统</span><span>${info.osVersion}</span></div>
      <div class="info-item"><span>Node 版本</span><span>${info.nodeVersion}</span></div>
      <div class="info-item"><span>CPU 核心</span><span>${info.cpuCores}</span></div>
      <div class="info-item"><span>内存</span><span>${Utils.formatFileSize(info.totalMemory)}</span></div>
      <div class="info-item"><span>可用内存</span><span>${Utils.formatFileSize(info.freeMemory)}</span></div>
      <div class="info-item"><span>运行时间</span><span>${(info.uptime / 3600).toFixed(2)} 小时</span></div>
    `;
  } catch (err) {
    container.innerHTML = `<p class="error">加载失败：${err.message}</p>`;
  }
}

/**
 * 加载进程列表
 */
async function loadProcessList() {
  const container = document.getElementById('process-list');
  if (!container) return;
  
  container.innerHTML = '<p class="empty-hint">加载中...</p>';
  
  try {
    const result = await ipcRenderer.invoke('get-process-list');
    if (result.success && result.processes) {
      container.innerHTML = result.processes.map(p => `
        <div class="process-item">
          <span class="process-name">${p.name}</span>
          <span class="process-pid">${p.pid}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<p class="error">加载失败：${result.error}</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="error">加载失败：${err.message}</p>`;
  }
}

/**
 * 加载网络信息
 */
async function loadNetworkInfo() {
  const container = document.getElementById('network-info');
  if (!container) return;
  
  container.innerHTML = '<p class="empty-hint">加载中...</p>';
  
  try {
    const info = await ipcRenderer.invoke('get-network-info');
    let html = `<div class="info-item"><span>主机名</span><span>${info.hostname}</span></div>`;
    
    for (const name in info.interfaces) {
      info.interfaces[name].forEach(addr => {
        html += `<div class="info-item"><span>${name}</span><span>${addr.address} (${addr.mac})</span></div>`;
      });
    }
    
    if (info.externalIp) {
      html += `<div class="info-item"><span>外网 IP</span><span>${info.externalIp}</span></div>`;
    }
    
    container.innerHTML = html;
  } catch (err) {
    container.innerHTML = `<p class="error">加载失败：${err.message}</p>`;
  }
}

/**
 * 加载音量
 */
async function loadVolume() {
  const slider = document.getElementById('volume-slider');
  if (!slider) return;
  
  try {
    const result = await ipcRenderer.invoke('get-volume');
    if (result.success && result.level !== null) {
      slider.value = result.level;
    }
  } catch (err) {
    Toast.error(`获取音量失败：${err.message}`);
  }
}

/**
 * 设置音量
 */
async function setVolume(level) {
  try {
    await ipcRenderer.invoke('set-volume', level);
  } catch (err) {
    Toast.error(`设置音量失败：${err.message}`);
  }
}

/**
 * 切换静音
 */
async function toggleMute() {
  try {
    await ipcRenderer.invoke('toggle-mute');
    Toast.success('已切换静音');
  } catch (err) {
    Toast.error(`切换静音失败：${err.message}`);
  }
}

// 初始化音量滑块
function initVolumeSlider() {
  const slider = document.getElementById('volume-slider');
  if (!slider) return;
  
  loadVolume();
  
  // 防抖处理
  const debouncedSetVolume = Utils.debounce((e) => {
    setVolume(parseInt(e.target.value));
  }, 100);
  
  slider.addEventListener('input', debouncedSetVolume);
}

/**
 * 读取目录
 */
async function readDirectory() {
  const input = document.getElementById('file-path-input');
  const container = document.getElementById('file-list');
  if (!container) return;
  
  const path = input.value.trim() || '~';
  container.innerHTML = '<p class="empty-hint">加载中...</p>';
  
  try {
    const result = await ipcRenderer.invoke('read-directory', path);
    if (result.success) {
      // 目录在前
      const sorted = result.files.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return 0;
        return a.isDirectory ? -1 : 1;
      });
      
      container.innerHTML = sorted.map(f => `
        <div class="file-item">
          <span class="file-name">${f.isDirectory ? '📁' : '📄'} ${f.name}</span>
          <span class="file-size">${!f.isDirectory ? Utils.formatFileSize(f.size) : ''}</span>
        </div>
      `).join('');
    } else {
      container.innerHTML = `<p class="error">加载失败：${result.error}</p>`;
    }
  } catch (err) {
    container.innerHTML = `<p class="error">加载失败：${err.message}</p>`;
  }
}

/**
 * 获取文件大小
 */
async function getFileSize() {
  const input = document.getElementById('file-path-input');
  if (!input) return;
  
  const path = input.value.trim();
  if (!path) {
    Toast.warning('请输入文件路径');
    return;
  }
  
  try {
    const result = await ipcRenderer.invoke('get-file-size', path);
    if (result.success) {
      Toast.info(`文件大小：${Utils.formatFileSize(result.size)}`);
    } else {
      Toast.error(`获取失败：${result.error}`);
    }
  } catch (err) {
    Toast.error(`获取失败：${err.message}`);
  }
}

/**
 * 执行 Shell 命令
 */
async function execShellCommand() {
  const input = document.getElementById('shell-command-input');
  const output = document.getElementById('shell-output');
  if (!input || !output) return;
  
  const command = input.value.trim();
  if (!command) {
    Toast.warning('请输入命令');
    return;
  }
  
  output.textContent = '执行中...';
  
  try {
    const result = await ipcRenderer.invoke('exec-shell-command', command, { timeout: 30000 });
    output.textContent = result.stdout || result.stderr || result.error || '无输出';
  } catch (err) {
    output.textContent = `错误：${err.message}`;
  }
}

/**
 * 显示通知
 */
async function showNotification(title, message) {
  try {
    await ipcRenderer.invoke('show-notification', title, message);
    return true;
  } catch (err) {
    console.error('通知失败:', err);
    return false;
  }
}

// 初始化系统工具
function initSystemTools() {
  initVolumeSlider();
}

// 导出全局函数
window.loadSystemInfo = loadSystemInfo;
window.loadProcessList = loadProcessList;
window.loadNetworkInfo = loadNetworkInfo;
window.loadVolume = loadVolume;
window.setVolume = setVolume;
window.toggleMute = toggleMute;
window.readDirectory = readDirectory;
window.getFileSize = getFileSize;
window.execShellCommand = execShellCommand;
window.showNotification = showNotification;

console.log('系统工具功能已加载 ✓');

// ============ 最终初始化 ============

// 增强功能初始化（在 DOMContentLoaded 之后调用）
setTimeout(() => {
  // 新增的初始化
  if (typeof initEnhancedFeatures === 'function') initEnhancedFeatures();
  if (typeof initSystemTools === 'function') initSystemTools();
  if (typeof initEnhancedCommandInput === 'function') initEnhancedCommandInput();
}, 100);

console.log('桌面机器人 v1.2.0 增强版已启动 ✓');

// ============ 自动保存功能 ============

const AutoSave = {
  enabled: true,
  interval: 30000, // 30 秒
  timer: null,
  
  start() {
    if (!this.enabled) return;
    this.timer = setInterval(() => {
      this.save();
    }, this.interval);
    console.log('自动保存已启动');
  },
  
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
  
  save() {
    let saved = 0;
    
    // 保存宏
    if (macros.length > 0) {
      saveMacros();
      saved++;
    }
    
    // 保存脚本
    if (scripts.length > 0) {
      saveScriptsToStorage();
      saved++;
    }
    
    // 保存任务
    if (tasks.length > 0) {
      localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
      saved++;
    }
    
    // 保存工作流
    if (typeof workflowModule !== 'undefined') {
      workflowModule.saveToStorage();
      saved++;
    }
    
    if (saved > 0) {
      console.log(`自动保存完成 (${saved} 项)`);
    }
  },
  
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.start();
    } else {
      this.stop();
    }
    return this.enabled;
  }
};

// ============ 性能监控 ============

const PerformanceMonitor = {
  startTime: Date.now(),
  frameCount: 0,
  lastFpsCheck: 0,
  fps: 0,
  
  recordFrame() {
    this.frameCount++;
    const now = Date.now();
    if (now - this.lastFpsCheck >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsCheck = now;
    }
  },
  
  getStats() {
    return {
      fps: this.fps,
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize
      } : null
    };
  },
  
  showStats() {
    const stats = this.getStats();
    Toast.info(`运行时间：${stats.uptime}s | FPS: ${stats.fps}`);
  }
};

// ============ 主题系统 ============

const ThemeManager = {
  currentTheme: 'dark',
  
  themes: {
    dark: {
      '--bg-primary': '#1e1e2e',
      '--bg-secondary': '#252537',
      '--bg-tertiary': '#2d2d44',
      '--text-primary': '#cdd6f4',
      '--text-secondary': '#a6adc8',
      '--accent-primary': '#89b4fa',
      '--accent-secondary': '#b4befe',
      '--success': '#a6e3a1',
      '--warning': '#fab387',
      '--danger': '#f38ba8',
      '--border': '#45475a'
    },
    light: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f5f5f5',
      '--bg-tertiary': '#e8e8e8',
      '--text-primary': '#2d2d2d',
      '--text-secondary': '#5a5a5a',
      '--accent-primary': '#2563eb',
      '--accent-secondary': '#3b82f6',
      '--success': '#16a34a',
      '--warning': '#f59e0b',
      '--danger': '#dc2626',
      '--border': '#d4d4d4'
    },
    blue: {
      '--bg-primary': '#0a192f',
      '--bg-secondary': '#112240',
      '--bg-tertiary': '#1d3557',
      '--text-primary': '#e6f1ff',
      '--text-secondary': '#8892b0',
      '--accent-primary': '#64ffda',
      '--accent-secondary': '#48c9b0',
      '--success': '#52c41a',
      '--warning': '#faad14',
      '--danger': '#f5222d',
      '--border': '#2a3f5f'
    },
    green: {
      '--bg-primary': '#1a1f1a',
      '--bg-secondary': '#232923',
      '--bg-tertiary': '#2d352d',
      '--text-primary': '#d4e6d4',
      '--text-secondary': '#8fa38f',
      '--accent-primary': '#4ade80',
      '--accent-secondary': '#22c55e',
      '--success': '#86efac',
      '--warning': '#fcd34d',
      '--danger': '#f87171',
      '--border': '#3a453a'
    }
  },
  
  init() {
    const saved = localStorage.getItem('desktop-robot-theme');
    if (saved && this.themes[saved]) {
      this.currentTheme = saved;
    }
    this.apply(this.currentTheme);
  },
  
  apply(themeName) {
    const theme = this.themes[themeName];
    if (!theme) return false;
    
    for (const [key, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(key, value);
    }
    
    this.currentTheme = themeName;
    localStorage.setItem('desktop-robot-theme', themeName);
    
    Toast.success(`主题已切换：${themeName}`);
    return true;
  },
  
  toggle() {
    const themes = Object.keys(this.themes);
    const currentIndex = themes.indexOf(this.currentTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    return this.apply(themes[nextIndex]);
  },
  
  getThemes() {
    return Object.keys(this.themes);
  }
};

// ============ 国际化支持（预留） ============

const i18n = {
  currentLang: 'zh-CN',
  
  translations: {
    'zh-CN': {
      welcome: '欢迎使用桌面机器人',
      ready: '就绪',
      running: '运行中',
      error: '错误',
      success: '成功',
      save: '保存',
      delete: '删除',
      edit: '编辑',
      run: '运行',
      stop: '停止',
      new: '新建',
      import: '导入',
      export: '导出',
      settings: '设置',
      help: '帮助'
    },
    'en-US': {
      welcome: 'Welcome to Desktop Robot',
      ready: 'Ready',
      running: 'Running',
      error: 'Error',
      success: 'Success',
      save: 'Save',
      delete: 'Delete',
      edit: 'Edit',
      run: 'Run',
      stop: 'Stop',
      new: 'New',
      import: 'Import',
      export: 'Export',
      settings: 'Settings',
      help: 'Help'
    },
    'ja-JP': {
      welcome: 'デスクトップロボットへようこそ',
      ready: '準備完了',
      running: '実行中',
      error: 'エラー',
      success: '成功',
      save: '保存',
      delete: '削除',
      edit: '編集',
      run: '実行',
      stop: '停止',
      new: '新規',
      import: 'インポート',
      export: 'エクスポート',
      settings: '設定',
      help: 'ヘルプ'
    }
  },
  
  init() {
    const saved = localStorage.getItem('desktop-robot-lang');
    if (saved && this.translations[saved]) {
      this.currentLang = saved;
    }
  },
  
  t(key) {
    return this.translations[this.currentLang]?.[key] || this.translations['zh-CN'][key] || key;
  },
  
  setLang(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('desktop-robot-lang', lang);
      this.applyTranslations();
      return true;
    }
    return false;
  },
  
  applyTranslations() {
    // 更新 UI 文本
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      el.textContent = this.t(key);
    });
  }
};

// ============ 收藏夹功能 ============

const Favorites = {
  items: [],
  
  init() {
    const saved = localStorage.getItem('desktop-robot-favorites');
    if (saved) {
      this.items = JSON.parse(saved);
    }
  },
  
  add(type, name) {
    const item = { type, name, id: Date.now() };
    this.items.push(item);
    this.save();
    Toast.success(`已添加收藏：${name}`);
  },
  
  remove(id) {
    const index = this.items.findIndex(i => i.id === id);
    if (index >= 0) {
      this.items.splice(index, 1);
      this.save();
      Toast.info('已取消收藏');
    }
  },
  
  isFavorite(type, name) {
    return this.items.some(i => i.type === type && i.name === name);
  },
  
  save() {
    localStorage.setItem('desktop-robot-favorites', JSON.stringify(this.items));
  },
  
  getItems() {
    return this.items;
  },
  
  quickRun(id) {
    const item = this.items.find(i => i.id === id);
    if (!item) return;
    
    if (item.type === 'macro') {
      const macro = macros.find(m => m.name === item.name);
      if (macro) {
        currentMacro = macro;
        runMacro();
      }
    } else if (item.type === 'script') {
      const script = scripts.find(s => s.name === item.name);
      if (script) {
        currentScript = script;
        runScript();
      }
    }
  }
};

// ============ 智能推荐系统 ============

const SmartRecommendations = {
  usageCount: {},
  
  record(type, name) {
    const key = `${type}:${name}`;
    this.usageCount[key] = (this.usageCount[key] || 0) + 1;
    this.save();
  },
  
  save() {
    localStorage.setItem('desktop-robot-usage', JSON.stringify(this.usageCount));
  },
  
  getTop(limit = 5) {
    const entries = Object.entries(this.usageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    
    return entries.map(([key, count]) => {
      const [type, name] = key.split(':');
      return { type, name, count };
    });
  },
  
  render() {
    const container = document.getElementById('smart-recommendations');
    if (!container) return;
    
    const top = this.getTop(5);
    if (top.length === 0) {
      container.innerHTML = '<p class="empty-hint">常用项目会显示在这里</p>';
      return;
    }
    
    container.innerHTML = top.map(item => `
      <div class="recommendation-item" onclick="Favorites.quickRun(
        (Favorites.items.find(f => f.type === '${item.type}' && f.name === '${item.name}') || {}).id
      )">
        <span class="rec-icon">${item.type === 'macro' ? '⚡' : '📜'}</span>
        <span class="rec-name">${item.name}</span>
        <span class="rec-count">${item.count}次</span>
      </div>
    `).join('');
  }
};

// ============ 数据导入导出增强 ============

const DataExporter = {
  async exportAll() {
    const data = {
      version: '1.3.0',
      exportDate: new Date().toISOString(),
      macros: macros,
      scripts: scripts,
      tasks: tasks,
      workflows: typeof workflowModule !== 'undefined' ? workflowModule.workflows : [],
      favorites: Favorites.items,
      usageCount: SmartRecommendations.usageCount,
      settings: Utils.getStorage('desktop-robot-settings'),
      theme: localStorage.getItem('desktop-robot-theme'),
      language: localStorage.getItem('desktop-robot-lang')
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `desktop-robot-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    Toast.success('完整备份已导出');
  },
  
  async importAll(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          
          if (data.macros) {
            macros = data.macros;
            saveMacros();
            renderMacroListWithDelete();
          }
          if (data.scripts) {
            scripts = data.scripts;
            saveScriptsToStorage();
            loadScriptsList();
          }
          if (data.tasks) {
            tasks = data.tasks;
            localStorage.setItem('desktop-robot-tasks', JSON.stringify(tasks));
            updateTasksList();
          }
          if (data.workflows) {
            workflowModule.workflows = data.workflows;
            workflowModule.saveToStorage();
            workflowModule.renderList();
          }
          if (data.favorites) {
            Favorites.items = data.favorites;
            Favorites.save();
          }
          if (data.usageCount) {
            SmartRecommendations.usageCount = data.usageCount;
            SmartRecommendations.save();
          }
          if (data.theme) {
            ThemeManager.apply(data.theme);
          }
          if (data.language) {
            i18n.setLang(data.language);
          }
          
          Toast.success('数据导入成功');
          resolve(true);
        } catch (err) {
          Toast.error(`导入失败：${err.message}`);
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
};

// ============ 欢迎引导 ============

const WelcomeGuide = {
  shown: false,
  
  check() {
    const shown = localStorage.getItem('desktop-robot-welcome-shown');
    this.shown = shown === 'true';
    return !this.shown;
  },
  
  markAsShown() {
    localStorage.setItem('desktop-robot-welcome-shown', 'true');
    this.shown = true;
  },
  
  show() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 600px;">
        <h2 style="text-align: center; margin-bottom: 20px;">🎉 欢迎使用桌面机器人 v1.3.0</h2>
        <div class="guide-content" style="padding: 20px;">
          <div class="guide-step">
            <h3>⌨️ 键盘宏</h3>
            <p>打开「指令」面板 → 滚动到键盘宏区域 → 新建宏 → 设置 F1-F12 快捷键</p>
          </div>
          <div class="guide-step" style="margin: 16px 0;">
            <h3>⚡ 快速命令</h3>
            <p>按 <kbd>Ctrl+K</kbd> 打开快速命令面板 → 输入关键词搜索 → 按 Enter 执行</p>
          </div>
          <div class="guide-step">
            <h3>🛠️ 系统工具</h3>
            <p>点击侧边栏「工具」→ 查看系统信息、进程列表、网络信息等</p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px;">
          <button id="welcome-ok-btn" class="btn btn-primary" style="padding: 12px 32px; font-size: 16px;">
            开始使用
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('welcome-ok-btn').addEventListener('click', () => {
      this.markAsShown();
      modal.remove();
    });
  }
};

// ============ 导出全局函数 ============

window.AutoSave = AutoSave;
window.PerformanceMonitor = PerformanceMonitor;
window.ThemeManager = ThemeManager;
window.i18n = i18n;
window.Favorites = Favorites;
window.SmartRecommendations = SmartRecommendations;
window.DataExporter = DataExporter;
window.WelcomeGuide = WelcomeGuide;

// ============ 最终初始化 ============

function initAllFeatures() {
  // 自动保存
  AutoSave.start();
  
  // 主题
  ThemeManager.init();
  
  // 国际化
  i18n.init();
  
  // 收藏夹
  Favorites.init();
  
  // 智能推荐
  SmartRecommendations.usageCount = Utils.getStorage('desktop-robot-usage') || {};
  
  // 欢迎引导
  if (WelcomeGuide.check()) {
    setTimeout(() => WelcomeGuide.show(), 500);
  }
  
  // 性能监控（可选）
  // setInterval(() => PerformanceMonitor.recordFrame(), 1000/60);
  
  console.log('所有增强功能已初始化 ✓');
}

// 在 DOMContentLoaded 后调用
setTimeout(initAllFeatures, 200);

console.log('桌面机器人 v1.3.0 增强模块已加载 ✓');
