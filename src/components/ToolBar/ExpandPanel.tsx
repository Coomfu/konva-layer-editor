import { useContext, useEffect } from 'react';
import EditorContext from '../../context';
import { getExpandRect } from '../../utils/utils';
import { Button, message, Select } from 'antd';
import { EXPAND_RATIO_OPTIONS, EXPAND_TIMES_OPTIONS, MAX_IMAGE_SIZE } from '../../utils/const';
import { getLayerCanvas } from '../../utils/canvas';
import { v4 as uuidv4 } from 'uuid';

const ExpandPanel = () => {
  const { selectedLayer, expandState, setCursor, imagesCache = {}, saveImage } = useContext(EditorContext);

  const onExpand = async () => {
    if (!selectedLayer) {
      message.error('请先选择图层');
      return;
    }

    try {
      const {
        width: expandWidth,
        height: expandHeight,
        x: expandX,
        y: expandY,
      } = getExpandRect(selectedLayer, expandState);

      const image = await getLayerCanvas({ ...selectedLayer, image: imagesCache?.[selectedLayer.fileId] });
      if (!image) {
        message.error('无法获取图层图像');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = expandWidth;
      canvas.height = expandHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        message.error('无法创建画布');
        return;
      }

      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, expandWidth, expandHeight);
      ctx.drawImage(
        image,
        (expandWidth - selectedLayer.width) / 2,
        (expandHeight - selectedLayer.height) / 2,
        selectedLayer.width,
        selectedLayer.height,
      );
      const fileUrl = canvas.toDataURL('image/png');

      saveImage?.({
        layer: {
          ...selectedLayer,
          fileUrl,
          fileId: uuidv4(),
          x: expandX,
          y: expandY,
          width: expandWidth,
          height: expandHeight,
        },
      });

      setCursor?.('default');
      message.success('扩图完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '扩图失败');
      console.error(error);
    }
  };

  const isOptionRatioDisabled = (item: { label: string; value: number }) => {
    if (!selectedLayer) return true;
    const expandRect = getExpandRect(selectedLayer, {
      type: 'custom',
      ratio: item.value,
    });
    return expandRect.width > MAX_IMAGE_SIZE || expandRect.height > MAX_IMAGE_SIZE;
  };

  const isOptionTimesDisabled = (item: { label: string; value: number }) => {
    if (!selectedLayer) return true;
    const expandRect = getExpandRect(selectedLayer, {
      type: 'original',
      times: item.value,
    });
    return expandRect.width > MAX_IMAGE_SIZE || expandRect.height > MAX_IMAGE_SIZE;
  };

  const originalExpandOptions = EXPAND_TIMES_OPTIONS.map((item) => ({
    label: item.label,
    value: item.value,
    disabled: isOptionTimesDisabled(item),
  }));

  useEffect(() => {
    if (selectedLayer) {
      expandState?.setType('custom');
      expandState?.setRatioStr('1:1');
      expandState?.setRatio(1);
    } else {
      expandState?.setType(undefined);
      expandState?.setRatioStr(undefined);
      expandState?.setRatio(undefined);
    }
  }, [selectedLayer]);

  return (
    <div className="tool-bar-panel">
      <div className="panel-section">
        <div className="panel-label-small">原始</div>
        <Select
          className="mb-4"
          style={{ width: '100%' }}
          size="small"
          disabled={expandState?.type !== 'original'}
          options={originalExpandOptions}
          value={expandState?.times}
          onChange={(value) => expandState?.setTimes(value)}
        />
        <div
          className={`ratio-button-compact ${expandState?.type === 'original' ? 'ratio-button-selected' : ''}`}
          onClick={() => {
            if (!selectedLayer) {
              message.error('请先选择图层');
              return;
            }
            if (originalExpandOptions.every((item) => item.disabled)) {
              message.error('当前图层进行原始尺寸扩图后将超出最大尺寸');
              return;
            }
            expandState?.setType('original');
            expandState?.setTimes(1.5);
          }}>
          原始
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-label-small">比例</div>
        <div className="ratio-buttons-compact">
          {EXPAND_RATIO_OPTIONS.map((item) => (
            <div
              key={item.label}
              className={`ratio-button-compact ${expandState?.ratioStr === item.label && expandState?.type === 'custom' ? 'ratio-button-selected' : ''} ${isOptionRatioDisabled(item) ? 'ratio-button-disabled' : ''}`}
              onClick={() => {
                if (!selectedLayer) {
                  message.error('请先选择图层');
                  return;
                }
                if (isOptionRatioDisabled(item)) {
                  message.error('当前图层进行该比例扩图后将超出最大尺寸');
                  return;
                }
                expandState?.setType('custom');
                expandState?.setRatioStr(item.label);
                expandState?.setRatio(item.value);
              }}>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <Button type="primary" block size="large" onClick={onExpand} className="panel-confirm-btn">
        确认扩图
      </Button>
    </div>
  );
};

export default ExpandPanel;
