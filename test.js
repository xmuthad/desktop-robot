/**
 * Desktop Robot - 功能测试套件
 * 测试各项功能是否正常工作
 */

const assert = require('assert');
const path = require('path');

// 测试统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0
};

// 测试工具函数
function test(name, fn) {
  stats.total++;
  return (async () => {
    try {
      await fn();
      stats.passed++;
      console.log(`✓ ${name}`);
      return true;
    } catch (err) {
      stats.failed++;
      console.log(`✗ ${name}`);
      console.log(`  错误：${err.message}`);
      return false;
    }
  })();
}

function skip(name, reason) {
  stats.skipped++;
  console.log(`○ ${name} (跳过：${reason})`);
}

function assertEqual(actual, expected, msg = '') {
  if (actual !== expected) {
    throw new Error(`${msg} 期望：${expected}, 实际：${actual}`);
  }
}

function assertTrue(condition, msg = '条件不满足') {
  if (!condition) {
    throw new Error(msg);
  }
}

function assertArrayEqual(actual, expected, msg = '') {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${msg} 期望：${expectedStr}, 实际：${actualStr}`);
  }
}

// ==================== 测试用例 ====================

async function runAllTests() {
  console.log('\n========================================');
  console.log('  Desktop Robot - 功能测试套件');
  console.log('========================================\n');

  // ----- 模板模块测试 -----
  console.log('--- 模板模块测试 ---\n');

  // 由于模板模块依赖 DOM，我们在 Node.js 环境中模拟测试
  const templatesModule = require('./src/templates.js');

  await test('模板库应包含预设模板', () => {
    // 检查宏模板是否导出
    const macroTemplates = templatesModule.macroTemplates || require('./src/templates.js').macroTemplates;
    // 如果没有导出，直接从源文件验证
    const fs = require('fs');
    const source = fs.readFileSync('./src/templates.js', 'utf-8');
    assertTrue(source.includes('const templatesModule'), '模板模块未定义');
    assertTrue(source.includes('templates: ['), '模板数组未定义');
  });

  await test('应包含晨会准备模板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/templates.js', 'utf-8');
    assertTrue(source.includes('morning-standup'), '缺少晨会准备模板');
    assertTrue(source.includes('钉钉'), '晨会模板应包含钉钉');
  });

  await test('应包含 GitHub 模板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/templates.js', 'utf-8');
    assertTrue(source.includes('github-open'), '缺少 GitHub 模板');
    assertTrue(source.includes('https://github.com'), 'GitHub 模板 URL 错误');
  });

  await test('应包含微信自动回复模板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/templates.js', 'utf-8');
    assertTrue(source.includes('wechat-reply'), '缺少微信模板');
    assertTrue(source.includes('微信'), '微信模板应包含微信');
  });

  await test('应包含开发环境模板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/templates.js', 'utf-8');
    assertTrue(source.includes('dev-workspace'), '缺少开发环境模板');
    assertTrue(source.includes('VSCode'), '开发环境模板应包含 VSCode');
  });

  await test('模板步骤类型应正确', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/templates.js', 'utf-8');
    const stepTypes = ['open-app', 'open-url', 'type-text', 'send-hotkey', 'mouse-click', 'wait', 'custom'];
    for (const type of stepTypes) {
      assertTrue(source.includes(`type: '${type}'`), `模板应支持步骤类型：${type}`);
    }
  });

  // ----- 工作流模块测试 -----
  console.log('\n--- 工作流模块测试 ---\n');

  await test('工作流模块文件存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./src/workflow.js'), 'workflow.js 文件不存在');
  });

  await test('工作流模块应包含必要函数', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/workflow.js', 'utf-8');
    const requiredFunctions = [
      'init',
      'loadWorkflows',
      'saveToStorage',
      'createNew',
      'save',
      'run',
      'stop',
      'renderList',
      'deleteWorkflow',
      'exportWorkflow',
      'importWorkflow',
      'renderSteps',
      'addStep',
      'removeStep'
    ];
    for (const fn of requiredFunctions) {
      assertTrue(source.includes(`${fn}(`), `工作流模块缺少函数：${fn}`);
    }
  });

  await test('工作流应支持 IPC 调用', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/workflow.js', 'utf-8');
    const ipcCalls = ['ipcRenderer.invoke', 'open-app', 'open-url', 'keyboard-type', 'mouse-click'];
    for (const call of ipcCalls) {
      assertTrue(source.includes(call), `工作流应支持 IPC 调用：${call}`);
    }
  });

  await test('工作流应支持步骤类型', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/workflow.js', 'utf-8');
    const stepTypes = [
      'open-app', 'open-url', 'type-text', 'send-hotkey',
      'mouse-click', 'mouse-move', 'wait', 'run-script', 'custom'
    ];
    for (const type of stepTypes) {
      assertTrue(source.includes(`case '${type}'`), `工作流应支持步骤类型：${type}`);
    }
  });

  // ----- AI 助手模块测试 -----
  console.log('\n--- AI 助手模块测试 ---\n');

  await test('AI 助手模块文件存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./src/ai-assistant.js'), 'ai-assistant.js 文件不存在');
  });

  await test('AI 助手应包含问题检测模式', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/ai-assistant.js', 'utf-8');
    assertTrue(source.includes('questionPatterns'), 'AI 助手应包含问题模式数组');
    assertTrue(source.includes('Would you like'), '应检测 "Would you like" 问题');
    assertTrue(source.includes('Do you want'), '应检测 "Do you want" 问题');
    assertTrue(source.includes('Confirm'), '应检测确认问题');
  });

  await test('AI 助手应包含回复模板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/ai-assistant.js', 'utf-8');
    assertTrue(source.includes('replyTemplates'), 'AI 助手应包含回复模板');
    assertTrue(source.includes('confirm'), '应包含确认回复');
    assertTrue(source.includes('continue'), '应包含继续回复');
  });

  await test('AI 助手应包含状态管理', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/ai-assistant.js', 'utf-8');
    assertTrue(source.includes('state:'), 'AI 助手应包含状态对象');
    assertTrue(source.includes('isMonitoring'), '应包含监听状态');
    assertTrue(source.includes('startMonitoring'), '应包含开始监听函数');
    assertTrue(source.includes('stopMonitoring'), '应包含停止监听函数');
  });

  // ----- 主进程测试 -----
  console.log('\n--- 主进程模块测试 ---\n');

  await test('主进程文件存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./src/main.js'), 'main.js 文件不存在');
  });

  await test('主进程应包含鼠标操作 IPC', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/main.js', 'utf-8');
    const mouseIPCs = [
      'mouse-move',
      'mouse-click',
      'mouse-double-click',
      'mouse-right-click'
    ];
    for (const ipc of mouseIPCs) {
      assertTrue(source.includes(`'${ipc}'`), `主进程应包含鼠标 IPC: ${ipc}`);
    }
  });

  await test('主进程应包含键盘操作 IPC', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/main.js', 'utf-8');
    const keyboardIPCs = [
      'keyboard-type',
      'keyboard-press',
      'keyboard-hotkey'
    ];
    for (const ipc of keyboardIPCs) {
      assertTrue(source.includes(`'${ipc}'`), `主进程应包含键盘 IPC: ${ipc}`);
    }
  });

  await test('主进程应包含屏幕操作 IPC', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/main.js', 'utf-8');
    const screenIPCs = [
      'get-screen-size',
      'get-screen-color',
      'capture-screen'
    ];
    for (const ipc of screenIPCs) {
      assertTrue(source.includes(`'${ipc}'`), `主进程应包含屏幕 IPC: ${ipc}`);
    }
  });

  await test('主进程应包含剪贴板操作 IPC', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/main.js', 'utf-8');
    const clipboardIPCs = [
      'clipboard-get',
      'clipboard-set',
      'clipboard-clear'
    ];
    for (const ipc of clipboardIPCs) {
      assertTrue(source.includes(`'${ipc}'`), `主进程应包含剪贴板 IPC: ${ipc}`);
    }
  });

  await test('主进程应包含应用操作 IPC', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/main.js', 'utf-8');
    const appIPCs = [
      'open-app',
      'open-url',
      'open-file'
    ];
    for (const ipc of appIPCs) {
      assertTrue(source.includes(`'${ipc}'`), `主进程应包含应用 IPC: ${ipc}`);
    }
  });

  await test('主进程应包含系统工具 IPC', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/main.js', 'utf-8');
    const toolIPCs = [
      'get-system-info',
      'get-process-list',
      'get-network-info',
      'get-battery-status',
      'set-volume',
      'show-notification'
    ];
    for (const ipc of toolIPCs) {
      assertTrue(source.includes(`'${ipc}'`), `主进程应包含系统工具 IPC: ${ipc}`);
    }
  });

  // ----- 渲染进程测试 -----
  console.log('\n--- 渲染进程模块测试 ---\n');

  await test('渲染进程文件存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./src/renderer.js'), 'renderer.js 文件不存在');
  });

  await test('渲染进程应初始化各模块', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/renderer.js', 'utf-8');
    assertTrue(source.includes('workflowModule.init()'), '应初始化工作流模块');
    assertTrue(source.includes('templatesModule.init()'), '应初始化模板模块');
    assertTrue(source.includes('aiAssistantModule.init()'), '应初始化 AI 助手模块');
  });

  await test('渲染进程应包含命令按钮初始化', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/renderer.js', 'utf-8');
    assertTrue(source.includes('initCommandButtons'), '应包含命令按钮初始化函数');
  });

  await test('渲染进程应包含脚本管理功能', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/renderer.js', 'utf-8');
    const scriptFunctions = [
      'initScriptManagement',
      'loadScriptsList',
      'runScript'
    ];
    for (const fn of scriptFunctions) {
      assertTrue(source.includes(fn), `渲染进程应包含脚本函数：${fn}`);
    }
  });

  await test('渲染进程应包含录制功能', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/renderer.js', 'utf-8');
    const recordFunctions = [
      'initRecorder',
      'startRecord',
      'stopRecord'
    ];
    for (const fn of recordFunctions) {
      assertTrue(source.includes(fn), `渲染进程应包含录制函数：${fn}`);
    }
  });

  await test('渲染进程应包含定时任务功能', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/renderer.js', 'utf-8');
    const schedulerFunctions = [
      'initScheduler',
      'loadTasks',
      'addTask'
    ];
    for (const fn of schedulerFunctions) {
      assertTrue(source.includes(fn), `渲染进程应包含定时任务函数：${fn}`);
    }
  });

  // ----- HTML 结构测试 -----
  console.log('\n--- HTML 结构测试 ---\n');

  await test('HTML 文件存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./src/index.html'), 'index.html 文件不存在');
  });

  await test('HTML 应包含所有面板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/index.html', 'utf-8');
    const panels = [
      'commands-panel',
      'workflow-panel',
      'templates-panel',
      'advanced-panel',
      'scripts-panel',
      'recorder-panel',
      'scheduler-panel',
      'settings-panel'
    ];
    for (const panel of panels) {
      assertTrue(source.includes(`id="${panel}"`), `HTML 应包含面板：${panel}`);
    }
  });

  await test('HTML 应包含所有导航项', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/index.html', 'utf-8');
    const navItems = ['commands', 'workflow', 'templates', 'advanced', 'scripts', 'recorder', 'scheduler', 'settings'];
    for (const item of navItems) {
      assertTrue(source.includes(`data-tab="${item}"`), `HTML 应包含导航项：${item}`);
    }
  });

  await test('HTML 应引用所有必需的 JS 文件', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/index.html', 'utf-8');
    const scripts = ['workflow.js', 'templates.js', 'renderer.js'];
    for (const script of scripts) {
      assertTrue(source.includes(`src="${script}"`), `HTML 应引用脚本：${script}`);
    }
  });

  await test('HTML 应包含日志面板', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/index.html', 'utf-8');
    assertTrue(source.includes('id="log-content"'), 'HTML 应包含日志内容区域');
    assertTrue(source.includes('id="log-content"'), 'HTML 应包含日志面板');
  });

  // ----- package.json 测试 -----
  console.log('\n--- package.json 测试 ---\n');

  await test('package.json 存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./package.json'), 'package.json 文件不存在');
  });

  await test('package.json 应包含正确的配置', () => {
    const pkg = require('./package.json');
    assertEqual(pkg.name, 'desktop-robot', '项目名称错误');
    assertTrue(pkg.version !== undefined, '缺少版本号');
    assertEqual(pkg.main, 'src/main.js', '入口文件错误');
  });

  await test('package.json 应包含测试脚本', () => {
    const pkg = require('./package.json');
    assertTrue(pkg.scripts.test !== undefined, '缺少测试脚本');
  });

  // ----- 样式文件测试 -----
  console.log('\n--- 样式文件测试 ---\n');

  await test('样式文件存在', () => {
    const fs = require('fs');
    assertTrue(fs.existsSync('./src/styles.css'), 'styles.css 文件不存在');
  });

  await test('样式应包含必要的变量', () => {
    const fs = require('fs');
    const source = fs.readFileSync('./src/styles.css', 'utf-8');
    const cssVars = [
      '--bg-primary',
      '--bg-secondary',
      '--text-primary',
      '--accent'
    ];
    for (const v of cssVars) {
      assertTrue(source.includes(v), `样式应包含 CSS 变量：${v}`);
    }
  });

  // ----- 辅助功能测试 -----
  console.log('\n--- 辅助函数测试 ---\n');

  await test('sleep 函数测试', async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const start = Date.now();
    await sleep(100);
    const elapsed = Date.now() - start;
    assertTrue(elapsed >= 90, `sleep 函数实际耗时 ${elapsed}ms，应 >= 90ms`);
  });

  await test('JSON 序列化/反序列化测试', () => {
    const workflow = {
      id: 123456,
      name: '测试工作流',
      steps: [
        { type: 'open-app', params: { app: 'Chrome' }, delay: 1 },
        { type: 'type-text', params: { text: 'Hello' }, delay: 0.5 }
      ]
    };
    const serialized = JSON.stringify(workflow);
    const deserialized = JSON.parse(serialized);
    assertEqual(deserialized.name, '测试工作流', '反序列化后名称不匹配');
    assertEqual(deserialized.steps.length, 2, '反序列化后步骤数不匹配');
  });

  // ----- 打印测试结果 -----
  console.log('\n========================================');
  console.log('  测试结果汇总');
  console.log('========================================');
  console.log(`  总计：${stats.total}`);
  console.log(`  ✓ 通过：${stats.passed}`);
  console.log(`  ✗ 失败：${stats.failed}`);
  console.log(`  ○ 跳过：${stats.skipped}`);
  console.log('========================================\n');

  if (stats.failed > 0) {
    console.log('⚠️  部分测试失败，请检查错误信息。');
    process.exit(1);
  } else {
    console.log('✓ 所有测试通过！');
    process.exit(0);
  }
}

// 运行测试
runAllTests().catch(err => {
  console.error('测试执行出错:', err);
  process.exit(1);
});
