import { useContext } from 'react';
import EditorContext from '../../context';
import { getLayersFileWithOverlay } from '../../utils/canvas';
import { message, Button } from 'antd';
import { loadImageOnce } from '../../hooks/useCachedImage';
import { v4 as uuidv4 } from 'uuid';

const MergePanel = () => {
  const { selectedLayers, setCursor, imagesCache = {}, addImage } = useContext(EditorContext);

  const onMerge = async () => {
    if (!selectedLayers || selectedLayers.length < 2) {
      message.error('请至少选择两个图层');
      return;
    }
    try {
      const file = await getLayersFileWithOverlay(
        selectedLayers.map((layer) => ({ ...layer, image: imagesCache?.[layer.fileId] })),
      );
      const fileUrl = URL.createObjectURL(file);
      loadImageOnce({ fileId: uuidv4(), fileUrl }).then(({ image }) => {
        addImage?.({ fileUrl, image });
        message.success('合并成功');
        setCursor?.('default');
      });
    } catch (error) {
      console.error(error);
      message.error('合并失败');
    }
  };

  return (
    <div className="tool-bar-panel">
      <div className="panel-section">
        <div className="panel-description">
          {selectedLayers && selectedLayers.length >= 2
            ? `已选择 ${selectedLayers.length} 个图层`
            : '请至少选择两个图层进行合并'}
        </div>
      </div>

      <Button type="primary" onClick={onMerge} className="panel-confirm-btn">
        合并
      </Button>
    </div>
  );
};

export default MergePanel;
