// AI 助手模块 - 自动响应 Claude CLI
const aiAssistantModule = {
  // 配置
  config: {
    enabled: false,
    logPath: '',
    checkInterval: 2000,
    autoReplyDelay: 1000,
    sessionFile: '',
  },

  // 状态
  state: {
    isMonitoring: false,
    lastLogPosition: 0,
    lastCheckTime: 0,
    consecutiveQuestions: 0,
    sessionHistory: [],
  },

  // 常见问题模式
  questionPatterns: [
    /Would you like to.*\?$/i,
    /Do you want to.*\?$/i,
    /Should I.*\?$/i,
    /Shall I.*\?$/i,
    /Do you agree.*\?$/i,
    /Confirm.*\?$/i,
    /Continue.*\?$/i,
    /Proceed.*\?$/i,
    /Is this correct.*\?$/i,
    /Does this look.*\?$/i,
    /What would you like.*\?$/i,
    /How would you like.*\?$/i,
    /Please (confirm|respond|answer|reply)/i,
    /Waiting for.*\?$/i,
    /Enter.*to continue/i,
    /Press.*to continue/i,
    /Type.*to proceed/i,
    /Answer.*\?$/i,
    /Choose.*\?$/i,
    /Select.*\?$/i,
    /Yes or no.*\?$/i,
    /Y\/N.*\?$/i,
    /\[Y\/n\]/,
    /\[y\/N\]/,
    /\(Y\/n\)/,
    /\(y\/N\)/,
    /:\s*$/,
    /\?\s*$/,
  ],

  // 预设回复模板
  replyTemplates: {
    confirm: ['yes', 'y', '确认', '好的', '继续'],
    deny: ['no', 'n', '不了', '取消'],
    continue: ['continue', '继续', '下一步', 'next'],
    proceed: ['proceed', '继续', '执行'],
    default: ['yes', '继续', '好的'],
  },

  autoReplyStrategy: 'confirm',

  init() {
    this.loadConfig();
    this.bindEvents();
  },

  loadConfig() {
    const saved = localStorage.getItem('desktop-robot-ai-assistant');
    if (saved) {
      const config = JSON.parse(saved);
      this.config = { ...this.config, ...config };
    }
    if (!this.config.sessionFile) {
      this.config.sessionFile = '/tmp/claude-cli-session.json';
    }
  },

  saveConfig() {
    localStorage.setItem('desktop-robot-ai-assistant', JSON.stringify(this.config));
  },

  bindEvents() {
    const settingsPanel = document.getElementById('settings-panel');
    if (settingsPanel) {
      this.injectSettingsUI(settingsPanel);
    }
  },

  injectSettingsUI(panel) {
    const aiSettingsHTML = `
      <div class="settings-group">
        <h3>🤖 AI 自动响应</h3>
        <div class="setting-item">
          <label for="ai-enabled">启用自动响应</label>
          <input type="checkbox" id="ai-enabled" ${this.config.enabled ? 'checked' : ''}>
        </div>
        <div class="setting-item">
          <label for="ai-strategy">回复策略</label>
          <select id="ai-strategy" class="select-input" style="width:150px;padding:8px;">
            <option value="confirm" ${this.autoReplyStrategy === 'confirm' ? 'selected' : ''}>总是确认</option>
            <option value="continue" ${this.autoReplyStrategy === 'continue' ? 'selected' : ''}>继续执行</option>
            <option value="smart" ${this.autoReplyStrategy === 'smart' ? 'selected' : ''}>智能判断</option>
          </select>
        </div>
        <div class="setting-item">
          <label for="ai-check-interval">检查间隔 (秒)</label>
          <input type="number" id="ai-check-interval" min="1" max="10" step="0.5" value="${this.config.checkInterval / 1000}">
        </div>
        <div class="setting-item">
          <label for="ai-log-path">终端日志路径</label>
          <input type="text" id="ai-log-path" class="text-input" value="${this.config.logPath}" placeholder="~/.zsh_history 或 /tmp/terminal.log">
        </div>
        <div class="setting-item">
          <label for="ai-custom-replys">自定义回复</label>
          <input type="text" id="ai-custom-replys" class="text-input" value="${this.replyTemplates.default.join(',')}" placeholder="用逗号分隔">
        </div>
        <div class="setting-item">
          <button id="ai-test-detection-btn" class="btn">🧪 测试检测</button>
          <button id="ai-toggle-monitoring-btn" class="btn">${this.state.isMonitoring ? '停止监听' : '开始监听'}</button>
        </div>
        <div class="ai-status" id="ai-status" style="margin-top:10px;padding:10px;background:var(--bg-tertiary);border-radius:8px;font-size:13px;">
          状态：${this.state.isMonitoring ? '<span style="color:var(--success)">监听中</span>' : '<span style="color:var(--text-secondary)">未启动</span>'}
        </div>
      </div>
    `;

    const dataSettings = panel.querySelector('.settings-group:last-child');
    if (dataSettings) {
      dataSettings.insertAdjacentHTML('beforebegin', aiSettingsHTML);
      this.bindAISettingsEvents();
    }
  },

  bindAISettingsEvents() {
    document.getElementById('ai-enabled')?.addEventListener('change', (e) => {
      this.config.enabled = e.target.checked;
      this.saveConfig();
      if (e.target.checked && !this.state.isMonitoring) {
        this.startMonitoring();
      } else if (!e.target.checked && this.state.isMonitoring) {
        this.stopMonitoring();
      }
    });

    document.getElementById('ai-strategy')?.addEventListener('change', (e) => {
      this.autoReplyStrategy = e.target.value;
      this.saveConfig();
    });

    document.getElementById('ai-check-interval')?.addEventListener('change', (e) => {
      this.config.checkInterval = parseFloat(e.target.value) * 1000;
      this.saveConfig();
      if (this.state.isMonitoring) {
        this.stopMonitoring();
        this.startMonitoring();
      }
    });

    document.getElementById('ai-log-path')?.addEventListener('change', (e) => {
      this.config.logPath = e.target.value;
      this.saveConfig();
    });

    document.getElementById('ai-custom-replys')?.addEventListener('change', (e) => {
      this.replyTemplates.default = e.target.value.split(',').map(s => s.trim());
      this.saveConfig();
    });

    document.getElementById('ai-test-detection-btn')?.addEventListener('click', () => {
      this.testDetection();
    });

    document.getElementById('ai-toggle-monitoring-btn')?.addEventListener('click', () => {
      if (this.state.isMonitoring) {
        this.stopMonitoring();
      } else {
        this.startMonitoring();
      }
    });
  },

  isQuestion(text) {
    for (const pattern of this.questionPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  },

  getReply(text) {
    switch (this.autoReplyStrategy) {
      case 'confirm':
        return this.replyTemplates.confirm[0];
      case 'deny':
        return this.replyTemplates.deny[0];
      case 'continue':
        return this.replyTemplates.continue[0];
      case 'smart':
        if (/^(Do|Would|Should|Shall|Is|Are)/i.test(text)) {
          return this.replyTemplates.confirm[0];
        }
        if (/Continue|Proceed/i.test(text)) {
          return this.replyTemplates.continue[0];
        }
        return this.replyTemplates.default[0];
      default:
        return this.replyTemplates.default[0];
    }
  },

  async getRecentTerminalOutput() {
    const ipcRenderer = window.ipcRenderer;

    try {
      if (this.config.logPath) {
        const result = await ipcRenderer.invoke('read-file-tail', this.config.logPath, 5000);
        if (result.success) {
          return result.content;
        }
      }

      const clipboard = await ipcRenderer.invoke('clipboard-get');
      if (clipboard && clipboard.length > 0) {
        return clipboard;
      }

      return '';
    } catch (err) {
      console.error('读取终端输出失败:', err);
      return '';
    }
  },

  async sendReply(reply) {
    const ipcRenderer = window.ipcRenderer;

    try {
      await ipcRenderer.invoke('keyboard-type', reply);
      await ipcRenderer.invoke('keyboard-press', 'enter');
      log(`[AI 助手] 自动回复：${reply}`, 'success');
      this.updateStatus(`已回复：${reply}`);
    } catch (err) {
      log(`[AI 助手] 回复失败：${err.message}`, 'error');
    }
  },

  async checkAndRespond() {
    const output = await this.getRecentTerminalOutput();
    if (!output) return;

    const lines = output.split('\n').filter(line => line.trim().length > 0);
    const lastLines = lines.slice(-10);

    for (const line of lastLines) {
      if (this.isQuestion(line)) {
        const reply = this.getReply(line);
        log(`[AI 助手] 检测到问题：${line.substring(0, 50)}...`, 'info');

        await this.sleep(this.config.autoReplyDelay);
        await this.sendReply(reply);
        return;
      }
    }
  },

  startMonitoring() {
    if (this.state.isMonitoring) return;

    this.state.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkAndRespond();
    }, this.config.checkInterval);

    this.updateStatus('监听中...');
    document.getElementById('ai-toggle-monitoring-btn').textContent = '停止监听';
    log('[AI 助手] 开始监听终端输出', 'success');
  },

  stopMonitoring() {
    if (!this.state.isMonitoring) return;

    clearInterval(this.monitoringInterval);
    this.state.isMonitoring = false;
    this.updateStatus('已停止');
    document.getElementById('ai-toggle-monitoring-btn').textContent = '开始监听';
    log('[AI 助手] 停止监听', 'info');
  },

  updateStatus(status) {
    const statusEl = document.getElementById('ai-status');
    if (statusEl) {
      statusEl.innerHTML = `状态：<span style="color:var(--success)">${status}</span>`;
    }
  },

  async testDetection() {
    const testTexts = [
      'Would you like to proceed?',
      'Do you want me to continue?',
      'Confirm the changes [Y/n]:',
      'Normal output line',
      'Should I make this change?',
    ];

    log('[AI 助手] 测试检测结果:', 'info');
    for (const text of testTexts) {
      const isQ = this.isQuestion(text);
      const reply = this.getReply(text);
      log(`  "${text}" -> ${isQ ? '问题' : '普通'} | 回复：${reply}`, isQ ? 'success' : 'info');
    }
  },

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = aiAssistantModule;
}

// 浏览器环境导出
window.aiAssistantModule = aiAssistantModule;
