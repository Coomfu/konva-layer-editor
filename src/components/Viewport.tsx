import React, { useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Stage, Layer as KonvaLayer, Rect } from 'react-konva';
import Konva from 'konva';
import EditorContext from '../context';
import LayerImage from './LayerImage';
import {
  getCanvasPointer,
  getCanvasRect,
  getNewScalePoint,
  isPointInSelectionBox,
  isRectOverlap,
} from '../utils/utils';
import Transformer from './Transformer';
import type { DragSelection } from '../type/types';
import {
  MAX_IMAGE_SIZE,
  MAX_VIEWPORT_SIZE,
  PAN_STEP,
  ZOOM_SCALE_MAX,
  ZOOM_SCALE_MIN,
  ZOOM_SCALE_STEP,
} from '../utils/const';
import EditLayer from './EditLayer';

// // ===== 渲染背景网格 =====
// const renderBackgroundGrid = (context: any, shape: any, zoomScale: number) => {
//   let gridSize = 12;
//   if (zoomScale > 1.8) gridSize = 8;
//   else if (zoomScale < 1) gridSize = 18;
//   else if (zoomScale < 0.6) gridSize = 36;

//   const canvasWidth = shape.width();
//   const canvasHeight = shape.height();

//   for (let y = 0; y < canvasHeight; y += gridSize) {
//     for (let x = 0; x < canvasWidth; x += gridSize) {
//       const isDarkCell = (Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 2 === 0;
//       context.fillStyle = isDarkCell ? '#ffffff' : '#dedfe1';
//       context.fillRect(Math.round(x), Math.round(y), Math.ceil(gridSize) + 0.5, Math.ceil(gridSize) + 0.5);
//     }
//   }
//   context.fillStrokeShape(shape);
// };

// ===== 主组件 =====
const Viewport: React.FC<{ style: React.CSSProperties }> = ({ style }) => {
  const {
    viewportSize = { width: 0, height: 0 },
    containerSize,
    containerRef,
    layers = [],
    selectedIds = [],
    setSelectedIds,
    transformerRef,
    stageRef,
    zoomScale = 1,
    setZoomScale,
    viewportPos = { x: 0, y: 0 },
    mainLayerRef,
    cursor,
    isAnimating,
  } = useContext(EditorContext);

  // ===== 状态管理 =====
  const rafId = useRef<number | null>(null);
  const [dragSelection, setDragSelection] = useState<DragSelection>({
    visible: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  // const [isGroupDragging, setIsGroupDragging] = useState<boolean>(false);
  // const dragData = useRef<IObject<any>[]>(null);

  // ===== 框选功能 =====
  const handleStageMouseDown = useCallback(
    (e: any) => {
      if (cursor !== 'default') return;

      const stage = e.target.getStage();

      // 如果在不可见区域点击在选中目标内且为单选，开始拖拽
      if (selectedIds.length === 1 && e.target === stage) {
        const node = transformerRef?.current?.nodes()[0];
        const mousePos = getCanvasPointer(stage);
        if (!node || !mousePos) return;
        if (isPointInSelectionBox([node], mousePos)) {
          node?.startDrag();
          return;
        }
      }

      // 只处理点击画布的情况
      if (e.target !== stage) return;

      const mousePos = getCanvasPointer(stage);
      if (!mousePos) return;

      // 开始框选
      setSelectedIds?.([]);
      setDragSelection({
        visible: true,
        x: mousePos.x,
        y: mousePos.y,
        width: 0,
        height: 0,
      });
      setIsBoxSelecting(true);
    },
    [selectedIds, cursor, setSelectedIds],
  );

  const handleStageMouseMove = useCallback(
    (e: any) => {
      if (!isBoxSelecting) return;

      const mousePos = getCanvasPointer(e.target.getStage());
      if (!mousePos) return;

      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        setDragSelection((prev) => ({
          ...prev,
          width: mousePos.x - prev.x,
          height: mousePos.y - prev.y,
        }));
      });
    },
    [isBoxSelecting],
  );

  const handleStageMouseUp = useCallback(() => {
    // // 结束组拖拽
    // if (isGroupDragging) {
    //   endGroupDrag();
    //   return;
    // }

    // 结束框选
    if (!isBoxSelecting) return;

    setIsBoxSelecting(false);
    setDragSelection((prev) => ({ ...prev, visible: false }));
    // 没有框选，直接返回
    if (dragSelection.width === 0 || dragSelection.height === 0) return;

    // 检测框选的图层
    const newSelectedLayerIds: string[] = [];
    layers
      .filter((layer) => layer.visible)
      .forEach((layer) => {
        const layerNode = stageRef?.current?.findOne(`#${layer.id}`);
        const selectionNode = stageRef?.current?.findOne('#selection-rect');

        if (!layerNode || !selectionNode) return;

        const selectionBounds = getCanvasRect(selectionNode);
        const layerBounds = getCanvasRect(layerNode);
        if (isRectOverlap(selectionBounds, layerBounds)) {
          newSelectedLayerIds.push(layer.id);
        }
      });

    setSelectedIds?.(newSelectedLayerIds);
  }, [isBoxSelecting, layers, dragSelection, setSelectedIds]);

  const handleStageMouseLeave = useCallback(() => {
    if (!isBoxSelecting) return;
    setIsBoxSelecting(false);
    setDragSelection((prev) => ({ ...prev, visible: false }));
  }, [isBoxSelecting]);

  // 组拖拽会破坏zindex，暂时只允许clip外单选拖动
  // // ===== 组拖拽功能 =====
  // const startGroupDrag = useCallback(() => {
  //   const stage = stageRef?.current;
  //   if (!stage) return false;

  //   const mousePos = getCanvasPointer(stage);
  //   if (!mousePos) return false;

  //   const selectedNodes = transformerRef?.current?.nodes();

  //   if (!selectedNodes || !isPointInSelectionBox(selectedNodes, mousePos)) return false;

  //   setIsGroupDragging(true);

  //   // 创建临时组进行拖拽
  //   const parentLayer = selectedNodes[0].getLayer();
  //   const tempGroup = new Konva.Group();
  //   parentLayer?.add(tempGroup);

  //   selectedNodes.forEach(node => {
  //     tempGroup.add(node as any);
  //   });
  //   dragData.current = selectedNodes.map(node => JSON.parse(node.toJSON()).attrs);
  //   updateLayers?.(selectedNodes.map(node => node.attrs) || []);

  //   stage.draw();
  //   tempGroup.startDrag();
  //   return true;
  // }, []);

  // const endGroupDrag = useCallback(() => {
  //   setIsGroupDragging(false);

  //   const selectedNodes = transformerRef?.current?.nodes();
  //   if (!selectedNodes?.length) return;

  //   const parentLayer = selectedNodes[0].getLayer();
  //   const tempGroup = selectedNodes[0].getParent();

  //   // 更新节点位置并移出组
  //   selectedNodes.forEach(node => {
  //     const absolutePosition = getCanvasAbsolutePosition(node);
  //     node.setAttrs({
  //       x: absolutePosition.x,
  //       y: absolutePosition.y,
  //     });
  //     parentLayer?.add(node as any);
  //   });
  //   updateLayers?.(selectedNodes.map(node => node.attrs) || []);
  //   historyManager?.addAction('changeNode', {
  //     preNodes: dragData.current,
  //     nextNodes: selectedNodes.map(node => JSON.parse(node.toJSON()).attrs),
  //   });

  //   tempGroup?.destroy();
  //   parentLayer?.draw();
  // }, []);

  const handleZoom = useCallback(
    (e: any, stage: Konva.Stage) => {
      const oldScale = zoomScale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const newScale = direction > 0 ? oldScale * ZOOM_SCALE_STEP : oldScale / ZOOM_SCALE_STEP;
      const clampedScale = Number(Math.max(ZOOM_SCALE_MIN, Math.min(ZOOM_SCALE_MAX, newScale)).toFixed(4));

      setZoomScale?.(clampedScale);

      // 计算缩放中心点
      const newPos = getNewScalePoint(stage, clampedScale, pointer);
      // 限制最大最小值
      const minX = (-viewportPos?.x - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * clampedScale + stage.width();
      const maxX = (-viewportPos?.x + MAX_IMAGE_SIZE) * clampedScale;
      const minY = (-viewportPos?.y - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * clampedScale + stage.height();
      const maxY = (-viewportPos?.y + MAX_IMAGE_SIZE) * clampedScale;

      stage.position({ x: Math.max(Math.min(newPos.x, maxX), minX), y: Math.max(Math.min(newPos.y, maxY), minY) });
      stage.scale({ x: clampedScale, y: clampedScale });
    },
    [zoomScale, setZoomScale, viewportPos],
  );

  const handlePan = useCallback(
    (e: any, stage: Konva.Stage) => {
      const currentStagePos = stage.position();
      const scale = stage.scaleX();

      // 限制最大最小值
      const minX = (-viewportPos?.x - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * scale + stage.width();
      const maxX = (-viewportPos?.x + MAX_IMAGE_SIZE) * scale;
      const minY = (-viewportPos?.y - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * scale + stage.height();
      const maxY = (-viewportPos?.y + MAX_IMAGE_SIZE) * scale;

      const newStagePos = {
        x: Math.max(Math.min(currentStagePos.x - e.evt.deltaX * PAN_STEP, maxX), minX),
        y: Math.max(Math.min(currentStagePos.y - e.evt.deltaY * PAN_STEP, maxY), minY),
      };

      stage.position(newStagePos);
    },
    [viewportPos, viewportSize],
  );

  // ===== 缩放和平移功能 =====
  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();

      if (isAnimating) return;

      const stage = stageRef?.current;
      if (!stage) return;

      if (e.evt.ctrlKey) {
        // 缩放模式
        handleZoom(e, stage);
      } else {
        // 平移模式
        handlePan(e, stage);
      }
    },
    [handlePan, handleZoom, isAnimating],
  );

  useEffect(() => {
    stageRef.current?.batchDraw();
  }, [cursor]);

  // ===== 主渲染 =====
  return (
    <div
      ref={containerRef}
      className="viewport-container"
      style={style}
      onMouseLeave={() => {
        // 拖拽中鼠标离开stage居然没反应，还要到这处理
        const nodes = transformerRef?.current?.nodes();
        if (nodes?.length) {
          nodes.forEach((node) => {
            node.stopDrag();
          });
        }
      }}>
      <Stage
        ref={stageRef}
        width={containerSize?.width}
        height={containerSize?.height}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onMouseLeave={handleStageMouseLeave}
        onWheel={handleWheel}>
        {/* 主内容层 */}
        <KonvaLayer
          ref={mainLayerRef}
          clipX={viewportPos?.x}
          clipY={viewportPos?.y}
          clipWidth={viewportSize?.width}
          clipHeight={viewportSize?.height}>
          {/* 中心可见区域背景 */}
          <Rect
            x={viewportPos?.x}
            y={viewportPos?.y}
            width={viewportSize?.width}
            height={viewportSize?.height}
            listening={false}
            perfectDrawEnabled={false}
            fill="#fff"
            stroke="#d0d7de"
            strokeWidth={2 / zoomScale}
            shadowColor="#000"
            shadowBlur={10}
            shadowOpacity={0.1}
            shadowOffsetX={0}
            shadowOffsetY={0}
          />

          {/* 图层内容 */}
          {layers.map((layer) => (
            <LayerImage key={layer.id} {...layer} />
          ))}
        </KonvaLayer>

        {/* 编辑层，遮罩和扩图框之类的 */}
        <EditLayer />

        {/* UI 层 */}
        <KonvaLayer>
          {/* 框选矩形 */}
          {dragSelection.visible && (
            <Rect
              id="selection-rect"
              x={dragSelection.x}
              y={dragSelection.y}
              width={dragSelection.width}
              height={dragSelection.height}
              fill="rgba(0, 150, 255, 0.1)"
              stroke="rgba(0, 150, 255, 0.8)"
              strokeWidth={1 / zoomScale}
            />
          )}

          {/* 变换控制器 */}
          <Transformer />
        </KonvaLayer>
      </Stage>
    </div>
  );
};

export default Viewport;
