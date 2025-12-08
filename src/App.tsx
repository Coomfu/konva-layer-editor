import { Layout } from 'antd';
import Editor from './index';
import './App.scss';

const { Content } = Layout;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Content>
        <div style={{ height: '100vh' }}>
          <Editor />
        </div>
      </Content>
    </Layout>
  );
}

export default App;
