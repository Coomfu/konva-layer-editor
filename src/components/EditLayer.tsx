import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import LayerImage from './LayerImage';
import { Layer as KonvaLayer, Image as KonvaImage, Rect } from 'react-konva';
import EditorContext from '../context';
import Konva from 'konva';
import { Position } from '../type/types';
import { getCanvasPointer, getExpandRect, worldToRectLocal } from '../utils/utils';
import PenIcon from '../assets/pen.svg?raw';
import EraserIcon from '../assets/eraser.svg?raw';

// ============ Draw Events Hook ============
const useDrawEvents = () => {
  const { drawingCanvas } = useContext(EditorContext);

  // 绘画相关状态
  const isDrawing = useRef<boolean>(false);
  const lastPos = useRef<Position>({ x: 0, y: 0 });

  const handleDrawMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    isDrawing.current = true;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    lastPos.current = {
      x: pos.x,
      y: pos.y,
    };
  }, []);

  const handleDrawMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDrawing.current) return;

      if (!drawingCanvas) return;
      const { context, tool } = drawingCanvas;

      const image = drawingCanvas?.imageRef.current;
      const stage = e.target.getStage();
      if (!image || !stage) {
        return;
      }

      const scale = stage.scaleX();
      const { x, y } = image.getAbsolutePosition();
      const rotation = image.getAbsoluteRotation();

      context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
      context.beginPath();

      const localPos = worldToRectLocal(lastPos.current.x, lastPos.current.y, x, y, rotation);

      context.moveTo(localPos.x / scale, localPos.y / scale);
      context.lineWidth = drawingCanvas.lineWidth / scale;

      const pos = stage.getPointerPosition();
      if (!pos) return;

      const newLocalPos = worldToRectLocal(pos.x, pos.y, x, y, rotation);
      context.lineTo(newLocalPos.x / scale, newLocalPos.y / scale);

      context.closePath();
      context.stroke();

      lastPos.current = pos;
      image.getLayer()?.batchDraw();
    },
    [drawingCanvas],
  );

  const handleDrawMouseUp = useCallback(async () => {
    isDrawing.current = false;
  }, []);

  const resetDrawing = useCallback(() => {
    isDrawing.current = false;
  }, []);

  return {
    handleDrawMouseDown,
    handleDrawMouseMove,
    handleDrawMouseUp,
    resetDrawing,
  };
};

const EditLayer = () => {
  const {
    selectedLayer,
    selectedLayers,
    cursor,
    drawingCanvas,
    expandState,
    zoomScale = 1,
  } = useContext(EditorContext);

  const { handleDrawMouseDown, handleDrawMouseMove, handleDrawMouseUp, resetDrawing } = useDrawEvents();

  // 鼠标状态
  const [isMouseEnter, setIsMouseEnter] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // ============ Cursor 管理 ============
  const ERASER_CURSOR = useMemo(() => `url("data:image/svg+xml;base64,${btoa(EraserIcon)}") 0 16, auto`, []);
  const PEN_CURSOR = useMemo(() => `url("data:image/svg+xml;base64,${btoa(PenIcon)}") 0 16, auto`, []);
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isMouseEnter) return;

    // 根据当前状态设置cursor
    if (cursor !== 'cutout') {
      container.style.cursor = 'default';
      return;
    }

    const tool = drawingCanvas?.tool;
    switch (tool) {
      case 'brush':
        container.style.cursor = PEN_CURSOR;
        break;
      case 'eraser':
        container.style.cursor = ERASER_CURSOR;
        break;
      default:
        container.style.cursor = 'default';
    }
  }, [cursor, drawingCanvas?.tool, isMouseEnter]);

  // ============ 统一事件处理 ============
  const handleMouseDown = useCallback(
    async (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (cursor !== 'cutout') return;
      if (!drawingCanvas) return;

      handleDrawMouseDown(e);
    },
    [drawingCanvas, handleDrawMouseDown, cursor],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawingCanvas) return;

      const { tool } = drawingCanvas;

      handleDrawMouseMove(e);
    },
    [drawingCanvas, handleDrawMouseMove],
  );

  const handleMouseUp = useCallback(
    async (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!drawingCanvas) return;

      const { tool } = drawingCanvas;

      handleDrawMouseUp();
    },
    [drawingCanvas, handleDrawMouseUp],
  );

  const handleMouseEnter = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (cursor !== 'cutout') return;

      setIsMouseEnter(true);
      const container = e.target.getStage()?.container();
      if (container) {
        containerRef.current = container;
      }
    },
    [cursor],
  );

  const handleMouseLeave = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      resetDrawing();
      setIsMouseEnter(false);

      const container = e.target.getStage()?.container();
      if (!container) return;
      container.style.cursor = 'default';
      containerRef.current = null;
    },
    [resetDrawing],
  );

  // ============ 组件渲染 ============
  if (!drawingCanvas || cursor === 'default' || !drawingCanvas.instance.current) return null;

  return (
    <KonvaLayer
      onMouseEnter={handleMouseEnter}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}>
      {selectedLayers?.map((layer) => (
        <LayerImage key={layer.id} {...layer} listening={false} id={`${layer.id}-editing`} visible={true} />
      ))}
      {cursor === 'expand' && selectedLayer && (
        <Rect
          {...getExpandRect(selectedLayer, expandState, zoomScale)}
          stroke="#479ff8"
          strokeWidth={2 / zoomScale}></Rect>
      )}
      {cursor === 'cutout' && selectedLayer && (
        <KonvaImage
          id="auto-select-result"
          ref={drawingCanvas.imageRef}
          image={drawingCanvas?.instance.current}
          x={selectedLayer.x}
          y={selectedLayer.y}
          width={selectedLayer.width}
          height={selectedLayer.height}
          rotation={selectedLayer.rotation}
          opacity={0.5}
        />
      )}
    </KonvaLayer>
  );
};

export default EditLayer;
