// import dgram from 'node:dgram';
import * as dgram from 'node:dgram';
import * as crypto from 'crypto';
import {createHash} from 'node:crypto';


const PREFIX_55AA_BIN = Buffer.from('\x00\x00U\xaa', 'ascii');
const PREFIX_6699_BIN = Buffer.from('\x00\x00\x66\x99', 'ascii');

// credit to tuya-convert and tinytuya
const UDPKEY = createHash('md5').update('yGAdlopoPVldABfn').digest();

const SCANTIME_SECONDS = 20

interface DeviceResponse {
  ip: string;
  gwId: string;
  active: number;
  ability: number;
  encrypt: boolean;
  productKey: string;
  version: string;
}

export default class TuyaScanner {
  server: dgram.Socket;
  connectionIsOpen: boolean;
  devicesFound: Map<string, DeviceResponse>; // ip addr -> device response to verify uniqueness
  constructor() {
    this.server = dgram.createSocket('udp4');
    this.connectionIsOpen = false;
    this.devicesFound = new Map<string, DeviceResponse>();
    this.initializeListeners();
  }

  private initializeListeners(): void {
    this.server.on('error', (err) => {
      console.error(`server error:\n${err.stack}`);
      this.connectionIsOpen = false;
      this.server.close();
    });

    this.server.on('message', (msg, rinfo) => {
      console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
      const decryptedMessage = this.decryptUdp(msg);
      console.log(`decrypted message: ${decryptedMessage}`);
      if (decryptedMessage !== null) {
        const device: DeviceResponse = JSON.parse(decryptedMessage);
        const ipAddr = device.ip;
        this.devicesFound.set(ipAddr, device);
      }

    });

    this.server.on('listening', () => {
      this.connectionIsOpen = true;
      const address = this.server.address();
      console.log(`server listening ${address.address}:${address.port}`);
      setTimeout(() => {
        if (this.connectionIsOpen) {
          this.server.close();
          this.connectionIsOpen = false;
          console.log(`stopped scanning for Tuya devices after ${SCANTIME_SECONDS} seconds`);
        }


      }, SCANTIME_SECONDS * 1000);
    });

    this.server.bind(6667);
  }

  private decrypt(msg: Buffer, key: Buffer) {
    const algorithm = 'aes-128-ecb';
    const cipher = crypto.createDecipheriv(algorithm, key, null);
    // @ts-ignore
    const firstPartOfResponse = cipher.update(msg, 'ascii', 'ascii');
    const lastPartOfResponse = cipher.final('ascii');
    return firstPartOfResponse + lastPartOfResponse;
  }

  private decryptUdp(msg: Buffer): string | null {
    const firstFourBytes = msg.subarray(0, 4);
    if (this.buffersAreEqual(firstFourBytes, PREFIX_55AA_BIN)) {
      const msgToDecrypt = msg.subarray(20, msg.length - 8);
      return this.decrypt(msgToDecrypt, UDPKEY)
    } else if (this.buffersAreEqual(firstFourBytes, PREFIX_6699_BIN)) {
      console.error('PREFIX_6699_BIN detected, but not currently supported');
    }
    try {
      return this.decrypt(msg, UDPKEY);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  private buffersAreEqual(buff1: Buffer, buff2: Buffer) {
    if (buff1.length !== buff2.length) {
      return false;
    }
    for (let i = 0; i < buff1.length; ++i) {
      if (buff1[i] !== buff2[i]) {
        return false;
      }
    }
    return true;
  }
}