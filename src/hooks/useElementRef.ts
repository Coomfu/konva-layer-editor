import { useRef } from 'react';
import Konva from 'konva';

const useElementRef = () => {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const mainLayerRef = useRef<Konva.Layer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return {
    stageRef,
    transformerRef,
    mainLayerRef,
    containerRef,
  };
};

export default useElementRef;
