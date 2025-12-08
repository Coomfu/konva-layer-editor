import { useContext, useState } from 'react';
import EditorContext from '../../context';
import {
  CheckCircleTwoTone,
  ExclamationCircleTwoTone,
  LoadingOutlined,
  HistoryOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { Spin } from 'antd';
import { getPureLayer } from '../../utils/utils';

const antIcon = <LoadingOutlined style={{ fontSize: 16 }} spin />;

const HistoryPanel = () => {
  const {
    layers = [],
    layersHistory,
    updateLayers,
    setSelectedIds,
    imagesCache = {},
    historyManager,
    imagesLoadingStatus,
    drawingCanvas,
  } = useContext(EditorContext);

  const [collapsed, setCollapsed] = useState(false);

  const onLayerImageChange = (id: string, fileId: string, fileUrl: string) => {
    const layer = layers.find((layer) => layer.id === id);
    const image = imagesCache[layer?.fileId || ''];
    const newImage = imagesCache[fileId];
    if (!newImage || !layer) {
      console.error(fileId, '图片未加载');
      return;
    }

    let width = newImage.width;
    let height = newImage.height;
    if (width > height) {
      width = Math.max(image.width, image.height);
      height = width / (newImage.width / newImage.height);
    } else {
      height = Math.max(image.width, image.height);
      width = height * (newImage.width / newImage.height);
    }

    const newLayer = {
      ...layer,
      fileId,
      fileUrl,
      image: newImage,
      cropWidth: (layer.cropWidth / image.width) * newImage.width,
      cropHeight: (layer.cropHeight / image.height) * newImage.height,
      cropX: ((layer.cropX || 0) / image.width) * newImage.width,
      cropY: ((layer.cropY || 0) / image.height) * newImage.height,
      width: (layer.width / image.width) * width,
      height: (layer.height / image.height) * height,
      imgWidth: (layer.imgWidth / image.width) * width,
      imgHeight: (layer.imgHeight / image.height) * height,
    };
    updateLayers?.([newLayer]);
    setSelectedIds?.([id]);
    drawingCanvas?.clear();
    historyManager?.addAction('changeNode', {
      preNodes: [getPureLayer(layer)],
      nextNodes: [getPureLayer(newLayer)],
    });
  };

  return (
    <div className={`history-layers ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel-section-header">
        <div className="section-title">
          <HistoryOutlined className="section-icon" />
          <span>生成历史</span>
        </div>
        {collapsed ? (
          <DownOutlined className="collapse-icon" onClick={() => setCollapsed(!collapsed)} />
        ) : (
          <UpOutlined className="collapse-icon" onClick={() => setCollapsed(!collapsed)} />
        )}
      </div>

      {!collapsed && (
        <div className="panel-section-content">
          {layersHistory?.map((history) => {
            const layer = layers.find((layer) => layer.id === history.layerId);
            if (!layer || !history?.imgList?.length) return null;
            return (
              <div key={history.layerId} className="history-group">
                <div className="history-group-title">{history?.layerName}</div>
                <div className="history-images">
                  {history.imgList?.map(({ fileId, fileUrl }) => (
                    <Spin key={fileId} spinning={imagesLoadingStatus?.[fileId] === true} indicator={antIcon}>
                      {imagesLoadingStatus?.[fileId] === 'error' ? (
                        <div className="history-image">
                          <img src={fileUrl}></img>
                          <ExclamationCircleTwoTone twoToneColor="#ff4d4f" />
                        </div>
                      ) : (
                        <div
                          className={`history-image ${fileId === layer?.fileId ? 'history-image-active' : ''}`}
                          onClick={() => {
                            if (fileId === layer?.fileId) return;
                            onLayerImageChange(history.layerId, fileId, fileUrl);
                          }}>
                          <img src={fileUrl}></img>
                          {fileId === layer?.fileId && <CheckCircleTwoTone twoToneColor="#1677ff" />}
                        </div>
                      )}
                    </Spin>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HistoryPanel;
