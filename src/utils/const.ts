export const userAgent = ((typeof navigator !== 'undefined' && navigator) || ({} as any)).userAgent || '';
export const isMacintosh =
  userAgent.indexOf('Macintosh') >= 0 || userAgent.indexOf('iPad') >= 0 || userAgent.indexOf('iPhone') >= 0;

export const PAN_STEP = 0.3;
export const ZOOM_SCALE_STEP = 1.02;
export const ZOOM_SCALE_MIN = 0.25;
export const ZOOM_SCALE_MAX = 2;
export const ZOOM_SCALE_OPTIONS = [
  { label: '全览', value: 'auto' },
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '100%', value: 1 },
  { label: '200%', value: 2 },
];

export const EXPAND_RATIO_OPTIONS = [
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '21:9', value: 21 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '2:3', value: 2 / 3 },
  { label: '9:16', value: 9 / 16 },
];

export const EXPAND_TIMES_OPTIONS = [
  { label: '1.5', value: 1.5 },
  { label: '2', value: 2 },
];

export const IMAGE_RATIO_OPTIONS = [
  { label: '1:1', width: 1024, height: 1024 },
  { label: '4:3', width: 1152, height: 864 },
  { label: '3:2', width: 1248, height: 832 },
  { label: '16:9', width: 1280, height: 720 },
  { label: '21:9', width: 1280, height: 533 },
  { label: '3:4', width: 864, height: 1152 },
  { label: '2:3', width: 832, height: 1248 },
  { label: '9:16', width: 720, height: 1280 },
];

export const MAX_VIEWPORT_SIZE = 2048;
export const MIN_VIEWPORT_SIZE = 1;
export const MAX_IMAGE_SIZE = 4096;
export const MIN_IMAGE_SIZE = 1;

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
