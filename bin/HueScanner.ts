import axios from 'axios';
import {HueDeviceResponse} from './Types';
import Scanner from './Scanner';

export default class HueScanner extends Scanner {
  baseUrl: string;
  username: string;

  constructor(baseUrl: string, username: string) {
    super();
    this.baseUrl = baseUrl;
    this.username = username;
  }
  public async scan(): Promise<HueDeviceResponse[]> {
    const deviceData = (await axios.get(`${this.baseUrl}/api/${this.username}/lights`)).data
    const deviceIds: string[] = Object.keys(deviceData);
    const devices: HueDeviceResponse[] = [];
    deviceIds.forEach((id: string) => {
      const data = {id, ...deviceData[id]};
      devices.push(data);
    });
    return devices;
  }
}