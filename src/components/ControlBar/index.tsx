import { Dropdown, Select } from 'antd';
import UndoIcon from '../../assets/undo.svg';
import RedoIcon from '../../assets/redo.svg';
import { useContext } from 'react';
import EditorContext from '../../context';
import { MAX_IMAGE_SIZE, MAX_VIEWPORT_SIZE, ZOOM_SCALE_OPTIONS } from '../../utils/const';
import Konva from 'konva';
import { getNewScalePoint } from '../../utils/utils';
import SizePanel from '../SizePanel';
import { DownOutlined } from '@ant-design/icons';
import './index.scss';
import classNames from 'classnames';
import SubToolBar from '../SubToolBar';

const ControlBar = () => {
  const {
    viewportSize = { width: 1024, height: 1024 },
    setViewportSize,
    historyManager,
    setZoomScale,
    zoomScale = 1,
    stageRef,
    setCursor,
    focusCenter,
    setSelectedIds,
    viewportPos = { x: 0, y: 0 },
    setIsAnimating,
  } = useContext(EditorContext);

  const onChangeZoomScale = (_: any, opt: any) => {
    if (opt.oriValue === 'auto') {
      focusCenter?.();
      return;
    }

    const scale = Number(opt.oriValue);
    const stage = stageRef?.current;
    if (!stage) return;

    setZoomScale?.(scale);

    const newPos = getNewScalePoint(stage, scale);

    const minX = (-viewportPos?.x - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * scale + stage.width();
    const maxX = (-viewportPos?.x + MAX_IMAGE_SIZE) * scale;
    const minY = (-viewportPos?.y - MAX_VIEWPORT_SIZE - MAX_IMAGE_SIZE) * scale + stage.height();
    const maxY = (-viewportPos?.y + MAX_IMAGE_SIZE) * scale;

    setIsAnimating?.(true);
    new Konva.Tween({
      node: stage,
      duration: 0.4,
      scaleX: scale,
      scaleY: scale,
      x: Math.max(Math.min(newPos.x, maxX), minX),
      y: Math.max(Math.min(newPos.y, maxY), minY),
      easing: Konva.Easings.EaseInOut,
      onFinish: () => {
        setIsAnimating?.(false);
      },
    }).play();
  };

  return (
    <div className="control-bar">
      <div className="flex-center-center control-bar-rect">
        <div className="control-bar-item">
          <Select
            style={{ width: '85px' }}
            value={`${Math.round(zoomScale * 100)}%`}
            onSelect={onChangeZoomScale}
            options={ZOOM_SCALE_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value === 'auto' ? 'auto' : `${Math.round(Number(opt.value) * 100)}%`,
              oriValue: opt.value,
            }))}
          />
        </div>
        <div
          className={classNames('control-bar-item', {
            'control-bar-item-disabled': !historyManager?.hasUndo,
          })}
          onClick={() => {
            if (!historyManager?.hasUndo) return;
            historyManager?.undo();
          }}>
          <UndoIcon />
        </div>
        <div
          className={classNames('control-bar-item', {
            'control-bar-item-disabled': !historyManager?.hasRedo,
          })}
          onClick={() => {
            if (!historyManager?.hasRedo) return;
            historyManager?.redo();
          }}>
          <RedoIcon />
        </div>
        <div className="control-bar-item">
          <Dropdown
            placement="bottom"
            trigger={['click']}
            dropdownRender={() => (
              <SizePanel size={viewportSize} setSize={({ width, height }) => setViewportSize?.({ width, height })} />
            )}>
            <div className="canvas-size-button" onClick={() => setSelectedIds?.([])}>
              <span>{`${viewportSize?.width}×${viewportSize?.height}`}</span>
              <DownOutlined />
            </div>
          </Dropdown>
        </div>
      </div>
      <SubToolBar />
    </div>
  );
};

export default ControlBar;
