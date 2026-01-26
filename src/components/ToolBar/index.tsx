import { useContext } from 'react';
import EditorContext from '../../context';
import { Cursor } from '../../type/types';
import MoveIcon from '../../assets/move.svg';
import CutoutIcon from '../../assets/cutout.svg';
import ExpandIcon from '../../assets/expand.svg';
import MergeIcon from '../../assets/merge.svg';
import './index.scss';

const ToolBar = () => {
  const { setCursor, cursor, selectedIds, setSelectedIds } = useContext(EditorContext);

  const onChangeCursor = (newCursor: Cursor) => {
    if (newCursor === 'cutout' || newCursor === 'expand') {
      if (selectedIds && selectedIds.length > 1) {
        setSelectedIds?.([selectedIds[0]]);
      }
    }
    requestAnimationFrame(() => {
      setCursor?.(newCursor);
    });
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
    </div>
  );
};

export default ToolBar;
