import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { Transformer as KonvaTransformer } from 'react-konva';
import EditorContext from '../context';
import type Konva from 'konva';
import type { IObject, Position } from '../type/types';
import useImage from 'use-image';
import rotater from '../assets/rotater.png';
import { MAX_IMAGE_SIZE, MAX_VIEWPORT_SIZE } from '../utils/const';

const Transformer = () => {
  const {
    transformerRef,
    selectedIds = [],
    stageRef,
    updateLayers,
    historyManager,
    cursor,
    selectedLayers,
  } = useContext(EditorContext);

  const isMultiSelected = useMemo(() => {
    return selectedLayers && selectedLayers?.length > 1;
  }, [selectedLayers]);

  const dragData = useRef<IObject<any>[] | null>(null);
  const dragPosition = useRef<Position | null>(null);

  const handleTransformStart = useCallback(() => {
    const dragNodes = transformerRef?.current?.nodes();
    if (!dragNodes || !dragNodes.length) return;
    dragData.current = dragNodes.map((node) => JSON.parse(node.toJSON()).attrs);

    if (!isMultiSelected) dragPosition.current = { x: dragNodes[0].attrs.x, y: dragNodes[0].attrs.y };

    updateLayers?.(dragNodes.map((node) => node.attrs) || []);
  }, [updateLayers, isMultiSelected]);

  const handleTransform = useCallback((e: any) => {
    if (isMultiSelected) return;

    const dragNodes = transformerRef?.current?.nodes();
    if (!dragNodes || !dragNodes.length) return;

    const node = dragNodes[0];
    const { x, y, width, height, imgWidth, imgHeight } = node.attrs;

    // 限制图片在画布上的最大最小值
    const minX = -MAX_IMAGE_SIZE;
    const maxX = MAX_VIEWPORT_SIZE + MAX_IMAGE_SIZE;
    const minY = -MAX_IMAGE_SIZE;
    const maxY = MAX_VIEWPORT_SIZE + MAX_IMAGE_SIZE;

    if (x + width < minX + 40 || y + height < minY + 40 || x > maxX - 40 || y > maxY - 40) {
      node.position(dragPosition.current);
      return;
    }

    // 以下代码为了解决设定最大尺寸后，拖边拖角x和y会动的bug
    const anchor = transformerRef?.current?.getActiveAnchor();
    // 拖角，到了全局最大值才不能动
    // 拖边，到当前图片尺寸或全局最大值就不能动
    if (
      ((anchor === 'top-left' || anchor === 'bottom-left' || anchor === 'top-right') &&
        (width >= MAX_IMAGE_SIZE || height >= MAX_IMAGE_SIZE)) ||
      ((anchor === 'top-center' || anchor === 'bottom-center') && (height >= imgHeight || height >= MAX_IMAGE_SIZE)) ||
      ((anchor === 'middle-left' || anchor === 'middle-right') && (width >= imgWidth || width >= MAX_IMAGE_SIZE))
    ) {
      node.position(dragPosition.current);

      node.setAttrs({
        skewX: 0,
        skewY: 0,
      });
      return;
    }

    dragPosition.current = { x, y };
  }, []);

  const handleTransformEnd = useCallback(() => {
    const dragNodes = transformerRef?.current?.nodes();
    if (!dragNodes || !dragNodes.length) return;

    historyManager?.addAction('changeNode', {
      preNodes: dragData.current,
      nextNodes: dragNodes.map((node) => JSON.parse(node.toJSON()).attrs),
    });
    dragData.current = null;
    updateLayers?.(dragNodes.map((node) => node.attrs) || []);
  }, [updateLayers, historyManager]);

  // ===== 选择状态同步 =====
  useEffect(() => {
    if (transformerRef?.current) {
      const selectedNodes = selectedIds
        .map((id) => stageRef?.current?.findOne(`#${id}`))
        .filter((node): node is Konva.Node => node !== undefined);

      transformerRef.current.nodes(selectedNodes);
    }
  }, [selectedIds]);

  const [icon] = useImage(rotater);
  const setRotateAnchor = useMemo(() => {
    return (anchor: any) => {
      if (!anchor.hasName('rotater')) return;

      anchor.cornerRadius(50); // 圆角

      // 设置icon
      anchor.scale({ x: 2, y: 2 });
      anchor.fill('#ffffff');
      anchor.fillPriority('pattern');
      anchor.fillPatternImage(icon);
      anchor.fillPatternScaleX(0.12);
      anchor.fillPatternScaleY(0.12);
      anchor.fillPatternOffsetX(-10);
      anchor.fillPatternOffsetY(-10);
      anchor.fillPatternRepeat('no-repeat');
    };
  }, [icon]);

  return (
    <KonvaTransformer
      ref={transformerRef}
      onDragStart={handleTransformStart}
      onDragMove={handleTransform}
      onDragEnd={handleTransformEnd}
      onTransformStart={handleTransformStart}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      anchorStyleFunc={setRotateAnchor}
      enabledAnchors={
        cursor === 'default'
          ? isMultiSelected
            ? ['top-left', 'top-right', 'bottom-left', 'bottom-right']
            : undefined
          : []
      }
      resizeEnabled={cursor === 'default'}
      rotateEnabled={cursor === 'default'}
      boundBoxFunc={(oldBox, newBox) => {
        // 禁止翻转
        if (newBox.width < 20 || newBox.height < 20) {
          return oldBox;
        }
        return newBox;
      }}
    />
  );
};

export default Transformer;
