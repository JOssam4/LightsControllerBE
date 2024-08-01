enum ChangeMode {
    STATIC,
    JUMP,
    GRADUAL,
}

interface Scene {
    unitSwitchIntervalTime: number;
    unitChangeTime: number;
    unitChangeMode: ChangeMode;
    h: number;
    s: number;
    v: number;
    whiteLightBrightness: number;
    colorTemperature: number;
}

interface SceneParts {
    sceneNum: number;
    parts: Scene[];
}

function parseScene(scene: string): Scene {
    const unitSwitchIntervalTime = parseInt(scene.substring(0, 2), 16);
    const unitChangeTime = parseInt(scene.substring(2, 4), 16);
    const unitChangeMode = parseInt(scene.substring(4, 6), 16);
    const h = parseInt(scene.substring(6, 10), 16);
    const s = Math.floor(parseInt(scene.substring(10, 14), 16) / 10);
    const v = Math.floor(parseInt(scene.substring(14, 18), 16) / 10);
    const whiteLightBrightness = parseInt(scene.substring(18, 22), 16);
    const colorTemperature = parseInt(scene.substring(22, 26), 16);
    return {
        unitSwitchIntervalTime,
        unitChangeTime,
        unitChangeMode,
        h,
        s,
        v,
        whiteLightBrightness,
        colorTemperature,
    };
}


function parseFullSceneIntoParts(fullScene: string): SceneParts {
    const sceneNum = parseInt(fullScene.substring(0, 2), 16);
    const chunks = [];
    let chunkLow = 2;
    let chunkHigh = chunkLow + 26;
    while (chunkLow < fullScene.length - 1) {
        const scene = fullScene.substring(chunkLow, chunkHigh)
        chunks.push(parseScene(scene));
        chunkLow = chunkHigh;
        chunkHigh += 26;
    }
    return {
        sceneNum,
        parts: chunks,
    };
}

function compressScene(scene: Scene): string {
    let ret = '';
    scene.s = Math.min(scene.s * 10, 1000);
    scene.v *= 10;
    ret += scene.unitSwitchIntervalTime.toString(16).padStart(2, '0');
    ret += scene.unitChangeTime.toString(16).padStart(2, '0');
    ret += scene.unitChangeMode.toString(16).padStart(2, '0');
    ret += scene.h.toString(16).padStart(4, '0');
    ret += scene.s.toString(16).padStart(4, '0');
    ret += scene.v.toString(16).padStart(4, '0');
    ret += scene.whiteLightBrightness.toString().padStart(4, '0');
    ret += scene.colorTemperature.toString().padStart(4, '0');
    return ret;
}

function compressSceneParts(sceneparts: SceneParts): string {
    let ret = '00'; // scene id = 0, but I don't think it matters
    for (const part of sceneparts.parts) {
        ret += compressScene(part);
    }
    return ret;

}

// accepts h in [0, 360], s in [0, 100] and v in [0, 100]
function getBetterCompressedScene(unitSwitchIntervalTime: number, unitChangeTime: number, unitChangeMode: ChangeMode, h: number, s: number, v: number, whiteLightBrightness: number=0, colorTemperature: number=0): string {
    s *= 10;
    v *= 10;
    const usit = unitSwitchIntervalTime.toString(16).padStart(2, '0')
    const uct = unitChangeTime.toString(16).padStart(2, '0');
    const ucm = unitChangeMode.toString(16).padStart(2, '0');
    const hexH = Math.round(h).toString(16).padStart(4, '0');
    const hexS = Math.round(s).toString(16).padStart(4, '0');
    const hexV = Math.round(v).toString(16).padStart(4, '0');
    const wlb = whiteLightBrightness.toString().padStart(4, '0');
    const ct = colorTemperature.toString().padStart(4, '0');
    return usit + uct + ucm + hexH + hexS + hexV + wlb + ct;
}


export {ChangeMode, Scene, SceneParts, parseScene, parseFullSceneIntoParts, compressScene, compressSceneParts, getBetterCompressedScene};