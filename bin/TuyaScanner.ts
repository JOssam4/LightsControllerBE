// import dgram from 'node:dgram';
import * as dgram from 'node:dgram';
import * as crypto from 'crypto';
import {createHash} from 'node:crypto';
import { TuyaDeviceResponse } from './Types';
import Scanner from './Scanner';

export default class TuyaScanner extends Scanner {
  server: dgram.Socket;
  connectionIsOpen: boolean;
  devicesFound: Map<string, TuyaDeviceResponse>; // ip addr -> device response to verify uniqueness
  deviceIdToNameMap: Map<string, string>
  static SCANTIME_SECONDS: number = 20;
  // credit to tuya-convert and tinytuya
  static UDPKEY = createHash('md5').update('yGAdlopoPVldABfn').digest();
  static PREFIX_55AA_BIN = Buffer.from('\x00\x00U\xaa', 'ascii');
  static PREFIX_6699_BIN = Buffer.from('\x00\x00\x66\x99', 'ascii');
  constructor(deviceIdToNameMap: Map<string, string>) {
    super();
    this.deviceIdToNameMap = deviceIdToNameMap;
    this.server = dgram.createSocket('udp4');
    this.connectionIsOpen = false;
    this.devicesFound = new Map<string, TuyaDeviceResponse>();
  }

  public async scan(): Promise<TuyaDeviceResponse[]> {
    return new Promise((resolve, reject) => this.initializeListeners(resolve, reject));
  }

  private initializeListeners(resolve: (value: (TuyaDeviceResponse[] | PromiseLike<TuyaDeviceResponse[]>)) => void, reject: (reason?: any) => void): void {
    this.server.on('error', (err) => {
      console.error(`server error:\n${err.stack}`);
      this.connectionIsOpen = false;
      this.server.close();
      reject(err);
    });

    this.server.on('message', (msg) => {
      const decryptedMessage = this.decryptUdp(msg);
      if (decryptedMessage !== null) {
        const device = JSON.parse(decryptedMessage);
        const gwId = device.gwId;
        this.devicesFound.set(gwId, {id: device.gwId, name: this.deviceIdToNameMap.get(device.gwId), ...device});
      }

    });

    this.server.on('listening', () => {
      this.connectionIsOpen = true;
      const address = this.server.address();
      console.log(`server listening ${address.address}:${address.port} for ${TuyaScanner.SCANTIME_SECONDS} seconds`);
      setTimeout(() => {
        if (this.connectionIsOpen) {
          this.server.close();
          this.connectionIsOpen = false;
          console.log(`stopped scanning for Tuya devices after ${TuyaScanner.SCANTIME_SECONDS} seconds`);
          resolve(Array.from(this.devicesFound.values()));
        }
      }, TuyaScanner.SCANTIME_SECONDS * 1000);
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
    if (this.buffersAreEqual(firstFourBytes, TuyaScanner.PREFIX_55AA_BIN)) {
      const msgToDecrypt = msg.subarray(20, msg.length - 8);
      return this.decrypt(msgToDecrypt, TuyaScanner.UDPKEY)
    } else if (this.buffersAreEqual(firstFourBytes, TuyaScanner.PREFIX_6699_BIN)) {
      console.error('PREFIX_6699_BIN detected, but not currently supported');
    }
    try {
      return this.decrypt(msg, TuyaScanner.UDPKEY);
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