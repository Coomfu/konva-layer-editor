import { useCallback, useEffect, useState } from 'react';
import type { EditorContextType } from '../context';
import type { Cursor, Layer, LayerHistory, Position, Size } from '../type/types';
import { useHistoryManager } from './useHistoryManager';
import useCachedImages from './useCachedImage';
import useDrawingCanvas from './useDrawingCanvas';
import useElementRef from './useElementRef';
import useLayerManger from './useLayerManger';
import useZoom from './useZoom';
import useExpand from './useExpand';
import useKeyManager from './useKeyManager';
import { message } from 'antd';
import { getDefaultLayer, getPureLayer } from '../utils/utils';
import { v4 as uuidv4 } from 'uuid';
import { isMacintosh } from '../utils/const';

const useEditor = (): Required<EditorContextType> => {
  // 基础状态管理
  const [cursor, setCursor] = useState<Cursor>('default');
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // 剪贴板状态
  const [clipboard, setClipboard] = useState<Layer[]>([]);

  // 尺寸相关状态
  const [viewportSize, setViewportSize] = useState<Size>({
    width: 1024,
    height: 1024,
  });
  const [containerSize, setContainerSize] = useState<Size>({
    width: 1024,
    height: 1024,
  });
  const viewportPos: Position = { x: 0, y: 0 };

  // DOM 引用
  const { containerRef, stageRef, transformerRef, mainLayerRef } = useElementRef();

  // 图层管理
  const {
    layersHistory,
    selectedLayer,
    updateLayers,
    setSelectedIds,
    removeLayer,
    restoreLayer,
    moveLayer,
    toggleLayer,
    selectedIds,
    layers,
    selectedLayers,
    setLayers,
    setLayersHistory,
  } = useLayerManger();

  // 缩放和定位
  const { zoomScale, setZoomScale, focusLayer, focusCenter } = useZoom({
    stageRef,
    selectedLayer,
    viewportSize,
    containerSize,
    viewportPos,
    cursor,
    setIsAnimating,
  });

  // 功能管理器
  const keyManager = useKeyManager();

  // 资源管理
  const {
    images: imagesCache,
    loadingStatus: imagesLoadingStatus,
    loadImage,
  } = useCachedImages({
    layers,
    layersHistory,
    setSelectedIds,
    setLoading,
  });

  const drawingCanvas = useDrawingCanvas({
    width: selectedLayer?.width || 0,
    height: selectedLayer?.height || 0,
    cursor,
  });

  const historyManager = useHistoryManager({ keyManager });

  // 扩展状态
  const expandState = useExpand();

  const addImage = async ({ fileUrl, image }: { fileUrl: string; image: HTMLImageElement }) => {
    let layerNumber = 1;
    while (layers.find((layer) => layer.name === `图层 ${layerNumber}`)) {
      layerNumber++;
    }
    const newLayer = getDefaultLayer({
      viewportPos,
      viewportSize,
      name: `图层 ${layerNumber}`,
      fileUrl,
      image,
    });
    setLoading(true);
    await saveImage?.({
      layer: newLayer,
    });
    setSelectedIds?.([newLayer.id]);
    setLoading(false);

    focusLayer?.(newLayer.id);

    if (newLayer.width !== newLayer.cropWidth || newLayer.height !== newLayer.cropHeight) {
      message.warning('图片尺寸超出最大限制，已自动缩放');
    }
  };

  const saveImage = async (params: { layer: Layer }) => {
    const { fileId, fileUrl } = params.layer;
    setLoading(true);
    const { image } = await loadImage({ fileId, fileUrl });

    let newLayers = layers;
    const preLayer = layers.find((layer) => layer.id === params.layer.id);
    if (!preLayer) {
      newLayers = [...layers, params.layer];
      setLayers(newLayers);

      historyManager?.addAction('createLayer', {
        layers: [getPureLayer(params.layer)],
        indexes: [layers.length],
        preSelectedIds: selectedIds,
      });
    } else {
      const nextLayer = {
        ...params.layer,
        fileUrl,
        fileId,
        cropX: 0,
        cropY: 0,
        cropWidth: image.width,
        cropHeight: image.height,
        imgWidth: image.width,
        imgHeight: image.height,
      };
      newLayers = layers.map((layer) => {
        if (layer.id === params.layer.id) {
          return nextLayer;
        }
        return layer;
      });
      setLayers(newLayers);

      historyManager?.addAction('changeNode', {
        preNodes: [getPureLayer(preLayer)],
        nextNodes: [getPureLayer(nextLayer)],
      });
    }

    let newLayersHistory = layersHistory;
    if (!layersHistory.find((layer) => layer.layerId === params.layer.id)) {
      newLayersHistory = [
        ...layersHistory,
        { layerId: params.layer.id, layerName: params.layer.name, imgList: [{ fileId, fileUrl }] },
      ];

      setLayersHistory(newLayersHistory);
    } else {
      newLayersHistory = layersHistory.map((l) => {
        if (l.layerId === params.layer.id) {
          return {
            ...l,
            imgList: [...(l.imgList || []), { fileId, fileUrl }],
          };
        }
        return l;
      });

      setLayersHistory(newLayersHistory);
    }
    setLoading(false);

    focusLayer?.(params.layer.id);
  };

  // 复制选中的图层
  const copyLayers = useCallback(() => {
    if (!selectedLayers || selectedLayers.length === 0) {
      return;
    }
    // 深拷贝图层数据到剪贴板
    const copiedLayers = selectedLayers.map((layer) => getPureLayer(layer));
    setClipboard(copiedLayers);
  }, [selectedLayers]);

  // 粘贴图层
  const pasteLayers = useCallback(() => {
    if (!clipboard || clipboard.length === 0) {
      return;
    }
    const newPasteLayers: Layer[] = [];
    let layerNumber = 1;
    clipboard.forEach(async (layer) => {
      while (layers.find((layer) => layer.name === `图层 ${layerNumber}`)) {
        layerNumber++;
      }
      const id = uuidv4();
      const pasteLayer = {
        ...layer,
        id,
        name: `图层 ${layerNumber}`,
        x: layer.x + 10,
        y: layer.y + 10,
      };
      newPasteLayers.push(pasteLayer);
      layerNumber++;
    });
    setSelectedIds(newPasteLayers.map((layer) => layer.id));
    setLayers((layers) => [...layers, ...newPasteLayers]);

    historyManager?.addAction('createLayer', {
      layers: newPasteLayers.map((layer) => getPureLayer(layer)),
      indexes: Array.from({ length: newPasteLayers.length }, (_, i) => layers.length + i),
      preSelectedIds: selectedIds,
    });

    setLayersHistory((layersHistory) => [
      ...layersHistory,
      ...newPasteLayers.map((layer) => ({
        layerId: layer.id,
        layerName: layer.name,
        imgList: [
          {
            fileId: layer.fileId,
            fileUrl: layer.fileUrl,
          },
        ],
      })),
    ]);
  }, [clipboard, selectedIds, layers, setSelectedIds]);

  // 监听容器尺寸变化
  useEffect(() => {
    const updateSize = () => {
      setContainerSize({
        width: containerRef.current?.clientWidth || 0,
        height: containerRef.current?.clientHeight || 0,
      });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 初始化历史管理器和事件监听
  useEffect(() => {
    if (containerRef.current) {
      const { clientWidth, clientHeight } = containerRef.current;
      setContainerSize({ width: clientWidth, height: clientHeight });
    }

    // 初始化history事件
    // 拖拽、旋转、缩放等改变node操作
    historyManager?.registerType(
      'changeNode',
      ({ preNodes }) => {
        // node都是toObject的数据
        updateLayers(preNodes);
        setSelectedIds?.(preNodes.map((node: any) => node.id) || []);
      },
      ({ nextNodes }) => {
        updateLayers(nextNodes);
        setSelectedIds?.(nextNodes.map((node: any) => node.id) || []);
      },
    );
    historyManager?.registerType(
      'undoCreateLayer',
      ({ layers, indexes }) => {
        restoreLayer(layers, indexes);
      },
      ({ layers, preSelectedIds }) => {
        removeLayer(layers, preSelectedIds);
      },
    );
    historyManager?.registerType(
      'createLayer',
      ({ layers, preSelectedIds = [] }) => {
        removeLayer(layers, preSelectedIds);
      },
      ({ layers, indexes }) => {
        restoreLayer(layers, indexes);
      },
    );
    historyManager?.registerType(
      'moveLayer',
      ({ layer, nextIndex, preIndex }) => {
        moveLayer(layer, nextIndex, preIndex);
      },
      ({ layer, nextIndex, preIndex }) => {
        moveLayer(layer, preIndex, nextIndex);
      },
    );

    keyManager?.registerKey({
      keys: ['esc'],
      callback: () => {
        setCursor?.('default');
      },
    });
    keyManager?.registerKey({
      keys: [isMacintosh ? 'meta' : 'ctrl', 'c'],
      callback: () => {
        copyLayers();
      },
    });
    keyManager?.registerKey({
      keys: [isMacintosh ? 'meta' : 'ctrl', 'v'],
      callback: () => {
        pasteLayers();
      },
    });

    return () => {
      keyManager?.unregisterKey({ keys: ['esc'] });
      keyManager?.unregisterKey({ keys: [isMacintosh ? 'meta' : 'ctrl', 'c'] });
      keyManager?.unregisterKey({ keys: [isMacintosh ? 'meta' : 'ctrl', 'v'] });
    };
  }, [copyLayers, pasteLayers, removeLayer, restoreLayer]);

  return {
    cursor,
    setCursor,
    loading,
    setLoading,
    isAnimating,
    setIsAnimating,
    layers,
    selectedLayer,
    selectedLayers,
    updateLayers,
    removeLayer,
    moveLayer,
    toggleLayer,
    focusLayer,
    focusCenter,
    selectedIds,
    setSelectedIds,
    viewportSize,
    viewportPos,
    setViewportSize,
    mainLayerRef,
    stageRef,
    transformerRef,
    zoomScale,
    setZoomScale,
    containerRef,
    containerSize,
    historyManager,
    layersHistory,
    imagesCache,
    imagesLoadingStatus,
    drawingCanvas,
    expandState,
    keyManager,
    addImage,
    saveImage,
  };
};

export default useEditor;
