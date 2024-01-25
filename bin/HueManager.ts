import axios from "axios";
import Manager from "./Manager";
import {Mode} from './Types';

enum AlertState {
    SELECT = 'select',
    LSELECT = 'lselect',
}

enum EffectState {
    COLORLOOP = 'colorloop',
    NONE = 'none'
}

enum HueMode {
    CT = "ct",
    HS = "hs",
    XY = "xy",
}

interface HueLightDeviceState {
    on: boolean; // True if the light should be on
    bri: number; // Brightness, in range 0 - 254. 0 is not off
    hue: number; // Hue, in range 0 - 65535
    sat: number; // Saturation, in range 0 - 254
    effect: EffectState;
    xy: [number, number]; // Color as an array of xy-coordinates
    ct: number; // White color temperature, in range 153 (cold) - 500 (warm)
    alert: AlertState; // 'select' flashes light once, 'lselect' flashes repeatedly for 10 seconds
    colormode: HueMode;
    transitiontime: number; // Time for transition in centiseconds
}

interface HueLightDeviceStatePayload {
    on?: boolean;
    bri?: number;
    hue?: number;
    sat?: number;
    effect?: EffectState;
    xy?: [number, number];
    ct?: number;
    alert?: AlertState;
    transitiontime?: number;
}

type SuccessResponse = {
    success: Object | boolean;
}

interface ErrorObj {
    type: number;
    address: string;
    description: string;
}

type ErrorResponse = {
    error: ErrorObj;
}

type SetStatusResponse = SuccessResponse | ErrorResponse;

export default class HueManager extends Manager {
    private readonly baseUrl: string;
    private readonly username: string;
    private readonly deviceId: number;

    constructor(baseUrl: string, username: string, deviceId: number) {
        super();
        this.username = username;
        this.deviceId = deviceId;
        this.baseUrl = baseUrl;
    }

    private async getDeviceStatus(): Promise<HueLightDeviceState> {
        // const response = await fetch(`${this.baseUrl}/api/${this.username}/lights/${this.deviceId}`);
        // return await response.json();
        return (await axios.get(`${this.baseUrl}/api/${this.username}/lights/${this.deviceId}`)).data.state;
    }

    private async setDeviceStatus(payload: HueLightDeviceStatePayload): Promise<SetStatusResponse[]> {
        // const resp = await fetch(`${this.baseUrl}/api/${this.username}/lights/${this.deviceId}/state`, { method: 'PUT', body: JSON.stringify(payload) });
        // return await resp.json();
        return (await axios.put(`${this.baseUrl}/api/${this.username}/lights/${this.deviceId}/state`, payload)).data;
    } 
    
    async getToggleStatus(): Promise<boolean> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.on);
    }

    setToggleStatus(status: boolean): Promise<SetStatusResponse[]> {
        const payload = {on: status}
        return this.setDeviceStatus(payload);
    }

    async getBrightness(): Promise<number> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.bri);
    }

    setBrightness(brightness: number): Promise<SetStatusResponse[]> {
        const payload = {bri: brightness};
        return this.setDeviceStatus(payload);
    }

    async getBetterHSV(): Promise<[number, number, number]> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => {
                const hueScaleFactor = 360 / 65535;
                const svScaleFactor = 100 / 254;
                const hue = Math.round(status.hue * hueScaleFactor);
                const sat = Math.round(status.sat * svScaleFactor);
                const bri = Math.round(status.bri * svScaleFactor);
                return [hue, sat, bri];
        });
    }

    setBetterHSV(h: number, s: number, v: number): Promise<SetStatusResponse[]> {
        const hueScaleFactor = 65535 / 360;
        const hue = Math.round(h * hueScaleFactor);
        const svScaleFactor = 254 / 100;
        const sat = Math.round(s * svScaleFactor);
        const bri = Math.round(v * svScaleFactor);
        const payload = {hue, sat, bri};
        return this.setDeviceStatus(payload);
    }

    async getBrightnessPercentage(): Promise<number> {
        const [h, s, v] = await this.getBetterHSV();
        return v;
    }

    async setBrightnessPercentage(brightness: number): Promise<SetStatusResponse[]> {
        const payload = {bri: Math.round(brightness * 254 / 100)};
        return this.setDeviceStatus(payload);
    }

    async getMode(): Promise<Mode> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => {
                if (status.colormode === HueMode.HS || status.colormode === HueMode.XY) {
                    return Mode.COLOR;
                } else {
                    return Mode.WHITE
                }
            });
    }

    async getXY(): Promise<[number, number]> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.xy);
    }

    setXY(xy: [number, number]): Promise<SetStatusResponse[]> {
        const payload = {xy: xy};
        return this.setDeviceStatus(payload);
    }

    setBetterXY(x: number, y: number): Promise<SetStatusResponse[]> {
        return this.setXY([x, y]);
    }

    async getTemperature(): Promise<number> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.ct);
    }

    setTemperature(colorTemp: number): Promise<SetStatusResponse[]> {
        const payload = {ct: colorTemp};
        return this.setDeviceStatus(payload);
    }

    async getWarmthPercentage(): Promise<number> {
        return this.getTemperature()
          .then((temperature: number) => Math.round(((temperature - 153) / 346) * 100));
    }

    async setWarmthPercentage(percentage: number): Promise<SetStatusResponse[]> {
        const rawTemp = Math.round(percentage * 346 / 100 + 153);
        return this.setTemperature(rawTemp);
    }

    async getAlert(): Promise<AlertState> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.alert);
    }

    setAlert(alert: AlertState): Promise<SetStatusResponse[]> {
        const payload = {alert: alert};
        return this.setDeviceStatus(payload);
    }

    async getTransitionTime(): Promise<number> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.transitiontime)
    }

    setTransitionTime(transitionTime: number): Promise<SetStatusResponse[]> {
        const payload = {transitiontime: transitionTime};
        return this.setDeviceStatus(payload);
    }

    async getEffect(): Promise<EffectState> {
        return this.getDeviceStatus()
            .then((status: HueLightDeviceState) => status.effect);
    }

    setEffect(effect: EffectState): Promise<SetStatusResponse[]> {
        const payload = {effect: effect};
        return this.setDeviceStatus(payload);
    }

    setTimer(time: Date): Promise<boolean> {
        const now = Date.now();
        const diffThenVsNowInMs: number = time.valueOf() - now.valueOf();
        // if difference is negative or 0, execute immediately
        setTimeout(() => this.setToggleStatus(false), diffThenVsNowInMs);
        return Promise.resolve(true);
    }
}