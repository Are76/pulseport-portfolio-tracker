const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;

// Lock userData to a consistent path so localStorage survives app updates/moves
app.setPath('userData', path.join(app.getPath('appData'), 'Pulseport'));

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Electron desktop is currently a legacy/non-primary runtime for PulsePort.
      // By product/security decision, keep Chromium webSecurity enabled in all modes.
      // If desktop support is restored later, direct renderer API calls may hit CORS
      // and must be moved behind a main-process/preload bridge (or trusted proxy).
      // Do NOT disable webSecurity to bypass CORS.
      webSecurity: true,
      partition: 'persist:pulseport', // Named persistent session — survives restarts
    },
    title: 'Pulseport',
    backgroundColor: '#050505',
    show: false,
    autoHideMenuBar: true,
  });

  win.once('ready-to-show', () => win.show());

  // Open all external links (explorers, etc.) in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const appUrl = isDev ? 'http://localhost:3000' : `file://`;
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5174');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
