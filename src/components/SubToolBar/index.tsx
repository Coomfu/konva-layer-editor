import './index.scss';
import CutoutPanel from './CutoutPanel';
import ExpandPanel from './ExpandPanel';
import MergePanel from './MergePanel';
import EditorContext from '../../context';
import { useContext, useMemo } from 'react';

const SubToolBar = () => {
  const { cursor } = useContext(EditorContext);

  const renderPanel = useMemo(() => {
    switch (cursor) {
      case 'cutout':
        return <CutoutPanel />;
      case 'expand':
        return <ExpandPanel />;
      case 'merge':
        return <MergePanel />;
      default:
        return null;
    }
  }, [cursor]);

  return <div className="sub-tool-bar">{renderPanel}</div>;
};

export default SubToolBar;
