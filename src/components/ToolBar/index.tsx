import { useContext, useRef } from 'react';
import EditorContext from '../../context';
import { Cursor } from '../../type/types';
import MoveIcon from '../../assets/move.svg';
import CutoutIcon from '../../assets/cutout.svg';
import ExpandIcon from '../../assets/expand.svg';
import MergeIcon from '../../assets/merge.svg';
import { DownloadOutlined, MessageOutlined, UploadOutlined } from '@ant-design/icons';
import { exportProjectToJson, importProjectFromJson } from '../../utils/project';
import { message } from 'antd';
import './index.scss';

const ToolBar = () => {
  const {
    setCursor,
    cursor,
    selectedIds,
    setSelectedIds,
    layers = [],
    setLayers,
    layersHistory = [],
    setLayersHistory,
    viewportSize = { width: 1024, height: 1024 },
    setViewportSize,
    imagesCache = {},
    setLoading,
  } = useContext(EditorContext);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onChangeCursor = (newCursor: Cursor) => {
    if (newCursor === 'cutout' || newCursor === 'expand' || newCursor === 'dialog') {
      if (selectedIds && selectedIds.length > 1) {
        setSelectedIds?.([selectedIds[0]]);
      }
    }
    requestAnimationFrame(() => {
      setCursor?.(newCursor);
    });
  };

  const handleExportJson = async () => {
    if (!layers || !layers.length) {
      message.warning('当前画布暂无图层数据');
      return;
    }

    try {
      await exportProjectToJson({
        layers,
        layersHistory,
        viewportSize,
        imagesCache,
      });
      message.success('工程数据已成功导出为 JSON 文件');
    } catch (err) {
      console.error('导出 JSON 失败:', err);
      message.error(err instanceof Error ? err.message : '导出 JSON 失败');
    }
  };

  const handleTriggerImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading?.(true);

    try {
      const result = await importProjectFromJson(file);
      setViewportSize?.(result.viewportSize);
      setLayers?.(result.layers);
      setLayersHistory?.(result.layersHistory);
      setSelectedIds?.(result.layers.length ? [result.layers[result.layers.length - 1].id] : []);
      message.success('工程数据已成功导入');
    } catch (err) {
      console.error('导入 JSON 失败:', err);
      message.error(err instanceof Error ? err.message : '导入 JSON 失败，请检查文件格式');
    } finally {
      setLoading?.(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const mainButtons = [
    {
      icon: <MoveIcon />,
      label: '移动',
      cursor: 'default' as Cursor,
    },
    {
      icon: <CutoutIcon />,
      label: '抠图',
      cursor: 'cutout' as Cursor,
    },
    {
      icon: <ExpandIcon />,
      label: '扩图',
      cursor: 'expand' as Cursor,
    },
    {
      icon: <MergeIcon />,
      label: '合并',
      cursor: 'merge' as Cursor,
    },
  ];

  if (import.meta.env.DEV) {
    mainButtons.push({
      icon: <MessageOutlined />,
      label: '对话',
      cursor: 'dialog' as Cursor,
    });
  }

  return (
    <div className="tool-bar">
      <div className="tool-bar-buttons">
        {mainButtons.map((button) => (
          <div
            key={button.cursor}
            className={`sidebar-button ${cursor === button.cursor ? 'sidebar-button-selected' : ''}`}
            onClick={() => onChangeCursor(button.cursor)}>
            <div className="sidebar-button-icon">{button.icon}</div>
            <div className="sidebar-button-label">{button.label}</div>
          </div>
        ))}
      </div>

      {/* 左下角导入与导出按钮 */}
      <div className="tool-bar-footer">
        <div className="sidebar-button sidebar-footer-button" onClick={handleTriggerImport} title="导入工程数据 (JSON)">
          <div className="sidebar-button-icon">
            <UploadOutlined style={{ fontSize: 17 }} />
          </div>
          <div className="sidebar-button-label">导入</div>
        </div>

        <div
          className={`sidebar-button sidebar-footer-button ${!layers.length ? 'sidebar-button-disabled' : ''}`}
          onClick={handleExportJson}
          title="导出工程数据 (JSON)">
          <div className="sidebar-button-icon">
            <DownloadOutlined style={{ fontSize: 17 }} />
          </div>
          <div className="sidebar-button-label">导出</div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};

export default ToolBar;
