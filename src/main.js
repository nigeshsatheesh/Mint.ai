const { app, BrowserWindow } = require('electron')
const path = require('path')

let splashWindow
let mainWindow

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })
  splashWindow.loadFile('src/pages/splash.html')

  // After 3 seconds, close splash and open main
  setTimeout(() => {
    createMain()
    splashWindow.close()
  }, 3000)
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 832,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    transparent: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  mainWindow.loadFile('src/pages/home.html')

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Taskbar pinning support
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.nigesh.mintai')
  }
}

app.whenReady().then(() => {
  createSplash()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
const { ipcMain } = require('electron')

ipcMain.on('minimize', () => mainWindow.minimize())
ipcMain.on('maximize', () => {
  mainWindow.isMaximized()
    ? mainWindow.unmaximize()
    : mainWindow.maximize()
})
ipcMain.on('close', () => mainWindow.close())