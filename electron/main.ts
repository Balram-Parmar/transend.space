import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import DiscoveryService from './core/DiscoveryService';
import Server, { ActiveTransfer } from './core/Server';
import forge from 'node-forge';
import getPort from 'get-port';
import { DeviceInfo, fileInfo, PeerDownloadRequest } from './utils/types';
import { IncomingMessage } from 'node:http';
import Downloader from './core/Downloader';

process.env.DIST = path.join(__dirname, '../dist');

// 1. Declare the Global Variable variable here
let mainWindow: BrowserWindow;
let winIsReady: Promise<BrowserWindow>;
let peerDiscoveryService: DiscoveryService;
let httpServerPort: number;
let downloadDirPath: string;
let httpServer: Server;
let fileDownloader: Downloader;
/*
-----------------------------------------------------Manage App-----------------------------------------------
*/

winIsReady = app.whenReady().then(() => {
  downloadDirPath = app.getPath('downloads');
  return createAndSetupWindow();
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

// ==================================================Main Logic=======================================================
winIsReady.then(() => {
  /*
-----------------------------------------------------Http Server-----------------------------------------------
*/
  httpServer.post('/downloadRequest', (req, res) => {
    let data: any = [];
    req.on('data', (chunk) => {
      console.log(chunk);
      data.push(chunk);
    });
    req.on('end', () => {
      let body: fileInfo[] = JSON.parse(Buffer.concat(data).toString()).files;

      body = body.map((file) => {
        let host = req.socket.remoteAddress; // Gives 192.168.1.7 (Correct!)
        const port = peerDiscoveryService.getDeviceInfo(host as string)?.httpPort;
        // Construct the base URL
        const baseUrl = `https://${host}:${port}`;
        return {
          ...file,
          downloadLink: `${baseUrl}${file.downloadLink}`,
        };
      });
      console.log('body received (MODIFIED ) ' + JSON.stringify(body));
      mainWindow.webContents.send('peer:request', body);
      ipcMain.once('peer:res', (_event, fileInfo: fileInfo[], accepted) => {
        if (!accepted) {
          console.log('user rejected your request');
          res.writeHead(200, { 'content-type': 'application/json' });
          res.write(JSON.stringify({ isAccepted: false, show: false, files: body }));
          return;
        } else {
          console.log('user accepted your request');
          res.writeHead(200, { 'content-type': 'application/json' });
          res.write(JSON.stringify({ isAccepted: true, show: false, files: body }));
        }
        res.end();

        //sending to transfer.ts
        mainWindow.webContents.send('addActiveTransfer', fileInfo);
        const downloads = fileInfo.map((file) => {
          return fileDownloader.downloadFile(file, downloadDirPath);
        });

        fileDownloader.on('progress:download', (id, activeTransfer: ActiveTransfer) => {
          mainWindow.webContents.send(
            'progress:download',
            id,
            activeTransfer.sessionBytesDownloaded,
            'DOWNLOADING',
          );
        });
        Promise.all(downloads).then(() => {
          console.log('all downloads Completed');
        });
      });
    });
  });

  httpServer.on('progress', (id, totalDownloaded: ActiveTransfer) => {
    mainWindow.webContents.send(
      'progress:upload',
      id,
      totalDownloaded.sessionBytesDownloaded,
      'UPLOADING',
    );
  });
  /*
-----------------------------------------------------Discovery Service-----------------------------------------------
*/
  peerDiscoveryService.on('device:found', async (device: DeviceInfo) => {
    mainWindow.webContents.send('device:found', device);
    console.log('device found in (main.ts)' + JSON.stringify(device) + '\n\n');
  });

  /*
----------------------------------------------------- Handle Frontend Invokes ----------------------------------------------- 
 */
  ipcMain.handle('select-file', async (event, device: DeviceInfo): Promise<PeerDownloadRequest> => {
    const filePath = await dialog.showOpenDialog(await winIsReady, {
      title: 'i am test title',
      properties: ['openFile', 'multiSelections'],
    });

    if (filePath.canceled) {
      mainWindow.webContents.send('file-dialog-canceled');
    }
    const data = filePath.filePaths.map((filePath) => httpServer.getFileInfo(filePath));
    let files = await Promise.all(data);
    console.log(files);

    files.forEach((file) => {
      console.log(
        `download link for ${file.name} https://10.2.209.222:${httpServerPort}${file.downloadLink}\n`,
      );
    });

    const finalResponse = await new Promise<PeerDownloadRequest>((resolve, reject) => {
      let response: Buffer[] = [];

      function responseHandler(res: IncomingMessage) {
        res.on('data', (chunk) => {
          response.push(chunk);
        });

        res.on('end', () => {
          try {
            const res: PeerDownloadRequest = JSON.parse(Buffer.concat(response).toString());
            if (res.isAccepted) {
              resolve({ isAccepted: true, show: false, fileInfo: files });
            } else if (!res.isAccepted) {
              resolve({ isAccepted: false, show: false, fileInfo: files });
            }
          } catch (e) {
            console.error('Failed to parse JSON from peer:', e);
            // If the peer sends invalid data, safely default to a cancelled/failed state
            resolve({ isAccepted: false, show: false, fileInfo: files });
          }
        });

        res.on('error', (err) => {
          reject(err);
        });
      }

      httpServer.req({
        method: 'POST',
        url: `https://${device.address}:${device.httpPort}/downloadRequest`,
        res: (res) => {
          responseHandler(res);
        },
        body: JSON.stringify({ files: files }),
      });
    });

    return finalResponse;
  });

  ipcMain.handle('refresh', (event) => {
    return peerDiscoveryService.getAllDevices();
  });
});

/*
----------------------------------------------------- Util Functions -----------------------------------------------
*/

/*
This functions initializes BrowserWindow, DiscoveryService, Https Server and sets the golobal variables.

*/
async function createAndSetupWindow(): Promise<BrowserWindow> {
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
  const { key, cert, serverPort } = await getCredentials();
  httpServerPort = serverPort;
  await startDiscoveryService(serverPort);
  await startHttpServer({ httpPort: serverPort, key: key, cert: cert, chunkSize: 1024 * 1024 });
  startFileDownloader(httpServer);
  return Promise.resolve(mainWindow);
}

function startFileDownloader(server: Server) {
  const downloader = new Downloader(server);
  fileDownloader = downloader;
}
//loads window in BrowserWindow according to the environment i.e localhost:5173 or dist/index.html in production
function loadWindow(win: BrowserWindow) {
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST as string, 'index.html'));
  }
}
async function startHttpServer({
  httpPort,
  key,
  cert,
  chunkSize,
}: {
  httpPort: number;
  key: string;
  cert: string;
  chunkSize: number;
}) {
  const server = new Server({
    port: httpPort,
    keyString: key,
    certString: cert,
    chunkSize: chunkSize,
  });

  await new Promise<void>((resolve, reject) => {
    server.on('started', () => {
      resolve();
    });
    server.on('error', () => {
      reject();
    });
  });
  httpServer = server;
}
async function startDiscoveryService(port: number) {
  const service = new DiscoveryService({ httpPort: port });
  await new Promise<void>((resolve, reject) => {
    service.on('started', () => {
      resolve();
    });
    service.on('error', () => {
      reject();
    });
  });
  peerDiscoveryService = service;
}
async function getCredentials() {
  const httpPort = await getPort();
  const ssl = generateLocalSSLCert();

  return { key: ssl.key, cert: ssl.cert, serverPort: httpPort };
}
//disable shortcuts to prevent brower behaviour
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
//function to generate ssl key and cert to be used for https.
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
