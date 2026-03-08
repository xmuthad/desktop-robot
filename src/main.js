const { app, BrowserWindow, ipcMain, screen: electronScreen, shell, clipboard, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const robot = require('robotjs');

let mainWindow;
let isRunning = false;
let shouldStop = false;

function createWindow() {
  const { width, height } = electronScreen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 1000,
    height: 750,
    minWidth: 900,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#1e1e2e'
  });

  mainWindow.loadFile('src/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// === 鼠标操作 ===
ipcMain.handle('mouse-move', async (event, x, y) => {
  robot.moveMouse(x, y);
  return true;
});

ipcMain.handle('mouse-move-smooth', async (event, x, y, duration = 1000) => {
  const start = robot.getMousePos();
  const steps = 20;
  const dx = (x - start.x) / steps;
  const dy = (y - start.y) / steps;

  for (let i = 1; i <= steps; i++) {
    if (shouldStop) break;
    robot.moveMouse(start.x + dx * i, start.y + dy * i);
    await sleep(duration / steps);
  }
  return true;
});

ipcMain.handle('mouse-click', async (event, button = 'left') => {
  robot.mouseClick(button);
  return true;
});

ipcMain.handle('mouse-double-click', async () => {
  robot.mouseClick('left', true);
  return true;
});

ipcMain.handle('mouse-right-click', async () => {
  robot.mouseClick('right');
  return true;
});

ipcMain.handle('mouse-drag', async (event, toX, toY) => {
  robot.dragMouse(toX, toY);
  return true;
});

ipcMain.handle('mouse-scroll-up', async (event, amount) => {
  robot.scrollMouse(amount, 'up');
  return true;
});

ipcMain.handle('mouse-scroll-down', async (event, amount) => {
  robot.scrollMouse(amount, 'down');
  return true;
});

ipcMain.handle('get-mouse-position', async () => {
  const pos = robot.getMousePos();
  return { x: pos.x, y: pos.y };
});

// === 键盘操作 ===
ipcMain.handle('keyboard-type', async (event, text) => {
  robot.typeString(text);
  return true;
});

ipcMain.handle('keyboard-type-delay', async (event, text, delay) => {
  for (const char of text) {
    if (shouldStop) break;
    robot.typeString(char);
    await sleep(delay);
  }
  return true;
});

ipcMain.handle('keyboard-press', async (event, key) => {
  robot.keyTap(key);
  return true;
});

ipcMain.handle('keyboard-hotkey', async (event, keys) => {
  const modifiers = ['command', 'control', 'alt', 'shift'];
  const mainKeys = keys.filter(k => !modifiers.includes(k));
  const modKeys = keys.filter(k => modifiers.includes(k));

  modKeys.forEach(k => robot.keyToggle(k, 'down'));
  mainKeys.forEach(k => robot.keyTap(k));
  if (mainKeys.length === 0 && modKeys.length > 0) {
    robot.keyTap(' ');
  }
  modKeys.reverse().forEach(k => robot.keyToggle(k, 'up'));
  return true;
});

ipcMain.handle('keyboard-hold', async (event, key, duration) => {
  robot.keyToggle(key, 'down');
  await sleep(duration);
  robot.keyToggle(key, 'up');
  return true;
});

// === 屏幕操作 ===
ipcMain.handle('get-screen-size', async () => {
  const size = robot.getScreenSize();
  return { width: Math.floor(size.width), height: Math.floor(size.height) };
});

ipcMain.handle('get-screen-color', async (event, x, y) => {
  const color = robot.getPixelColor(x, y);
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  return { hex: color, rgb: { r, g, b } };
});

ipcMain.handle('capture-screen', async (event, filename) => {
  try {
    const savePath = filename || path.join(app.getPath('desktop'), `screenshot_${Date.now()}.png`);
    const image = nativeImage.createFromScreen(nativeImage.createEmpty());

    // 使用 webContents 截图
    const bounds = { x: 0, y: 0, width: electronScreen.getPrimaryDisplay().workAreaSize.width, height: electronScreen.getPrimaryDisplay().workAreaSize.height };
    const screenshot = await mainWindow.webContents.capturePage(bounds);
    fs.writeFileSync(savePath, screenshot.toPNG());

    return { success: true, path: savePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// === 剪贴板操作 ===
ipcMain.handle('clipboard-get', async () => {
  return clipboard.readText();
});

ipcMain.handle('clipboard-set', async (event, text) => {
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('clipboard-clear', async () => {
  clipboard.clear();
  return true;
});

ipcMain.handle('clipboard-get-image', async () => {
  const image = clipboard.readImage();
  return image.isEmpty() ? null : { width: image.getSize().width, height: image.getSize().height };
});

// === 应用操作 ===
ipcMain.handle('open-app', async (event, appName) => {
  const { exec } = require('child_process');
  const platform = process.platform;

  return new Promise((resolve) => {
    if (platform === 'darwin') {
      exec(`open -a "${appName}"`, (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true }));
    } else if (platform === 'win32') {
      exec(`start ${appName}`, (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true }));
    } else {
      exec(`${appName} &`, (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true }));
    }
  });
});

ipcMain.handle('open-url', async (event, url) => {
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('open-file', async (event, filePath) => {
  const { exec } = require('child_process');
  const platform = process.platform;

  return new Promise((resolve) => {
    if (platform === 'darwin') {
      exec(`open "${filePath}"`, (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true }));
    } else if (platform === 'win32') {
      exec(`start "" "${filePath}"`, (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true }));
    } else {
      exec(`xdg-open "${filePath}"`, (err) => err ? resolve({ success: false, error: err.message }) : resolve({ success: true }));
    }
  });
});

// === 窗口管理 ===
ipcMain.handle('minimize-window', async () => {
  if (mainWindow) mainWindow.minimize();
  return true;
});

ipcMain.handle('maximize-window', async () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  return true;
});

ipcMain.handle('close-window-app', async (event, appName) => {
  const { exec } = require('child_process');
  if (process.platform === 'darwin') {
    exec(`osascript -e 'quit app "${appName}"'`);
  }
  return true;
});

// === 终端日志读取 ===
ipcMain.handle('read-file-tail', async (event, filePath, lines = 50) => {
  try {
    let fullPath = filePath;
    if (filePath.startsWith('~')) {
      fullPath = path.join(require('os').homedir(), filePath.slice(1));
    }

    if (!fs.existsSync(fullPath)) {
      return { success: false, error: '文件不存在', content: '' };
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const allLines = content.split('\n');
    const tailLines = allLines.slice(-lines).join('\n');

    return { success: true, content: tailLines };
  } catch (err) {
    return { success: false, error: err.message, content: '' };
  }
});

// === 会话记录 ===
let sessionRecording = false;
let sessionLog = [];

ipcMain.handle('start-session-recording', async () => {
  sessionRecording = true;
  sessionLog = [];
  return { success: true };
});

ipcMain.handle('stop-session-recording', async () => {
  sessionRecording = false;
  return { success: true };
});

ipcMain.handle('add-to-session', async (event, text) => {
  if (sessionRecording) {
    sessionLog.push({ time: Date.now(), text });
  }
  return { success: true };
});

ipcMain.handle('get-session-log', async () => {
  return { success: true, log: sessionLog };
});

ipcMain.handle('clear-session-log', async () => {
  sessionLog = [];
  return { success: true };
});

// === 脚本执行 ===
ipcMain.handle('stop-script', async () => {
  shouldStop = true;
  return true;
});

ipcMain.handle('run-script', async (event, commands) => {
  if (isRunning) return { success: false, error: '脚本正在运行中' };

  isRunning = true;
  shouldStop = false;
  const results = [];

  try {
    for (const cmd of commands) {
      if (shouldStop) {
        results.push({ command: cmd.command, success: false, error: '用户停止' });
        break;
      }

      try {
        await executeCommand(cmd.command);
        results.push({ command: cmd.command, success: true });

        if (cmd.delay && cmd.delay > 0) {
          await sleep(cmd.delay * 1000);
        }
      } catch (err) {
        results.push({ command: cmd.command, success: false, error: err.message });
      }
    }
  } finally {
    isRunning = false;
  }

  return { success: true, results };
});

async function executeCommand(cmdStr) {
  const cmd = cmdStr.toLowerCase().trim();

  // 鼠标命令
  if (cmd === '点击' || cmd === '点一下') {
    robot.mouseClick('left');
  } else if (cmd === '双击' || cmd === '点两下') {
    robot.mouseClick('left', true);
  } else if (cmd === '右键' || cmd === '右击') {
    robot.mouseClick('right');
  } else if (cmd === '移动中心') {
    const size = robot.getScreenSize();
    robot.moveMouse(size.width / 2, size.height / 2);
  }
  // 键盘命令
  else if (cmd === '按回车' || cmd === '回车' || cmd === '确定') {
    robot.keyTap('enter');
  } else if (cmd === '复制') {
    robot.keyToggle('command', 'down');
    robot.keyTap('c');
    robot.keyToggle('command', 'up');
  } else if (cmd === '粘贴') {
    robot.keyToggle('command', 'down');
    robot.keyTap('v');
    robot.keyToggle('command', 'up');
  } else if (cmd === '全选') {
    robot.keyToggle('command', 'down');
    robot.keyTap('a');
    robot.keyToggle('command', 'up');
  } else if (cmd === '撤销') {
    robot.keyToggle('command', 'down');
    robot.keyTap('z');
    robot.keyToggle('command', 'up');
  } else if (cmd === '保存') {
    robot.keyToggle('command', 'down');
    robot.keyTap('s');
    robot.keyToggle('command', 'up');
  } else if (cmd === '新建标签') {
    robot.keyToggle('command', 'down');
    robot.keyTap('t');
    robot.keyToggle('command', 'up');
  } else if (cmd === '关闭标签') {
    robot.keyToggle('command', 'down');
    robot.keyTap('w');
    robot.keyToggle('command', 'up');
  } else if (cmd === '刷新') {
    robot.keyToggle('command', 'down');
    robot.keyTap('r');
    robot.keyToggle('command', 'up');
  } else if (cmd.startsWith('输入 ')) {
    const text = cmdStr.slice(3);
    robot.typeString(text);
  }
  // 浏览器命令
  else if (cmd.startsWith('打开 chrome') || cmd.startsWith('启动 chrome')) {
    openApp('Google Chrome');
  } else if (cmd.startsWith('打开 safari') || cmd.startsWith('启动 safari')) {
    openApp('Safari');
  } else if (cmd.startsWith('打开 edge') || cmd.startsWith('启动 edge')) {
    openApp('Microsoft Edge');
  } else if (cmd.startsWith('访问 ')) {
    let url = cmd.slice(3).trim();
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    await shell.openExternal(url);
  }
  // 窗口命令
  else if (cmd === '关闭窗口' || cmd === '关闭') {
    robot.keyToggle('command', 'down');
    robot.keyTap('w');
    robot.keyToggle('command', 'up');
  } else if (cmd === '最小化') {
    robot.keyToggle('command', 'down');
    robot.keyTap('m');
    robot.keyToggle('command', 'up');
  } else if (cmd === '最大化' || cmd === '全屏') {
    robot.keyToggle('control', 'down');
    robot.keyToggle('command', 'down');
    robot.keyTap('f');
    robot.keyToggle('command', 'up');
    robot.keyToggle('control', 'up');
  }
  // 剪贴板命令
  else if (cmd === '获取剪贴板') {
    const text = clipboard.readText();
    console.log(`剪贴板内容：${text}`);
  } else if (cmd === '清空剪贴板') {
    clipboard.clear();
  }
  // 截图命令
  else if (cmd === '截图' || cmd === '截屏') {
    const savePath = path.join(app.getPath('desktop'), `screenshot_${Date.now()}.png`);
    const screenshot = await mainWindow.webContents.capturePage();
    fs.writeFileSync(savePath, screenshot.toPNG());
  }
  // 其他
  else if (cmd === '鼠标位置') {
    const pos = robot.getMousePos();
    console.log(`鼠标位置：${pos.x}, ${pos.y}`);
  }

  return true;
}

function openApp(appName) {
  const { exec } = require('child_process');
  if (process.platform === 'darwin') {
    exec(`open -a "${appName}"`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 应用生命周期
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============ 增强的 IPC 处理器 ============

/**
 * 获取系统信息
 */
ipcMain.handle('get-system-info', async () => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    const platform = process.platform;
    const info = {
      platform: platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuCores: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      freeMemory: require('os').freemem(),
      hostname: require('os').hostname(),
      uptime: require('os').uptime()
    };
    
    if (platform === 'darwin') {
      exec('sw_vers -productVersion', (err, stdout) => {
        info.osVersion = stdout.trim() || 'macOS';
        resolve(info);
      });
    } else {
      info.osVersion = platform;
      resolve(info);
    }
  });
});

/**
 * 获取进程列表
 */
ipcMain.handle('get-process-list', async () => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('ps -ax -o pid,comm | head -50', (err, stdout) => {
        if (err) {
          resolve({ success: false, error: err.message });
          return;
        }
        const processes = stdout.split('\n').slice(1).map(line => {
          const parts = line.trim().split(/\s+/);
          return { pid: parts[0], name: parts[parts.length - 1] };
        });
        resolve({ success: true, processes });
      });
    } else {
      resolve({ success: false, error: '不支持的平台' });
    }
  });
});

/**
 * 杀掉指定进程
 */
ipcMain.handle('kill-process', async (event, pid) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec(`kill ${pid}`, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
});

/**
 * 获取文件大小
 */
ipcMain.handle('get-file-size', async (event, filePath) => {
  const fs = require('fs');
  
  try {
    const stats = fs.statSync(filePath);
    return { success: true, size: stats.size };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * 读取文件列表
 */
ipcMain.handle('read-directory', async (event, dirPath) => {
  const fs = require('fs');
  const path = require('path');
  
  try {
    let fullPath = dirPath;
    if (dirPath.startsWith('~')) {
      fullPath = path.join(require('os').homedir(), dirPath.slice(1));
    }
    
    const files = fs.readdirSync(fullPath);
    const fileDetails = files.map(file => {
      const filePath = path.join(fullPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      };
    });
    
    return { success: true, files: fileDetails };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/**
 * 执行 Shell 命令
 */
ipcMain.handle('exec-shell-command', async (event, command, options = {}) => {
  const { exec } = require('child_process');
  const { timeout = 10000 } = options;
  
  return new Promise((resolve) => {
    exec(command, { timeout }, (err, stdout, stderr) => {
      resolve({
        success: !err,
        stdout,
        stderr,
        error: err?.message,
        code: err?.code
      });
    });
  });
});

/**
 * 获取网络信息
 */
ipcMain.handle('get-network-info', async () => {
  const os = require('os');
  
  const interfaces = os.networkInterfaces();
  const info = {
    interfaces: {},
    hostname: os.hostname(),
    externalIp: null
  };
  
  for (const name in interfaces) {
    info.interfaces[name] = interfaces[name]
      .filter(addr => addr.family === 'IPv4')
      .map(addr => ({ address: addr.address, mac: addr.mac }));
  }
  
  // 获取外网 IP（可选）
  try {
    const { exec } = require('child_process');
    exec('curl -s ifconfig.me', { timeout: 5000 }, (err, stdout) => {
      if (!err) {
        info.externalIp = stdout.trim();
      }
    });
  } catch (e) {
    // 忽略错误
  }
  
  return info;
});

/**
 * 获取电池状态（仅笔记本）
 */
ipcMain.handle('get-battery-status', async () => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('pmset -g batt', (err, stdout) => {
        if (err) {
          resolve({ available: false });
          return;
        }
        
        const match = stdout.match(/(\d+)%/);
        const percent = match ? parseInt(match[1]) : null;
        const charging = stdout.includes('charging');
        const timeRemaining = stdout.match(/(\d+:\d+)/)?.[1];
        
        resolve({
          available: true,
          percent,
          charging,
          timeRemaining
        });
      });
    } else {
      resolve({ available: false });
    }
  });
});

/**
 * 获取当前活跃窗口
 */
ipcMain.handle('get-active-window', async () => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('osascript -e "tell application \"System Events\" to get name of first process whose frontmost is true"', (err, stdout) => {
        resolve({
          success: !err,
          name: stdout?.trim()?.replace(/"/g, '') || null,
          error: err?.message
        });
      });
    } else {
      resolve({ success: false, error: '仅支持 macOS' });
    }
  });
});

/**
 * 设置音量
 */
ipcMain.handle('set-volume', async (event, level) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec(`osascript -e "set volume output volume ${Math.min(100, Math.max(0, level))}"`, (err) => {
        resolve({ success: !err, error: err?.message });
      });
    } else {
      resolve({ success: false, error: '仅支持 macOS' });
    }
  });
});

/**
 * 获取音量
 */
ipcMain.handle('get-volume', async () => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('osascript -e "output volume of (get volume settings)"', (err, stdout) => {
        resolve({
          success: !err,
          level: parseInt(stdout) || null,
          error: err?.message
        });
      });
    } else {
      resolve({ success: false, error: '仅支持 macOS' });
    }
  });
});

/**
 * 静音/取消静音
 */
ipcMain.handle('toggle-mute', async () => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec('osascript -e "set volume output muted (not output muted of (get volume settings))"', (err) => {
        resolve({ success: !err, error: err?.message });
      });
    } else {
      resolve({ success: false, error: '仅支持 macOS' });
    }
  });
});

/**
 * 弹出磁盘
 */
ipcMain.handle('eject-disk', async (event, diskName) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    exec(`diskutil eject "${diskName || '/Volumes/*'}"`, (err) => {
      resolve({ success: !err, error: err?.message });
    });
  });
});

/**
 * 获取最近文件
 */
ipcMain.handle('get-recent-files', async (event, limit = 10) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec(`osascript -e "tell application \\\"Finder\\\" to get name of every item of (get recent items limit ${limit})"`, (err, stdout) => {
        resolve({
          success: !err,
          files: stdout?.split(', ').map(f => f.replace(/"/g, '')) || [],
          error: err?.message
        });
      });
    } else {
      resolve({ success: false, error: '仅支持 macOS' });
    }
  });
});

/**
 * 显示通知
 */
ipcMain.handle('show-notification', async (event, title, message) => {
  const { exec } = require('child_process');
  
  return new Promise((resolve) => {
    if (process.platform === 'darwin') {
      exec(`osascript -e "display notification \\"${message}\\" with title \\"${title}\\""`, (err) => {
        resolve({ success: !err, error: err?.message });
      });
    } else {
      resolve({ success: false, error: '仅支持 macOS' });
    }
  });
});

console.log('增强 IPC 处理器已加载 ✓');
