// canvas相关工具函数

import { Layer } from '../type/types';
import { getRotatedBounds } from './utils';

export const getLayerData = (layer: Layer, exportFormat: 'JPG' | 'PNG' = 'PNG'): Promise<Blob> => {
  return new Promise<Blob>((resolve, reject) => {
    try {
      const canvas = getLayerCanvas(layer);
      if (!canvas) return reject(new Error('无法获取 CanvasRenderingContext2D'));
      canvas.toBlob(
        (b) => {
          if (!b) return reject(new Error('导出 blob 失败'));
          resolve(b);
        },
        exportFormat === 'JPG' ? 'image/jpeg' : 'image/png',
        1,
      );
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 获取layer的图片文件
 */
export const getLayerFile = async (layer: Layer, exportFormat: 'JPG' | 'PNG' = 'PNG') => {
  const blob = (await getLayerData(layer, exportFormat)) as Blob;
  const ext = exportFormat === 'JPG' ? 'jpg' : 'png';
  return new File([blob], `image_${layer.id}.${ext}`, { type: exportFormat === 'JPG' ? 'image/jpeg' : 'image/png' });
};

/** 获得多个layer的合并版本 */
export const getLayersFile = async (layers: Layer[], exportFormat: 'JPG' | 'PNG' = 'PNG') => {
  return new Promise<File>((resolve, reject) => {
    try {
      const canvases = layers.map((layer) => getLayerCanvas(layer)).filter((canvas) => canvas !== null);
      // 计算总高度和最大宽度
      const totalHeight = canvases.reduce((sum, canvas) => sum + canvas.height, 0);
      const maxWidth = Math.max(...canvases.map((canvas) => canvas.width));

      // 创建合并后的canvas
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = maxWidth;
      mergedCanvas.height = totalHeight;
      const ctx = mergedCanvas.getContext('2d');
      if (!ctx) return reject(new Error('无法获取 CanvasRenderingContext2D'));

      // 从上到下依次绘制
      let currentY = 0;
      canvases.forEach((canvas) => {
        ctx.drawImage(canvas, 0, currentY);
        currentY += canvas.height;
      });

      getCanvasFile(mergedCanvas, exportFormat).then(resolve);
    } catch (err) {
      reject(err);
    }
  });
};

export const getLayersFileWithOverlay = async (layers: Layer[], exportFormat: 'JPG' | 'PNG' = 'PNG') => {
  return new Promise<File>((resolve, reject) => {
    try {
      // 创建viewport大小的canvas
      const canvas = document.createElement('canvas');

      // 计算所有图层旋转后的边界
      const bounds = layers.map((layer) => getRotatedBounds(layer));
      const minX = Math.min(...bounds.map((bound) => bound.minX));
      const maxX = Math.max(...bounds.map((bound) => bound.maxX));
      const minY = Math.min(...bounds.map((bound) => bound.minY));
      const maxY = Math.max(...bounds.map((bound) => bound.maxY));

      canvas.width = maxX - minX;
      canvas.height = maxY - minY;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('无法获取 CanvasRenderingContext2D'));

      // 按顺序绘制每个layer
      const canvases = layers.map((layer) => getLayerCanvas(layer)).filter((canvas) => canvas !== null);
      canvases.forEach((layerCanvas, index) => {
        const layer = layers[index];
        const { width, height, rotation = 0 } = layer;

        ctx.save(); // 保存当前状态

        // 移动到图层中心点（相对于canvas坐标系）
        const centerX = (bounds[index].minX + bounds[index].maxX) / 2 - minX;
        const centerY = (bounds[index].minY + bounds[index].maxY) / 2 - minY;

        ctx.translate(centerX, centerY);

        // 应用旋转
        if (rotation !== 0) {
          ctx.rotate((Math.PI / 180) * rotation);
        }

        // 绘制图层（相对于中心点）
        ctx.drawImage(layerCanvas, -width / 2, -height / 2, width, height);

        ctx.restore(); // 恢复状态
      });

      getCanvasFile(canvas, exportFormat).then(resolve);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * 获取layer的canvas，方便合成
 * @param layer
 * @returns
 */
export const getLayerCanvas = (layer: Layer): HTMLCanvasElement | null => {
  try {
    const { cropX = 0, cropY = 0, cropWidth, cropHeight, width, height, image } = layer;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 原图绘制区域 → 目标 canvas 画布大小
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight, // 原图裁剪区域
      0,
      0,
      width,
      height, // 绘制到目标 canvas 上并缩放
    );

    return canvas;
  } catch (err) {
    console.error('err', err);
    return null;
  }
};

export const getCanvasFile = (canvas: HTMLCanvasElement, exportFormat: 'JPG' | 'PNG' = 'PNG') => {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('导出 blob 失败'));
        const file = new File([blob], 'image.png', { type: 'image/png' });
        resolve(file);
      },
      exportFormat === 'JPG' ? 'image/jpeg' : 'image/png',
    );
  });
};

export const cutByMask = (image: HTMLCanvasElement, mask: HTMLCanvasElement) => {
  const width = image.width;
  const height = image.height;

  // 创建一个新 canvas，用于输出结果
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
  if (!resultCtx) throw new Error('Cannot get canvas context');

  resultCtx.globalCompositeOperation = 'source-over';
  resultCtx.drawImage(image, 0, 0);

  resultCtx.globalCompositeOperation = 'destination-in';
  resultCtx.drawImage(mask, 0, 0);

  return resultCanvas;
};

/**
 * 反选canvas的透明区域
 * @param canvas
 * @returns
 */
export const invertMask = (canvas: HTMLCanvasElement) => {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 保存当前内容
    const currentCanvas = document.createElement('canvas');
    currentCanvas.width = canvas.width;
    currentCanvas.height = canvas.height;
    const currentCtx = currentCanvas.getContext('2d');
    if (!currentCtx) return;

    currentCtx.drawImage(canvas, 0, 0);

    // 保存当前的globalCompositeOperation
    const globalCompositeOperation = ctx.globalCompositeOperation;

    ctx.globalCompositeOperation = 'source-over'; // 确保是正常绘制模式
    ctx.fillStyle = '#61a8f8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-out';
    // destination-out模式绘制之前保存的内容，实现反转
    ctx.drawImage(currentCanvas, 0, 0);

    ctx.globalCompositeOperation = globalCompositeOperation;
  } catch (err) {
    console.log(err);
  }
};

export const isCanvasBlank = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return true;
  const width = canvas.width;
  const height = canvas.height;

  // 取全部像素，返回 Uint8ClampedArray，格式为 [r,g,b,a, r,g,b,a, …]
  const imgData = ctx.getImageData(0, 0, width, height).data;

  // 遍历每个像素的 α 值；只要发现非零就可判定已绘制内容
  for (let i = 3; i < imgData.length; i += 4) {
    if (imgData[i] !== 0) {
      return false; // 有不透明或半透明像素
    }
  }
  return true; // 所有像素均透明
};
