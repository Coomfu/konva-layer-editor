import { useContext, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Image as KonvaImage } from 'react-konva';
import EditorContext from '../context';
import type { Layer, Rect, Size } from '../type/types';
import type { Image } from 'konva/lib/shapes/Image';
import { MAX_IMAGE_SIZE } from '../utils/const';

const LayerImage: React.FC<Layer> = (layer: Layer) => {
  const {
    setSelectedIds,
    selectedIds,
    transformerRef,
    cursor,
    selectedLayer,
    keyManager,
    selectedLayers,
    imagesCache = {},
  } = useContext(EditorContext);

  const { id, width, height, cropX = 0, cropY = 0, cropWidth, cropHeight, imgWidth, imgHeight } = layer;
  const image = useMemo(() => imagesCache[layer.fileId || ''], [layer.fileId, imagesCache]);

  const isMultiSelected = useMemo(() => {
    return selectedLayers && selectedLayers?.length > 1;
  }, [selectedLayers]);

  // 图片拖拽框宽高
  const [size, setSize] = useState<Size>({ width, height });
  // 遮挡部分的属性，这个需要根据图片宽高再统一比例尺
  const [cropRect, setCropRect] = useState<Rect>({
    x: cropX,
    y: cropY,
    width: cropWidth,
    height: cropHeight,
  });

  const imageRef = useRef<Image>(null);

  const handleTransform = useCallback(() => {
    const node = imageRef.current;
    if (!node || !image) return;

    const anchor = transformerRef?.current?.getActiveAnchor();

    const scaleX = node.scaleX() < 0 ? -node.scaleX() : node.scaleX();
    const scaleY = node.scaleY() < 0 ? -node.scaleY() : node.scaleY();
    const nodeWidth = node.width();
    const nodeHeight = node.height();
    const currentImageSize = {
      width: node.attrs.imgWidth || imgWidth,
      height: node.attrs.imgHeight || imgHeight,
    };
    const currentCropRect = {
      x: node.cropX(),
      y: node.cropY(),
      width: node.cropWidth() || image.width,
      height: node.cropHeight() || image.height,
    };
    let newWidth = Math.min(Math.max(20, nodeWidth * scaleX), MAX_IMAGE_SIZE);
    let newHeight = Math.min(Math.max(20, nodeHeight * scaleY), MAX_IMAGE_SIZE);
    const nextAttrs: Record<string, number> = {
      scaleX: 1,
      scaleY: 1,
    };

    // 如果拖动四个角，那么就按比例改变
    if (anchor === 'top-left' || anchor === 'top-right' || anchor === 'bottom-left' || anchor === 'bottom-right') {
      if (newWidth >= MAX_IMAGE_SIZE) {
        newHeight = (newWidth * nodeHeight) / nodeWidth;
      } else if (newHeight >= MAX_IMAGE_SIZE) {
        newWidth = (newHeight * nodeWidth) / nodeHeight;
      }
      nextAttrs.imgWidth = Number(((newWidth / nodeWidth) * currentImageSize.width).toFixed(4));
      nextAttrs.imgHeight = Number(((newHeight / nodeHeight) * currentImageSize.height).toFixed(4));
      nextAttrs.width = Number(newWidth.toFixed(4));
      nextAttrs.height = Number(newHeight.toFixed(4));
    } else {
      // 拖动四条边进行裁剪
      const ratioX = image.width / currentImageSize.width;
      const ratioY = image.height / currentImageSize.height;

      if (anchor === 'middle-right') {
        const deltaWidth = newWidth - nodeWidth;
        let newCropWidth = currentCropRect.width + deltaWidth * ratioX;

        // 右边界保护：不能超过原图右边界，且宽度不能超过原图全宽
        if (currentCropRect.x + newCropWidth > image.width || newWidth >= currentImageSize.width) {
          newCropWidth = image.width - currentCropRect.x;
          newWidth = Math.min(newCropWidth / ratioX, currentImageSize.width);
        }

        nextAttrs.width = Number(newWidth.toFixed(4));
        nextAttrs.cropWidth = Number(newCropWidth.toFixed(4));
      } else if (anchor === 'middle-left') {
        const rightEdge = node.x() + nodeWidth * scaleX;
        const deltaWidth = nodeWidth - newWidth;
        const cropXChange = deltaWidth * ratioX;

        let newCropX = currentCropRect.x + cropXChange;
        let newCropWidth = currentCropRect.width - cropXChange;

        // 左边界保护：向左拉到原图左边界 (cropX < 0) 或超出原图全宽时
        if (newCropX < 0 || newWidth >= currentImageSize.width) {
          newCropX = 0;
          newCropWidth = Math.min(currentCropRect.x + currentCropRect.width, image.width);
          newWidth = Math.min(newCropWidth / ratioX, currentImageSize.width);
        }

        const newX = rightEdge - newWidth;

        nextAttrs.x = Number(newX.toFixed(4));
        nextAttrs.width = Number(newWidth.toFixed(4));
        nextAttrs.cropX = Number(newCropX.toFixed(4));
        nextAttrs.cropWidth = Number(newCropWidth.toFixed(4));
      } else if (anchor === 'bottom-center') {
        const deltaHeight = newHeight - nodeHeight;
        let newCropHeight = currentCropRect.height + deltaHeight * ratioY;

        // 下边界保护：不能超过原图下边界，且高度不能超过原图全高
        if (currentCropRect.y + newCropHeight > image.height || newHeight >= currentImageSize.height) {
          newCropHeight = image.height - currentCropRect.y;
          newHeight = Math.min(newCropHeight / ratioY, currentImageSize.height);
        }

        nextAttrs.height = Number(newHeight.toFixed(4));
        nextAttrs.cropHeight = Number(newCropHeight.toFixed(4));
      } else if (anchor === 'top-center') {
        const bottomEdge = node.y() + nodeHeight * scaleY;
        const deltaHeight = nodeHeight - newHeight;
        const cropYChange = deltaHeight * ratioY;

        let newCropY = currentCropRect.y + cropYChange;
        let newCropHeight = currentCropRect.height - cropYChange;

        // 上边界保护：向上拉到原图上边界 (cropY < 0) 或超出原图全高时
        if (newCropY < 0 || newHeight >= currentImageSize.height) {
          newCropY = 0;
          newCropHeight = Math.min(currentCropRect.y + currentCropRect.height, image.height);
          newHeight = Math.min(newCropHeight / ratioY, currentImageSize.height);
        }

        const newY = bottomEdge - newHeight;

        nextAttrs.y = Number(newY.toFixed(4));
        nextAttrs.height = Number(newHeight.toFixed(4));
        nextAttrs.cropY = Number(newCropY.toFixed(4));
        nextAttrs.cropHeight = Number(newCropHeight.toFixed(4));
      }
    }

    node.setAttrs({
      ...nextAttrs,
    });
  }, [image, transformerRef, imgWidth, imgHeight]);

  const handleTransformEnd = useCallback(() => {
    const node = imageRef.current;
    if (!node) return;

    setSize({
      width: Number(node.width().toFixed(4)),
      height: Number(node.height().toFixed(4)),
    });
    setCropRect({
      x: node.cropX(),
      y: node.cropY(),
      width: node.cropWidth(),
      height: node.cropHeight(),
    });
  }, []);

  const handleSelect = useCallback(() => {
    if (keyManager?.keycon.shiftKey && (cursor === 'default' || cursor === 'merge')) {
      // Shift + 点击：切换选择状态
      if (selectedIds?.includes(layer.id)) {
        setSelectedIds?.(selectedIds.filter((id) => id !== layer.id));
      } else {
        setSelectedIds?.([...(selectedIds || []), layer.id]);
      }
    } else {
      // 普通点击：如果是多选状态且当前已选中，保持多选；否则单选
      if (selectedIds?.includes(layer.id) && selectedIds.length > 1) {
        return; // 保持当前多选状态
      }
      setSelectedIds?.([layer.id]);
    }
  }, [selectedIds, setSelectedIds, layer.id]);

  const handleDragStart = useCallback(
    (e) => {
      // 多选时不响应单独拖动
      if (!isMultiSelected) {
        return;
      }
      // 确保拖动时元素被选中
      handleSelect();
    },
    [isMultiSelected, handleSelect],
  );

  const handleMouseDown = useCallback(
    async (e: any) => {
      e.cancelBubble = true; // 阻止事件冒泡到 Stage
      handleSelect(); // 立即选中并显示 Transformer
    },
    [isMultiSelected, handleSelect, cursor, selectedLayer],
  );

  useEffect(() => {
    setSize({ width, height });
    setCropRect({ x: cropX, y: cropY, width: cropWidth, height: cropHeight });
    const node = imageRef.current;
    node?.setAttrs({
      imgWidth,
      imgHeight,
    });
  }, [width, height, cropX, cropY, cropWidth, cropHeight, imgWidth, imgHeight]);

  if (!image) return null;

  return (
    <KonvaImage
      {...layer}
      id={id}
      image={image}
      draggable={cursor === 'default' ? true : false}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragMove={() => {}}
      onDragEnd={() => {}}
      onTransform={handleTransform}
      onTransformEnd={handleTransformEnd}
      ref={imageRef}
      width={size.width}
      height={size.height}
      cropX={cropRect.x}
      cropY={cropRect.y}
      cropWidth={cropRect.width}
      cropHeight={cropRect.height}
    />
  );
};

export default LayerImage;
