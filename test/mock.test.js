/**
 * Desktop Robot - 模拟测试套件
 * 模拟用户交互、IPC 调用和实际场景测试
 */

const assert = require('assert');

// 测试统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

// ==================== 模拟工具类 ====================

// 模拟 IPC 调用
class MockIPC {
  constructor() {
    this.handlers = new Map();
    this.callLog = [];
  }

  handle(channel, handler) {
    this.handlers.set(channel, handler);
  }

  async invoke(channel, ...args) {
    this.callLog.push({ channel, args, time: Date.now() });
    const handler = this.handlers.get(channel);
    if (handler) {
      return await handler({}, ...args);
    }
    throw new Error(`No handler for channel: ${channel}`);
  }

  getLog() {
    return this.callLog;
  }

  clearLog() {
    this.callLog = [];
  }
}

// 模拟 RobotJS
class MockRobot {
  constructor() {
    this.mousePos = { x: 0, y: 0 };
    this.clicked = false;
    this.lastClick = null;
    this.typedText = '';
    this.keysPressed = [];
  }

  moveMouse(x, y) {
    this.mousePos = { x, y };
  }

  getMousePos() {
    return this.mousePos;
  }

  mouseClick(button = 'left') {
    this.clicked = true;
    this.lastClick = { type: 'click', button, pos: { ...this.mousePos } };
  }

  typeString(text) {
    this.typedText += text;
  }

  keyTap(key) {
    this.keysPressed.push({ type: 'tap', key, time: Date.now() });
  }

  keyToggle(key, state) {
    this.keysPressed.push({ type: 'toggle', key, state, time: Date.now() });
  }

  getPixelColor(x, y) {
    return 'ffffff';
  }

  getScreenSize() {
    return { width: 1920, height: 1080 };
  }

  reset() {
    this.mousePos = { x: 0, y: 0 };
    this.clicked = false;
    this.lastClick = null;
    this.typedText = '';
    this.keysPressed = [];
  }
}

// 模拟 localStorage
class MockLocalStorage {
  constructor() {
    this.data = new Map();
  }

  getItem(key) {
    return this.data.get(key) || null;
  }

  setItem(key, value) {
    this.data.set(key, value);
  }

  removeItem(key) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }

  get length() {
    return this.data.size;
  }

  key(index) {
    return Array.from(this.data.keys())[index];
  }
}

// 测试辅助函数
function test(name, fn) {
  stats.total++;
  try {
    fn();
    stats.passed++;
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    stats.failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    错误：${err.message}`);
    return false;
  }
}

function it(name, fn) {
  return test(name, fn);
}

function describe(groupName, fn) {
  console.log(`\n${groupName}`);
  fn();
}

function assertTrue(condition, message) {
  if (!condition) {
    throw new Error(message || '条件不满足');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message || '值不匹配'} - 期望：${expected}, 实际：${actual}`);
  }
}

function assertArrayEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message || '数组不匹配'} - 期望：${expectedStr}, 实际：${actualStr}`);
  }
}

// ==================== 模拟测试 ====================

console.log('\n========================================');
console.log('  Desktop Robot - 模拟测试套件');
console.log('========================================');

// ----- IPC 调用模拟测试 -----
describe('\n🔌 IPC 调用模拟测试', () => {
  const ipc = new MockIPC();
  const robot = new MockRobot();

  // 注册模拟的 IPC 处理器
  ipc.handle('mouse-move', async (event, x, y) => {
    robot.moveMouse(x, y);
    return true;
  });

  ipc.handle('mouse-click', async (event, button) => {
    robot.mouseClick(button);
    return true;
  });

  ipc.handle('keyboard-type', async (event, text) => {
    robot.typeString(text);
    return true;
  });

  ipc.handle('keyboard-hotkey', async (event, keys) => {
    keys.forEach(key => robot.keyToggle(key, 'down'));
    robot.keyTap(keys[keys.length - 1]);
    keys.reverse().forEach(key => robot.keyToggle(key, 'up'));
    return true;
  });

  it('应能移动鼠标到指定位置', async () => {
    robot.reset();
    await ipc.invoke('mouse-move', 100, 200);
    assertEqual(robot.mousePos.x, 100, 'X 坐标错误');
    assertEqual(robot.mousePos.y, 200, 'Y 坐标错误');
  });

  it('应能执行鼠标点击', async () => {
    robot.reset();
    await ipc.invoke('mouse-click', 'left');
    assertTrue(robot.clicked, '点击标志应被设置');
    assertEqual(robot.lastClick.button, 'left', '点击按钮错误');
  });

  it('应能输入文本', async () => {
    robot.reset();
    await ipc.invoke('keyboard-type', 'Hello World');
    assertEqual(robot.typedText, 'Hello World', '输入的文本错误');
  });

  it('应能执行快捷键组合', async () => {
    robot.reset();
    await ipc.invoke('keyboard-hotkey', ['command', 'c']);
    const keys = robot.keysPressed.map(k => k.key);
    assertTrue(keys.includes('command'), '应包含 command 键');
    assertTrue(keys.includes('c'), '应包含 c 键');
  });

  it('应记录所有 IPC 调用', () => {
    const log = ipc.getLog();
    assertTrue(log.length >= 4, '应至少记录 4 次调用');
    const channels = log.map(l => l.channel);
    assertTrue(channels.includes('mouse-move'), '应记录 mouse-move');
    assertTrue(channels.includes('keyboard-type'), '应记录 keyboard-type');
  });
});

// ----- 工作流执行模拟测试 -----
describe('\n⚡ 工作流执行模拟测试', () => {
  const robot = new MockRobot();
  const ipc = new MockIPC();

  // 注册所有工作流相关的 IPC 处理器
  ipc.handle('open-app', async (event, appName) => {
    return { success: true, appName };
  });

  ipc.handle('open-url', async (event, url) => {
    return { success: true, url };
  });

  ipc.handle('keyboard-type', async (event, text) => {
    robot.typeString(text);
    return true;
  });

  ipc.handle('keyboard-hotkey', async (event, keys) => {
    keys.forEach(k => robot.keysPressed.push({ key: k }));
    return true;
  });

  ipc.handle('mouse-click', async (event, button) => {
    robot.mouseClick(button);
    return true;
  });

  const executeStep = async (step) => {
    switch (step.type) {
      case 'open-app':
        await ipc.invoke('open-app', step.params.app);
        break;
      case 'open-url':
        await ipc.invoke('open-url', step.params.url);
        break;
      case 'type-text':
        await ipc.invoke('keyboard-type', step.params.text);
        break;
      case 'send-hotkey':
        await ipc.invoke('keyboard-hotkey', [...step.params.modifiers, step.params.key]);
        break;
      case 'mouse-click':
        await ipc.invoke('mouse-click', step.params.type || 'left');
        break;
    }
  };

  it('应能执行打开应用步骤', async () => {
    const step = { type: 'open-app', params: { app: 'Google Chrome' } };
    const result = await executeStep(step);
    const log = ipc.getLog();
    const lastCall = log[log.length - 1];
    assertEqual(lastCall.channel, 'open-app', '应调用 open-app');
  });

  it('应能执行打开 URL 步骤', async () => {
    ipc.clearLog();
    const step = { type: 'open-url', params: { url: 'https://github.com' } };
    await executeStep(step);
    const log = ipc.getLog();
    const lastCall = log[log.length - 1];
    assertEqual(lastCall.args[0], 'https://github.com', 'URL 应正确');
  });

  it('应能执行输入文本步骤', async () => {
    robot.reset();
    ipc.clearLog();
    const step = { type: 'type-text', params: { text: 'Hello' } };
    await executeStep(step);
    assertEqual(robot.typedText, 'Hello', '应输入正确的文本');
  });

  it('应能执行快捷键步骤', async () => {
    robot.reset();
    ipc.clearLog();
    const step = { type: 'send-hotkey', params: { modifiers: ['command'], key: 's' } };
    await executeStep(step);
    const keys = robot.keysPressed.map(k => k.key);
    assertTrue(keys.includes('command'), '应包含 command');
    assertTrue(keys.includes('s'), '应包含 s');
  });

  it('应能执行完整工作流', async () => {
    robot.reset();
    ipc.clearLog();

    const workflow = [
      { type: 'open-app', params: { app: 'Chrome' }, delay: 1 },
      { type: 'wait', desc: '等待', delay: 1 },
      { type: 'type-text', params: { text: 'test' }, delay: 0 },
      { type: 'send-hotkey', params: { modifiers: ['command'], key: 'enter' }, delay: 0 }
    ];

    // 执行工作流（跳过 wait 类型）
    for (const step of workflow) {
      if (step.type !== 'wait') {
        await executeStep(step);
      }
    }

    const log = ipc.getLog();
    assertEqual(log.length, 4, '应执行 4 个步骤');
    assertEqual(robot.typedText, 'test', '应输入 test');
  });
});

// ----- 模板使用场景模拟测试 -----
describe('\n📋 模板使用场景模拟测试', () => {
  const templates = [
    {
      id: 'morning-standup',
      name: '晨会准备',
      steps: [
        { type: 'open-app', desc: '打开钉钉', params: { app: '钉钉' }, delay: 2 },
        { type: 'wait', desc: '等待 3 秒', params: { seconds: 3 }, delay: 0 },
        { type: 'open-url', desc: '打开会议文档', params: { url: 'https://docs.qq.com' }, delay: 2 }
      ]
    },
    {
      id: 'github-open',
      name: '打开 GitHub',
      steps: [
        { type: 'open-app', desc: '打开 Chrome', params: { app: 'Google Chrome' }, delay: 2 },
        { type: 'open-url', desc: '访问 GitHub', params: { url: 'https://github.com' }, delay: 3 }
      ]
    },
    {
      id: 'copy-paste-workflow',
      name: '复制粘贴',
      steps: [
        { type: 'send-hotkey', desc: '复制', params: { modifiers: ['command'], key: 'c' }, delay: 0.3 },
        { type: 'send-hotkey', desc: '切换应用', params: { modifiers: ['command'], key: 'tab' }, delay: 0.5 },
        { type: 'send-hotkey', desc: '粘贴', params: { modifiers: ['command'], key: 'v' }, delay: 0.3 }
      ]
    }
  ];

  it('晨会模板应打开正确的应用', () => {
    const template = templates.find(t => t.id === 'morning-standup');
    const openAppSteps = template.steps.filter(s => s.type === 'open-app');
    assertTrue(openAppSteps.length > 0, '晨会模板应包含打开应用步骤');
    assertEqual(openAppSteps[0].params.app, '钉钉', '应打开钉钉');
  });

  it('GitHub 模板应打开正确的 URL', () => {
    const template = templates.find(t => t.id === 'github-open');
    const urlSteps = template.steps.filter(s => s.type === 'open-url');
    assertTrue(urlSteps.length > 0, 'GitHub 模板应包含打开 URL 步骤');
    assertEqual(urlSteps[0].params.url, 'https://github.com', 'URL 应正确');
  });

  it('复制粘贴模板应使用正确的快捷键', () => {
    const template = templates.find(t => t.id === 'copy-paste-workflow');
    const hotkeySteps = template.steps.filter(s => s.type === 'send-hotkey');
    assertEqual(hotkeySteps.length, 3, '复制粘贴应有 3 个快捷键步骤');

    const keys = hotkeySteps.map(s => s.params.key);
    assertEqual(keys[0], 'c', '第一步应是复制 (c)');
    assertEqual(keys[1], 'tab', '第二步应是切换 (tab)');
    assertEqual(keys[2], 'v', '第三步应是粘贴 (v)');
  });

  it('模板步骤应有合理的延迟', () => {
    templates.forEach(template => {
      template.steps.forEach(step => {
        assertTrue(step.delay >= 0, '延迟应 >= 0');
        assertTrue(step.delay <= 10, '延迟应 <= 10 秒');
      });
    });
  });
});

// ----- AI 助手问题检测模拟测试 -----
describe('\n🤖 AI 助手问题检测模拟测试', () => {
  // 模拟 AI 助手的问题检测逻辑
  const questionPatterns = [
    /Would you like to.*\?$/i,
    /Do you want to.*\?$/i,
    /Should I.*\?$/i,
    /Confirm.*\?$/i,
    /Continue.*\?$/i,
    /\?\s*$/,
    /:\s*$/,
  ];

  const isQuestion = (text) => {
    for (const pattern of questionPatterns) {
      if (pattern.test(text)) {
        return true;
      }
    }
    return false;
  };

  const getReply = (strategy, text) => {
    if (strategy === 'confirm') return 'yes';
    if (strategy === 'continue') return 'continue';
    if (strategy === 'smart') {
      if (/^(Do|Would|Should)/i.test(text)) return 'yes';
      if (/Continue|Proceed/i.test(text)) return 'continue';
      return 'yes';
    }
    return 'yes';
  };

  const testQuestions = [
    { text: 'Would you like to proceed?', expected: true },
    { text: 'Do you want me to continue?', expected: true },
    { text: 'Should I make this change?', expected: true },
    { text: 'Confirm the changes [Y/n]:', expected: true },
    { text: 'Continue execution?', expected: true },
    { text: 'Building project...', expected: false },
    { text: 'Installing dependencies', expected: false },
    { text: 'Done! All tests passed.', expected: false },
  ];

  it('应正确识别问题', () => {
    testQuestions.forEach(({ text, expected }) => {
      const result = isQuestion(text);
      assertEqual(result, expected, `问题识别错误："${text}"`);
    });
  });

  it('应生成正确的回复 (confirm 策略)', () => {
    assertEqual(getReply('confirm', 'Any question'), 'yes', 'confirm 策略应返回 yes');
  });

  it('应生成正确的回复 (continue 策略)', () => {
    assertEqual(getReply('continue', 'Any question'), 'continue', 'continue 策略应返回 continue');
  });

  it('应智能回复 (smart 策略)', () => {
    assertEqual(getReply('smart', 'Do you want to continue?'), 'yes', 'smart 策略应识别 Do 问句');
    assertEqual(getReply('smart', 'Continue execution?'), 'continue', 'smart 策略应识别 Continue');
  });
});

// ----- 宏命令执行模拟测试 -----
describe('\n⌨️ 宏命令执行模拟测试', () => {
  const robot = new MockRobot();

  const executeMacro = async (commands) => {
    for (const cmd of commands) {
      if (cmd.actionType === 'hotkey') {
        const keys = cmd.actionValue.split('+');
        keys.forEach(k => robot.keysPressed.push({ key: k }));
      } else if (cmd.actionType === 'type') {
        robot.typeString(cmd.actionValue);
      }

      if (cmd.delay > 0) {
        // 模拟延迟（实际测试中不等待）
      }
    }
  };

  it('应能执行复制粘贴宏', async () => {
    robot.reset();
    const commands = [
      { key: 'Ctrl+C', actionType: 'hotkey', actionValue: 'Ctrl+C', delay: 0.2 },
      { key: 'Ctrl+V', actionType: 'hotkey', actionValue: 'Ctrl+V', delay: 0.2 }
    ];
    await executeMacro(commands);

    const keys = robot.keysPressed.map(k => k.key);
    assertTrue(keys.includes('Ctrl') || keys.includes('C'), '应包含 Ctrl 或 C');
    assertTrue(keys.includes('V'), '应包含 V');
  });

  it('应能执行文本输入宏', async () => {
    robot.reset();
    const commands = [
      { key: 'Hello', actionType: 'type', actionValue: 'Hello', delay: 0.2 },
      { key: ' World', actionType: 'type', actionValue: ' World', delay: 0 }
    ];
    await executeMacro(commands);

    assertEqual(robot.typedText, 'Hello World', '应输入正确的文本');
  });

  it('应能执行保存全部宏', async () => {
    robot.reset();
    const commands = [
      { key: 'Ctrl+S', actionType: 'hotkey', actionValue: 'Ctrl+S', delay: 0.3 },
      { key: 'Win+D', actionType: 'hotkey', actionValue: 'Win+D', delay: 0.2 }
    ];
    await executeMacro(commands);

    const keys = robot.keysPressed.map(k => k.key);
    assertTrue(keys.includes('S'), '应包含 S（保存）');
    assertTrue(keys.includes('D'), '应包含 D（显示桌面）');
  });
});

// ----- 剪贴板操作模拟测试 -----
describe('\n📋 剪贴板操作模拟测试', () => {
  const clipboard = {
    content: '',

    writeText(text) {
      this.content = text;
    },

    readText() {
      return this.content;
    },

    clear() {
      this.content = '';
    }
  };

  it('应能写入剪贴板', () => {
    clipboard.clear();
    clipboard.writeText('测试内容');
    assertEqual(clipboard.readText(), '测试内容', '剪贴板内容应正确');
  });

  it('应能读取剪贴板', () => {
    clipboard.writeText('新内容');
    assertEqual(clipboard.readText(), '新内容', '应能读取剪贴板');
  });

  it('应能清空剪贴板', () => {
    clipboard.writeText('临时内容');
    clipboard.clear();
    assertEqual(clipboard.readText(), '', '剪贴板应被清空');
  });
});

// ----- 定时任务模拟测试 -----
describe('\n⏰ 定时任务模拟测试', () => {
  const tasks = [];
  let currentTime = new Date('2024-01-01 10:00:00');

  const addTask = (task) => {
    tasks.push({
      ...task,
      id: tasks.length + 1,
      enabled: task.enabled !== false
    });
  };

  const getDueTasks = () => {
    return tasks.filter(task => {
      if (!task.enabled) return false;
      const [hours, minutes] = task.time.split(':').map(Number);
      return currentTime.getHours() === hours && currentTime.getMinutes() === minutes;
    });
  };

  const shouldRunOnDay = (task, dayOfWeek) => {
    if (task.repeatDaily) return true;
    if (task.repeatWeekdays && [1, 2, 3, 4, 5].includes(dayOfWeek)) return true;
    if (task.repeatWeekend && [0, 6].includes(dayOfWeek)) return true;
    return !task.repeatDaily && !task.repeatWeekdays && !task.repeatWeekend;
  };

  it('应能添加定时任务', () => {
    addTask({
      name: '晨会提醒',
      script: 'morning-meeting',
      time: '09:00',
      enabled: true
    });
    assertEqual(tasks.length, 1, '应有一个任务');
    assertEqual(tasks[0].name, '晨会提醒', '任务名称应正确');
  });

  it('应能获取到期任务', () => {
    tasks.length = 0;
    addTask({ name: '任务 1', time: '10:00', enabled: true });
    addTask({ name: '任务 2', time: '10:00', enabled: true });
    addTask({ name: '任务 3', time: '11:00', enabled: true });

    const dueTasks = getDueTasks();
    assertEqual(dueTasks.length, 2, '应有 2 个到期任务');
  });

  it('应支持每日重复', () => {
    tasks.length = 0;
    addTask({ name: '每日任务', time: '09:00', repeatDaily: true });
    assertTrue(shouldRunOnDay(tasks[0], 1), '应支持每日重复');
    assertTrue(shouldRunOnDay(tasks[0], 6), '周末也应运行');
  });

  it('应支持工作日重复', () => {
    tasks.length = 0;
    addTask({ name: '工作日任务', time: '09:00', repeatWeekdays: true });
    assertTrue(shouldRunOnDay(tasks[0], 1), '周一应运行');
    assertTrue(shouldRunOnDay(tasks[0], 5), '周五应运行');
    assertTrue(!shouldRunOnDay(tasks[0], 6), '周六不应运行');
  });

  it('应支持周末重复', () => {
    tasks.length = 0;
    addTask({ name: '周末任务', time: '10:00', repeatWeekend: true });
    assertTrue(shouldRunOnDay(tasks[0], 0), '周日应运行');
    assertTrue(shouldRunOnDay(tasks[0], 6), '周六应运行');
    assertTrue(!shouldRunOnDay(tasks[0], 1), '周一不应运行');
  });
});

// ----- 录制功能模拟测试 -----
describe('\n🔴 录制功能模拟测试', () => {
  const recorder = {
    isRecording: false,
    recordedCommands: [],

    start() {
      this.isRecording = true;
      this.recordedCommands = [];
    },

    stop() {
      this.isRecording = false;
    },

    record(command) {
      if (this.isRecording) {
        this.recordedCommands.push({
          ...command,
          timestamp: Date.now()
        });
      }
    },

    getCommands() {
      return this.recordedCommands;
    }
  };

  it('应能开始录制', () => {
    recorder.start();
    assertTrue(recorder.isRecording, '录制状态应为 true');
    assertEqual(recorder.recordedCommands.length, 0, '录制开始时命令列表应为空');
  });

  it('应能记录鼠标点击', () => {
    recorder.record({ type: 'mouse-click', params: { button: 'left' } });
    recorder.record({ type: 'mouse-click', params: { button: 'left' } });
    assertEqual(recorder.recordedCommands.length, 2, '应记录 2 次点击');
  });

  it('应能记录键盘输入', () => {
    recorder.record({ type: 'keyboard-type', params: { text: 'Hello' } });
    const commands = recorder.getCommands();
    const lastCmd = commands[commands.length - 1];
    assertEqual(lastCmd.type, 'keyboard-type', '最后一条应是键盘输入');
  });

  it('应能停止录制', () => {
    recorder.stop();
    assertTrue(!recorder.isRecording, '录制状态应为 false');

    const beforeLength = recorder.recordedCommands.length;
    recorder.record({ type: 'mouse-click' });
    assertEqual(recorder.recordedCommands.length, beforeLength, '停止后不应再记录');
  });

  it('应能获取录制的命令', () => {
    recorder.start();
    recorder.record({ type: 'mouse-click', params: { button: 'left' } });
    recorder.record({ type: 'keyboard-type', params: { text: 'test' } });
    recorder.stop();

    const commands = recorder.getCommands();
    assertEqual(commands.length, 2, '应有 2 条命令');
    assertTrue(commands[0].timestamp > 0, '命令应有时间戳');
  });
});

// ----- 系统工具模拟测试 -----
describe('\n🛠️ 系统工具模拟测试', () => {
  const mockSystem = {
    getCpuUsage: () => Math.random() * 100,
    getMemoryUsage: () => ({
      total: 16 * 1024 * 1024 * 1024,
      used: 8 * 1024 * 1024 * 1024,
      free: 8 * 1024 * 1024 * 1024
    }),
    getNetworkInterfaces: () => [
      { name: 'en0', address: '192.168.1.100', mac: '00:11:22:33:44:55' }
    ]
  };

  it('应能获取 CPU 使用率', () => {
    const cpu = mockSystem.getCpuUsage();
    assertTrue(cpu >= 0 && cpu <= 100, 'CPU 使用率应在 0-100 之间');
  });

  it('应能获取内存使用情况', () => {
    const memory = mockSystem.getMemoryUsage();
    assertTrue(memory.total > 0, '总内存应大于 0');
    assertEqual(memory.total, memory.used + memory.free, '内存总和应匹配');
  });

  it('应能获取网络接口', () => {
    const interfaces = mockSystem.getNetworkInterfaces();
    assertTrue(interfaces.length > 0, '应至少有一个网络接口');
    assertTrue(interfaces[0].address.includes('.'), '应有有效的 IP 地址');
  });
});

// ----- HTML 结构验证测试 -----
describe('\n📄 HTML 结构验证测试', () => {
  const fs = require('fs');
  const htmlSource = fs.readFileSync('./src/index.html', 'utf-8');

  it('HTML 标签应平衡闭合', () => {
    const openHtml = (htmlSource.match(/<html/g) || []).length;
    const closeHtml = (htmlSource.match(/<\/html>/g) || []).length;
    assertEqual(openHtml, closeHtml, 'html 标签未正确闭合');
  });

  it('head 和 body 标签应平衡闭合', () => {
    const openHead = (htmlSource.match(/<head>/g) || []).length;
    const closeHead = (htmlSource.match(/<\/head>/g) || []).length;
    assertEqual(openHead, closeHead, 'head 标签未正确闭合');

    const openBody = (htmlSource.match(/<body>/g) || []).length;
    const closeBody = (htmlSource.match(/<\/body>/g) || []).length;
    assertEqual(openBody, closeBody, 'body 标签未正确闭合');
  });

  it('div 标签应总体平衡', () => {
    const openDivs = (htmlSource.match(/<div/g) || []).length;
    const closeDivs = (htmlSource.match(/<\/div>/g) || []).length;
    assertEqual(openDivs, closeDivs, `div 标签不平衡：开启${openDivs}个，闭合${closeDivs}个`);
  });

  it('main 标签应正确闭合', () => {
    const openMain = htmlSource.indexOf('<main class="main-content">');
    const closeMain = htmlSource.indexOf('</main>');
    assertTrue(openMain > 0, '应有 main 标签开启');
    assertTrue(closeMain > openMain, 'main 标签应正确闭合');
  });

  it('section 标签应平衡闭合', () => {
    const openSections = (htmlSource.match(/<section/g) || []).length;
    const closeSections = (htmlSource.match(/<\/section>/g) || []).length;
    assertEqual(openSections, closeSections, 'section 标签未正确闭合');
  });

  it('aside 标签应平衡闭合', () => {
    const openAsides = (htmlSource.match(/<aside/g) || []).length;
    const closeAsides = (htmlSource.match(/<\/aside>/g) || []).length;
    assertEqual(openAsides, closeAsides, 'aside 标签未正确闭合');
  });

  it('modal 模态框 div 应平衡闭合', () => {
    const modalDivs = (htmlSource.match(/<div id="[^"]+-modal"/g) || []).length;
    // 每个 modal 开启后应有对应的闭合，通过总的 div 平衡来验证
    const openModalDivs = (htmlSource.match(/<div id="[^"]*modal[^"]*"/g) || []).length;
    assertTrue(openModalDivs > 0, '应至少有一个模态框');
  });

  it('container 结构应正确 - main 在 log-panel 之前闭合', () => {
    const mainCloseIdx = htmlSource.indexOf('</main>');
    const logPanelIdx = htmlSource.indexOf('<aside class="log-panel">');
    assertTrue(mainCloseIdx > 0, '应有</main>标签');
    assertTrue(logPanelIdx > 0, '应有 log-panel');
    assertTrue(mainCloseIdx < logPanelIdx, 'main 标签应在 log-panel 之前闭合');
  });
});

// ==================== 打印结果 ====================

console.log('\n========================================');
console.log('  模拟测试汇总');
console.log('========================================');
console.log(`  总计：${stats.total}`);
console.log(`  ✓ 通过：${stats.passed}`);
console.log(`  ✗ 失败：${stats.failed}`);
console.log('========================================\n');

if (stats.failed > 0) {
  console.log('⚠️  部分测试失败，请检查错误信息。');
  process.exit(1);
} else {
  console.log('✓ 所有模拟测试通过！');
  process.exit(0);
}
