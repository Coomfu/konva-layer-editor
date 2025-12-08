import { Button, Slider } from 'antd';
import { useContext } from 'react';
import EditorContext from '../../context';
import PenIcon from '../../assets/pen.svg';
import EraserIcon from '../../assets/eraser.svg';
import InvertSelectionIcon from '../../assets/invert-selection.svg';
import { message } from 'antd';
import { cutByMask, getLayerCanvas, invertMask, isCanvasBlank } from '../../utils/canvas';
import { v4 as uuidv4 } from 'uuid';

const CutoutPanel = () => {
  const { selectedLayer, drawingCanvas, setCursor, imagesCache, saveImage } = useContext(EditorContext);

  const onCutOut = () => {
    if (!selectedLayer) {
      message.error('请先选择图层');
      return;
    }

    try {
      const image = getLayerCanvas({
        ...selectedLayer!,
        image: imagesCache?.[selectedLayer.fileId],
      });
      const mask = drawingCanvas?.instance.current;

      if (!image || !mask || !selectedLayer) return;

      if (isCanvasBlank(mask)) {
        message.error('请涂抹需要抠图的区域');
        return;
      }

      const result = cutByMask(image, mask);
      const fileUrl = result.toDataURL('image/png');
      saveImage?.({
        layer: {
          ...selectedLayer,
          fileId: uuidv4(),
          fileUrl,
        },
      });

      setCursor?.('default');
    } catch (err: any) {
      message.error(err.message || '抠图失败');
    }
  };

  const onSelectReverse = () => {
    const canvas = drawingCanvas?.instance.current;
    if (!canvas) return;
    invertMask(canvas);
    drawingCanvas.imageRef.current?.getLayer()?.batchDraw();
  };

  return (
    <div className="tool-bar-panel">
      <div className="panel-section">
        <div className="tool-buttons-compact">
          <div
            className={`tool-button-with-label ${drawingCanvas?.tool === 'brush' ? 'tool-button-selected' : ''}`}
            onClick={() => drawingCanvas?.setTool('brush')}>
            <PenIcon />
            <span className="tool-button-text">涂抹</span>
          </div>
          <div
            className={`tool-button-with-label ${drawingCanvas?.tool === 'eraser' ? 'tool-button-selected' : ''}`}
            onClick={() => drawingCanvas?.setTool('eraser')}>
            <EraserIcon />
            <span className="tool-button-text">擦除</span>
          </div>
          <div className="tool-button-with-label" onClick={onSelectReverse}>
            <InvertSelectionIcon />
            <span className="tool-button-text">反选</span>
          </div>
        </div>
      </div>

      <div className="panel-section vertical-slider-section">
        <div className="panel-label-small">大小</div>
        <Slider
          vertical
          style={{ height: 120 }}
          disabled={drawingCanvas?.tool !== 'brush' && drawingCanvas?.tool !== 'eraser'}
          max={40}
          min={1}
          value={drawingCanvas?.lineWidth}
          onChange={drawingCanvas?.setLineWidth}
        />
        <div className="slider-value">{drawingCanvas?.lineWidth}</div>
      </div>

      <Button type="primary" block size="large" onClick={onCutOut} className="panel-confirm-btn">
        确认抠图
      </Button>
    </div>
  );
};

export default CutoutPanel;
