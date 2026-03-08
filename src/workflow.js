// 工作流模块
// 使用全局 ipcRenderer（由 renderer.js 导出到 window 对象）
// 注意：不要重新声明，直接使用全局变量

const workflowModule = {
  workflows: [],
  currentWorkflow: null,
  shouldStop: false,

  init() {
    this.loadWorkflows();
    this.bindEvents();
    this.registerGlobalHotkeys();
    this.updateEmptyState();
  },

  registerGlobalHotkeys() {
    document.addEventListener('keydown', (e) => {
      if (!this.currentWorkflow || !this.currentWorkflow.hotkey) return;
      if (e.key === this.currentWorkflow.hotkey) {
        e.preventDefault();
        this.run();
      }
    });
  },

  bindEvents() {
    const newWorkflowBtn = document.getElementById('new-workflow-btn');
    if (newWorkflowBtn) {
      newWorkflowBtn.addEventListener('click', () => this.createNew());
    }
    const saveWorkflowBtn = document.getElementById('save-workflow-btn');
    if (saveWorkflowBtn) {
      saveWorkflowBtn.addEventListener('click', () => this.save());
    }
    const runWorkflowBtn = document.getElementById('run-workflow-btn');
    if (runWorkflowBtn) {
      runWorkflowBtn.addEventListener('click', () => this.run());
    }
    const stopWorkflowBtn = document.getElementById('stop-workflow-btn');
    if (stopWorkflowBtn) {
      stopWorkflowBtn.addEventListener('click', () => this.stop());
    }
    const addStepBtn = document.getElementById('add-step-btn');
    if (addStepBtn) {
      addStepBtn.addEventListener('click', () => this.openAddStepPanel());
    }

    const importWorkflowBtn = document.getElementById('import-workflow-btn');
    if (importWorkflowBtn) {
      importWorkflowBtn.addEventListener('click', () => {
        document.getElementById('workflow-file-input').click();
      });
    }
    const exportWorkflowBtn = document.getElementById('export-workflow-btn');
    if (exportWorkflowBtn) {
      exportWorkflowBtn.addEventListener('click', () => {
        if (!this.currentWorkflow) {
          log('请先加载一个工作流', 'error');
          return;
        }
        this.exportWorkflow(this.workflows.findIndex(w => w.id === this.currentWorkflow.id));
      });
    }
    const workflowFileInput = document.getElementById('workflow-file-input');
    if (workflowFileInput) {
      workflowFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          this.importWorkflow(file);
        }
        e.target.value = '';
      });
    }

    const stepType = document.getElementById('step-type');
    if (stepType) {
      stepType.addEventListener('change', renderStepParams);
    }

    // 侧滑面板控制
    const closeAddStep = document.getElementById('close-add-step');
    if (closeAddStep) {
      closeAddStep.addEventListener('click', () => this.closeAddStepPanel());
    }
    const cancelAddStep = document.getElementById('cancel-add-step');
    if (cancelAddStep) {
      cancelAddStep.addEventListener('click', () => this.closeAddStepPanel());
    }
    const confirmAddStepBtn = document.getElementById('confirm-add-step-btn');
    if (confirmAddStepBtn) {
      confirmAddStepBtn.addEventListener('click', confirmAddStep);
    }
  },

  loadWorkflows() {
    const saved = localStorage.getItem('desktop-robot-workflows');
    if (saved) {
      this.workflows = JSON.parse(saved);
    }
    this.renderList();
    // 如果有工作流，自动选择第一个
    if (this.workflows.length > 0) {
      this.currentWorkflow = this.workflows[0];
      this.renderEditor();
      this.updateEmptyState();
      // 高亮第一个列表项
      const firstItem = document.querySelector('#workflow-list li');
      if (firstItem) {
        firstItem.classList.add('active');
      }
    }
  },

  saveToStorage() {
    localStorage.setItem('desktop-robot-workflows', JSON.stringify(this.workflows));
  },

  createNew() {
    this.currentWorkflow = {
      id: Date.now(),
      name: '新工作流',
      hotkey: '',
      steps: []
    };
    this.renderEditor();
    this.updateEmptyState();
    log('创建新工作流', 'info');
  },

  save() {
    if (!this.currentWorkflow) {
      log('请先创建或加载工作流', 'error');
      return;
    }

    const name = document.getElementById('workflow-name').value.trim();
    const hotkey = document.getElementById('workflow-hotkey').value;

    if (!name) {
      log('请输入工作流名称', 'error');
      return;
    }

    this.currentWorkflow.name = name;
    this.currentWorkflow.hotkey = hotkey;

    const existingIndex = this.workflows.findIndex(w => w.id === this.currentWorkflow.id);
    if (existingIndex >= 0) {
      this.workflows[existingIndex] = this.currentWorkflow;
    } else {
      this.workflows.push(this.currentWorkflow);
    }

    this.saveToStorage();
    this.renderList();
    log(`工作流已保存：${name}`, 'success');
  },

  run() {
    if (!this.currentWorkflow || this.currentWorkflow.steps.length === 0) {
      log('工作流为空', 'error');
      return;
    }

    document.getElementById('run-workflow-btn').disabled = true;
    document.getElementById('stop-workflow-btn').disabled = false;
    setStatus('工作流运行中...', 'running');

    runWorkflow(this.currentWorkflow.steps);
  },

  stop() {
    this.shouldStop = true;
    document.getElementById('run-workflow-btn').disabled = false;
    document.getElementById('stop-workflow-btn').disabled = true;
    setStatus('已停止', 'error');
    log('工作流已停止', 'info');
  },

  renderList() {
    const listEl = document.getElementById('workflow-list');
    if (this.workflows.length === 0) {
      listEl.innerHTML = '<li class="workflow-list-empty">暂无工作流，点击"新建"开始</li>';
      return;
    }

    listEl.innerHTML = this.workflows.map((wf, index) => `
      <li data-index="${index}" data-id="${wf.id}">
        <div class="workflow-list-item-content">
          <div class="workflow-list-name">${wf.name}</div>
          <div class="workflow-list-meta">
            <span class="step-count">${wf.steps.length} 个步骤</span>
            ${wf.hotkey ? `<span class="hotkey-badge">${wf.hotkey}</span>` : ''}
          </div>
        </div>
        <div class="workflow-list-actions">
          <button class="btn-icon btn-edit" title="编辑">✏️</button>
          <button class="btn-icon btn-delete" title="删除">🗑️</button>
        </div>
      </li>
    `).join('');

    listEl.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const index = parseInt(li.dataset.index);
        workflowModule.currentWorkflow = workflowModule.workflows[index];
        workflowModule.renderEditor();
        workflowModule.updateEmptyState();
        listEl.querySelectorAll('li').forEach(l => l.classList.remove('active'));
        li.classList.add('active');
        log(`加载工作流：${workflowModule.currentWorkflow.name}`, 'info');
      });

      // 绑定编辑按钮事件
      const editBtn = li.querySelector('.btn-edit');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(li.dataset.index);
          workflowModule.currentWorkflow = workflowModule.workflows[index];
          workflowModule.renderEditor();
          workflowModule.updateEmptyState();
          listEl.querySelectorAll('li').forEach(l => l.classList.remove('active'));
          li.classList.add('active');
        });
      }

      // 绑定删除按钮事件
      const deleteBtn = li.querySelector('.btn-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const index = parseInt(li.dataset.index);
          workflowModule.deleteWorkflow(index);
        });
      }
    });
  },

  deleteWorkflow(index) {
    const wf = this.workflows[index];
    this.workflows.splice(index, 1);
    this.saveToStorage();
    this.renderList();
    this.currentWorkflow = null;
    this.updateEmptyState();
    log(`已删除工作流：${wf.name}`, 'info');
  },

  exportWorkflow(index) {
    const wf = this.workflows[index];
    const dataStr = JSON.stringify(wf, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${wf.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log(`已导出工作流：${wf.name}`, 'success');
  },

  importWorkflow(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const wf = JSON.parse(event.target.result);
        wf.id = Date.now();
        this.workflows.push(wf);
        this.saveToStorage();
        this.renderList();
        log(`已导入工作流：${wf.name}`, 'success');
      } catch (err) {
        log('导入失败：文件格式错误', 'error');
      }
    };
    reader.readAsText(file);
  },

  renderEditor() {
    if (!this.currentWorkflow) return;
    document.getElementById('workflow-name').value = this.currentWorkflow.name;
    document.getElementById('workflow-hotkey').value = this.currentWorkflow.hotkey || '';
    this.renderSteps();
    this.updateStepCount();
  },

  updateStepCount() {
    const countEl = document.getElementById('workflow-step-count');
    if (countEl && this.currentWorkflow) {
      const count = this.currentWorkflow.steps?.length || 0;
      countEl.textContent = `${count} 个步骤`;
    }
  },

  renderSteps() {
    const container = document.getElementById('workflow-steps');
    const steps = this.currentWorkflow.steps || [];

    if (steps.length === 0) {
      container.innerHTML = '<p class="empty-hint" style="text-align:center;padding:40px;color:var(--text-secondary);">暂无步骤，点击"添加步骤"开始</p>';
      return;
    }

    container.innerHTML = steps.map((step, index) => {
      const typeLabels = {
        'open-app': '🚀 打开应用',
        'open-url': '🌐 打开网址',
        'type-text': '⌨️ 输入文本',
        'send-hotkey': '🎹 快捷键',
        'mouse-click': '🖱️ 鼠标点击',
        'mouse-move': '🖱️ 移动鼠标',
        'wait': '⏱️ 等待',
        'run-script': '📜 运行脚本',
        'custom': '💬 自定义'
      };

      return `
        <div class="workflow-step-item" data-index="${index}">
          <span class="step-drag-handle">⋮</span>
          <div class="step-number">${index + 1}</div>
          <div class="step-info">
            <span class="step-type-badge">${typeLabels[step.type] || step.type}</span>
            <div class="step-desc">${step.desc || step.params || ''}</div>
            ${step.delay > 0 ? `<div class="step-delay">⏱ 等待 ${step.delay}s</div>` : ''}
          </div>
          <div class="step-actions">
            <button class="btn-icon btn-edit" title="编辑">✏️</button>
            <button class="btn-icon btn-move-up" title="上移">↑</button>
            <button class="btn-icon btn-move-down" title="下移">↓</button>
            <button class="btn-icon btn-delete" title="删除">🗑️</button>
          </div>
        </div>
      `;
    }).join('');

    // 绑定按钮事件
    const stepItems = container.querySelectorAll('.workflow-step-item');
    console.log('[workflow] 找到步骤项数量:', stepItems.length);
    stepItems.forEach((item, i) => {
      const index = parseInt(item.dataset.index);
      const editBtn = item.querySelector('.btn-edit');
      const upBtn = item.querySelector('.btn-move-up');
      const downBtn = item.querySelector('.btn-move-down');
      const delBtn = item.querySelector('.btn-delete');
      console.log(`[workflow] 步骤 ${i}: index=${index}, 按钮存在性:`, {
        up: !!upBtn,
        down: !!downBtn,
        del: !!delBtn,
        edit: !!editBtn
      });

      editBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[workflow] 编辑按钮点击:', index);
        workflowModule.editStep(index);
      });
      upBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[workflow] 上移按钮点击:', index);
        workflowModule.moveStep(index, -1);
      });
      downBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[workflow] 下移按钮点击:', index);
        workflowModule.moveStep(index, 1);
      });
      delBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[workflow] 删除按钮点击:', index);
        workflowModule.removeStep(index);
      });
    });
  },

  addStep(step) {
    if (!this.currentWorkflow) {
      this.currentWorkflow = { id: Date.now(), name: '新工作流', steps: [] };
    }
    if (!this.currentWorkflow.steps) {
      this.currentWorkflow.steps = [];
    }
    this.currentWorkflow.steps.push(step);
    this.renderSteps();
    this.updateStepCount();
    this.closeAddStepPanel();
    log(`添加步骤：${step.desc}`, 'info');
  },

  editStep(index) {
    if (!this.currentWorkflow || !this.currentWorkflow.steps[index]) return;

    const step = this.currentWorkflow.steps[index];
    this.editingStepIndex = index;

    // 打开侧滑面板
    const panel = document.getElementById('add-step-panel');
    if (panel) {
      panel.classList.remove('hidden');
    }

    // 设置步骤类型
    const typeSelect = document.getElementById('step-type');
    if (typeSelect) {
      typeSelect.value = step.type;
    }

    // 渲染参数表单
    renderStepParams();

    // 更新确认按钮文本
    const confirmBtn = document.getElementById('confirm-add-step-btn');
    if (confirmBtn) {
      confirmBtn.textContent = '保存步骤';
    }

    // 填充现有参数值
    setTimeout(() => {
      switch (step.type) {
        case 'open-app':
          document.getElementById('step-param-app').value = step.params.app || '';
          break;
        case 'open-url':
          document.getElementById('step-param-url').value = step.params.url || '';
          break;
        case 'type-text':
          document.getElementById('step-param-text').value = step.params.text || '';
          break;
        case 'send-hotkey':
          if (step.params.modifiers) {
            document.getElementById('hotkey-cmd').checked = step.params.modifiers.includes('command');
            document.getElementById('hotkey-ctrl').checked = step.params.modifiers.includes('control');
            document.getElementById('hotkey-alt').checked = step.params.modifiers.includes('alt');
            document.getElementById('hotkey-shift').checked = step.params.modifiers.includes('shift');
          }
          document.getElementById('hotkey-key').value = step.params.key || '';
          break;
        case 'mouse-click':
          document.getElementById('mouse-click-type').value = step.params.type || 'left';
          break;
        case 'mouse-move':
          document.getElementById('mouse-move-x').value = step.params.x || 0;
          document.getElementById('mouse-move-y').value = step.params.y || 0;
          break;
        case 'wait':
          document.getElementById('step-param-wait').value = step.params.seconds || 1;
          break;
        case 'run-script':
          document.getElementById('step-param-script').value = step.params.scriptName || '';
          break;
        case 'custom':
          document.getElementById('step-param-custom').value = step.params.command || '';
          break;
      }
      document.getElementById('step-delay').value = step.delay || 0;
    }, 50);
  },

  updateStep(updatedStep) {
    if (!this.currentWorkflow || this.editingStepIndex === undefined) return;

    this.currentWorkflow.steps[this.editingStepIndex] = updatedStep;
    this.editingStepIndex = undefined;

    this.renderSteps();
    this.updateStepCount();
    this.closeAddStepPanel();

    // 恢复确认按钮文本
    const confirmBtn = document.getElementById('confirm-add-step-btn');
    if (confirmBtn) {
      confirmBtn.textContent = '添加步骤';
    }

    log(`修改步骤：${updatedStep.desc}`, 'info');
  },

  moveStep(index, direction) {
    if (!this.currentWorkflow) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this.currentWorkflow.steps.length) return;
    [this.currentWorkflow.steps[index], this.currentWorkflow.steps[newIndex]] =
    [this.currentWorkflow.steps[newIndex], this.currentWorkflow.steps[index]];
    this.renderSteps();
  },

  removeStep(index) {
    if (!this.currentWorkflow) return;
    this.currentWorkflow.steps.splice(index, 1);
    this.renderSteps();
    this.updateStepCount();
  },

  updateEmptyState() {
    const emptyState = document.getElementById('workflow-empty-state');
    const editorArea = document.getElementById('workflow-editor-area');
    if (emptyState && editorArea) {
      if (!this.currentWorkflow) {
        emptyState.classList.remove('hidden');
        editorArea.classList.add('hidden');
      } else {
        emptyState.classList.add('hidden');
        editorArea.classList.remove('hidden');
      }
    }
  },

  openAddStepPanel() {
    if (!this.currentWorkflow) {
      log('请先创建或加载工作流', 'error');
      return;
    }
    // 重置编辑状态
    this.editingStepIndex = undefined;
    const panel = document.getElementById('add-step-panel');
    if (panel) {
      panel.classList.remove('hidden');
      renderStepParams();
    }
  },

  closeAddStepPanel() {
    const panel = document.getElementById('add-step-panel');
    if (panel) {
      panel.classList.add('hidden');
    }
    // 重置编辑状态
    this.editingStepIndex = undefined;
    // 恢复确认按钮文本
    const confirmBtn = document.getElementById('confirm-add-step-btn');
    if (confirmBtn) {
      confirmBtn.textContent = '添加步骤';
    }
  }
};

function showAddStepModal() {
  document.getElementById('add-step-modal').classList.remove('hidden');
  renderStepParams();
}

function hideAddStepModal() {
  document.getElementById('add-step-modal').classList.add('hidden');
}

function renderStepParams() {
  const type = document.getElementById('step-type').value;
  const container = document.getElementById('step-params-container');

  const params = {
    'open-app': `<label>应用名称</label><input type="text" id="step-param-app" class="text-input" placeholder="如：Google Chrome">`,
    'open-url': `<label>网址</label><input type="text" id="step-param-url" class="text-input" placeholder="https://example.com">`,
    'type-text': `<label>文本内容</label><textarea id="step-param-text" class="text-input" style="width:100%;min-height:80px;" placeholder="要输入的文本"></textarea>`,
    'send-hotkey': `
      <label>修饰键</label>
      <div class="checkbox-group">
        <label><input type="checkbox" id="hotkey-cmd"> Command</label>
        <label><input type="checkbox" id="hotkey-ctrl"> Control</label>
        <label><input type="checkbox" id="hotkey-alt"> Option</label>
        <label><input type="checkbox" id="hotkey-shift"> Shift</label>
      </div>
      <label style="margin-top:12px;">主键</label>
      <div class="hotkey-key-container">
        <input type="text" id="hotkey-key" class="text-input" placeholder="输入键名，如：C, V, enter">
        <div class="hotkey-presets">
          <span class="preset-label">常用键：</span>
          <button type="button" class="preset-btn" data-key="enter">↩ 回车</button>
          <button type="button" class="preset-btn" data-key="tab">Tab</button>
          <button type="button" class="preset-btn" data-key="space">空格</button>
          <button type="button" class="preset-btn" data-key="delete">删除</button>
          <button type="button" class="preset-btn" data-key="escape">Esc</button>
          <button type="button" class="preset-btn" data-key="up">↑</button>
          <button type="button" class="preset-btn" data-key="down">↓</button>
          <button type="button" class="preset-btn" data-key="left">←</button>
          <button type="button" class="preset-btn" data-key="right">→</button>
        </div>
      </div>
    `,
    'mouse-click': `
      <label>点击类型</label>
      <select id="mouse-click-type" class="select-input">
        <option value="left">左键点击</option>
        <option value="right">右键点击</option>
        <option value="double">双击</option>
      </select>
    `,
    'mouse-move': `
      <div class="input-group" style="margin-bottom:10px;">
        <label>X 坐标</label>
        <input type="number" id="mouse-move-x" class="text-input" value="0">
      </div>
      <div class="input-group">
        <label>Y 坐标</label>
        <input type="number" id="mouse-move-y" class="text-input" value="0">
      </div>
    `,
    'wait': `<label>等待时间 (秒)</label><input type="number" id="step-param-wait" class="text-input" value="1" min="0.1" step="0.1">`,
    'run-script': `
      <label>选择脚本</label>
      <select id="step-param-script" class="select-input"></select>
    `,
    'custom': `<label>指令</label><input type="text" id="step-param-custom" class="text-input" placeholder="输入指令">`
  };

  container.innerHTML = params[type] || '';

  if (type === 'run-script') {
    const select = document.getElementById('step-param-script');
    const scripts = JSON.parse(localStorage.getItem('desktop-robot-scripts') || '[]');
    if (scripts.length === 0) {
      select.innerHTML = '<option value="">暂无脚本</option>';
    } else {
      select.innerHTML = scripts.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
  }

  // 为快捷键预设按钮添加事件监听
  if (type === 'send-hotkey') {
    setTimeout(() => {
      document.querySelectorAll('.hotkey-presets .preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const key = e.target.dataset.key;
          document.getElementById('hotkey-key').value = key;
        });
      });
    }, 0);
  }
}

function confirmAddStep() {
  const type = document.getElementById('step-type').value;
  const delay = parseFloat(document.getElementById('step-delay').value) || 0;

  let desc = '';
  let params = {};

  switch (type) {
    case 'open-app':
      desc = document.getElementById('step-param-app').value;
      params = { app: desc };
      break;
    case 'open-url':
      desc = document.getElementById('step-param-url').value;
      params = { url: desc };
      break;
    case 'type-text':
      desc = document.getElementById('step-param-text').value;
      params = { text: desc };
      break;
    case 'send-hotkey':
      const mods = [];
      if (document.getElementById('hotkey-cmd').checked) mods.push('command');
      if (document.getElementById('hotkey-ctrl').checked) mods.push('control');
      if (document.getElementById('hotkey-alt').checked) mods.push('alt');
      if (document.getElementById('hotkey-shift').checked) mods.push('shift');
      const key = document.getElementById('hotkey-key').value;
      desc = mods.length > 0 ? `${mods.join('+')}+${key}` : key;
      params = { modifiers: mods, key: key };
      break;
    case 'mouse-click':
      const clickType = document.getElementById('mouse-click-type').value;
      desc = clickType === 'left' ? '左键点击' : clickType === 'right' ? '右键点击' : '双击';
      params = { type: clickType };
      break;
    case 'mouse-move':
      const x = document.getElementById('mouse-move-x').value;
      const y = document.getElementById('mouse-move-y').value;
      desc = `移动到 (${x}, ${y})`;
      params = { x: parseInt(x), y: parseInt(y) };
      break;
    case 'wait':
      const wait = document.getElementById('step-param-wait').value;
      desc = `等待 ${wait} 秒`;
      params = { seconds: parseFloat(wait) };
      break;
    case 'run-script':
      desc = document.getElementById('step-param-script').value;
      params = { scriptName: desc };
      break;
    case 'custom':
      desc = document.getElementById('step-param-custom').value;
      params = { command: desc };
      break;
  }

  if (!desc) {
    log('请填写参数', 'error');
    return;
  }

  const step = { type, desc, params, delay };

  // 检查是否为编辑模式
  if (workflowModule.editingStepIndex !== undefined) {
    workflowModule.updateStep(step);
  } else {
    workflowModule.addStep(step);
  }
}

async function runWorkflow(steps) {
  workflowModule.shouldStop = false;
  const statusEl = document.getElementById('workflow-status');

  for (let i = 0; i < steps.length; i++) {
    if (workflowModule.shouldStop) break;

    const step = steps[i];
    statusEl.textContent = `执行步骤 ${i + 1}/${steps.length}: ${step.desc}`;
    log(`执行：${step.desc}`, 'info');

    try {
      await executeStep(step);
      if (step.delay > 0) {
        await sleep(step.delay * 1000);
      }
    } catch (err) {
      log(`步骤执行失败：${err.message}`, 'error');
    }
  }

  workflowModule.shouldStop = false;
  document.getElementById('run-workflow-btn').disabled = false;
  document.getElementById('stop-workflow-btn').disabled = true;
  statusEl.textContent = '';
  setStatus('就绪', 'ready');
  log('工作流执行完成', 'success');
}

async function executeStep(step) {
  switch (step.type) {
    case 'open-app':
      await ipcRenderer.invoke('open-app', step.params.app);
      break;
    case 'open-url':
      const url = step.params.url.startsWith('http') ? step.params.url : `https://${step.params.url}`;
      await ipcRenderer.invoke('open-url', url);
      break;
    case 'type-text':
      await ipcRenderer.invoke('keyboard-type', step.params.text);
      break;
    case 'send-hotkey':
      const keys = [...step.params.modifiers, step.params.key];
      await ipcRenderer.invoke('keyboard-hotkey', keys);
      break;
    case 'mouse-click':
      if (step.params.type === 'double') {
        await ipcRenderer.invoke('mouse-double-click');
      } else {
        await ipcRenderer.invoke('mouse-click', step.params.type);
      }
      break;
    case 'mouse-move':
      await ipcRenderer.invoke('mouse-move', step.params.x, step.params.y);
      break;
    case 'wait':
      await sleep(step.params.seconds * 1000);
      break;
    case 'run-script':
      const scripts = JSON.parse(localStorage.getItem('desktop-robot-scripts') || '[]');
      const script = scripts.find(s => s.name === step.params.scriptName);
      if (script) {
        await ipcRenderer.invoke('run-script', script.commands);
      }
      break;
    case 'custom':
      const cmd = step.params.command;
      if (cmd === '点击' || cmd === '点一下') {
        await ipcRenderer.invoke('mouse-click', 'left');
      } else if (cmd === '双击' || cmd === '点两下') {
        await ipcRenderer.invoke('mouse-double-click');
      } else if (cmd === '右键' || cmd === '右击') {
        await ipcRenderer.invoke('mouse-right-click');
      } else if (cmd === '按回车' || cmd === '回车' || cmd === '确定') {
        await ipcRenderer.invoke('keyboard-press', 'enter');
      } else if (cmd === '复制') {
        await ipcRenderer.invoke('keyboard-hotkey', ['command', 'c']);
      } else if (cmd === '粘贴') {
        await ipcRenderer.invoke('keyboard-hotkey', ['command', 'v']);
      } else if (cmd === '截图' || cmd === '截屏') {
        await ipcRenderer.invoke('capture-screen');
      } else if (cmd.startsWith('输入 ')) {
        await ipcRenderer.invoke('keyboard-type', cmd.slice(3));
      } else if (cmd.startsWith('访问 ')) {
        const cmdUrl = cmd.slice(3).trim();
        const fullUrl = cmdUrl.startsWith('http') ? cmdUrl : `https://${cmdUrl}`;
        await ipcRenderer.invoke('open-url', fullUrl);
      } else {
        await ipcRenderer.invoke('keyboard-type', cmd);
      }
      break;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 暴露到全局作用域
window.workflowModule = workflowModule;
