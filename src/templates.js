// 模板库模块
const templatesModule = {
  templates: [
    {
      id: 'morning-standup',
      name: '晨会准备',
      category: 'office',
      icon: '📅',
      description: '快速打开晨会相关的软件，进入会议状态',
      tags: ['钉钉', '会议', '办公'],
      steps: [
        { type: 'open-app', desc: '打开钉钉', params: { app: '钉钉' }, delay: 2 },
        { type: 'wait', desc: '等待 3 秒', params: { seconds: 3 }, delay: 0 },
        { type: 'open-url', desc: '打开会议文档', params: { url: 'https://docs.qq.com' }, delay: 2 },
        { type: 'custom', desc: '共享屏幕', params: { command: '点击' }, delay: 0.5 }
      ]
    },
    {
      id: 'github-open',
      name: '打开 GitHub',
      category: 'browser',
      icon: '🐙',
      description: '打开 Chrome 浏览器并访问 GitHub',
      tags: ['浏览器', 'GitHub', '开发'],
      steps: [
        { type: 'open-app', desc: '打开 Chrome', params: { app: 'Google Chrome' }, delay: 2 },
        { type: 'open-url', desc: '访问 GitHub', params: { url: 'https://github.com' }, delay: 3 }
      ]
    },
    {
      id: 'google-search',
      name: 'Google 搜索',
      category: 'browser',
      icon: '🔍',
      description: '打开 Google 并输入搜索内容',
      tags: ['浏览器', '搜索'],
      steps: [
        { type: 'open-app', desc: '打开 Chrome', params: { app: 'Google Chrome' }, delay: 2 },
        { type: 'open-url', desc: '访问 Google', params: { url: 'https://google.com' }, delay: 2 },
        { type: 'type-text', desc: '输入搜索内容', params: { text: '' }, delay: 0.5 },
        { type: 'send-hotkey', desc: '按回车搜索', params: { modifiers: [], key: 'enter' }, delay: 0 }
      ]
    },
    {
      id: 'excel-data-entry',
      name: 'Excel 数据录入',
      category: 'office',
      icon: '📊',
      description: '打开 Excel 准备工作',
      tags: ['Excel', '数据', '办公'],
      steps: [
        { type: 'open-app', desc: '打开 Excel', params: { app: 'Microsoft Excel' }, delay: 3 },
        { type: 'send-hotkey', desc: '新建文件', params: { modifiers: ['command'], key: 'n' }, delay: 1 }
      ]
    },
    {
      id: 'wechat-reply',
      name: '微信自动回复',
      category: 'social',
      icon: '💬',
      description: '打开微信并输入回复内容',
      tags: ['微信', '回复', '社交'],
      steps: [
        { type: 'open-app', desc: '打开微信', params: { app: '微信' }, delay: 2 },
        { type: 'mouse-click', desc: '点击聊天窗口', params: { type: 'left' }, delay: 0.5 },
        { type: 'type-text', desc: '输入回复', params: { text: '您好，我现在不方便回复，稍后联系您。' }, delay: 0.5 },
        { type: 'send-hotkey', desc: '发送消息', params: { modifiers: ['command'], key: 'enter' }, delay: 0 }
      ]
    },
    {
      id: 'dev-workspace',
      name: '开发环境',
      category: 'custom',
      icon: '💻',
      description: '一键打开开发工具',
      tags: ['开发', 'VSCode', '终端'],
      steps: [
        { type: 'open-app', desc: '打开 VSCode', params: { app: 'Visual Studio Code' }, delay: 2 },
        { type: 'wait', desc: '等待 2 秒', params: { seconds: 2 }, delay: 0 },
        { type: 'open-app', desc: '打开 Terminal', params: { app: 'Terminal' }, delay: 1 },
        { type: 'type-text', desc: '输入 cd 命令', params: { text: 'cd ~/projects' }, delay: 0.5 },
        { type: 'send-hotkey', desc: '执行命令', params: { modifiers: [], key: 'enter' }, delay: 0 }
      ]
    },
    {
      id: 'clean-desktop',
      name: '清理桌面',
      category: 'system',
      icon: '🧹',
      description: '最小化所有窗口，清理桌面',
      tags: ['系统', '清理'],
      steps: [
        { type: 'send-hotkey', desc: 'Cmd+M 最小化', params: { modifiers: ['command'], key: 'm' }, delay: 0.5 },
        { type: 'send-hotkey', desc: 'Cmd+M 最小化', params: { modifiers: ['command'], key: 'm' }, delay: 0.5 },
        { type: 'send-hotkey', desc: 'Cmd+M 最小化', params: { modifiers: ['command'], key: 'm' }, delay: 0.5 }
      ]
    },
    {
      id: 'screenshot-save',
      name: '截图保存',
      category: 'system',
      icon: '📸',
      description: '截取屏幕并保存',
      tags: ['截图', '系统'],
      steps: [
        { type: 'custom', desc: '截图', params: { command: '截图' }, delay: 1 }
      ]
    },
    {
      id: 'copy-paste-workflow',
      name: '复制粘贴',
      category: 'office',
      icon: '📋',
      description: '快速复制粘贴工作流',
      tags: ['复制', '粘贴'],
      steps: [
        { type: 'send-hotkey', desc: '复制', params: { modifiers: ['command'], key: 'c' }, delay: 0.3 },
        { type: 'send-hotkey', desc: '切换应用', params: { modifiers: ['command'], key: 'tab' }, delay: 0.5 },
        { type: 'send-hotkey', desc: '粘贴', params: { modifiers: ['command'], key: 'v' }, delay: 0.3 }
      ]
    },
    {
      id: 'youtube-music',
      name: '打开音乐',
      category: 'social',
      icon: '🎵',
      description: '打开 YouTube 音乐',
      tags: ['音乐', 'YouTube'],
      steps: [
        { type: 'open-app', desc: '打开 Chrome', params: { app: 'Google Chrome' }, delay: 2 },
        { type: 'open-url', desc: '访问 YouTube 音乐', params: { url: 'https://music.youtube.com' }, delay: 3 }
      ]
    }
  ],

  init() {
    this.render();
    this.bindEvents();
  },

  bindEvents() {
    // 分类切换
    document.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const category = item.dataset.category;
        this.render(category);
      });
    });

    // 使用模板按钮
    document.getElementById('use-template-btn').addEventListener('click', () => this.useTemplate());
    document.getElementById('cancel-template-btn').addEventListener('click', () => {
      document.getElementById('template-detail-modal').classList.add('hidden');
    });
  },

  render(category = 'all') {
    const grid = document.getElementById('templates-grid');
    let templates = this.templates;

    if (category !== 'all') {
      templates = templates.filter(t => t.category === category);
    }

    grid.innerHTML = templates.map(t => `
      <div class="template-card" data-id="${t.id}">
        <h4><span class="step-icon">${t.icon}</span> ${t.name}</h4>
        <p>${t.description}</p>
        <div class="tags">
          ${t.tags.map(tag => `<span class="template-tag">${tag}</span>`).join('')}
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => this.showDetail(card.dataset.id));
    });
  },

  showDetail(id) {
    const template = this.templates.find(t => t.id === id);
    if (!template) return;

    document.getElementById('template-detail-title').textContent = `${template.icon} ${template.name}`;
    document.getElementById('template-detail-desc').textContent = template.description;

    const stepsList = document.getElementById('template-detail-steps');
    stepsList.innerHTML = template.steps.map((s, i) => {
      const icons = {
        'open-app': '🚀',
        'open-url': '🌐',
        'type-text': '⌨️',
        'send-hotkey': '🎹',
        'mouse-click': '🖱️',
        'mouse-move': '📍',
        'wait': '⏱️',
        'run-script': '📜',
        'custom': '💬'
      };
      return `<li><span class="step-icon">${icons[s.type] || '📌'}</span> ${i + 1}. ${s.desc}</li>`;
    }).join('');

    document.getElementById('template-detail-modal').classList.remove('hidden');
    this.selectedTemplate = template;
  },

  useTemplate() {
    if (!this.selectedTemplate) return;

    // 复制到工作流
    const workflow = {
      id: Date.now(),
      name: this.selectedTemplate.name,
      hotkey: '',
      steps: JSON.parse(JSON.stringify(this.selectedTemplate.steps))
    };

    workflowModule.workflows.push(workflow);
    workflowModule.currentWorkflow = workflow;
    workflowModule.saveToStorage();
    workflowModule.renderList();
    workflowModule.renderEditor();

    document.getElementById('template-detail-modal').classList.add('hidden');

    // 切换到工作流面板
    document.querySelector('[data-tab="workflow"]').click();

    log(`已使用模板：${this.selectedTemplate.name}`, 'success');
  }
};

// 预设宏模板
const macroTemplates = [
  {
    id: 'copy-paste',
    name: '复制粘贴',
    hotkey: 'F1',
    description: '快速复制粘贴工作流',
    tags: ['复制', '粘贴', '办公'],
    commands: [
      { key: 'Ctrl+C', actionType: 'hotkey', actionValue: 'Ctrl+C', delay: 0.2 },
      { key: 'Alt+Tab', actionType: 'hotkey', actionValue: 'Alt+Tab', delay: 0.3 },
      { key: 'Ctrl+V', actionType: 'hotkey', actionValue: 'Ctrl+V', delay: 0.2 }
    ]
  },
  {
    id: 'save-all',
    name: '保存全部',
    hotkey: 'F2',
    description: '保存当前工作并最小化窗口',
    tags: ['保存', '窗口', '办公'],
    commands: [
      { key: 'Ctrl+S', actionType: 'hotkey', actionValue: 'Ctrl+S', delay: 0.3 },
      { key: 'Win+D', actionType: 'hotkey', actionValue: 'Win+D', delay: 0.2 }
    ]
  },
  {
    id: 'browser-dev',
    name: '打开开发环境',
    hotkey: 'F3',
    description: '打开浏览器和开发者工具',
    tags: ['开发', '浏览器'],
    commands: [
      { key: 'Ctrl+T', actionType: 'hotkey', actionValue: 'Ctrl+T', delay: 0.5 },
      { key: 'https://localhost:3000', actionType: 'type', actionValue: 'https://localhost:3000', delay: 0.3 },
      { key: 'Enter', actionType: 'hotkey', actionValue: 'Enter', delay: 0.2 },
      { key: 'F12', actionType: 'hotkey', actionValue: 'F12', delay: 0 }
    ]
  },
  {
    id: 'hello-world',
    name: '问候语',
    hotkey: 'F4',
    description: '快速输入常用问候语',
    tags: ['文本', '快捷回复'],
    commands: [
      { key: '您好！感谢您的消息。', actionType: 'type', actionValue: '您好！感谢您的消息。', delay: 0.2 },
      { key: '我会尽快回复您。', actionType: 'type', actionValue: '我会尽快回复您。', delay: 0 }
    ]
  },
  {
    id: 'close-all',
    name: '关闭所有窗口',
    hotkey: 'F5',
    description: '关闭当前应用的所有窗口',
    tags: ['窗口', '系统'],
    commands: [
      { key: 'Alt+F4', actionType: 'hotkey', actionValue: 'Alt+F4', delay: 0.3 },
      { key: 'Alt+F4', actionType: 'hotkey', actionValue: 'Alt+F4', delay: 0.3 },
      { key: 'Alt+F4', actionType: 'hotkey', actionValue: 'Alt+F4', delay: 0 }
    ]
  }
];

// 导出宏模板
if (typeof module !== 'undefined' && module.exports) {
  module.exports.macroTemplates = macroTemplates;
}

// 浏览器环境导出
window.templatesModule = templatesModule;
