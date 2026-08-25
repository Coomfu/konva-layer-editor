import { createContext, createRef } from 'react';
import type { Cursor, Layer, LayerHistory, Position, Size } from '../type/types';
import Konva from 'konva';
import type { HistoryManager } from '../hooks/useHistoryManager';
import { DrawingCanvas } from '../hooks/useDrawingCanvas';
import { ExpandState } from '../hooks/useExpand';
import { KeyManager } from '../hooks/useKeyManager';

export type EditorContextType = {
  // 基础状态
  cursor?: Cursor;
  setCursor?: React.Dispatch<React.SetStateAction<Cursor>>;
  loading?: boolean;
  setLoading?: React.Dispatch<React.SetStateAction<boolean>>;
  isAnimating?: boolean;
  setIsAnimating?: React.Dispatch<React.SetStateAction<boolean>>;

  // 图层管理
  layers?: Layer[];
  setLayers?: React.Dispatch<React.SetStateAction<Layer[]>>;
  selectedLayer?: Layer | null;
  selectedLayers?: Layer[];
  toggleLayer?: (layer: Layer) => void;
  updateLayers?: (nodes: any[]) => void;
  removeLayer?: (layers: Layer[]) => void;
  moveLayer?: (layer: Layer, nextIndex: number, preIndex: number) => void;
  focusLayer?: (id?: string) => void;
  focusCenter?: () => void;
  selectedIds?: string[];
  setSelectedIds?: React.Dispatch<React.SetStateAction<string[]>>;
  setLayersHistory?: React.Dispatch<React.SetStateAction<LayerHistory[]>>;

  // 尺寸和位置
  viewportSize?: Size;
  viewportPos?: Position;
  containerSize?: Size;
  setViewportSize?: React.Dispatch<React.SetStateAction<Size>>;

  // DOM 引用
  containerRef: React.RefObject<HTMLDivElement>;
  stageRef: React.RefObject<Konva.Stage>;
  transformerRef: React.RefObject<Konva.Transformer>;
  mainLayerRef: React.RefObject<Konva.Layer>;

  // 缩放控制
  zoomScale?: number;
  setZoomScale?: React.Dispatch<React.SetStateAction<number>>;

  // 历史管理
  historyManager?: HistoryManager;
  layersHistory?: LayerHistory[];

  // 资源管理
  imagesCache?: { [id: string]: HTMLImageElement };
  imagesLoadingStatus?: { [id: string]: boolean | 'error' };
  drawingCanvas?: DrawingCanvas;

  // 扩展状态
  expandState?: ExpandState;

  // 快捷键管理
  keyManager?: KeyManager;

  // 保存图片
  saveImage?: (params: { layer: Layer }) => Promise<void>;
  addImage?: ({ fileUrl, image }: { fileUrl: string; image: HTMLImageElement }) => Promise<void>;
};

const EditorContext = createContext<EditorContextType>({
  stageRef: createRef<Konva.Stage>(),
  transformerRef: createRef<Konva.Transformer>(),
  mainLayerRef: createRef<Konva.Layer>(),
  containerRef: createRef<HTMLDivElement>(),
});

export default EditorContext;
