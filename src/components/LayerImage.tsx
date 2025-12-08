import { useContext, useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { Image as KonvaImage } from 'react-konva';
import EditorContext from '../context';
import type { Layer, Position, Rect, Size } from '../type/types';
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

  const position = useRef<Position>({ x: layer.x, y: layer.y });
  // 图片拖拽框宽高
  const [size, setSize] = useState<Size>({ width, height });
  // 图片包含被遮挡部分的当前宽高，当作比例尺用
  const [imageSize, setImageSize] = useState<Size>({
    width: imgWidth,
    height: imgHeight,
  });
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
    if (!node) return;

    const anchor = transformerRef?.current?.getActiveAnchor();

    const scaleX = node.scaleX() < 0 ? -node.scaleX() : node.scaleX();
    const scaleY = node.scaleY() < 0 ? -node.scaleY() : node.scaleY();
    let newWidth = Math.min(Math.max(20, node.width() * scaleX), MAX_IMAGE_SIZE);
    let newHeight = Math.min(Math.max(20, node.height() * scaleY), MAX_IMAGE_SIZE);

    node.scaleX(1);
    node.scaleY(1);

    // 如果拖动四个角，那么就按比例改变
    if (anchor === 'top-left' || anchor === 'top-right' || anchor === 'bottom-left' || anchor === 'bottom-right') {
      if (newWidth >= MAX_IMAGE_SIZE) {
        newHeight = (newWidth * node.height()) / node.width();
      } else if (newHeight >= MAX_IMAGE_SIZE) {
        newWidth = (newHeight * node.width()) / node.height();
      }
      setImageSize({
        width: Number(((newWidth / size.width) * imageSize.width).toFixed(4)),
        height: Number(((newHeight / size.height) * imageSize.height).toFixed(4)),
      });
      node.setAttrs({
        imgWidth: Number(((newWidth / size.width) * imageSize.width).toFixed(4)),
        imgHeight: Number(((newHeight / size.height) * imageSize.height).toFixed(4)),
      });
    } else {
      // 拖动四条边
      const aspectRatio = newWidth / newHeight;
      const imageRatio = image.width / image.height;

      let newCropWidth = cropRect.width || image.width;
      let newCropHeight = cropRect.height || image.height;
      let newCropX = cropRect.x;
      let newCropY = cropRect.y;

      if (anchor === 'middle-left' || anchor === 'middle-right') {
        // 宽变大 -- 产品说禁止大过原图
        if (newWidth >= imageSize.width) {
          newWidth = imageSize.width;
          setImageSize({
            width: Number(newWidth.toFixed(4)),
            height: imageSize.height >= node.height() ? node.height() : Number((newWidth / imageRatio).toFixed(4)),
          });
          node.setAttrs({
            imgWidth: Number(newWidth.toFixed(4)),
            imgHeight: Number((newWidth / imageRatio).toFixed(4)),
          });
          newCropWidth = image.width;
          // newCropHeight = image.width / aspectRatio;
          newCropX = 0;
          newCropY = newCropY + (cropRect.height - newCropHeight) / 2; // 实际cropHeight是越变越小
        } else if (newWidth < imageSize.width) {
          // 宽缩小
          if (anchor === 'middle-left') {
            // 拖的左边
            newCropWidth = (newWidth / imageSize.width) * image.width;
            newCropX = newCropX - newCropWidth + cropRect.width;
          } else if (anchor === 'middle-right') {
            newCropWidth = (newWidth / imageSize.width) * image.width;
            // 拖右边时，如果宽度不够了，就要先把newCropX减到0
            if (newCropWidth + newCropX > image.width) {
              newCropX = newCropX - (newCropWidth + newCropX - image.width);
            }
          }
        }
      }

      if (anchor === 'top-center' || anchor === 'bottom-center') {
        // 高变大 -- 产品说禁止大过原图
        if (newHeight >= imageSize.height) {
          newHeight = imageSize.height;
          setImageSize({
            height: Number(newHeight.toFixed(4)),
            width: imageSize.width === node.width() ? node.width() : Number((newHeight * imageRatio).toFixed(4)),
          });
          node.setAttrs({
            imgWidth: Number((newHeight * imageRatio).toFixed(4)),
            imgHeight: Number(newHeight.toFixed(4)),
          });
          // newCropWidth = image.height * aspectRatio;
          newCropHeight = image.height;
          newCropY = 0;
          newCropX = newCropX + (cropRect.width - newCropWidth) / 2;
        } else if (newHeight < imageSize.height) {
          // 高缩小
          if (anchor === 'top-center') {
            // 拖的上边
            newCropHeight = (newHeight / imageSize.height) * image.height;
            newCropY = newCropY - newCropHeight + cropRect.height;
          } else if (anchor === 'bottom-center') {
            newCropHeight = (newHeight / imageSize.height) * image.height;
            if (newCropHeight + newCropY > image.height) {
              newCropY = newCropY - (newCropHeight + newCropY - image.height);
            }
          }
        }
      }

      newCropX = Math.max(0, newCropX);
      newCropY = Math.max(0, newCropY);

      position.current = { x: node.x(), y: node.y() };
      setCropRect({
        x: newCropX,
        y: newCropY,
        width: newCropWidth,
        height: newCropHeight,
      });
    }

    setSize({
      width: Number(newWidth.toFixed(4)),
      height: Number(newHeight.toFixed(4)),
    });
  }, [imageSize, size, cropRect, image]);

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
    setImageSize({ width: imgWidth, height: imgHeight });
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
