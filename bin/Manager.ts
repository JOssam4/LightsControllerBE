import {Mode} from './Types';
import {SceneParts} from './Scenes';

abstract class Manager {
    abstract getToggleStatus(): Promise<boolean>;
    abstract setToggleStatus(status: boolean): Promise<Object>;
    abstract getBrightness(): Promise<number>;
    abstract setBrightness(brightness: number): Promise<Object>;
    abstract getBetterHSV(): Promise<[number, number, number]>;
    abstract setBetterHSV(h: number, s: number, v: number): Promise<Object>;
    abstract getBrightnessPercentage(): Promise<number>;
    abstract setBrightnessPercentage(brightness: number): Promise<Object>;
    // Use white brightness for both brightness and temp because for Hue, brightness can be set via HSV
    abstract getWarmthPercentage(): Promise<number | undefined>;
    abstract setWarmthPercentage(percentage: number): Promise<Object>;
    abstract getMode(): Promise<Mode>;
    abstract setTimer(time: Date): Promise<boolean>;
    abstract getSceneParts(): Promise<SceneParts>;
    abstract setSceneFromParts(sceneparts: SceneParts): Promise<Object>;
    protected getRgbs(c: number, x: number, h: number): [number, number, number] {
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
    protected async getRGB(): Promise<[number, number, number]> {
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
    protected getH(r: number, g: number, b: number, cMax: number, delta: number): number {
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
    protected getS(cMax: number, delta: number): number {
        if (cMax === 0) {
            return 0;
        } else {
            return delta / cMax;
        }
    }
    protected setRGB(r: number, g: number, b: number): Promise<Object> {
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

export default Manager;