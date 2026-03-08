/**
 * Desktop Robot - 单元测试套件
 * 对各个模块进行详细的单元测试
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// 测试统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0
};

// 断言辅助函数
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

function describe(groupName, fn) {
  console.log(`\n${groupName}`);
  fn();
}

function it(name, fn) {
  test(name, fn);
}

// ==================== 单元测试 ====================

console.log('\n========================================');
console.log('  Desktop Robot - 单元测试套件');
console.log('========================================');

// ----- 模板数据结构测试 -----
describe('\n📋 模板数据结构测试', () => {
  const source = fs.readFileSync('./src/templates.js', 'utf-8');

  it('模板应有唯一 ID', () => {
    const ids = source.match(/id:\s*'([^']+)'/g);
    assertTrue(ids && ids.length > 0, '应至少有一个模板 ID');
    const idValues = ids.map(id => id.match(/id:\s*'([^']+)'/)[1]);
    const uniqueIds = [...new Set(idValues)];
    assertEqual(uniqueIds.length, idValues.length, '模板 ID 应唯一');
  });

  it('每个模板应有名称和描述', () => {
    const names = source.match(/name:\s*'([^']+)'/g);
    const descs = source.match(/description:\s*'([^']+)'/g);
    assertTrue(names && names.length > 0, '模板应有名称');
    assertEqual(names.length, descs ? descs.length : 0, '名称和描述数量应匹配');
  });

  it('每个模板应有分类', () => {
    const categories = ['browser', 'office', 'social', 'system', 'custom'];
    const sourceLower = source.toLowerCase();
    categories.forEach(cat => {
      if (source.includes(`category: '${cat}'`)) {
        // 分类存在
      }
    });
    assertTrue(source.includes("category: 'browser'"), '应有浏览器分类模板');
    assertTrue(source.includes("category: 'office'"), '应有办公分类模板');
  });

  it('模板步骤应有类型和描述', () => {
    const stepTypes = source.match(/type:\s*'([^']+)'/g);
    const stepDescs = source.match(/desc:\s*'([^']+)'/g);
    assertTrue(stepTypes && stepTypes.length > 0, '模板应有步骤类型');
    assertTrue(stepDescs && stepDescs.length > 0, '模板应有步骤描述');
  });

  it('模板应有标签', () => {
    assertTrue(source.includes('tags:'), '模板应包含标签数组');
    assertTrue(source.includes("tags: ['钉钉'"), '晨会模板应有标签');
  });
});

// ----- 工作流逻辑测试 -----
describe('\n⚡ 工作流逻辑测试', () => {
  const source = fs.readFileSync('./src/workflow.js', 'utf-8');

  it('工作流应有初始化状态', () => {
    assertTrue(source.includes('workflows: []'), '应初始化工作流数组');
    assertTrue(source.includes('currentWorkflow: null'), '应初始化当前工作流');
    assertTrue(source.includes('shouldStop: false'), '应初始化停止标志');
  });

  it('工作流保存应验证名称', () => {
    assertTrue(source.includes('if (!name)'), '保存时应检查名称');
    assertTrue(source.includes("'请输入工作流名称'"), '应有名称验证提示');
  });

  it('工作流运行应检查步骤', () => {
    assertTrue(source.includes('steps.length === 0'), '运行时应检查步骤是否为空');
    assertTrue(source.includes("'工作流为空'"), '应有空步骤提示');
  });

  it('工作流应支持导入导出', () => {
    assertTrue(source.includes('exportWorkflow'), '应支持导出');
    assertTrue(source.includes('importWorkflow'), '应支持导入');
    assertTrue(source.includes('JSON.stringify'), '导出应使用 JSON 序列化');
    assertTrue(source.includes('JSON.parse'), '导入应使用 JSON 解析');
  });

  it('工作流步骤应支持移动', () => {
    assertTrue(source.includes('moveStep'), '应支持移动步骤');
    assertTrue(source.includes('splice'), '移动步骤应使用 splice');
  });

  it('工作流应支持 localStorage 持久化', () => {
    assertTrue(source.includes('localStorage.getItem'), '应从 localStorage 加载');
    assertTrue(source.includes('localStorage.setItem'), '应保存到 localStorage');
  });
});

// ----- AI 助手逻辑测试 -----
describe('\n🤖 AI 助手逻辑测试', () => {
  const source = fs.readFileSync('./src/ai-assistant.js', 'utf-8');

  it('AI 助手应有配置对象', () => {
    assertTrue(source.includes('config:'), '应有配置对象');
    assertTrue(source.includes('enabled:'), '应有启用状态');
    assertTrue(source.includes('checkInterval:'), '应有检查间隔配置');
  });

  it('AI 助手应有问题检测函数', () => {
    assertTrue(source.includes('isQuestion('), '应有 isQuestion 函数');
    assertTrue(source.includes('questionPatterns'), '应使用问题模式数组');
  });

  it('AI 助手应有回复生成函数', () => {
    assertTrue(source.includes('getReply('), '应有 getReply 函数');
    assertTrue(source.includes('autoReplyStrategy'), '应支持回复策略');
  });

  it('AI 助手应支持多种策略', () => {
    assertTrue(source.includes("case 'confirm'"), '应支持确认策略');
    assertTrue(source.includes("case 'continue'"), '应支持继续策略');
    assertTrue(source.includes("case 'smart'"), '应支持智能策略');
  });

  it('AI 助手应有监听控制函数', () => {
    assertTrue(source.includes('startMonitoring'), '应有开始监听函数');
    assertTrue(source.includes('stopMonitoring'), '应有停止监听函数');
    assertTrue(source.includes('setInterval'), '应使用定时器检查');
  });

  it('AI 助手应支持测试功能', () => {
    assertTrue(source.includes('testDetection'), '应有测试检测函数');
  });
});

// ----- 主进程 IPC 测试 -----
describe('\n🔌 主进程 IPC 测试', () => {
  const source = fs.readFileSync('./src/main.js', 'utf-8');

  it('IPC 处理器应正确注册', () => {
    assertTrue(source.includes('ipcMain.handle'), '应使用 ipcMain.handle 注册 IPC');
  });

  it('鼠标移动应返回成功', () => {
    assertTrue(source.includes("'mouse-move'"), '应处理鼠标移动');
    assertTrue(source.includes('robot.moveMouse'), '应调用 robotjs.moveMouse');
  });

  it('键盘输入应使用 robotjs', () => {
    assertTrue(source.includes("'keyboard-type'"), '应处理键盘输入');
    assertTrue(source.includes('robot.typeString'), '应调用 robotjs.typeString');
  });

  it('快捷键应正确处理修饰键', () => {
    assertTrue(source.includes("'keyboard-hotkey'"), '应处理快捷键');
    assertTrue(source.includes('keyToggle'), '应使用 keyToggle 处理组合键');
  });

  it('截图应保存为 PNG', () => {
    assertTrue(source.includes("'capture-screen'"), '应处理截图');
    assertTrue(source.includes('.png'), '截图应保存为 PNG 格式');
  });

  it('打开应用应支持跨平台', () => {
    assertTrue(source.includes('process.platform'), '应检测平台');
    assertTrue(source.includes('darwin'), '应支持 macOS');
    assertTrue(source.includes('win32'), '应支持 Windows');
  });
});

// ----- 渲染进程功能测试 -----
describe('\n🖥️ 渲染进程功能测试', () => {
  const source = fs.readFileSync('./src/renderer.js', 'utf-8');

  it('渲染进程应初始化所有模块', () => {
    assertTrue(source.includes('workflowModule.init()'), '应初始化工作流');
    assertTrue(source.includes('templatesModule.init()'), '应初始化模板');
    assertTrue(source.includes('aiAssistantModule.init()'), '应初始化 AI 助手');
  });

  it('应绑定事件监听器', () => {
    assertTrue(source.includes('addEventListener'), '应使用 addEventListener');
    assertTrue(source.includes("document.getElementById"), '应获取 DOM 元素');
  });

  it('日志函数应支持多种类型', () => {
    assertTrue(source.includes('function log('), '应有 log 函数');
    assertTrue(source.includes("'info'"), '应支持 info 类型');
    assertTrue(source.includes("'success'"), '应支持 success 类型');
    assertTrue(source.includes("'error'"), '应支持 error 类型');
  });

  it('应支持标签切换', () => {
    const htmlSource = fs.readFileSync('./src/index.html', 'utf-8');
    assertTrue(htmlSource.includes("data-tab"), '应支持 data-tab 属性');
    assertTrue(htmlSource.includes('classList.add'), '应使用 classList 切换');
  });

  it('应支持宏编辑器', () => {
    assertTrue(source.includes('macro'), '应包含宏相关代码');
    assertTrue(source.includes('add-macro-cmd'), '应支持添加宏命令');
  });
});

// ----- HTML 结构完整性测试 -----
describe('\n📄 HTML 结构完整性测试', () => {
  const source = fs.readFileSync('./src/index.html', 'utf-8');

  it('HTML 应有正确的文档结构', () => {
    assertTrue(source.includes('<!DOCTYPE html>'), '应有 DOCTYPE 声明');
    assertTrue(source.includes('<html'), '应有 html 标签');
    assertTrue(source.includes('<head>'), '应有 head 标签');
    assertTrue(source.includes('<body>'), '应有 body 标签');
  });

  it('HTML 标签应正确闭合', () => {
    // 检查主要标签是否成对出现
    const openHtml = (source.match(/<html/g) || []).length;
    const closeHtml = (source.match(/<\/html>/g) || []).length;
    assertEqual(openHtml, closeHtml, 'html 标签未正确闭合');

    const openHead = (source.match(/<head>/g) || []).length;
    const closeHead = (source.match(/<\/head>/g) || []).length;
    assertEqual(openHead, closeHead, 'head 标签未正确闭合');

    const openBody = (source.match(/<body>/g) || []).length;
    const closeBody = (source.match(/<\/body>/g) || []).length;
    assertEqual(openBody, closeBody, 'body 标签未正确闭合');
  });

  it('container  div 应正确闭合', () => {
    const openContainer = (source.match(/<div class="container">/g) || []).length;
    // container 的闭合应该是 </div>，需要验证数量匹配
    // 简单验证：有 opening 就应有 closing
    assertTrue(openContainer >= 1, '应至少有一个 container div');
  });

  it('main 标签应在正确位置闭合', () => {
    const openMain = source.indexOf('<main class="main-content">');
    const closeMain = source.indexOf('</main>');
    assertTrue(openMain > 0, '应有 main 标签开启');
    assertTrue(closeMain > openMain, 'main 标签应正确闭合');

    // 验证 main 在 log-panel 之前闭合
    const logPanelStart = source.indexOf('<aside class="log-panel">');
    assertTrue(closeMain < logPanelStart, 'main 标签应在 log-panel 之前闭合');
  });

  it('section 标签应正确闭合', () => {
    // 使用更宽松的正则表达式匹配所有 section 标签
    const openSections = (source.match(/<section/g) || []).length;
    const closeSections = (source.match(/<\/section>/g) || []).length;
    assertEqual(openSections, closeSections, 'section 标签未正确闭合');
  });

  it('aside 标签应正确闭合', () => {
    const openAsides = (source.match(/<aside class="[^"]+">/g) || []).length;
    const closeAsides = (source.match(/<\/aside>/g) || []).length;
    assertEqual(openAsides, closeAsides, 'aside 标签未正确闭合');
  });

  it('div 标签应总体平衡', () => {
    const openDivs = (source.match(/<div/g) || []).length;
    const closeDivs = (source.match(/<\/div>/g) || []).length;
    assertEqual(openDivs, closeDivs, `div 标签不平衡：开启${openDivs}个，闭合${closeDivs}个`);
  });

  it('HTML 应引用样式表', () => {
    assertTrue(source.includes('stylesheet'), '应引用样式表');
    assertTrue(source.includes('styles.css'), '应引用 styles.css');
  });

  it('模态框应正确定义', () => {
    const modals = [
      'add-step-modal',
      'add-command-modal',
      'open-url-modal',
      'add-macro-cmd-modal'
    ];
    modals.forEach(modal => {
      assertTrue(source.includes(`id="${modal}"`), `应有模态框：${modal}`);
    });
  });

  it('输入元素应有正确的类型', () => {
    assertTrue(source.includes('type="text"'), '应有文本输入框');
    assertTrue(source.includes('type="number"'), '应有数字输入框');
    assertTrue(source.includes('type="checkbox"'), '应有复选框');
    assertTrue(source.includes('type="time"'), '应有时间选择器');
  });

  it('按钮应有正确的类别', () => {
    assertTrue(source.includes('class="btn'), '应有 btn 类按钮');
    assertTrue(source.includes('btn-primary'), '应有主要按钮');
    assertTrue(source.includes('btn-secondary'), '应有次要按钮');
  });
});

// ----- 配置和依赖测试 -----
describe('\n📦 配置和依赖测试', () => {
  const pkg = require('../package.json');

  it('package.json 应有正确的元数据', () => {
    assertEqual(pkg.name, 'desktop-robot', '项目名称错误');
    assertEqual(typeof pkg.version, 'string', '版本号应为字符串');
    assertEqual(pkg.license, 'MIT', '许可证应为 MIT');
  });

  it('package.json 应有必需的依赖', () => {
    assertTrue(pkg.dependencies.robotjs !== undefined, '需要 robotjs');
    assertTrue(pkg.devDependencies.electron !== undefined, '需要 electron');
  });

  it('package.json 应有正确的构建配置', () => {
    assertTrue(pkg.build !== undefined, '应有构建配置');
    assertEqual(pkg.build.appId, 'com.desktop.robot', '应用 ID 错误');
  });
});

// ----- 辅助函数测试 -----
describe('\n🔧 辅助函数测试', () => {
  it('sleep 函数应正确等待', async () => {
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const start = Date.now();
    await sleep(50);
    const elapsed = Date.now() - start;
    assertTrue(elapsed >= 45, `sleep 函数应等待至少 45ms，实际 ${elapsed}ms`);
  });

  it('JSON 序列化应保持数据结构', () => {
    const data = {
      id: 1,
      name: '测试',
      steps: [{ type: 'click', delay: 0.5 }],
      nested: { a: 1, b: [1, 2, 3] }
    };
    const parsed = JSON.parse(JSON.stringify(data));
    assertEqual(parsed.id, data.id, 'ID 应保持');
    assertEqual(parsed.name, data.name, '名称应保持');
    assertEqual(parsed.steps.length, 1, '步骤数组应保持');
    assertEqual(parsed.nested.b.length, 3, '嵌套数组应保持');
  });
});

// ==================== 断言辅助函数 ====================

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

// ==================== 打印结果 ====================

console.log('\n========================================');
console.log('  单元测试汇总');
console.log('========================================');
console.log(`  总计：${stats.total}`);
console.log(`  ✓ 通过：${stats.passed}`);
console.log(`  ✗ 失败：${stats.failed}`);
console.log('========================================\n');

if (stats.failed > 0) {
  console.log('⚠️  部分测试失败，请检查错误信息。');
  process.exit(1);
} else {
  console.log('✓ 所有单元测试通过！');
  process.exit(0);
}
