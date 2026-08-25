import { Layer, LayerHistory, Size } from '../type/types';
import { loadImageOnce } from '../hooks/useCachedImage';
import saveAs from 'file-saver';
import { v4 as uuidv4 } from 'uuid';

export interface LayerProjectData {
  version: string;
  createdAt: number;
  viewportSize: Size;
  layers: Layer[];
  layersHistory?: LayerHistory[];
}

/**
 * 将 HTMLImageElement 转为 Base64 Data URL，确保导出的 JSON 自包含可跨机器持久化
 */
export const imageToBase64 = (image: HTMLImageElement): string => {
  if (!image) return '';
  if (image.src && image.src.startsWith('data:image/')) {
    return image.src;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, image.naturalWidth || image.width);
  canvas.height = Math.max(1, image.naturalHeight || image.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return image.src || '';
  ctx.drawImage(image, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * 导出整套编辑器工程数据为 JSON 文件
 */
export const exportProjectToJson = async ({
  layers,
  layersHistory = [],
  viewportSize,
  imagesCache = {},
  fileName,
}: {
  layers: Layer[];
  layersHistory?: LayerHistory[];
  viewportSize: Size;
  imagesCache?: { [id: string]: HTMLImageElement };
  fileName?: string;
}) => {
  // 1. 序列化图层并确保图片为自包含 Base64 格式
  const serializedLayers: Layer[] = layers.map((layer) => {
    const cachedImage = imagesCache[layer.fileId];
    let fileUrl = layer.fileUrl;
    if (cachedImage && (!fileUrl || fileUrl.startsWith('blob:'))) {
      try {
        fileUrl = imageToBase64(cachedImage);
      } catch (err) {
        console.warn('图层图片转 Base64 失败，保持原 URL:', err);
      }
    }

    return {
      id: layer.id,
      name: layer.name,
      fileId: layer.fileId,
      fileUrl,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      scaleX: layer.scaleX ?? 1,
      scaleY: layer.scaleY ?? 1,
      rotation: layer.rotation ?? 0,
      visible: layer.visible ?? true,
      cropX: layer.cropX ?? 0,
      cropY: layer.cropY ?? 0,
      cropWidth: layer.cropWidth,
      cropHeight: layer.cropHeight,
      imgWidth: layer.imgWidth,
      imgHeight: layer.imgHeight,
    };
  });

  // 2. 序列化历史记录
  const serializedHistory: LayerHistory[] = layersHistory.map((item) => ({
    layerId: item.layerId,
    layerName: item.layerName,
    imgList: (item.imgList || []).map((img) => {
      const cachedImage = imagesCache[img.fileId];
      let fileUrl = img.fileUrl;
      if (cachedImage && (!fileUrl || fileUrl.startsWith('blob:'))) {
        try {
          fileUrl = imageToBase64(cachedImage);
        } catch (err) {
          console.warn('历史图片转 Base64 失败:', err);
        }
      }
      return {
        fileId: img.fileId,
        fileUrl,
      };
    }),
  }));

  const projectData: LayerProjectData = {
    version: '1.0',
    createdAt: Date.now(),
    viewportSize,
    layers: serializedLayers,
    layersHistory: serializedHistory,
  };

  const jsonString = JSON.stringify(projectData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const actualFileName = fileName || `layer-editor-project-${Date.now()}.json`;
  saveAs(blob, actualFileName);
};

/**
 * 解析并导入 JSON 工程文件，预加载所有图层图片
 */
export const importProjectFromJson = async (
  file: File,
): Promise<{
  viewportSize: Size;
  layers: Layer[];
  layersHistory: LayerHistory[];
}> => {
  const text = await file.text();
  let projectData: LayerProjectData;

  try {
    projectData = JSON.parse(text);
  } catch {
    throw new Error('无效的 JSON 文件格式');
  }

  if (!projectData || typeof projectData !== 'object') {
    throw new Error('JSON 数据结构不正确');
  }

  const rawLayers = projectData.layers || [];
  if (!Array.isArray(rawLayers)) {
    throw new Error('缺少有效的图层列表 (layers)');
  }

  // 预加载所有图层图片
  const loadedLayers = await Promise.all(
    rawLayers.map(async (rawLayer, index) => {
      const fileId = rawLayer.fileId || uuidv4();
      const fileUrl = rawLayer.fileUrl;
      if (!fileUrl) {
        throw new Error(`图层「${rawLayer.name || index + 1}」缺少图片数据 (fileUrl)`);
      }

      const { image } = await loadImageOnce({ fileId, fileUrl });
      const width = rawLayer.width || image.width;
      const height = rawLayer.height || image.height;

      return {
        id: rawLayer.id || uuidv4(),
        name: rawLayer.name || `图层 ${index + 1}`,
        fileId,
        fileUrl,
        x: rawLayer.x ?? 0,
        y: rawLayer.y ?? 0,
        width,
        height,
        scaleX: rawLayer.scaleX ?? 1,
        scaleY: rawLayer.scaleY ?? 1,
        rotation: rawLayer.rotation ?? 0,
        visible: rawLayer.visible ?? true,
        cropX: rawLayer.cropX ?? 0,
        cropY: rawLayer.cropY ?? 0,
        cropWidth: rawLayer.cropWidth ?? image.width,
        cropHeight: rawLayer.cropHeight ?? image.height,
        imgWidth: rawLayer.imgWidth ?? width,
        imgHeight: rawLayer.imgHeight ?? height,
      } as Layer;
    }),
  );

  // 预加载历史记录图片
  const rawHistory = projectData.layersHistory || [];
  if (Array.isArray(rawHistory)) {
    await Promise.all(
      rawHistory.flatMap((hist) =>
        (hist.imgList || []).map(async (item) => {
          if (item.fileId && item.fileUrl) {
            try {
              await loadImageOnce({ fileId: item.fileId, fileUrl: item.fileUrl });
            } catch (err) {
              console.warn('历史图片预加载跳过:', err);
            }
          }
        }),
      ),
    );
  }

  const viewportSize = projectData.viewportSize || { width: 1024, height: 1024 };

  return {
    viewportSize,
    layers: loadedLayers,
    layersHistory: rawHistory,
  };
};
