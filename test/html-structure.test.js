/**
 * Desktop Robot - HTML 结构验证测试
 * 专门用于验证 HTML 文件的结构完整性和标签配对
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

function describe(groupName, fn) {
  console.log(`\n${groupName}`);
  fn();
}

// HTML 解析辅助函数
class HTMLValidator {
  constructor(source) {
    this.source = source;
    this.errors = [];
  }

  // 检查标签是否平衡
  checkTagBalance(tagName) {
    const openRegex = new RegExp(`<${tagName}(?:\\s|>|/)`, 'gi');
    const selfCloseRegex = new RegExp(`<${tagName}[^>]*/>`, 'gi');
    const closeRegex = new RegExp(`</${tagName}>`, 'gi');

    const openTags = (this.source.match(openRegex) || []).length;
    const selfCloseTags = (this.source.match(selfCloseRegex) || []).length;
    const closeTags = (this.source.match(closeRegex) || []).length;

    // 自闭合标签不算需要配对的开启标签
    const effectiveOpenTags = openTags - selfCloseTags;

    return {
      open: effectiveOpenTags,
      close: closeTags,
      balanced: effectiveOpenTags === closeTags
    };
  }

  // 检查标签嵌套顺序
  checkNestingOrder() {
    const tagPattern = /<(\/?)([\w-]+)(?:\s[^>]*)?>/gi;
    const stack = [];
    const voidElements = ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'];

    let match;
    let position = 0;

    while ((match = tagPattern.exec(this.source)) !== null) {
      position = match.index;
      const isClosing = match[1] === '/';
      const tagName = match[2].toLowerCase();

      // 跳过自闭合标签和空元素
      const isSelfClosing = match[0].endsWith('/>');
      const isVoidElement = voidElements.includes(tagName);

      if (isVoidElement || isSelfClosing) {
        continue;
      }

      if (!isClosing) {
        stack.push({ tag: tagName, position });
      } else {
        const lastOpen = stack.pop();
        if (!lastOpen) {
          this.errors.push({
            type: 'unexpected_close',
            tag: tagName,
            position,
            message: `意外的闭合标签 </${tagName}>，没有对应的开启标签`
          });
        } else if (lastOpen.tag !== tagName) {
          this.errors.push({
            type: 'mismatched_close',
            tag: tagName,
            expected: lastOpen.tag,
            position,
            message: `闭合标签 </${tagName}> 与开启标签 <${lastOpen.tag}> 不匹配`
          });
          // 将错误的标签重新压入栈，继续检查
          stack.push(lastOpen);
        }
      }
    }

    // 报告未闭合的标签
    stack.forEach(item => {
      this.errors.push({
        type: 'unclosed',
        tag: item.tag,
        position: item.position,
        message: `标签 <${item.tag}> 未闭合（位置：${item.position}）`
      });
    });

    return this.errors;
  }

  // 检查属性是否存在
  hasAttribute(pattern) {
    return pattern.test(this.source);
  }

  // 获取元素数量
  getElementCount(selector) {
    if (selector.startsWith('#')) {
      const id = selector.substring(1);
      return (this.source.match(new RegExp(`id="${id}"`, 'g')) || []).length;
    }
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return (this.source.match(new RegExp(`class="[^"]*${className}[^"]*"`, 'g')) || []).length;
    }
    return (this.source.match(new RegExp(`<${selector}`, 'gi')) || []).length;
  }
}

// ==================== 测试执行 ====================

console.log('\n========================================');
console.log('  HTML 结构验证测试');
console.log('========================================');

const htmlPath = path.join(__dirname, '..', 'src', 'index.html');
const htmlSource = fs.readFileSync(htmlPath, 'utf-8');
const validator = new HTMLValidator(htmlSource);

// ----- 基础标签平衡测试 -----
describe('\n📐 基础标签平衡测试', () => {
  test('html 标签应平衡', () => {
    const result = validator.checkTagBalance('html');
    assertTrue(result.balanced, `html 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('head 标签应平衡', () => {
    const result = validator.checkTagBalance('head');
    assertTrue(result.balanced, `head 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('body 标签应平衡', () => {
    const result = validator.checkTagBalance('body');
    assertTrue(result.balanced, `body 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('div 标签应平衡', () => {
    const result = validator.checkTagBalance('div');
    assertTrue(result.balanced, `div 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('section 标签应平衡', () => {
    const result = validator.checkTagBalance('section');
    assertTrue(result.balanced, `section 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('aside 标签应平衡', () => {
    const result = validator.checkTagBalance('aside');
    assertTrue(result.balanced, `aside 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('nav 标签应平衡', () => {
    const result = validator.checkTagBalance('nav');
    assertTrue(result.balanced, `nav 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('main 标签应平衡', () => {
    const result = validator.checkTagBalance('main');
    assertTrue(result.balanced, `main 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('button 标签应平衡', () => {
    const result = validator.checkTagBalance('button');
    assertTrue(result.balanced, `button 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('input 标签应存在（自闭合）', () => {
    const count = validator.getElementCount('input');
    assertTrue(count > 0, '页面应包含 input 元素');
  });

  test('ul 标签应平衡', () => {
    const result = validator.checkTagBalance('ul');
    assertTrue(result.balanced, `ul 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });

  test('li 标签应平衡', () => {
    const result = validator.checkTagBalance('li');
    assertTrue(result.balanced, `li 标签不平衡：开启${result.open}个，闭合${result.close}个`);
  });
});

// ----- 嵌套顺序测试 -----
describe('\n🔗 标签嵌套顺序测试', () => {
  test('标签嵌套顺序应正确', () => {
    const errors = validator.checkNestingOrder();
    if (errors.length > 0) {
      const errorMessages = errors.map(e => e.message).join('\n');
      throw new Error(`嵌套错误:\n${errorMessages}`);
    }
  });
});

// ----- 关键结构测试 -----
describe('\n🏗️ 关键页面结构测试', () => {
  test('container div 应正确包裹 sidebar 和 main', () => {
    const containerStart = htmlSource.indexOf('<div class="container">');
    const sidebarStart = htmlSource.indexOf('<aside class="sidebar">');
    const mainStart = htmlSource.indexOf('<main class="main-content">');
    const mainEnd = htmlSource.indexOf('</main>');
    const logPanelStart = htmlSource.indexOf('<aside class="log-panel">');
    // 找到 container 的结束标签 - 应该是最后一个</div>
    const containerEnd = htmlSource.lastIndexOf('</div>');

    assertTrue(containerStart >= 0, '应有 container div');
    assertTrue(sidebarStart > containerStart, 'sidebar 应在 container 内');
    assertTrue(mainStart > containerStart, 'main 应在 container 内');
    assertTrue(mainEnd > mainStart, 'main 标签应正确闭合');
    assertTrue(mainEnd < logPanelStart, 'main 应在 log-panel 之前闭合');
    assertTrue(containerEnd > logPanelStart, 'container 应包裹 log-panel');
  });

  test('sidebar 应在 main 之前', () => {
    const sidebarStart = htmlSource.indexOf('<aside class="sidebar">');
    const mainStart = htmlSource.indexOf('<main class="main-content">');
    assertTrue(sidebarStart < mainStart, 'sidebar 应在 main 之前定义');
  });

  test('log-panel 应在 container 的闭合标签之前', () => {
    const containerStart = htmlSource.indexOf('<div class="container">');
    const logPanelStart = htmlSource.indexOf('<aside class="log-panel">');
    const logPanelEnd = htmlSource.indexOf('</aside>', logPanelStart);
    // 找到 container 的结束标签
    const containerEnd = htmlSource.lastIndexOf('</div>');

    assertTrue(logPanelStart > containerStart, 'log-panel 应在 container 内');
    assertTrue(logPanelEnd < containerEnd, 'log-panel 应在 container 结束前闭合');
  });
});

// ----- 导航和数据属性测试 -----
describe('\n🔍 导航和数据属性测试', () => {
  test('所有 nav-item 应有 data-tab 属性', () => {
    const navItems = htmlSource.match(/<button class="nav-item"[^>]*data-tab="[^"]*"[^>]*>/g) || [];
    const allNavItems = htmlSource.match(/<button class="nav-item"[^>]*>/g) || [];
    assertEqual(navItems.length, allNavItems.length, '所有 nav-item 都应包含 data-tab 属性');
  });

  test('data-tab 值应与 panel ID 对应', () => {
    const dataTabs = htmlSource.match(/data-tab="([^"]+)"/g) || [];
    const tabValues = dataTabs.map(s => s.match(/data-tab="([^"]+)"/)[1]);

    tabValues.forEach(tab => {
      const panelId = `${tab}-panel`;
      assertTrue(htmlSource.includes(`id="${panelId}"`), `panel "${panelId}" 应存在以匹配 data-tab="${tab}"`);
    });
  });

  test('所有 panel 应有 panel 类', () => {
    const panels = htmlSource.match(/id="[a-z]+-panel"/g) || [];
    panels.forEach(panelIdAttr => {
      const panelId = panelIdAttr.match(/id="([a-z]+-panel)"/)[1];
      // panel 可能有额外的类如 'active'
      assertTrue(htmlSource.includes(`id="${panelId}"`) && htmlSource.includes(`class="panel`) || htmlSource.includes(`class="panel active"`), `panel "${panelId}" 应有 panel 类`);
    });
  });
});

// ----- 模态框结构测试 -----
describe('\n📦 模态框结构测试', () => {
  const modalIds = [
    'add-step-modal',
    'add-command-modal',
    'open-url-modal',
    'add-macro-cmd-modal'
  ];

  modalIds.forEach(modalId => {
    test(`模态框 ${modalId} 结构应完整`, () => {
      const modalStart = htmlSource.indexOf(`<div id="${modalId}"`);

      assertTrue(modalStart >= 0, `模态框 ${modalId} 应存在`);

      // 检查模态框内容 - 从 modalStart 开始查找 modal-actions
      const modalSection = htmlSource.substring(modalStart, modalStart + 2000);
      assertTrue(modalSection.includes('modal-content'), `模态框 ${modalId} 应包含 modal-content`);
      assertTrue(modalSection.includes('modal-actions'), `模态框 ${modalId} 应包含 modal-actions`);
    });
  });
});

// ----- 脚本和样式引用测试 -----
describe('\n📜 脚本和样式引用测试', () => {
  test('应引用 styles.css', () => {
    assertTrue(htmlSource.includes('href="styles.css"'), '应引用 styles.css');
  });

  test('脚本引用顺序应正确', () => {
    const workflowScript = htmlSource.indexOf('src="workflow.js"');
    const templatesScript = htmlSource.indexOf('src="templates.js"');
    const rendererScript = htmlSource.indexOf('src="renderer.js"');

    assertTrue(workflowScript >= 0, '应引用 workflow.js');
    assertTrue(templatesScript >= 0, '应引用 templates.js');
    assertTrue(rendererScript >= 0, '应引用 renderer.js');
    assertTrue(workflowScript < rendererScript, 'workflow.js 应在 renderer.js 之前引用');
    assertTrue(templatesScript < rendererScript, 'templates.js 应在 renderer.js 之前引用');
  });
});

// ==================== 打印结果 ====================

console.log('\n========================================');
console.log('  HTML 结构验证汇总');
console.log('========================================');
console.log(`  总计：${stats.total}`);
console.log(`  ✓ 通过：${stats.passed}`);
console.log(`  ✗ 失败：${stats.failed}`);
console.log('========================================\n');

if (stats.failed > 0) {
  console.log('⚠️  部分测试失败，请检查错误信息。');
  console.log('\n详细错误：');
  validator.errors.forEach((err, i) => {
    console.log(`  ${i + 1}. ${err.message}`);
  });
  process.exit(1);
} else {
  console.log('✓ 所有 HTML 结构测试通过！');
  process.exit(0);
}
