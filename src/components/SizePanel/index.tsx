import React, { useEffect, useState } from 'react';
import './index.scss';
import { IMAGE_RATIO_OPTIONS, MAX_VIEWPORT_SIZE, MIN_VIEWPORT_SIZE } from '../../utils/const';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { InputNumber } from 'antd';
import classNames from 'classnames';

const validateNumber = (num: number) => {
  return Math.max(Math.min(Math.round(num), MAX_VIEWPORT_SIZE), MIN_VIEWPORT_SIZE);
};

const SizePanel: React.FC<{
  size: { width: number; height: number };
  // 自定义输入的时候就不会有ratio
  setSize: (size: { width: number; height: number; ratio?: string }) => void;
  disabledInput?: boolean;
}> = ({ size, setSize, disabledInput = false }) => {
  const [width, setWidth] = useState<number>(size.width ?? 1024);
  const [height, setHeight] = useState<number>(size.height ?? 1024);
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [lockRatio, setLockRatio] = useState<number>(1);

  const handleWidthChange = (value: number) => {
    const newWidth = value;
    setWidth(newWidth);
    if (isLocked) {
      setHeight(validateNumber(newWidth / lockRatio));
    }
  };

  const handleHeightChange = (value: number) => {
    const newHeight = value;
    setHeight(newHeight);
    if (isLocked) {
      setWidth(validateNumber(newHeight * lockRatio));
    }
  };

  const getRatioIconStyle = ({ width, height }: { width: number; height: number }) => {
    const maxSize = 32;
    const ratio = width / height;

    let iconWidth, iconHeight;
    if (ratio >= 1) {
      iconWidth = maxSize;
      iconHeight = maxSize / ratio;
    } else {
      iconWidth = maxSize * ratio;
      iconHeight = maxSize;
    }

    return {
      width: `${iconWidth}px`,
      height: `${iconHeight}px`,
    };
  };

  useEffect(() => {
    setLockRatio(size.width / size.height);
  }, [size]);

  return (
    <div className="size-panel">
      <div className="size-panel-section">
        <div className="size-panel-title">画布尺寸</div>
        <div className={classNames('size-panel-dimensions', { disabled: disabledInput })}>
          <div className="dimension-input">
            <span className="dimension-label">W :</span>
            <InputNumber
              value={width}
              disabled={disabledInput}
              onKeyDown={(e) => {
                if (
                  !/^\d*$/.test(e.key) &&
                  !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
                ) {
                  e.preventDefault();
                }
              }}
              onChange={(value) => handleWidthChange(Number(value) ?? 1)}
              onBlur={(e) => {
                const value = Number(e.target.value);
                setSize({
                  width: validateNumber(value),
                  height: validateNumber(isLocked ? value / lockRatio : height),
                });
              }}
              className="dimension-field"
              maxLength={4}
              max={MAX_VIEWPORT_SIZE}
              min={MIN_VIEWPORT_SIZE}
              controls={false}
            />
          </div>
          <div
            className="lock-icon"
            onClick={() => {
              setIsLocked(!isLocked);
              if (!isLocked) {
                setLockRatio(width / height);
              }
            }}>
            {isLocked || disabledInput ? <LockOutlined /> : <UnlockOutlined />}
          </div>
          <div className="dimension-input">
            <span className="dimension-label">H :</span>
            <InputNumber
              value={height}
              disabled={disabledInput}
              onKeyDown={(e) => {
                if (
                  !/^\d*$/.test(e.key) &&
                  !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)
                ) {
                  e.preventDefault();
                }
              }}
              onChange={(value) => handleHeightChange(Number(value) ?? 1)}
              onBlur={(e) => {
                const value = Number(e.target.value);
                setSize({
                  width: validateNumber(isLocked ? value * lockRatio : width),
                  height: validateNumber(value),
                });
              }}
              className="dimension-field"
              maxLength={4}
              max={MAX_VIEWPORT_SIZE}
              min={MIN_VIEWPORT_SIZE}
              controls={false}
            />
          </div>
        </div>
      </div>

      <div className="size-panel-section">
        <div className="size-panel-title">画布比例</div>
        <div className="ratio-grid">
          {IMAGE_RATIO_OPTIONS.map((option) => (
            <div
              key={option.label}
              className="ratio-option"
              onClick={() => {
                setWidth(option.width);
                setHeight(option.height);
                setSize({ width: option.width, height: option.height, ratio: option.label });
              }}>
              <div className="ratio-icon">
                <div className="ratio-shape" style={getRatioIconStyle(option)} />
              </div>
              <div className="ratio-label">{option.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SizePanel;
