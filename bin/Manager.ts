import { getOptions, refreshOptions, setOptions, findOptions, Mode} from "./Types";
import {ChangeMode, Scene, SceneParts, parseScene, parseFullSceneIntoParts, compressScene, compressSceneParts, getBetterCompressedScene} from './Scenes';

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
    11: Unit switching interval time (0-100) -- Transition interval between lighting modes. The higher the value here, the longer it takes to transition to another color
    22: Unit change time (0-100) -- Lighting mode duration. The higher the value here, the longer the lights will stay this color before beginning the next transition.
    33: Unit change mode (0 static, 1 jump, 2 gradual change)
    4444: H (chromaticity: 0-360, 0X0000-0X0168)
    5555: S (saturated: 0-1000, 0X0000-0X03E8)
    6666: V (Brightness: 0-1000, 0X0000-0X03E8)
    7777: White light brightness (0-1000)
    8888: Color temperature value (0-1000)
    Note: The numbers 1-8 correspond to as many groups as there are units

    You can string together a bunch of values for 25 to get a fade loop or something like that.
    Ex: 010b0a02000003e803e8000000000b0a02007603e803e8000000000b0a0200e703e803e800000000
    Note: scene number is not repeated for each group. It only appears once, at the beginning
    
    Dissected example:
    01 0b0a02000003e803e800000000 0b0a02007603e803e800000000 0b0a0200e703e803e800000000
    01 - scene number
    0b - Unit switching interval time (11) -- I think this refers to how long the lights take to switch between colors
    0a - Unit change time (10) -- I think this refers to how long the lights stay on a color for before switching.
    02: Unit change mode: gradual change
    0000: H
    03e8: S
    03e8: V
    0000: White light brightness (yes, you can have both hsv and white)
    0000: color temperature (doesn't appear to do anything since datapoint 23 is not supported)
    
    Example 2: The fade button on the controller causes the following scene:
    0b440002000003e803e800000000440002001d03e803e800000000440002004603e803e800000000440002008403e803e80000000044000200b703e803e80000000044000200ef03e803e800000000440002013103e803e800000000
    = 0b 440002000003e803e800000000 440002001d03e803e800000000 440002004603e803e800000000 440002008403e803e800000000 44000200b703e803e800000000 44000200ef03e803e800000000 440002013103e803e800000000

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

  async setHSV(hsv: string): Promise<Object> {
    const mode = await this.getMode();
    if (mode !== Mode.COLOR) {
      return this.bulbDevice.set({
        multiple: true,
        data: {
          '21': Mode.COLOR,
          '24': hsv,
        },
        shouldWaitForResponse: false
      });
    } else {
      return this.bulbDevice.set({dps: 24, set: hsv});
    }
  }

  getScene(): Promise<string> {
    return this.bulbDevice.get({dps: 25});
  }

  setScene(scene: string): Promise<Object> {
    return this.bulbDevice.set({dps: 25, set: scene});
  }

  getCountdown(): Promise<number> {
    return this.bulbDevice.get({dps: 26});
  }

  setCountdown(countdown: number): Promise<Object> {
    return this.bulbDevice.set({dps: 26, set: countdown});
  }

  // Better methods

  // toggle and mode are ok how they are.

  getWhiteBrightnessPercentage(): Promise<number> {
    return this.getBrightness()
      .then((brightness: number) => brightness / 10)
  }

  setWhiteBrightnessPercentage(percentage: number) {
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

  async setBetterHSV(h: number, s: number, v: number): Promise<Object> {
    s *= 10;
    v *= 10;
    const hexH = Math.round(h).toString(16).padStart(4, '0');
    const hexS = Math.round(s).toString(16).padStart(4, '0');
    const hexV = Math.round(v).toString(16).padStart(4, '0');
    const hsvVal = hexH + hexS + hexV;
    if (this.bulbDevice.isConnected()) {
      return this.setHSV(hsvVal);
    } else {
      const ret = await this.bulbDevice.find()
        .then(() => this.bulbDevice.connect())
        .then(() => this.setHSV(hsvVal));
      this.bulbDevice.disconnect()
      return ret;
    }
  }

  async getBrightnessPercentage(): Promise<number> {
    const mode = await this.getMode();
    if (mode === Mode.WHITE) {
      return this.getWhiteBrightnessPercentage();
    } else if (mode === Mode.COLOR) {
      const [h, s, v] = await this.getBetterHSV();
      return v;
    } else {
      console.log('unsupported mode. Supported modes are WHITE and COLOR.');
      return -1;
    }
  }

  async setBrightnessPercentage(brightness: number): Promise<Object> {
     const mode = await this.getMode();
     if (mode === Mode.WHITE) {
       return this.setWhiteBrightnessPercentage(brightness);
     } else if (mode === Mode.COLOR) {
       const [h, s, v] = await this.getBetterHSV();
       return this.setBetterHSV(h, s, brightness)
     } else {
       console.log('unsupported mode. Supported modes are WHITE and COLOR');
       return {}
     }
  }

  async getCurrentScene(): Promise<SceneParts> {
    const compressedScene = await this.getScene();
    return parseFullSceneIntoParts(compressedScene);
  }

  async setCurrentScene(sceneparts: SceneParts): Promise<Object> {
    const compressedScene = compressSceneParts(sceneparts);
    return this.setScene(compressedScene);
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

