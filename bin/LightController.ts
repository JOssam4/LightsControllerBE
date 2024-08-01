import HueManager from './HueManager';
import Manager from './Manager';
import TuyaManager from './TuyaManager';
import {Mode, TuyaDeviceResponse, HueDeviceResponse} from './Types';
import { SceneParts } from './Scenes';
import TuyaScanner from "./TuyaScanner";
import HueScanner from "./HueScanner";
import * as fs from 'fs';
import TuyAPI from 'tuyapi';

interface HSVState {
    h: number;
    s: number;
    v: number;
}

type LightState = {
    color: HSVState;
    white: number | undefined;
    temperature: number | undefined;
    toggle: boolean;
    mode: Mode;
    sceneBrightness?: number;
}

interface CompletedStatus {
    completed: boolean;
}

interface BrightnessState {
    brightness: number;
}

interface ToggleState {
    toggle: boolean;
}

interface ModeState {
    mode: Mode;
}

interface WarmthState {
    warmth: number | undefined;
}

interface SetModeState {
    completed: boolean;
    brightness?: number;
}

interface DevicesResponse {
    hue: HueDeviceResponse[];
    tuya: TuyaDeviceResponse[];
}

type DeviceNotFoundResponse = {
    responseCode: 400;
    message: string;
}

type DeviceDoesNotSupportOperationResponse = {
    responseCode: 405;
    message: string;
}

type Response<Type> = {
    responseCode: number;
    data: Type;
}

interface KeyObj {
    id: string;
    key: string;
    name: string;
}

export default class LightController {
    hueBaseUrl: string;
    hueUsername: string;
    devices: DevicesResponse;
    deviceIdToDeviceManager: Map<string, Manager>;
    tuyaKeys: Map<string, string>;
    constructor(hueBaseUrl: string, hueUsername: string, devices: DevicesResponse) {
        this.hueBaseUrl = hueBaseUrl;
        this.hueUsername = hueUsername;
        this.devices = devices;
        this.tuyaKeys = this.getTuyaKeys();
        this.deviceIdToDeviceManager = this.getDeviceIdToDeviceManagerMap(devices);
    }

    public static async create(hueBaseUrl: string, hueUsername: string): Promise<LightController> {
        const devices: DevicesResponse = await LightController.scan(hueBaseUrl, hueUsername);
        return new LightController(hueBaseUrl, hueUsername, devices);
    }

    private getTuyaKeys(): Map<string, string> {
        const data = fs.readFileSync('./bin/tuya_keys.json');
        // technically we could do JSON.parse(data), but this way makes TypeScript happy. Might have to do with type coercion.
        const keys: KeyObj[] = JSON.parse(data.toString())
        const ret = new Map<string, string>();
        keys.forEach((key: KeyObj) => {
            ret.set(key.id, key.key);
        });
        return ret;
    }

    private static getTuyaNames(): Map<string, string> {
        const data = fs.readFileSync('./bin/tuya_keys.json');
        const names: KeyObj[] = JSON.parse(data.toString());
        const ret = new Map<string, string>();
        names.forEach((key: KeyObj) => {
            ret.set(key.id, key.name);
        });
        return ret;
    }

    private static async scan(hueBaseUrl: string, hueUsername: string): Promise<DevicesResponse> {
        const hueScanner: HueScanner = new HueScanner(hueBaseUrl, hueUsername);
        const hueDevices: HueDeviceResponse[] = await hueScanner.scan();
        const tuyaScanner: TuyaScanner = new TuyaScanner(this.getTuyaNames());
        const tuyaDevices: TuyaDeviceResponse[] = await tuyaScanner.scan();
        return {
            hue: hueDevices,
            tuya: tuyaDevices,
        };
    }

    private getDeviceIdToDeviceManagerMap(devices: DevicesResponse): Map<string, Manager> {
        const deviceIdToDeviceManager = new Map<string, Manager>;
        const hueDevices = devices.hue;
        const tuyaDevices = devices.tuya;
        hueDevices.forEach((hueDevice: HueDeviceResponse) => {
            const id = hueDevice.id;
            const deviceManager: Manager = new HueManager(this.hueBaseUrl, this.hueUsername, parseInt(id));
            deviceIdToDeviceManager.set(id, deviceManager);
        });
        tuyaDevices.forEach((tuyaDevice: TuyaDeviceResponse) => {
            const id = tuyaDevice.id;
            const key = this.tuyaKeys.get(id);
            if (!key) {
                console.log(`No key found for tuya device with id ${id} at ip address ${tuyaDevice.ip}. Device will not be included in response nor will it be tracked.`);
                return;
            }
            const deviceObject = {
                id,
                key,
                version: tuyaDevice.version,
                ip: tuyaDevice.ip,
            };
            const tuyAPIDevice: TuyAPI = new TuyAPI(deviceObject);
            // @ts-ignore -- due to lack of types for TuyAPI
            const deviceManager: Manager = new TuyaManager(tuyAPIDevice);
            deviceIdToDeviceManager.set(id, deviceManager);
        });
        return deviceIdToDeviceManager;
    }

    async getDevices(reScan: boolean): Promise<DevicesResponse> {
        if (reScan) {
            const devices: DevicesResponse = await LightController.scan(this.hueBaseUrl, this.hueUsername);
            this.devices = devices;
            this.deviceIdToDeviceManager = this.getDeviceIdToDeviceManagerMap(devices);
            return devices;
        }
        return this.devices;
    }

    async getState(deviceId: string): Promise<Response<LightState> | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        const toggle = await managedDevice.getToggleStatus();
        const [h, s, v] = await managedDevice.getBetterHSV();
        const mode = await managedDevice.getMode();
        const white = (managedDevice instanceof TuyaManager) ? await managedDevice.getWhiteBrightnessPercentage() : undefined;
        const temperature = (managedDevice instanceof HueManager) ? await managedDevice.getWarmthPercentage() : undefined;
        const sceneBrightness = (managedDevice instanceof TuyaManager) ? await managedDevice.getBrightnessPercentage() : undefined;
        return {
            responseCode: 200,
            data: {
                color: {h, s, v},
                white,
                temperature,
                toggle,
                mode,
                sceneBrightness
            }
        };
    }

    async getColor(deviceId: string): Promise<Response<HSVState> | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        const [h, s, v] = await managedDevice.getBetterHSV();
        console.debug(`current color: ${[h, s, v]}`);
        return {
            responseCode: 200,
            data: {h, s, v}
        }
    }

    async putColor(devices: string[], hsv: HSVState): Promise<Response<CompletedStatus> | DeviceNotFoundResponse> {
        // const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Tried to put color on device with invalid id!`,
            };
        }
        const {h, s, v} = hsv;
        const promises = (managedDevices as Manager[]).map((managedDevice: Manager) => {
            return managedDevice.setBetterHSV(h, s, v)
              .then(() => {
                  return {
                      responseCode: 200, data: {completed: true}
                  }
              })
              .catch((err) => {
                  console.error(err);
                  return {
                      responseCode: 200,
                      data: {completed: false}
                  };
              });
        })
        return Promise.all(promises)
          .then((responses: Response<CompletedStatus>[]) => {
              return {
                  responseCode: 200,
                  data: {completed: responses.every((response: Response<CompletedStatus>) => response.data.completed)}
              } as Response<CompletedStatus>;
          })

    }

    async getBrightness(deviceId: string): Promise<Response<BrightnessState> | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        const brightness = await managedDevice.getBrightnessPercentage();
        return {
            responseCode: 200,
            data: {brightness}
        };
    }

    async putBrightness(devices: string[], brightness: number): Promise<Response<CompletedStatus> | DeviceNotFoundResponse> {
        // const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Tried to put brightness on device with invalid id!`,
            };
        }

        const promises = (managedDevices as Manager[]).map((managedDevice: Manager) => {
        if (brightness < 0) {
            brightness = 0;
        } else if (brightness > 100) {
            brightness = 100;
        }
        return managedDevice.setBrightnessPercentage(brightness)
            .then(() => {
                return {
                    responseCode: 200,
                    data: {completed: true}
                };
            })
            .catch(() => {
                return {
                    responseCode: 200,
                    data: {completed: false}};
            });
        });

        return Promise.all(promises)
          .then((responses: Response<CompletedStatus>[]) => {
              return {
                  responseCode: 200,
                  data: {completed: responses.every((response: Response<CompletedStatus>) => response.data.completed)}
              } as Response<CompletedStatus>;
          });
    }
    async getToggle(deviceId: string): Promise<Response<ToggleState> | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        const toggle = await managedDevice.getToggleStatus();
        return {
            responseCode: 200,
            data: {toggle}
        };
    }

    async putToggle(devices: string[], toggle: boolean): Promise<Response<CompletedStatus> | DeviceNotFoundResponse> {
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Tried to put toggle on device with invalid id!`,
            };
        }
        const promises = (managedDevices as Manager[]).map((managedDevice: Manager) => {
            return managedDevice.setToggleStatus(toggle)
              .then(() => {
                  return {
                      responseCode: 200,
                      data: {completed: true}
                  };
              })
              .catch(() => {
                  return {
                      responseCode: 200,
                      data: {completed: false}
                  };
              });
        });
        return Promise.all(promises)
          .then((responses: Response<CompletedStatus>[]) => {
              return {
                  responseCode: 200,
                  data: {completed: responses.every((response: Response<CompletedStatus>) => response.data.completed)}
              } as Response<CompletedStatus>;
          });
    }

    async getMode(deviceId: string): Promise<Response<ModeState> | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        let mode = await managedDevice.getMode();
        return {
            responseCode: 200,
            data: {
                mode
            }
        };
    }

    // Since setting modes isn't as straightforward on Hue lights, this is an abstraction over setting hue/saturation, ct, or xy values to what they already were
    // Note: setting hue lights to hue/saturation mode won't have any visible effect
    async putMode(devices: string[], mode: Mode): Promise<Response<SetModeState> | DeviceNotFoundResponse> {
        // const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Tried to put mode on device with invalid id!`,
            };
        }
        const promises = (managedDevices as Manager[]).map(async (managedDevice: Manager) => {
            if (managedDevice instanceof HueManager) {
                const [h, s, v] = await managedDevice.getBetterHSV();
                const currentWarmth = await managedDevice.getWarmthPercentage();
                const status = (mode === Mode.COLOR)
                  ? await managedDevice.setBetterHSV(h, s, v)
                  : await managedDevice.setWarmthPercentage(currentWarmth);
                const completedSuccessfully = status.every(each => Object.keys(each).includes('success'));
                return {
                    responseCode: 200,
                    data: {completed: completedSuccessfully}
                };
            } else if (managedDevice instanceof TuyaManager) {
                await managedDevice.setMode(mode);
                const brightness = await managedDevice.getBrightnessPercentage();
                console.debug(`brightness: ${brightness}`);
                return {
                    responseCode: 200,
                    data: {completed: true, brightness}
                };
            }
            return {
                responseCode: 200,
                data: {completed: false}
            };
        });
        return Promise.all(promises)
          .then((responses: Response<CompletedStatus>[]) => {
              return {
                  responseCode: 200,
                  data: {completed: responses.every((response: Response<CompletedStatus>) => response.data.completed)}
              } as Response<CompletedStatus>;
          });
    }

    async getScene(deviceId: string): Promise<Response<SceneParts> | DeviceDoesNotSupportOperationResponse | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        if (managedDevice instanceof TuyaManager) {
            const sceneparts = await managedDevice.getSceneParts();
            console.debug('current scene: ');
            console.dir(sceneparts);
            return {
                responseCode: 200,
                data: sceneparts
            };
        }
        return {
            responseCode: 405,
            message: `deviceId ${deviceId} does not support scenes.`
        }
    }

    async putScene(devices: string[], sceneParts: SceneParts): Promise<Response<CompletedStatus> | DeviceDoesNotSupportOperationResponse | DeviceNotFoundResponse> {
        // const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Tried to put scene on device with invalid id!`,
            };
        }
        const promises = (managedDevices as Manager[]).map(async (managedDevice: Manager) => {
            if (managedDevice instanceof TuyaManager) {
                await managedDevice.setSceneFromParts(sceneParts);
                return {
                    responseCode: 200,
                    data: {completed: true}
                } as Response<CompletedStatus>;
            }
            return {
                responseCode: 405,
                message: `Device does not support scenes.`
            } as DeviceDoesNotSupportOperationResponse;
        });
        return Promise.all(promises)
          .then((responses: (DeviceDoesNotSupportOperationResponse | Response<CompletedStatus>)[]) => {
              // 405 error means device does not support operation
              if (responses.some((response) => response.responseCode === 405)) {
                  return {
                      responseCode: 405,
                      message: 'Device does not support scenes.'
                  }
              }
              const allRequestsCompleted = (responses as Response<CompletedStatus>[]).every((response: Response<CompletedStatus>) => response.data.completed);
              return {
                  responseCode: 200,
                  data: {completed: allRequestsCompleted}
              } as Response<CompletedStatus>;
          });
    }

    async getWarmth(deviceId: string): Promise<Response<WarmthState> | DeviceNotFoundResponse> {
        const managedDevice = this.deviceIdToDeviceManager.get(deviceId);
        if (!managedDevice) {
            return {
                responseCode: 400,
                message: `deviceId ${deviceId} does not correspond with any found device!`
            };
        }
        const warmth = await managedDevice.getWarmthPercentage();
        return {
            responseCode: 200,
            data: {
                warmth
            }
        };
    }

    async putWarmth(devices: string[], warmth: number): Promise<Response<CompletedStatus> | DeviceNotFoundResponse> {
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Tried to put warmth on device with invalid id!`,
            };
        }
        const promises = (managedDevices as Manager[]).map((managedDevice: Manager) => {
            return managedDevice.setWarmthPercentage(warmth)
              .then(() => {
                  return {
                      responseCode: 200,
                      data: {completed: true}
                  };
              })
              .catch(() => {
                  return {
                      responseCode: 200,
                      data: {completed: false}
                  };
              });
        });
        return Promise.all(promises)
          .then((responses: Response<CompletedStatus>[]) => {
              return {
                  responseCode: 200,
                  data: {completed: responses.every((response: Response<CompletedStatus>) => response.data.completed)}
              } as Response<CompletedStatus>;
          });
    }

    async putTimer(devices: string[], time: Date): Promise<Response<CompletedStatus> | DeviceNotFoundResponse> {
        const managedDevices = devices.map((deviceId: string) => this.deviceIdToDeviceManager.get(deviceId));
        if (!managedDevices.every((managedDevice: Manager | undefined) => managedDevice !== undefined)) {
            return {
                responseCode: 400,
                message: `Cannot set timer on device with invalid id!`,
            };
        }
        const promises = (managedDevices as Manager[]).map((managedDevice: Manager) => {
            return managedDevice.setTimer(time)
              .then(() => {
                  return {
                      responseCode: 200,
                      data: {completed: true}
                  };
              })
              .catch(() => {
                  return {
                      responseCode: 200,
                      data: {completed: false}
                  };
              });
        });
        return Promise.all(promises)
          .then((responses: Response<CompletedStatus>[]) => {
              return {
                  responseCode: 200,
                  data: {completed: responses.every((response: Response<CompletedStatus>) => response.data.completed)}
              } as Response<CompletedStatus>;
          });
    }
}