enum Mode {
  WHITE = 'white',
  COLOR = 'colour',
  SCENE = 'scene',
  MUSIC = 'music',
}

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
  multiple?: boolean;
  data?: Object;
  shouldWaitForResponse?: boolean;
}

type findOptions = {
  timeout: number;
  all: boolean;
}


type State = {
  scene: number;
  switchingInterval: number;
  changeTime: number;
  changeMode: ChangeMode;
  whiteLightBrightness: number;
}

export type{ getOptions, refreshOptions, setOptions, findOptions, Mode, State };