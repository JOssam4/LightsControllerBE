import HueManager from './HueManager';
import Manager from './Manager';
import TuyaManager from './TuyaManager';
import { HueMode, Mode, TuyaMode } from './Types';
import { SceneParts } from './Scenes';

interface HSVState {
    h: number;
    s: number;
    v: number;
}

interface LightState {
    color: HSVState;
    white: number;
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

interface SetModeState {
    completed: boolean;
    brightness?: number;
}

async function getState(managedDevice: Manager): Promise<LightState> {
    const toggle = await managedDevice.getToggleStatus();
    const [h, s, v] = await managedDevice.getBetterHSV();
    const mode = await managedDevice.getMode();
    const white = await managedDevice.getWhiteBrightnessPercentage();
    const sceneBrightness = (managedDevice instanceof TuyaManager) ? await managedDevice.getBrightnessPercentage() : undefined;
    console.debug(`current toggle: ${toggle}`);
    console.debug(`current color: ${[h, s, v]}`);
    console.debug(`current mode: ${mode}`);
    console.debug(`white brightness/temp: ${white}`);
    if (managedDevice instanceof TuyaManager) {
        console.debug(`scene brightness: ${sceneBrightness}`);
    }
    return {
        color: {h, s, v},
        white,
        toggle,
        mode,
        sceneBrightness
    };
}

async function getColor(managedDevice: Manager): Promise<HSVState> {
    const [h, s, v] = await managedDevice.getBetterHSV();
    console.debug(`current color: ${[h, s, v]}`);
    return {h, s, v}
}

async function putColor(managedDevice: Manager, hsv: HSVState): Promise<CompletedStatus> {
    const {h, s, v} = hsv;
    return managedDevice.setBetterHSV(h, s, v)
        .then(() => {
            return {completed: true};
        })
        .catch((err) => {
            console.error(err);
            return {completed: false};
        });
}

async function getBrightness(managedDevice: Manager): Promise<BrightnessState> {
    const brightness = await managedDevice.getBrightnessPercentage();
    return {brightness};
}

async function putBrightness(managedDevice: Manager, brightness: number): Promise<CompletedStatus> {
    if (brightness < 0) {
        brightness = 0;
    } else if (brightness > 100) {
        brightness = 100;
    }
    return managedDevice.setBrightnessPercentage(brightness)
        .then(() => {
            return {completed: true};
        })
        .catch(() => {
            return {completed: false};
        });
}

async function getToggle(managedDevice: Manager): Promise<ToggleState> {
    const toggle = await managedDevice.getToggleStatus();
    console.debug(`current toggle status: ${toggle}`);
    return {toggle};
}

async function putToggle(managedDevice: Manager, toggle: boolean): Promise<CompletedStatus> {
    return managedDevice.setToggleStatus(toggle)
        .then(() => {
            return {completed: true};
        })
        .catch(() => {
            return {completed: false};
        });
}

async function getMode(managedDevice: Manager): Promise<ModeState> {
    const mode = await managedDevice.getMode();
    console.debug(`current mode: ${mode}`);
    return {mode};
}

/**
 * Since setting modes isn't as straightforward on Hue lights, this is an abstraction over setting hue/saturation, ct, or xy values to what they already were
 */
async function putMode(managedDevice: Manager, mode: Mode): Promise<SetModeState> {
    if (managedDevice instanceof HueManager) {
        mode = mode as HueMode;
        const currentMode = await managedDevice.getMode();
        const [h, s, v] = await managedDevice.getBetterHSV();
        const currentXY = await managedDevice.getXY();
        const currentWarmth = await managedDevice.getWhiteBrightnessPercentage();
        let status;
        if (mode === HueMode.CT) {
            status = await managedDevice.setWhiteBrightnessPercentage(currentWarmth);
        } else if (mode === HueMode.HS) {
            status = await managedDevice.setBetterHSV(h, s, v);
        } else {
            status = await managedDevice.setXY(currentXY);
        }
        const completedSuccessfully = Object.keys(status).includes('success');
        return {completed: completedSuccessfully};
    } else if (managedDevice instanceof TuyaManager) {
        mode = mode as TuyaMode;
        await managedDevice.setMode(mode);
        const brightness = await managedDevice.getBrightnessPercentage();
        console.debug(`brightness: ${brightness}`);
        return {completed: true, brightness};
    }
    return {completed: false};
}

async function getScene(managedDevice: Manager): Promise<SceneParts | null> {
    if (managedDevice instanceof TuyaManager) {
        const sceneparts = await managedDevice.getCurrentScene();
        console.debug('current scene: ');
        console.dir(sceneparts);
        return sceneparts;
    }
    return null;
}

async function putScene(managedDevice: Manager, scene: SceneParts): Promise<CompletedStatus | null> {
    if (managedDevice instanceof TuyaManager) {
        await managedDevice.setCurrentScene(scene);
        return {completed: true};
    } else {
        return null;
    }
}

export {getState, getColor, putColor, getBrightness, putBrightness, getToggle, putToggle, getMode, putMode, getScene, putScene};