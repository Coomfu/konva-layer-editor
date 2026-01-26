import Konva from 'konva';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MAX_IMAGE_SIZE, MAX_VIEWPORT_SIZE, ZOOM_SCALE_MAX, ZOOM_SCALE_MIN } from '../utils/const';
import { Cursor, Layer, Position, Size } from '../type/types';

const useZoom = ({
  stageRef,
  selectedLayer,
  viewportPos,
  viewportSize,
  containerSize,
  cursor,
  setIsAnimating,
}: {
  stageRef: React.RefObject<Konva.Stage>;
  selectedLayer: Layer | null;
  viewportSize: Size;
  containerSize: Size;
  viewportPos: Position;
  cursor: Cursor;
  setIsAnimating: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const [zoomScale, setZoomScale] = useState(0.5);
  const autoZoomScale = useMemo(() => {
    return Math.max(
      Math.min(
        (containerSize.width * 0.7) / viewportSize.width,
        (containerSize.height * 0.7) / viewportSize.height,
        ZOOM_SCALE_MAX,
      ),
      ZOOM_SCALE_MIN,
    );
  }, [containerSize, viewportSize]);

  const focusLayer = (id?: string) => {
    const stage = stageRef?.current;
    if (!stage || (!selectedLayer && !id)) return;
    const targetId = id || selectedLayer?.id;
    const node = stageRef.current.findOne((node: any) => node.id() === targetId);
    if (!node) return;

    const { width, height, x, y } = node.getClientRect();
    let newScale = zoomScale;
    if (width * 2.5 > stage.width() || height * 2.5 > stage.height()) {
      newScale = Math.max(
        Math.min(
          (stage.width() * 0.4) / (width / stage.scaleX()),
          (stage.height() * 0.4) / (height / stage.scaleY()),
          ZOOM_SCALE_MAX,
        ),
        ZOOM_SCALE_MIN,
      );
    }

    setZoomScale?.(newScale);
    const scaleRatio = newScale / zoomScale;
    const newPoint = {
      x: (stage.x() - x) * scaleRatio + (stage.width() - width * scaleRatio) / 2,
      y: (stage.y() - y) * scaleRatio + (stage.height() - height * scaleRatio) / 2,
    };

    const minX = (-viewportPos?.x - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * newScale + stage.width();
    const maxX = (-viewportPos?.x + MAX_IMAGE_SIZE) * newScale;
    const minY = (-viewportPos?.y - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * newScale + stage.height();
    const maxY = (-viewportPos?.y + MAX_IMAGE_SIZE) * newScale;

    setIsAnimating(true);
    new Konva.Tween({
      node: stage,
      duration: 0.4,
      scaleX: newScale,
      scaleY: newScale,
      x: Math.max(Math.min(newPoint.x, maxX), minX),
      y: Math.max(Math.min(newPoint.y, maxY), minY),
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        setIsAnimating(false);
      },
    }).play();
  };

  const focusCenter = useCallback(
    (animate: boolean = true) => {
      setZoomScale?.(autoZoomScale);
      const stage = stageRef?.current;
      if (!stage) return;

      const minX = (-viewportPos?.x - viewportSize?.width) * autoZoomScale;
      const maxX = minX + stage.width() + viewportSize?.width * autoZoomScale;
      const minY = (-viewportPos?.y - viewportSize?.height) * autoZoomScale;
      const maxY = minY + stage.height() + viewportSize?.height * autoZoomScale;

      const newCenter = {
        x: (maxX + minX) / 2,
        y: (maxY + minY) / 2,
      };

      if (!animate) {
        stage.scale({ x: autoZoomScale, y: autoZoomScale });

        stage.position(newCenter);
        return;
      }

      setIsAnimating(true);
      new Konva.Tween({
        node: stage,
        duration: 0.4,
        scaleX: autoZoomScale,
        scaleY: autoZoomScale,
        x: newCenter.x,
        y: newCenter.y,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          setIsAnimating(false);
        },
      }).play();
    },
    [autoZoomScale, viewportPos, viewportSize],
  );

  useEffect(() => {
    focusCenter(false);
  }, [autoZoomScale]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (cursor !== 'default') return;
    // 跳过cursor的第一次动画
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    focusCenter();
  }, [cursor]);

  // 监听选中图层和光标变化
  useEffect(() => {
    if (selectedLayer && cursor !== 'default') {
      focusLayer();
    }
  }, [selectedLayer?.id, cursor]);

  return {
    zoomScale,
    setZoomScale,
    focusLayer,
    focusCenter,
  };
};

export default useZoom;
