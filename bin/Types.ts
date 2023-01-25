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


export type { getOptions, refreshOptions, setOptions, findOptions };
export { Mode };