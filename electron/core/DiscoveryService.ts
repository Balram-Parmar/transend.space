import dgram, { Socket } from 'dgram';
import EventEmitter from 'events';
import { ActiveInterfaces, DeviceInfo, DiscoveryServiceOptions } from '../utils/types';
import os from 'os';
/*

Events 
device:found => DeviceInfo type
device:lost => DeviceInfo

*/
class DiscoveryService extends EventEmitter {
  private instance: Socket;
  private interfaces: ActiveInterfaces[] = [];
  private httpPort: number;
  private Devices: Map<string, DeviceInfo>;
  private discoveryPort: number = 6321;
  constructor({ httpPort }: DiscoveryServiceOptions) {
    super();

    this.httpPort = httpPort;
    this.Devices = new Map();
    this.instance = dgram.createSocket({ type: 'udp4' });

    this.instance.on('error', (err) => {
      console.error(`Discovery Service  error:\n${err.stack}`);
      this.emit('error');
      this.instance.close();
    });

    this.instance.on('message', (msg, rinfo) => {
      const isSelfMessage = this.getDeviceInterfaces().some(
        (iface) => iface.address === rinfo.address,
      );

      if (isSelfMessage) {
        return;
      }
      const data: DeviceInfo = JSON.parse(msg.toString());

      // console.log(`UDP Socket got a message : from ${rinfo.address} as ${JSON.stringify(data)}`);
      //save device in map or update last seen if already avaliable
      if (!this.Devices.has(rinfo.address)) {
        this.emit('device:found', data);
        console.log(`Device Found : ${JSON.stringify(data)}`);
      }
      this.handleDeviceFound(data);
    });

    this.instance.on('listening', () => {
      console.log(`UDP Socket listening localhost:${this.discoveryPort}`);
      this.instance.setBroadcast(true);
      //emit started event when socket is ready and listining and start sending 'Discovery Signals'
      setInterval(() => {
        this.sendDiscoverySignal();
      }, 1000);
      this.emit('started');
    });
    this.instance.bind({ port: this.discoveryPort });
    this.handleOfflineDevice();
  }

  private handleDeviceFound(data: DeviceInfo) {
    this.Devices.set(data.address, {
      name: data.name,
      address: data.address,
      lastSeen: Date.now(),
      httpPort: data.httpPort,
      //optional
      arch: data.arch,
      os: data.os,
    });
  }
  private sendDiscoverySignal() {
    const ipInterfaces = this.getDeviceInterfaces();

    // Cache static OS values outside the loop
    const rawHostname = os.hostname();
    const deviceName = rawHostname.includes('undefined') ? os.userInfo().username : rawHostname;
    const arch = os.arch();
    const platform = os.platform();

    for (const iface of ipInterfaces) {
      const deviceInfo = {
        name: deviceName,
        httpPort: this.httpPort,
        address: iface.address,
        arch: arch,
        os: platform,
        lastSeen: Date.now(),
      };

      const messageBuffer = Buffer.from(JSON.stringify(deviceInfo));
      const broadcastAddress = this.getDirectedBroadcastAddress(iface.address, iface.netmask);

      this.instance.send(messageBuffer, this.discoveryPort, broadcastAddress, (err, bytes) => {
        if (err) {
          console.error(`Error sending broadcast on ${iface.address}:`, err);
        }
        // console.log(`sending signal on interface ${iface.address}`);
      });
    }
  }
  private getDirectedBroadcastAddress(address: string, netmask: string): string {
    const ip = address.split('.');
    const mask = netmask.split('.');

    // Calculate per-octet directly. Unary '+' coerces the string to a number instantly.
    return (
      (+ip[0] | (~+mask[0] & 255)) +
      '.' +
      (+ip[1] | (~+mask[1] & 255)) +
      '.' +
      (+ip[2] | (~+mask[2] & 255)) +
      '.' +
      (+ip[3] | (~+mask[3] & 255))
    );
  }
  private getDeviceInterfaces(): Array<ActiveInterfaces> {
    //if we already have interfaces then return it
    if (this.interfaces.length > 0) return this.interfaces;
    //otherwise fetch and save it
    const interfaces = os.networkInterfaces();
    const activeInterfaces: ActiveInterfaces[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      addrs?.forEach((addr) => {
        if (addr.family === 'IPv4' && !addr.internal) {
          activeInterfaces.push({
            address: addr.address,
            netmask: addr.netmask,
          });
        }
      });
    }
    this.interfaces = activeInterfaces;

    return activeInterfaces;
  }
  public getAllDevices() {
    return Array.from(this.Devices.values());
  }

  private handleOfflineDevice() {
    setInterval(() => {
      for (const device of this.Devices.entries()) {
        if (Date.now() - device[1].lastSeen > 1000000000) {
          this.emit('device:lost', device[1]);
          console.log(`lost Device : ${JSON.stringify(device[1])}`);
          this.Devices.delete(device[1].address);
        }
      }
    }, 1000);
  }
}

export default DiscoveryService;
