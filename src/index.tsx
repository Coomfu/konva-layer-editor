import './index.scss';
import useEditor from './hooks/useEditor';
import EditorContext from './context';
import Panel from './components/Panel';
import Viewport from './components/Viewport';
import ControlBar from './components/ControlBar';
import ToolBar from './components/ToolBar';
import DialogPanel from './components/SubToolBar/DialogPanel';
import { Spin } from 'antd';

const Editor = () => {
  const editorState = useEditor();

  return (
    <EditorContext.Provider value={editorState}>
      <Spin spinning={editorState.loading} wrapperClassName="global-loading">
        <div className="image-editor">
          <ToolBar />
          <Panel />
          <ControlBar />
          <DialogPanel />
          <div className="image-editor-viewer">
            <Viewport
              style={{
                width: '100%',
                height: '100%',
              }}
            />
          </div>
        </div>
      </Spin>
    </EditorContext.Provider>
  );
};

export default Editor;
