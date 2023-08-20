const enum TuyaMode {
  WHITE = 'white',
  COLOR = 'colour',
  SCENE = 'scene',
  MUSIC = 'music',
}

const enum HueMode {
  HS = 'hs',
  XY = 'xy',
  CT = 'ct'
}

type Mode = TuyaMode | HueMode;

enum ChangeMode {
  STATIC,
  JUMP,
  GRADUAL,
}

type getOptions = {
  schema?: boolean;
  dps: number;
  cid?: string;
}

type refreshOptions = {}

type setOptions = {
  dps: number;
  set: any;
  cid?: string;
  shouldWaitForResponse?: boolean;
} | {
  multiple: boolean;
  data: Object;
  cid?: string;
  shouldWaitForResponse?: boolean;
}

type findOptions = {
  timeout: number;
  all: boolean;
}

type TuyaDeviceResponse = {
  id: string; // same as gwId. Use as key to identify device to server
  ip: string;
  gwId: string;
  active: number;
  ability: number;
  encrypt: boolean;
  productKey: string;
  version: string;
}

enum AlertState {
  SELECT = 'select',
  LSELECT = 'lselect',
}

enum EffectState {
  COLORLOOP = 'colorloop',
  NONE = 'none'
}

type HueDeviceState = {
  on: boolean; // True if the light should be on
  bri: number; // Brightness, in range 0 - 254. 0 is not off
  hue: number; // Hue, in range 0 - 65535
  sat: number; // Saturation, in range 0 - 254
  effect: EffectState;
  xy: [number, number]; // Color as an array of xy-coordinates
  ct: number; // White color temperature, in range 153 (cold) - 500 (warm)
  alert: AlertState; // 'select' flashes light once, 'lselect' flashes repeatedly for 10 seconds
  colormode: HueMode;
  mode: string;
  reachable: boolean;
}

type HueDeviceResponse = {
  id: string; // Custom addition so we don't have to send back a nested object or a map
  state: HueDeviceState;
  swupdate: Object;
  type: string;
  name: string;
  modelid: string;
  manufacturername: string;
  productname: string;
  capabilities: Object;
  config: Object;
  uniqueid: string;
  swversion: string;
  swconfigid: string;
  productid: string;
}

type DeviceResponse = TuyaDeviceResponse | HueDeviceResponse;

export type { getOptions, refreshOptions, setOptions, findOptions, Mode, DeviceResponse, TuyaDeviceResponse, HueDeviceResponse };
export { TuyaMode, HueMode };