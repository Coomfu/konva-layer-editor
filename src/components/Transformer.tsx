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

  const handleTransform = useCallback(
    (e: any) => {
      if (isMultiSelected) return;

      const dragNodes = transformerRef?.current?.nodes();
      if (!dragNodes || !dragNodes.length) return;

      const node = dragNodes[0];
      const { x, y, width, height } = node.attrs;

      // 限制图片在画布上的最大最小值
      const minX = -MAX_IMAGE_SIZE;
      const maxX = MAX_VIEWPORT_SIZE + MAX_IMAGE_SIZE;
      const minY = -MAX_IMAGE_SIZE;
      const maxY = MAX_VIEWPORT_SIZE + MAX_IMAGE_SIZE;

      if (x + width < minX + 40 || y + height < minY + 40 || x > maxX - 40 || y > maxY - 40) {
        if (dragPosition.current) {
          node.position(dragPosition.current);
        }
        return;
      }

      dragPosition.current = { x, y };
    },
    [isMultiSelected, transformerRef],
  );

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
        // 禁止翻转与过小尺寸
        if (Math.abs(newBox.width) < 20 || Math.abs(newBox.height) < 20) {
          return oldBox;
        }

        if (isMultiSelected) {
          if (newBox.width > MAX_IMAGE_SIZE || newBox.height > MAX_IMAGE_SIZE) {
            return oldBox;
          }
          return newBox;
        }

        const dragNodes = transformerRef?.current?.nodes();
        if (!dragNodes || !dragNodes.length) return newBox;
        const node = dragNodes[0];
        const anchor = transformerRef?.current?.getActiveAnchor();
        if (!anchor) return newBox;

        const cropX = node.cropX() ?? 0;
        const cropY = node.cropY() ?? 0;
        const imgWidth = node.attrs.imgWidth || node.width();
        const imgHeight = node.attrs.imgHeight || node.height();
        const image = node.attrs.image;
        const naturalWidth = image?.width || imgWidth;
        const naturalHeight = image?.height || imgHeight;

        const ratioX = naturalWidth / imgWidth;
        const ratioY = naturalHeight / imgHeight;

        if (anchor === 'middle-left') {
          const maxExpandLeft = cropX / ratioX;
          const minX = oldBox.x + oldBox.width - Math.min(node.width() + maxExpandLeft, imgWidth, MAX_IMAGE_SIZE);
          if (newBox.x < minX) {
            newBox.x = minX;
            newBox.width = oldBox.x + oldBox.width - minX;
          }
          if (newBox.width > MAX_IMAGE_SIZE) {
            newBox.x = oldBox.x + oldBox.width - MAX_IMAGE_SIZE;
            newBox.width = MAX_IMAGE_SIZE;
          }
        } else if (anchor === 'top-center') {
          const maxExpandTop = cropY / ratioY;
          const minY = oldBox.y + oldBox.height - Math.min(node.height() + maxExpandTop, imgHeight, MAX_IMAGE_SIZE);
          if (newBox.y < minY) {
            newBox.y = minY;
            newBox.height = oldBox.y + oldBox.height - minY;
          }
          if (newBox.height > MAX_IMAGE_SIZE) {
            newBox.y = oldBox.y + oldBox.height - MAX_IMAGE_SIZE;
            newBox.height = MAX_IMAGE_SIZE;
          }
        } else if (anchor === 'middle-right') {
          const maxExpandRight = (naturalWidth - (cropX + (node.cropWidth() || naturalWidth))) / ratioX;
          const maxWidth = Math.min(node.width() + maxExpandRight, imgWidth, MAX_IMAGE_SIZE);
          if (newBox.width > maxWidth) {
            newBox.width = maxWidth;
          }
        } else if (anchor === 'bottom-center') {
          const maxExpandBottom = (naturalHeight - (cropY + (node.cropHeight() || naturalHeight))) / ratioY;
          const maxHeight = Math.min(node.height() + maxExpandBottom, imgHeight, MAX_IMAGE_SIZE);
          if (newBox.height > maxHeight) {
            newBox.height = maxHeight;
          }
        } else if (
          anchor === 'top-left' ||
          anchor === 'top-right' ||
          anchor === 'bottom-left' ||
          anchor === 'bottom-right'
        ) {
          if (newBox.width > MAX_IMAGE_SIZE || newBox.height > MAX_IMAGE_SIZE) {
            return oldBox;
          }
        }

        return newBox;
      }}
    />
  );
};

export default Transformer;
