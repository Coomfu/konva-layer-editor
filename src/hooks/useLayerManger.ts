import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layer, LayerHistory, LayerImage } from '../type/types';

const useLayerManger = () => {
  const [layers, setLayers] = useState<Layer[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedLayer = useMemo(() => {
    if (!selectedIds || !selectedIds.length || selectedIds.length > 1) return null;
    return layers.find((layer) => layer.id === selectedIds[0]) || null;
  }, [layers, selectedIds]);
  const selectedLayers = useMemo(() => {
    if (!selectedIds || !selectedIds.length) return [];
    return layers.filter((layer) => selectedIds.includes(layer.id));
  }, [layers, selectedIds]);

  const [layersHistory, setLayersHistory] = useState<LayerHistory[]>([]);

  // 这几个函数，因为会用到historyManager里面，尽量不要使用快照数据
  const addLayerHistory = useCallback(
    (id: string, imageList: LayerImage[]) => {
      setLayersHistory((history) =>
        history.map((l) => {
          if (l.layerId === id) {
            return {
              ...l,
              imgList: [...(l.imgList || []), ...imageList],
            };
          }
          return l;
        }),
      );
    },
    [setLayersHistory],
  );

  const updateLayers = useCallback(
    (nodes: any[]) => {
      setLayers((layers) =>
        layers.map((layer) => {
          const target = nodes.find((node) => node.id === layer.id);
          if (target) {
            return { visible: layer.visible, ...target, skewX: 0, skewY: 0 };
          }
          return layer;
        }),
      );
    },
    [setLayers],
  );

  const restoreLayer = useCallback(
    (targetLayers: Layer[], indexes: number[]) => {
      setLayers((layers) => {
        const newLayers = Array(layers.length + targetLayers.length).fill(undefined);
        indexes.forEach((index, i) => {
          newLayers[index] = targetLayers[i];
        });
        for (let i = newLayers.length - 1; i >= 0; i--) {
          if (newLayers[i] === undefined) {
            newLayers[i] = layers.splice(layers.length - 1, 1)[0];
          }
        }
        return newLayers;
      });
      setSelectedIds?.(targetLayers.map((l) => l.id));
    },
    [setSelectedIds, setLayers],
  );

  const removeLayer = useCallback(
    (targetLayers: Layer[], preSelectedIds?: string[]) => {
      setLayers((layers) => {
        return layers.filter((l) => !targetLayers.some((tl) => tl.id === l.id));
      });
      if (preSelectedIds) setSelectedIds?.(preSelectedIds);
      else setSelectedIds((ids) => ids.filter((id) => !targetLayers.some((l) => l.id === id)));
    },
    [setLayers, setSelectedIds],
  );

  const moveLayer = useCallback(
    (layer: Layer, preIndex: number, nextIndex: number) => {
      setLayers((layers) => {
        const newLayers = [...layers];
        newLayers.splice(preIndex, 1);
        newLayers.splice(nextIndex, 0, layer);
        return newLayers;
      });
    },
    [setLayers],
  );

  const toggleLayer = useCallback(
    (layer: Layer) => setLayers?.((prev) => prev.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l))),
    [setLayers],
  );

  return {
    layers,
    setLayers,
    selectedIds,
    setSelectedIds,
    selectedLayer,
    selectedLayers,
    layersHistory,
    setLayersHistory,
    addLayerHistory,
    updateLayers,
    restoreLayer,
    removeLayer,
    moveLayer,
    toggleLayer,
  };
};

export default useLayerManger;
