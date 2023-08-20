import { DeviceResponse } from './Types';

export default abstract class Scanner {
  abstract scan(): Promise<DeviceResponse[]>;
}