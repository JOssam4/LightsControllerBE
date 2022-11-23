import { getOptions, refreshOptions, setOptions, findOptions, Mode, State} from "./Types";

/*
https://developer.tuya.com/en/docs/iot/product-function-definition?id=K9tp155s4th6b
dps: {
    '20': true, <-- switch. Type: Boolean. Value: true/false or on/off

    '21': 'white', <-- mode. Type: Enum. Value: 'white', 'colour', 'scene', 'music'

    '22': 200, <-- white light brightness. Type: Number. Value: 10 - 1000, corresponding to actual brightness 1%-100%$. Lowest brightness display is 1%.

    Note that 23 is missing. It would have been cooling and warming value. @TODO: see if we can program it back in

    '24': '00e302bc0294', <-- IPL (hsv). Type: Character. Value: of format AAAABBBBCCCC (ex: 000011112222).
    0000: H (chromaticity: 0-360, 0X0000-0X0168)
    1111: S (saturation: 0-1000, 0X0000-0X03E8)
    2222: V (Brightness: 0-1000, 0X0000-0X03E8)

    '25': '000e0d0000000000000000c80000', <-- Situation. Type: Character. Value: Value: 0011223344445555666677778888
    00: Scene number
    11: Unit switching interval time (0-100)
    22: Unit change time (0-100)
    33: Unit change mode (0 static, 1 jump, 2 gradual change)
    4444: H (chromaticity: 0-360, 0X0000-0X0168)
    5555: S (saturated: 0-1000, 0X0000-0X03E8)
    6666: V (Brightness: 0-1000, 0X0000-0X03E8)
    7777: White light brightness (0-1000)
    8888: Color temperature value (0-1000)
    Note: The numbers 1-8 correspond to as many groups as there are units

    '26': 0 <-- Countdown. Type: Numeric. Value: 0-86400. The data unit is second,
    which corresponds to a value of 60 for one minute, and the maximum setting is 86400 = 23 hours and 59 minutes.
    0 means off
  }

  Note: this API separates white and colored light into two separate entities (kinda).
  @TODO: write methods that can change current color without changing brightness.

 */



interface BulbDevice {
  get: (options: getOptions) => Promise<any>;
  refresh: (options: refreshOptions) => Promise<Object>;
  set: (options: setOptions) => Promise<Object>;
  connect: () => Promise<Boolean>;
  disconnect: () => void;
  isConnected: () => Boolean;
  find: (options?: findOptions) => Promise<Boolean | Array<any>>;
  toggle: (property: number) => Promise<Boolean>;
}

export default class Manager {
  private bulbDevice: BulbDevice;

  constructor(device: BulbDevice) {
    this.bulbDevice = device;
  }

  // BASE LEVEL METHODS, just to interact with nodejs library.
  getToggleStatus(): Promise<boolean> {
    return this.bulbDevice.get({dps: 20});
  }

  setToggleStatus(status: boolean): Promise<Object> {
    return this.bulbDevice.set({dps: 20, set: status});
  }

  getMode(): Promise<Mode> {
    return this.bulbDevice.get({dps: 21});
  }

  setMode(mode: Mode): Promise<Object> {
    return this.bulbDevice.set({dps: 21, set: mode});
  }

  getBrightness(): Promise<number> {
    return this.bulbDevice.get({dps: 22});
  }

  setBrightness(brightness: number): Promise<Object> {
    return this.bulbDevice.set({dps: 22, set: brightness});
  }

  getHSV(): Promise<string> {
    return this.bulbDevice.get({dps: 24});
  }

  setHSV(hsv: string): Promise<Object> {
    return this.bulbDevice.set({dps: 24, set: hsv});
  }

  getState(): Promise<string> {
    return this.bulbDevice.get({dps: 25});
  }

  setState(state: string): Promise<Object> {
    return this.bulbDevice.set({dps: 25, set: state});
  }

  getCountdown(): Promise<number> {
    return this.bulbDevice.get({dps: 26});
  }

  setCountdown(countdown: number): Promise<Object> {
    return this.bulbDevice.set({dps: 26, set: countdown});
  }

  // Better methods

  // toggle and mode are ok how they are.

  getBrightnessPercentage(): Promise<number> {
    return this.getBrightness()
      .then((brightness: number) => brightness / 10)
  }

  setBrightnessPercentage(percentage: number) {
    const brightnessRAW = percentage * 10;
    return this.setBrightness(brightnessRAW);
  }

  /**
   * emit 0 <= h <= 360
   * emit 0 <= s <= 100
   * emit 0 <= v <= 100
   */

  async getBetterHSV(): Promise<[number, number, number]> {
    const hsvVal: string = await this.getHSV();
    const h = parseInt(hsvVal.substring(0, 4), 16);
    const s = parseInt(hsvVal.substring(4, 8), 16);
    const v = parseInt(hsvVal.substring(8, 12), 16);

    return [h, s / 10, v / 10];
  }

  setBetterHSV(h: number, s: number, v: number): Promise<Object> {
    s *= 10;
    v *= 10;
    const hexH = h.toString(16).padStart(4, '0');
    const hexS = s.toString(16).padStart(4, '0');
    const hexV = v.toString(16).padStart(4, '0');
    const hsvVal = hexH + hexS + hexV;
    if (this.bulbDevice.isConnected()) {
      return this.setHSV(hsvVal);
    } else {
      return this.bulbDevice.find()
        .then(() => this.bulbDevice.connect())
        .then(() => this.setHSV(hsvVal));
    }
  }

  async getBetterState(): Promise<State> {
    const stateVal: string = await this.getState();
    const scene = parseInt(stateVal.substring(0, 2), 10);
    const switchingInterval = parseInt(stateVal.substring(2, 4), 10);
    const changeTime = parseInt(stateVal.substring(4, 6), 10);
    const changeMode = parseInt(stateVal.substring(6, 8), 10);
    // const H = parseInt(stateVal.substring(8, 12), 16);
    // const S = parseInt(stateVal.substring(12, 16), 16);
    // const V = parseInt(stateVal.substring(16, 20), 16);
    const whiteLightBrightness = parseInt(stateVal.substring(20, 24), 10);
    // const colorTemperatureValue = parseInt(stateVal.substring(24), 10);

    return {
      scene,
      switchingInterval: switchingInterval,
      changeTime,
      changeMode,
      whiteLightBrightness,
    }
  }

  private getRgbs(c: number, x: number, h: number): [number, number, number] {
    if (h >= 0 && h < 60) {
      return [c, x, 0];
    } else if (h >= 60 && h < 120) {
      return [x, c, 0];
    } else if (h >= 120 && h < 180) {
      return [0, c, x];
    } else if (h >= 180 && h < 240) {
      return [0, x, c];
    } else if (h >= 240 && h < 300) {
      return [x, 0, c];
    } else {
      return [c, 0, x];
    }
  }

  async getRGB(): Promise<[number, number, number]> {
    let [h, s, v] = await this.getBetterHSV();
    s /= 100;
    v /= 100;

    const c = v * s;
    const hh = h / 60.0;
    const x = c * (1.0 - Math.abs((hh % 2) - 1));
    const m = v - c;
    const [rp, gp, bp] = this.getRgbs(c, x, h);
    return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];

  }

  private getH(r: number, g: number, b: number, cMax: number, delta: number): number {
    if (delta === 0) {
      return 0;
    } else if (cMax === r) {
      return 60 * (((g - b) / delta) % 6);
    } else if (cMax === g) {
      return 60 * (((b - r) / delta) + 2);
    } else {
      return 60 * (((r - g) / delta) + 4);
    }
  }

  private getS(cMax: number, delta: number): number {
    if (cMax === 0) {
      return 0;
    } else {
      return delta / cMax;
    }
  }

  setRGB(r: number, g: number, b: number): Promise<Object> {
    r /= 255;
    g /= 255;
    b /= 255;

    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    const h = Math.round(this.getH(r, g, b, cMax, delta));
    const s = Math.round(this.getS(cMax, delta))
    const v = Math.round(cMax);

    return this.setBetterHSV(h, s * 100, v * 100);

  }

}

