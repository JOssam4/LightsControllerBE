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


export type { getOptions, refreshOptions, setOptions, findOptions, Mode };
export { TuyaMode, HueMode };