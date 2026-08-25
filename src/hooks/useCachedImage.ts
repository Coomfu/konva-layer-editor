import { Layer, LayerHistory, LayerImage } from '../type/types';
import { useCallback, useEffect, useState } from 'react';

const imagesCache = new Map<string, HTMLImageElement>();
const imagesQueue = new Map<string, Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }>>();

export const clearImageCache = () => {
  imagesCache.clear();
  imagesQueue.clear();
};

export function loadImageOnce({
  fileId,
  fileUrl,
}: LayerImage): Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }> {
  if (imagesCache.has(fileId)) {
    return Promise.resolve({ fileId, fileUrl, image: imagesCache.get(fileId)! });
  }
  if (imagesQueue.has(fileId)) {
    return imagesQueue.get(fileId)!;
  }

  const promise = new Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = fileUrl;
    img.dataset.key = fileId;
    img.onload = () => {
      imagesCache.set(fileId, img);
      imagesQueue.delete(fileId);

      Object.defineProperty(img, 'width', {
        get() {
          return img.naturalWidth;
        },
      });
      Object.defineProperty(img, 'height', {
        get() {
          return img.naturalHeight;
        },
      });

      resolve({ fileId, fileUrl, image: img });
    };
    img.onerror = () => {
      console.warn(`图片加载失败: ${fileUrl}`);
      // 返回默认图片或空图片
      const fallbackImg = new Image();
      resolve({ fileId, fileUrl, image: fallbackImg });
    };
  });

  // const promise = new Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }>((resolve, reject) => {
  //   // 🔧 使用 fetch 下载图片并创建 blob URL
  //   fetch(fileUrl)
  //     .then((response) => {
  //       if (!response.ok) {
  //         throw new Error(`HTTP error! status: ${response.status}`);
  //       }
  //       return response.blob();
  //     })
  //     .then((blob) => {
  //       const blobUrl = URL.createObjectURL(blob);
  //       const img = new Image();

  //       img.src = blobUrl;
  //       img.dataset.key = fileId;
  //       img.dataset.blobUrl = blobUrl; // 保存 blob URL 用于后续清理

  //       img.onload = () => {
  //         imagesCache.set(fileId, img);
  //         imagesQueue.delete(fileId);
  //         resolve({ fileId, fileUrl, image: img }); // 返回 blob URL
  //       };

  //       img.onerror = () => {
  //         URL.revokeObjectURL(blobUrl); // 清理 blob URL
  //         resolve({ fileId, fileUrl, image: new Image() });
  //       };
  //     })
  //     .catch((error) => {
  //       console.error('图片下载失败:', error);
  //       resolve({ fileId, fileUrl, image: new Image() });
  //     });
  // });
  imagesQueue.set(fileId, promise);
  return promise;
}

function loadImages(
  images: LayerImage[],
  callback?: (result: { fileId: string; fileUrl: string; image: HTMLImageElement }) => void,
): Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }[]> {
  if (!images.length) return Promise.resolve([]);
  return Promise.all(
    images.map((image) =>
      loadImageOnce(image).then((result) => {
        callback?.(result);
        return result;
      }),
    ),
  );
}

const useCachedImages = ({
  layersHistory,
  layers,
  setLoading,
  setSelectedIds,
}: {
  layersHistory: LayerHistory[];
  layers: Layer[];
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds?: React.Dispatch<React.SetStateAction<string[]>>;
}): {
  images: { [id: string]: HTMLImageElement };
  loadingStatus: { [id: string]: boolean | 'error' };
  loadImage: (params: {
    fileId: string;
    fileUrl: string;
  }) => Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }>;
} => {
  const [images, setImages] = useState<{ [id: string]: HTMLImageElement }>({});
  // 记录图片加载状态
  const [loadingStatus, setLoadingStatus] = useState<{ [id: string]: boolean | 'error' }>({});

  // loadImageOnce是为了在图片池生成image实例，loadImage则是带图片加载状态的版本
  // 一般来说，修改图层或者新建图层都是要有image实例，所以一般使用loadImageOnce即可
  // 如果你需要在历史插入多张备选图片时，使用loadImage更佳
  const loadImage = useCallback(
    ({ fileId, fileUrl }: LayerImage): Promise<{ fileId: string; fileUrl: string; image: HTMLImageElement }> => {
      setLoadingStatus((prev) => ({ ...prev, [fileId]: true }));
      return new Promise((resolve, reject) => {
        loadImageOnce({ fileId, fileUrl })
          .then((result) => {
            setImages((prev) => ({ ...prev, [result.fileId]: result.image }));
            setLoadingStatus((prev) => ({ ...prev, [result.fileId]: false }));
            resolve(result);
          })
          .catch((error) => {
            setLoadingStatus((prev) => ({ ...prev, [fileId]: 'error' }));
            reject(error);
          });
      });
    },
    [],
  );

  useEffect(() => {
    // 1. 同步已在 Map 缓存中的图片到 React state（解决外部导入或预加载后未同步至 state 的问题）
    const cachedImagesToSync: { [id: string]: HTMLImageElement } = {};
    let hasCachedToSync = false;

    layers.forEach((layer) => {
      if (layer.fileId && imagesCache.has(layer.fileId) && !images[layer.fileId]) {
        cachedImagesToSync[layer.fileId] = imagesCache.get(layer.fileId)!;
        hasCachedToSync = true;
      }
    });

    layersHistory.forEach((item) => {
      item.imgList?.forEach((img) => {
        if (img.fileId && imagesCache.has(img.fileId) && !images[img.fileId]) {
          cachedImagesToSync[img.fileId] = imagesCache.get(img.fileId)!;
          hasCachedToSync = true;
        }
      });
    });

    if (hasCachedToSync) {
      setImages((prev) => ({ ...prev, ...cachedImagesToSync }));
    }

    // 2. 加载尚未进入缓存的图片
    const unCachedLayers = layers.filter((layer) => !imagesCache.has(layer.fileId) && !imagesQueue.has(layer.fileId));
    const unCachedHistory = layersHistory.flatMap((layer) =>
      (layer.imgList ?? []).filter((img) => !imagesCache.has(img.fileId) && !imagesQueue.has(img.fileId)),
    );

    if (unCachedLayers.length || unCachedHistory.length) {
      setLoading?.(true);

      // 初始化所有未加载 fileId 的加载状态为 true
      setLoadingStatus((prev: { [id: string]: boolean | 'error' }) => {
        const next = { ...prev };
        unCachedLayers.forEach((layer) => {
          next[layer.fileId] = true;
        });
        unCachedHistory.forEach((img) => {
          next[img.fileId] = true;
        });
        return next;
      });

      // 实时更新图片加载完成状态
      const updateImageAndStatus = (result: { fileId: string; fileUrl: string; image: HTMLImageElement }) => {
        setImages((prev) => ({ ...prev, [result.fileId]: result.image }));
        setLoadingStatus((prev) => ({ ...prev, [result.fileId]: false }));
      };

      // 优先处理 layers
      loadImages(unCachedLayers, updateImageAndStatus).then(() => {
        if (layers.length && setSelectedIds) {
          setSelectedIds((prev) => (prev.length ? prev : [layers[layers.length - 1].id]));
        }
        setLoading?.(false);
        loadImages(unCachedHistory, updateImageAndStatus);
      });
    }
  }, [layers, layersHistory, setSelectedIds, setLoading, images]);

  return { images, loadingStatus, loadImage };
};

export default useCachedImages;
