import React, { useContext, useEffect, useMemo, useState } from 'react';
import { App, Checkbox, Dropdown, Input, message, Modal, Space } from 'antd';
import {
  EllipsisOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  UploadOutlined,
  PlusCircleOutlined,
  PictureOutlined,
  AppstoreOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  KeyboardSensor,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToFirstScrollableAncestor, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import EditorContext from '../../context';
import { getFitLayer, getPureLayer } from '../../utils/utils';
import { loadImageOnce } from '../../hooks/useCachedImage';
import { isMacintosh } from '../../utils/const';
import { Cursor, Layer } from '../../type/types';
import classNames from 'classnames';
import { v4 as uuidv4 } from 'uuid';

// 可拖拽的图层项组件
const SortableLayerItem = ({
  layer,
  index,
  isSelected,
  onSelect,
  onAction,
  onToggleVisibility,
  cursor,
  selectedIds,
  totalLayers,
}: {
  layer: Layer;
  index: number;
  isSelected: boolean;
  onSelect?: (id: string) => void;
  onAction?: (key: string, layer: Layer) => void;
  onToggleVisibility?: (id: string) => void;
  cursor?: Cursor;
  selectedIds: string[];
  totalLayers: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className={classNames('layer', { 'layer-selected': isSelected })}
      onClick={() => onSelect?.(layer.id)}
      {...attributes}
      {...listeners}>
      <img className="layer-image-preview" src={layer.fileUrl} />
      <span className="layer-name">{layer.name}</span>
      <Space size={0}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'delete',
                label: '删除',
              },
              {
                key: 'up',
                label: '上移',
                disabled: index === 0,
              },
              {
                key: 'down',
                label: '下移',
                disabled: index === totalLayers - 1,
              },
              {
                key: 'fit',
                label: '自适应画布',
              },
            ],
            onClick: ({ key, domEvent }) => {
              domEvent.stopPropagation();
              onAction?.(key, layer);
            },
          }}>
          <EllipsisOutlined style={{ padding: 5 }} onClick={(e) => e.stopPropagation()} />
        </Dropdown>
        {layer.visible ? (
          <EyeOutlined
            style={{ padding: 5 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility?.(layer.id);
            }}
          />
        ) : (
          <EyeInvisibleOutlined
            style={{ padding: 5 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility?.(layer.id);
            }}
          />
        )}
        {cursor === 'merge' && (
          <Checkbox
            checked={selectedIds.includes(layer.id)}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(layer.id);
            }}
          />
        )}
      </Space>
    </div>
  );
};

const LayerPanel = () => {
  const { modal } = App.useApp();
  const {
    setLoading,
    layers = [],
    updateLayers,
    toggleLayer,
    selectedIds = [],
    setSelectedIds,
    historyManager,
    viewportPos = { x: 0, y: 0 },
    viewportSize = { width: 0, height: 0 },
    cursor,
    containerSize,
    removeLayer,
    moveLayer,
    keyManager,
    selectedLayers,
    imagesCache = {},
    addImage,
  } = useContext(EditorContext);
  const reverseLayers = useMemo(() => [...layers].reverse(), [layers]);

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 400, // 👈 长按时间（毫秒）
        tolerance: 5, // 👈 鼠标抖动容差（px）
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    // 找到原始数组中的索引位置
    const oldIndex = layers.findIndex((layer) => layer.id === active.id);
    const newIndex = layers.findIndex((layer) => layer.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      const layer = layers[oldIndex];
      moveLayer?.(layer, oldIndex, newIndex);

      // 记录历史操作
      historyManager?.addAction('moveLayer', {
        layer: getPureLayer(layer),
        preIndex: oldIndex,
        nextIndex: newIndex,
      });
    }
  };

  const onRemoveLayer = (targetLayers: Layer[]) => {
    removeLayer?.(targetLayers);
    historyManager?.addAction('undoCreateLayer', {
      layers: targetLayers,
      indexes: targetLayers.map((l) => layers.findIndex((tl) => tl.id === l.id)),
      preSelectedIds: selectedIds,
    });
  };

  const moveUpLayer = (layer: Layer) => {
    const index = layers.findIndex((l) => l.id === layer.id);
    moveLayer?.(layer, index, index - 1);
    historyManager?.addAction('moveLayer', {
      layer: getPureLayer(layer),
      nextIndex: index - 1,
      preIndex: index,
    });
  };

  const moveDownLayer = (layer: Layer) => {
    const index = layers.findIndex((l) => l.id === layer.id);
    moveLayer?.(layer, index, index + 1);
    historyManager?.addAction('moveLayer', {
      layer: getPureLayer(layer),
      nextIndex: index + 1,
      preIndex: index,
    });
  };

  const fitLayer = (layer: Layer) => {
    const image = imagesCache[layer?.fileId || ''];
    const newLayer = {
      ...getFitLayer({
        id: layer.id,
        viewportPos,
        viewportSize,
        name: layer.name,
        image,
        fileUrl: layer.fileUrl,
      }),
      visible: layer.visible,
    };
    updateLayers?.([newLayer]);
    historyManager?.addAction('changeNode', {
      preNodes: [getPureLayer(layer)],
      nextNodes: [getPureLayer(newLayer)],
    });
  };

  const onLayerAdd = (e: any) => {
    if (e.key === 'upload') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png, image/jpeg, image/jpg';
      input.style.display = 'none';

      // 插入 DOM，触发点击
      document.body.appendChild(input);
      input.click();

      input.onchange = () => {
        const file = input.files?.[0];
        if (file) {
          const fileUrl = URL.createObjectURL(file);

          loadImageOnce({ fileId: uuidv4(), fileUrl }).then(({ fileUrl, image }) => {
            addImage?.({ fileUrl, image });
          });
          return;
        } else {
          console.error('未选择任何文件');
        }

        // 清理 DOM
        input.remove();
      };

      input.onerror = (e) => {
        input.remove();
        console.error('文件选择失败');
      };
    } else if (e.key === 'network') {
      let tempUrl = '';
      modal.confirm({
        title: '请输入图片网络地址',
        content: (
          <Input
            placeholder="请输入"
            onChange={(e) => {
              tempUrl = e.target.value;
            }}
          />
        ),
        onOk() {
          if (tempUrl) {
            setLoading?.(true);
            loadImageOnce({ fileId: uuidv4(), fileUrl: tempUrl })
              .then(({ fileUrl, image }) => {
                addImage?.({ fileUrl, image });
              })
              .finally(() => {
                setLoading?.(false);
              });
          }
        },
      });
    }
  };

  const onLayerAction = (key: string, layer: any) => {
    if (key === 'delete') {
      onRemoveLayer([layer]);
    } else if (key === 'up') {
      moveDownLayer?.(layer);
    } else if (key === 'down') {
      moveUpLayer?.(layer);
    } else if (key === 'fit') {
      fitLayer(layer);
    }
  };

  const onLayerSelect = (id: string) => {
    if (keyManager?.keycon.shiftKey && cursor === 'default') {
      if (selectedIds.includes(id)) {
        setSelectedIds?.(selectedIds.filter((target) => target !== id));
      } else {
        setSelectedIds?.([...selectedIds, id]);
      }
    } else if (cursor === 'merge') {
      if (selectedIds.includes(id)) {
        setSelectedIds?.(selectedIds.filter((target) => target !== id));
      } else {
        setSelectedIds?.([...selectedIds, id]);
      }
    } else {
      setSelectedIds?.([id]);
    }
  };

  const onLayerToggleVisibility = (id: string) => {
    const layer = layers.find((layer) => layer.id === id);
    if (!layer) return;
    toggleLayer?.(layer);
    historyManager?.addAction('changeNode', {
      preNodes: [getPureLayer({ ...layer, visible: layer.visible })],
      nextNodes: [getPureLayer({ ...layer, visible: !layer.visible })],
    });
  };

  useEffect(() => {
    keyManager?.registerKey({
      keys: [isMacintosh ? 'backspace' : 'delete'],
      callback: () => {
        if (selectedLayers?.length) {
          onRemoveLayer(selectedLayers);
        }
      },
    });

    return () => {
      keyManager?.unregisterKey({ keys: [isMacintosh ? 'backspace' : 'delete'] });
    };
  }, [selectedLayers]);

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={collapsed ? 'collapsed' : ''}>
      <div className="panel-section-header">
        <div className="section-title">
          <AppstoreOutlined className="section-icon" />
          <span>图层</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Dropdown
            trigger={['click']}
            menu={{
              onClick: onLayerAdd,
              items: [
                { label: '本地上传', icon: <UploadOutlined />, key: 'upload' },
                { label: '网络图片', icon: <PictureOutlined />, key: 'network' },
              ],
            }}>
            <div className="add-layer-button" onClick={(e) => e.stopPropagation()} title="新建图层">
              <PlusCircleOutlined />
            </div>
          </Dropdown>
          {collapsed ? (
            <DownOutlined className="collapse-icon" onClick={() => setCollapsed(!collapsed)} />
          ) : (
            <UpOutlined className="collapse-icon" onClick={() => setCollapsed(!collapsed)} />
          )}
        </div>
      </div>

      {!collapsed && (
        <DndContext
          sensors={sensors}
          onDragEnd={handleDragEnd}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}>
          <SortableContext items={layers.map((layer) => layer.id)} strategy={verticalListSortingStrategy}>
            <div className="layers">
              {reverseLayers.map((layer, index) => (
                <SortableLayerItem
                  key={layer.id}
                  layer={layer}
                  index={index}
                  isSelected={selectedIds.includes(layer.id)}
                  onSelect={onLayerSelect}
                  onAction={onLayerAction}
                  onToggleVisibility={onLayerToggleVisibility}
                  cursor={cursor}
                  selectedIds={selectedIds}
                  totalLayers={layers.length}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default LayerPanel;
