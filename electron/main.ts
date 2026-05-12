import { app, BrowserWindow, ipcMain, dialog, webContents } from 'electron';
import path from 'node:path';
import DiscoveryService from './core/DiscoveryService';
import Server, { ActiveTransfer } from './core/Server';
import forge from 'node-forge';
import getPort from 'get-port';
import { DeviceInfo, fileInfo, PeerDownloadRequest } from './utils/types';
import { IncomingMessage } from 'node:http';
import fs from 'fs/promises';
import Downloader from './core/Downloader';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

// 1. Declare the variable here, but do NOT create the window yet.
let mainWindow: BrowserWindow;
let winIsReady: Promise<BrowserWindow>;
let server: Server;
let service: DiscoveryService;
let httpPort: number;
let downloadDirPath: string;
/*
-----------------------------------------------------Manage App-----------------------------------------------
*/

app.whenReady().then(() => {
  // 2. Call our setup function once Electron is fully initialized
  winIsReady = createAndSetupWindow();
  downloadDirPath = app.getPath('downloads');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    // 3. Re-create the window if the user clicks the dock icon on macOS
    createAndSetupWindow();
  }
});
/*
-----------------------------------------------------Discovery Service-----------------------------------------------
*/

// Get any random free port
(async () => {
  httpPort = await getPort();
  const ssl = generateLocalSSLCert();
  console.log('success fully generated ssl certificate');
  server = new Server({
    port: httpPort,
    keyString: ssl.key,
    certString: ssl.cert,
    chunkSize: 1024,
  });

  const downloader = new Downloader(server);
  service = new DiscoveryService({ httpPort });

  //Handle Peer Download File Request
  server.post('/downloadRequest', (req, res) => {
    let data: Buffer[] = [];
    req.on('data', (chunk) => {
      data.push(chunk);
    });
    req.on('end', () => {
      const body: fileInfo[] = JSON.parse(Buffer.concat(data).toString()).files;

      winIsReady.then(() => {
        console.log(`received download Request for files ${JSON.stringify(body)}`);
        mainWindow.webContents.send('peer:request', body);
        ipcMain.once('peer:res', (_event, fileInfo: fileInfo[], accepted) => {
          if (!accepted) {
            console.log('user rejected your request');
            res.writeHead(200, { 'content-type': 'application/json' });
            res.write({ isWaiting: false, cancalled: false, rejected: true });
          }

          res.end();
          console.log('accpeted' + JSON.stringify(fileInfo));
          const downloader = new Downloader(server);
          //sending to transfer.ts
          mainWindow.webContents.send('addActiveTransfer', fileInfo);
          const downloads = fileInfo.map((file) => {
            return downloader.downloadFile(file, downloadDirPath);
          });

          downloader.on('progress:download', (id, activeTransfer: ActiveTransfer, type) => {
            mainWindow.webContents.send(
              'progress:download',
              id,
              activeTransfer.sessionBytesDownloaded,
            );
          });
          Promise.all(downloads).then(() => {
            console.log('all downloads Completed');
          });
        });
      });
    });
  });

  service.on('device:found', async (device: DeviceInfo) => {
    (await winIsReady).webContents.send('device:found', device);
    console.log('device found in (main.ts)' + JSON.stringify(device) + '\n\n');
  });
  server.on('progress', (id, totalDownloaded: ActiveTransfer) => {
    winIsReady.then(() => {
      mainWindow.webContents.send('progress', id, totalDownloaded.sessionBytesDownloaded);
    });
  });
})();

/*
----------------------------------------------------- Handle Frontend Invokes -----------------------------------------------
*/

ipcMain.handle('select-file', async (event, device: DeviceInfo): Promise<PeerDownloadRequest> => {
  const filePath = await dialog.showOpenDialog(await winIsReady, {
    title: 'i am test title',
    properties: ['openFile', 'multiSelections'], // Added 'multiSelections'
  });

  // 1. Return the new interface structure if the user cancels the dialog or selects nothing
  if (filePath.canceled || !filePath.filePaths.length) {
    return { isWaiting: false, cancelled: true, fileInfo: null };
  }

  const data = filePath.filePaths.map((filePath) => server.getFileInfo(filePath));
  let files = await Promise.all(data);
  console.log(files);

  files.forEach((file) => {
    console.log(
      `download link for ${file.name} https://192.168.1.9:${httpPort}${file.downloadLink}\n`,
    );
  });
  // 2. Type the Promise with your new interface
  const finalResponse = await new Promise<PeerDownloadRequest>((resolve, reject) => {
    let response: Buffer[] = [];

    function responseHandler(res: IncomingMessage) {
      res.on('data', (chunk) => {
        response.push(chunk);
      });

      res.on('end', () => {
        try {
          const res = JSON.parse(Buffer.concat(response).toString());

          resolve({ ...res, fileInfo: files });
        } catch (e) {
          console.error('Failed to parse JSON from peer:', e);
          // If the peer sends invalid data, safely default to a cancelled/failed state
          resolve({ isWaiting: false, cancelled: true, fileInfo: null });
        }
      });

      res.on('error', (err) => {
        reject(err);
      });
    }

    server.req({
      method: 'POST',
      url: `https://${device.address}:${device.httpPort}/downloadRequest`,
      res: (res) => {
        responseHandler(res);
      },
      body: JSON.stringify(files),
    });
  });

  // This will now return the correctly typed PeerDownloadRequest object
  return finalResponse;
});

ipcMain.handle('refresh', (event) => {
  return service.getAllDevices();
});

/*
----------------------------------------------------- Util Functions -----------------------------------------------
*/

function createAndSetupWindow(): Promise<BrowserWindow> {
  mainWindow = new BrowserWindow({
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  loadWindow(mainWindow);
  disableShortCuts(mainWindow);
  return Promise.resolve(mainWindow);
}

function loadWindow(win: BrowserWindow) {
  // If in development, the plugin injects this environment variable
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // In production, load the built HTML file
    win.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }
}

function disableShortCuts(win: BrowserWindow) {
  win.webContents.on('before-input-event', (event, input) => {
    // Disable specific shortcuts
    if (input.control && input.key.toLowerCase() === 'r') {
      event.preventDefault(); // Disable Ctrl+R
    }
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      event.preventDefault(); // Disable Ctrl+Shift+I (DevTools)
    }
    if (input.key === 'F5') {
      event.preventDefault(); // Disable F5 refresh
    }
    if (input.control && input.key.toLowerCase() === 't') {
      event.preventDefault(); // Disable Ctrl+T new tab
    }
  });
}

function generateLocalSSLCert() {
  console.log('Generating local SSL certificate...');

  // 1. Generate a 2048-bit RSA key pair
  const keys = forge.pki.rsa.generateKeyPair(2048);

  // 2. Create a new certificate
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01'; // Serial number

  // 3. Set validity (e.g., valid for 1 year)
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // 4. Define the certificate attributes
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'State' },
    { name: 'localityName', value: 'City' },
    { name: 'organizationName', value: 'My Electron App' },
    { shortName: 'OU', value: 'Local Dev' },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs); // Self-signed, so issuer is the same as subject

  // 5. Add extensions to specify this is for a server
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: true,
    },
    {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'subjectAltName',
      altNames: [
        {
          type: 2, // DNS name
          value: 'localhost',
        },
        {
          type: 7, // IP address
          ip: '127.0.0.1',
        },
      ],
    },
  ]);

  // 6. Sign the certificate with its own private key
  cert.sign(keys.privateKey, forge.md.sha256.create());

  // 7. Convert the keys and cert to PEM format (strings)
  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

  return {
    cert: pemCert,
    key: pemKey,
  };
}
