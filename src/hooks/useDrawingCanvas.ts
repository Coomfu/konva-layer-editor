import Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { Cursor } from '../type/types';

export type DrawingCanvas = {
  instance: React.RefObject<HTMLCanvasElement>;
  context: CanvasRenderingContext2D;
  setLineWidth: (width: number) => void;
  tool: 'brush' | 'eraser';
  setTool: (tool: 'brush' | 'eraser') => void;
  lineWidth: number;
  imageRef: React.RefObject<Konva.Image>;
  clear: () => void;
};

const useDrawingCanvas = ({
  width,
  height,
  cursor,
}: {
  width: number;
  height: number;
  cursor: Cursor;
}): Required<DrawingCanvas> => {
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [lineWidth, setLineWidth] = useState(10);
  const imageRef = useRef<Konva.Image | null>(null);

  const canvas = useRef(document.createElement('canvas'));
  const context = canvas.current.getContext('2d', { willReadFrequently: true })!;
  context.strokeStyle = '#61a8f8';
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.lineWidth = 5;
  context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

  const clear = () => {
    canvas.current.getContext('2d')?.clearRect(0, 0, canvas.current.width, canvas.current.height);
  };

  useEffect(() => {
    canvas.current.width = width;
    canvas.current.height = height;
  }, [width, height]);

  useEffect(() => {
    context.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    context.lineWidth = lineWidth;
  }, [lineWidth, tool]);

  useEffect(() => {
    clear();
    setTool('brush');
  }, [cursor]);

  return {
    instance: canvas,
    context,
    tool,
    setTool,
    lineWidth,
    setLineWidth,
    imageRef,
    clear,
  };
};

export default useDrawingCanvas;
