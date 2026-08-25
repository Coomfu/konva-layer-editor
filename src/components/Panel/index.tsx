import { useContext, useState } from 'react';
import { Button, Dropdown, Select, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import EditorContext from '../../context';
import type { Layer } from '../../type/types';
import { getLayerData, getLayerFile } from '../../utils/canvas';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import HistoryPanel from './History';
import LayerPanel from './Layer';
import './index.scss';

const Menu = () => {
  const {
    layers = [],
    selectedIds = [],
    selectedLayers = [],
    viewportPos,
    viewportSize = { width: 1024, height: 1024 },
    stageRef,
    mainLayerRef,
    imagesCache = {},
  } = useContext(EditorContext);

  const [exportFormat, setExportFormat] = useState<'PNG' | 'JPG'>('PNG');
  const [exportContent, setExportContent] = useState<'selectedLayers' | 'allLayers' | 'canvas'>('selectedLayers');

  const exportLayers = async (layersToExport: Layer[]) => {
    const zip = new JSZip();

    if (layersToExport.length === 1) {
      const file = await getLayerFile(
        { ...layersToExport[0], image: imagesCache?.[layersToExport[0].fileId] },
        exportFormat,
      );
      saveAs(file, exportFormat === 'PNG' ? 'export.png' : 'export.jpg');
      return;
    }

    for (let i = 0; i < layersToExport.length; i++) {
      try {
        const blob = await getLayerData(
          { ...layersToExport[i], image: imagesCache?.[layersToExport[i].fileId] },
          exportFormat,
        );
        const ext = exportFormat === 'JPG' ? 'jpg' : 'png';
        zip.file(`image_${i + 1}.${ext}`, blob);
      } catch (err) {
        console.error(`处理第 ${i + 1} 张图失败:`, err);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, 'images.zip');
  };

  const exportCanvas = () => {
    const stage = stageRef?.current;
    const mainLayer = mainLayerRef?.current;
    if (!stage || !mainLayer) return;

    const scale = stage.scaleX();
    const pos = stage.position();
    const png = mainLayer.toDataURL({
      mimeType: exportFormat === 'PNG' ? 'image/png' : 'image/jpeg',
      x: (viewportPos?.x || 0) * scale + pos.x,
      y: (viewportPos?.y || 0) * scale + pos.y,
      width: Math.ceil((viewportSize?.width || 0) * scale),
      height: Math.ceil((viewportSize?.height || 0) * scale),
      pixelRatio: 1 / scale,
    });
    const a = document.createElement('a');
    a.href = png;
    a.download = exportFormat === 'PNG' ? 'export.png' : 'export.jpg';
    a.click();
  };

  const onExport = () => {
    if (exportContent === 'canvas') exportCanvas();
    else if (exportContent === 'selectedLayers') {
      if (!selectedIds.length) {
        message.error('没有选中图层');
        return;
      }
      exportLayers(selectedLayers);
    } else {
      if (!layers.length) {
        message.error('没有图层');
        return;
      }
      exportLayers(layers);
    }
  };

  return (
    <div className="layer-panel">
      {/* 导出图片section */}
      <div className="export-section">
        <Dropdown
          placement="bottomRight"
          trigger={['click']}
          dropdownRender={() => (
            <div className="layer-panel-export-dropdown">
              <div className="export-option-row">
                <span className="export-label">格式：</span>
                <Select
                  size="small"
                  value={exportFormat}
                  style={{ flex: 1 }}
                  onSelect={setExportFormat}
                  options={[
                    { label: 'PNG', value: 'PNG' },
                    { label: 'JPG', value: 'JPG' },
                  ]}
                />
              </div>
              <div className="export-option-row">
                <span className="export-label">内容：</span>
                <Select
                  size="small"
                  value={exportContent}
                  style={{ flex: 1 }}
                  onSelect={setExportContent}
                  options={[
                    { label: '选中图层', value: 'selectedLayers' },
                    { label: '所有图层', value: 'allLayers' },
                    { label: '当前画布', value: 'canvas' },
                  ]}
                />
              </div>
            </div>
          )}>
          <Button className="w100" onClick={onExport} type="primary" disabled={!selectedIds.length}>
            <DownloadOutlined />
            <span>导出图片</span>
          </Button>
        </Dropdown>
      </div>

      <HistoryPanel />
      <LayerPanel />
    </div>
  );
};

export default Menu;
