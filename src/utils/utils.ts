import type { Node } from 'konva/lib/Node';
import type { Stage } from 'konva/lib/Stage';
import type { Layer, Position, Rect, Size } from '../type/types';
import { ExpandState } from '../hooks/useExpand';
import { v4 as uuidv4 } from 'uuid';
import { MAX_IMAGE_SIZE } from './const';

export function isNumber(value: any): value is number {
  return typeof value === 'number';
}

export const getCanvasPointer = (stage: Stage): Position => {
  const pointer = stage.getPointerPosition();
  const scale = stage.scaleX();
  const pos = stage.position();
  return {
    x: (pointer!.x - pos.x) / scale,
    y: (pointer!.y - pos.y) / scale,
  };
};

export const getCanvasAbsolutePosition = (node: Node): Position => {
  const absolutePosition = node.getAbsolutePosition();
  const stage = node.getStage();
  const currentScale = stage?.scaleX() ?? 1;
  const stagePos = stage?.position() || { x: 0, y: 0 };

  return {
    x: (absolutePosition.x - stagePos.x) / currentScale,
    y: (absolutePosition.y - stagePos.y) / currentScale,
  };
};

export const getCanvasRect = (node: Node): Rect => {
  const stage = node.getStage();
  const rect = node.getClientRect();
  const scale = stage?.scaleX() ?? 1;
  const pos = stage?.position() || { x: 0, y: 0 };
  return {
    x: (rect.x - pos.x) / scale,
    y: (rect.y - pos.y) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
};

/**
 * 判断一个点击点是否在多个 Konva 节点的 selection 框内（基于 getClientRect）
 * @param nodes 被选中的 Konva 节点列表
 * @param point 点击点，stage 坐标系下的 { x, y }
 * @returns 是否在 selection 框内部
 */
export const isPointInSelectionBox = (nodes: Node[], point: Position): boolean => {
  if (!nodes || nodes.length === 0) return false;

  // 计算所有节点的全局 bounding box（包含旋转缩放）
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  for (const node of nodes) {
    const box = getCanvasRect(node);
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  return point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY;
};

export const isRectOverlap = (rect1: Rect, rect2: Rect): boolean => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
};

/**
 * 缩放时获取position点用，point不传默认中心点
 * @param stage
 * @param newScale
 * @param point
 */
export const getNewScalePoint = (stage: any, newScale: number, _point?: Position): Position => {
  const stagePos = stage.position();
  const scale = stage.scaleX();
  const point = _point || {
    x: (stage.width() || 0) / 2,
    y: (stage.height() || 0) / 2,
  };

  const pointTo = {
    x: (point.x - stagePos.x) / scale,
    y: (point.y - stagePos.y) / scale,
  };

  const newPoint = {
    x: point.x - pointTo.x * newScale,
    y: point.y - pointTo.y * newScale,
  };
  return newPoint;
};

/**
 * 根据layer的尺寸和扩展比例计算expandRect
 * @param layerWidth layer的宽度
 * @param layerHeight layer的高度
 * @param expandRatio 扩展比例，可以是'original'或数字比例
 * @returns 计算后的expandRect {x, y, width, height}
 */
export const getExpandRect = (
  layer?: Layer,
  expandState?: Partial<ExpandState>,
  zoomScale: number = 1,
): Rect & { rotation: number } => {
  if (!layer || !expandState) return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };

  // 计算目标比例
  const targetRatio = expandState.ratio;
  const currentRatio = layer.width / layer.height;

  let newWidth: number;
  let newHeight: number;

  // 如果是原始比例，直接返回原始尺寸
  if (expandState.type === 'original') {
    if (!expandState.times) return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    newHeight = layer.height * expandState.times;
    newWidth = layer.width * expandState.times;
  } else {
    if (!targetRatio) return { x: 0, y: 0, width: 0, height: 0, rotation: 0 };
    if (targetRatio > currentRatio) {
      // 目标比例更宽，以高度为基准
      newHeight = layer.height;
      newWidth = newHeight * targetRatio;
    } else {
      // 目标比例更窄，以宽度为基准
      newWidth = layer.width;
      newHeight = newWidth / targetRatio;
    }
  }

  const sigma = (Math.PI / 180) * (layer.rotation || 0);
  const offsetWidth = (newWidth - layer.width) / 2;
  const offsetHeight = (newHeight - layer.height) / 2;

  return {
    x: layer.x - Math.cos(sigma) * (offsetWidth + 1 / zoomScale) + Math.sin(sigma) * (offsetHeight + 1 / zoomScale),
    y: layer.y - Math.sin(sigma) * (offsetWidth + 1 / zoomScale) - Math.cos(sigma) * (offsetHeight + 1 / zoomScale),
    width: newWidth + 2 / zoomScale,
    height: newHeight + 2 / zoomScale,
    rotation: layer.rotation,
  };
};

export function worldToRectLocal(x: number, y: number, a: number, b: number, rotation: number) {
  const sigma = (Math.PI / 180) * rotation;
  const dx = x - a;
  const dy = y - b;

  const u = Math.cos(sigma) * dx + Math.sin(sigma) * dy;
  const v = -Math.sin(sigma) * dx + Math.cos(sigma) * dy;

  return { x: u, y: v };
}

/**
 * 计算旋转后的边界盒子
 * @param layer 图层对象
 * @returns 包含旋转后图层的最小边界盒子
 */
export const getRotatedBounds = (layer: Layer) => {
  const { x, y, width, height, rotation = 0 } = layer;

  // 如果没有旋转，直接返回原始边界
  if (rotation === 0) {
    return { minX: x, maxX: x + width, minY: y, maxY: y + height };
  }

  // 计算旋转弧度
  const rad = (Math.PI / 180) * rotation;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // 四个角坐标
  const corners = [
    { x: x, y: y }, // 左上
    { x: x + width * cos, y: y + width * sin }, // 右上
    { x: x - height * sin, y: y + height * cos }, // 左下
    { x: x + width * cos - height * sin, y: y + width * sin + height * cos }, // 右下
  ];

  // 找到包围盒
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

export const getDefaultLayer = ({
  id,
  viewportSize,
  viewportPos = { x: 0, y: 0 },
  name,
  fileUrl,
  image,
}: {
  id?: string;
  viewportSize: Size;
  viewportPos?: Position;
  name: string;
  fileUrl?: string;
  image: HTMLImageElement;
}): Layer => {
  // 计算按比例缩放后的宽高
  let width = image.width;
  let height = image.height;

  // 如果图片尺寸超过最大限制，按比例缩放
  if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
    const widthScale = MAX_IMAGE_SIZE / width;
    const heightScale = MAX_IMAGE_SIZE / height;
    const scale = Math.min(widthScale, heightScale); // 取较小的缩放比例保持宽高比

    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  // 计算居中位置
  const x = viewportPos.x + (viewportSize.width - width) / 2;
  const y = viewportPos.y + (viewportSize.height - height) / 2;

  return {
    id: id || uuidv4(),
    name,
    fileId: image.dataset.key || '',
    fileUrl: fileUrl || image.src,
    x,
    y,
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    cropX: 0,
    cropY: 0,
    cropWidth: image.width,
    cropHeight: image.height,
    imgWidth: width,
    imgHeight: height,
  };
};

export const getFitLayer = ({
  id,
  viewportSize,
  viewportPos = { x: 0, y: 0 },
  name,
  fileUrl,
  image,
}: {
  id?: string;
  viewportSize: Size;
  viewportPos?: Position;
  name: string;
  fileUrl?: string;
  image: HTMLImageElement;
}): Layer => {
  // 计算合适的宽高，保持比例且不超过viewport
  const ratio = image.width / image.height;
  const viewportRatio = viewportSize.width / viewportSize.height;
  let width = image.width;
  let height = image.height;

  if (ratio > viewportRatio) {
    width = viewportSize.width;
    height = width / ratio;
  } else {
    height = viewportSize.height;
    width = height * ratio;
  }

  // 计算居中位置
  const x = viewportPos.x + (viewportSize.width - width) / 2;
  const y = viewportPos.y + (viewportSize.height - height) / 2;

  return {
    id: id || uuidv4(),
    name,
    fileId: image.dataset.key || '',
    fileUrl: fileUrl || image.src,
    x,
    y,
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    cropX: 0,
    cropY: 0,
    cropWidth: image.width,
    cropHeight: image.height,
    imgWidth: width,
    imgHeight: height,
  };
};

export const getPureLayer = (layer: Layer): Layer => {
  const { image: _image, ...node } = layer;
  return node;
};
