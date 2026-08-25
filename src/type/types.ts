import type { ImageConfig } from 'konva/lib/shapes/Image';

export interface IObject<T> {
  [key: string]: T;
}

export interface Position {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface DragSelection {
  visible: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layer extends Omit<ImageConfig, 'image'> {
  fileId: string;
  fileUrl: string;
  id: string;
  visible: boolean;
  // 图片实际宽高
  imgWidth: number;
  imgHeight: number;
  // 图片被遮挡部分需要的属性
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
}

export type LayerImage = {
  fileId: string;
  fileUrl: string;
};

export type LayerHistory = {
  layerId: string;
  imgList?: LayerImage[];
  layerName: string;
};

export type Cursor = 'default' | 'cutout' | 'select' | 'expand' | 'merge' | 'dialog';
