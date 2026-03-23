import { app, BrowserWindow, Tray, Menu, nativeImage, shell, utilityProcess, dialog } from 'electron';
import * as path from 'path';
import * as http from 'http';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let serverProcess: ReturnType<typeof utilityProcess.fork> | null = null;

const isDev = process.env.NODE_ENV === 'development';
const SERVER_PORT = 3847;

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function waitForServer(port: number, timeout = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const attempt = () => {
      const req = http.request(
        { host: '127.0.0.1', port, path: '/api/v1/health', timeout: 1000 },
        (res) => {
          res.resume();
          if (res.statusCode === 200) resolve();
          else retry();
        }
      );
      req.on('error', retry);
      req.end();
    };
    const retry = () => {
      if (Date.now() > deadline) reject(new Error(`Server did not start within ${timeout}ms`));
      else setTimeout(attempt, 300);
    };
    attempt();
  });
}

function startServer(): void {
  const serverScript = app.isPackaged
    ? path.join(process.resourcesPath, 'server', 'index.js')
    : path.join(__dirname, '..', '..', 'server', 'dist', 'index.js');
  const webPath = app.isPackaged
    ? path.join(process.resourcesPath, 'web')
    : path.join(__dirname, '..', '..', 'web', 'dist');
  const dataDir = app.getPath('userData');

  serverProcess = utilityProcess.fork(serverScript, [], {
    env: {
      ...process.env,
      UMBRA_STATIC_PATH: webPath,
      UMBRA_DATA_DIR: dataDir,
      NODE_ENV: 'production',
    },
  });

  serverProcess.on('exit', (code) => {
    console.log(`Server process exited with code ${code}`);
  });
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', () => {
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Umbra 업데이트',
        message: '새 버전이 다운로드되었습니다. 지금 재시작하시겠습니까?',
        buttons: ['지금 재시작', '나중에'],
        defaultId: 0,
      })
      .then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
  });

  autoUpdater.checkForUpdatesAndNotify().catch((err) => {
    console.error('Update check failed:', err);
  });
}

function createTray() {
  const iconPath = isDev
    ? path.join(__dirname, '..', 'assets', 'icon.png')
    : path.join(process.resourcesPath, 'assets', 'icon.png');

  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Umbra',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Settings',
      click: () => {
        const settingsUrl = isDev
          ? `http://localhost:3848/settings`
          : `http://127.0.0.1:${SERVER_PORT}/settings`;
        shell.openExternal(settingsUrl);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Umbra');
  tray.setContextMenu(contextMenu);
}

function setupAutoStart() {
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: false,
      path: process.execPath,
      args: ['--hidden'],
    });
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3848');
    mainWindow.webContents.openDevTools();
  } else {
    await waitForServer(SERVER_PORT).catch((err) => {
      console.error('Server failed to start:', err);
    });
    mainWindow.loadURL(`http://127.0.0.1:${SERVER_PORT}`);
  }
}

app.whenReady().then(async () => {
  if (!isDev) startServer();
  setupAutoStart();
  createTray();
  await createWindow();
  if (!isDev) setupAutoUpdater();
});

app.on('before-quit', () => {
  serverProcess?.kill();
});

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
