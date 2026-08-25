import { Button, Input, Modal, message } from 'antd';
import { ArrowUpOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import { useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import EditorContext from '../../context';
import { loadImageOnce } from '../../hooks/useCachedImage';
import { getLayerCanvas, getSafeCanvasSizeByMaxPngSize, resizeCanvas } from '../../utils/canvas';
import {
  DEFAULT_MODEL_CONFIG,
  ModelConfig,
  executeImageEdit,
  getStoredModelConfig,
  saveStoredModelConfig,
  wrapImageProxyUrl,
} from '../../services/imageEdit';

const DialogPanel = () => {
  const {
    selectedLayer,
    layers = [],
    selectedIds = [],
    setSelectedIds,
    imagesCache = {},
    addImage,
    setLoading,
    cursor,
  } = useContext(EditorContext);
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);

  // 模型配置状态
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG);
  const [editingConfig, setEditingConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG);

  // 目标图层：优先取选中的图层，若未手动选则默认兜底取顶层图层
  const activeLayer = selectedLayer || (layers.length > 0 ? layers[layers.length - 1] : null);

  useEffect(() => {
    const stored = getStoredModelConfig();
    setModelConfig(stored);
    setEditingConfig(stored);
  }, []);

  // 进入对话模式时，如果未选中任何图层但画布有图层，自动默认选中顶层图层
  useEffect(() => {
    if (cursor === 'dialog' && selectedIds.length === 0 && layers.length > 0) {
      setSelectedIds?.([layers[layers.length - 1].id]);
    }
  }, [cursor, selectedIds.length, layers, setSelectedIds]);

  if (!import.meta.env.DEV || cursor !== 'dialog') {
    return null;
  }

  const handleOpenConfig = () => {
    setEditingConfig({ ...modelConfig });
    setConfigModalVisible(true);
  };

  const handleSaveConfig = () => {
    if (!editingConfig.baseUrl.trim()) {
      message.error('API Base URL 不能为空');
      return;
    }
    if (!editingConfig.model.trim()) {
      message.error('Model 名称不能为空');
      return;
    }

    const saved = saveStoredModelConfig(editingConfig);
    setModelConfig(saved);
    setConfigModalVisible(false);
    message.success('模型配置已保存');
  };

  const handleResetConfig = () => {
    setEditingConfig({ ...DEFAULT_MODEL_CONFIG, apiKey: editingConfig.apiKey });
  };

  const runGenerate = async () => {
    const currentPrompt = prompt.trim();

    if (!currentPrompt) {
      message.warning('请输入提示词 (Prompt)');
      return;
    }

    const targetLayer = activeLayer;
    if (!targetLayer) {
      message.error('画布中暂无图层，请先上传或添加一张图片');
      return;
    }

    // 确保选中的状态与操作图层一致
    if (!selectedLayer || selectedLayer.id !== targetLayer.id) {
      setSelectedIds?.([targetLayer.id]);
    }

    if (!modelConfig.apiKey?.trim()) {
      message.warning('请先配置大模型 API Key');
      handleOpenConfig();
      return;
    }

    let image = imagesCache[targetLayer.fileId];
    if (!image) {
      try {
        const loaded = await loadImageOnce({ fileId: targetLayer.fileId, fileUrl: targetLayer.fileUrl });
        image = loaded.image;
      } catch {
        message.error('当前图层图片加载失败，请重试');
        return;
      }
    }

    const canvas = getLayerCanvas({
      ...targetLayer,
      image,
    });
    if (!canvas) {
      message.error('无法获取当前图层图片');
      return;
    }

    setGenerating(true);
    setLoading?.(true);

    try {
      const safeSize = getSafeCanvasSizeByMaxPngSize({
        width: canvas.width,
        height: canvas.height,
      });
      const inputCanvas =
        safeSize.width === canvas.width && safeSize.height === canvas.height
          ? canvas
          : resizeCanvas(canvas, safeSize.width, safeSize.height);
      const inputImageUrl = inputCanvas.toDataURL('image/png');

      const { outputImageUrl } = await executeImageEdit({
        baseUrl: modelConfig.baseUrl,
        apiKey: modelConfig.apiKey,
        model: modelConfig.model,
        prompt: currentPrompt,
        imageUrls: [inputImageUrl],
      });

      // 代理中转结果图片，避免外部 OSS 触发 Canvas 跨域污染
      const proxiedOutputImageUrl = wrapImageProxyUrl(outputImageUrl);

      const nextFileId = uuidv4();
      const { fileUrl, image: generatedImage } = await loadImageOnce({
        fileId: nextFileId,
        fileUrl: proxiedOutputImageUrl,
      });

      if (!generatedImage.width || !generatedImage.height) {
        throw new Error('生成结果图片加载失败');
      }

      await addImage?.({
        fileUrl,
        image: generatedImage,
      });

      message.success('图片生成完成');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '图片生成失败';
      message.error(errorMessage);
    } finally {
      setGenerating(false);
      setLoading?.(false);
    }
  };

  return (
    <>
      <div className="image-editor-dialog-prompt">
        <div className="dialog-prompt-shell">
          {/* 突出展示的顶层 Tab 栏 */}
          <div className="dialog-prompt-tabs">
            {activeLayer ? (
              <div className="dialog-prompt-tab-layer" title={`当前操作图层: ${activeLayer.name}`}>
                <img src={activeLayer.fileUrl} alt={activeLayer.name} />
                <span className="dialog-prompt-tab-layer-name">{activeLayer.name}</span>
              </div>
            ) : (
              <div className="dialog-prompt-tab-layer dialog-prompt-tab-layer-empty">
                <span className="dialog-prompt-tab-layer-name">未选择图层</span>
              </div>
            )}

            <div
              className={`dialog-prompt-tab-config ${!modelConfig.apiKey ? 'dialog-prompt-tab-config-warning' : ''}`}
              onClick={handleOpenConfig}
              title={modelConfig.apiKey ? `当前模型: ${modelConfig.model} (点击配置)` : '点击配置 API Key 和接口地址'}>
              <SettingOutlined />
              <span className="dialog-prompt-tab-config-name">
                {!modelConfig.apiKey ? '未配置 Key' : modelConfig.model}
              </span>
            </div>
          </div>

          <textarea
            className="dialog-prompt-textarea"
            value={prompt}
            placeholder={
              activeLayer
                ? `描述你希望对「${activeLayer.name}」做什么修改（例如：给主体戴上墨镜）`
                : '描述你希望对图片做什么修改'
            }
            disabled={generating}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                runGenerate();
              }
            }}
            autoFocus
          />

          <div className="dialog-prompt-footer">
            <Button
              type="primary"
              onClick={runGenerate}
              className="dialog-prompt-send-btn"
              loading={generating}
              disabled={!prompt.trim()}
              title="发送修改"
              icon={!generating ? <ArrowUpOutlined /> : undefined}
            />
          </div>
        </div>
      </div>

      <Modal
        title="大模型图像编辑配置"
        open={configModalVisible}
        onOk={handleSaveConfig}
        onCancel={() => setConfigModalVisible(false)}
        okText="保存配置"
        cancelText="取消"
        className="dialog-model-config-modal"
        destroyOnClose>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
          <div>
            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#334155' }}>API Base URL</div>
            <Input
              value={editingConfig.baseUrl}
              placeholder="https://api-inference.modelscope.cn"
              onChange={(e) => setEditingConfig({ ...editingConfig, baseUrl: e.target.value })}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              支持任意远程 URL 或自定义代理路径（开发服务器已配置安全代理以防止跨域阻拦）。
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#334155' }}>
              API Key / Access Token <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <Input.Password
              value={editingConfig.apiKey}
              placeholder="请输入 ModelScope Token 或 API 密钥"
              onChange={(e) => setEditingConfig({ ...editingConfig, apiKey: e.target.value })}
            />
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
              仅保存在本地浏览器 localStorage 中，不会上传至任何第三方服务器。
            </div>
          </div>

          <div>
            <div style={{ marginBottom: 6, fontWeight: 500, fontSize: 13, color: '#334155' }}>Model 名称</div>
            <Input
              value={editingConfig.model}
              placeholder="Qwen/Qwen-Image-Edit-2511"
              onChange={(e) => setEditingConfig({ ...editingConfig, model: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              onClick={handleResetConfig}
              style={{ padding: 0, color: '#64748b' }}>
              恢复默认
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DialogPanel;
