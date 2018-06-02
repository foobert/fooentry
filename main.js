const { app, BrowserWindow, ipcMain } = require("electron");

let debugWindow;
let mainWindow;

global.configuration = {
  description: "",
  isConfirmation: null
};

app.on("ready", () => {
  //openDebug();
  ok("Ready");
});

app.on("activate", function() {});

process.stdin.setEncoding("utf8");

process.stdin.on("readable", () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    parseInput(chunk.trim());
  }
});

process.stdin.on("end", () => {
  app.quit();
});

function closeWindow() {
  if (mainWindow) {
    let tmp = mainWindow;
    mainWindow = null;
    tmp.close();
  }
}

ipcMain.on("synchronous-message", (event, arg, arg2) => {
  switch (arg) {
    case "ok":
      if (arg2) {
        data(arg2);
      }
      ok();
      break;
    case "cancel":
      err(1, "not confirmed");
      break;
  }
  closeWindow();
});

function openDebug() {
  debugWindow = new BrowserWindow({ width: 800, height: 600 });
  debugWindow.loadFile("debug.html");
  debugWindow.on("closed", function() {
    debugWindow = null;
  });
}

function openMainWindow() {
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 500,
      height: 350,
      center: true,
      resizeable: false,
      minimizable: false,
      maximizable: false,
      fullscreen: false,
      fullscreenable: false,
      closable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      autoHideMenuBar: true,
      //titleBarStyle: "hidden",
      title: "GPG PIN Entry"
    });
  }
  mainWindow.loadFile("index.html");
}

function parseInput(line) {
  debug("C: " + line);
  let m = null;

  if ((m = line.match(/^OPTION ([a-zA-Z-]+)(=(.+))?$/))) {
    // ignore for simplicty
    ok();
    return;
  }

  if ((m = line.match(/GETINFO ([a-zA-Z-]+)$/))) {
    switch (m[1]) {
      case "flavor":
        data("foo");
        break;
      case "version":
        data("1.0.0");
        break;
      case "pid":
        data(process.pid);
        break;
      default:
        data("unknown");
        break;
    }
    ok();
    return;
  }

  if ((m = line.match(/^SETDESC (.+)$/))) {
    global.configuration.description = decodeURI(m[1]);
    ok();
    return;
  }

  if (line === "CONFIRM") {
    global.configuration.isConfirmation = true;
    openMainWindow();
    mainWindow.loadFile("index.html");
    mainWindow.on("closed", function() {
      if (mainWindow) {
        mainWindow = null;
        err(2, "window closed");
      }
    });
    return;
  }

  if (line === "GETPIN") {
    global.configuration.isConfirmation = false;
    openMainWindow();
    mainWindow.on("closed", function() {
      if (mainWindow) {
        mainWindow = null;
        err(1, "no passphrase");
      }
    });
    return;
  }

  if (line === "BYE") {
    ok();
    app.quit();
    return;
  }

  ok("ignored");
}

function data(s) {
  write("D " + s);
}

function ok(msg) {
  if (msg) {
    write("OK " + msg);
  } else {
    write("OK");
  }
}

function err(code, msg) {
  write("ERR " + code + " " + msg);
}

function write(msg) {
  debug(msg);
  process.stdout.write(msg + "\n");
}

function debug(msg) {
  if (debugWindow) {
    debugWindow.webContents.executeJavaScript(
      "debug(" + JSON.stringify(msg) + ");"
    );
  }
}
