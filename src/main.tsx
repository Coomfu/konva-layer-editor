import React from 'react';
import ReactDOM from 'react-dom/client';
import { App as AntdApp, ConfigProvider } from 'antd';
import App from './App.tsx';
import 'antd/dist/reset.css';
import zhCN from 'antd/locale/zh_CN';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider
    locale={zhCN}
    componentSize="small"
    theme={{
      token: {
        fontSize: 12,
      },
      components: {
        Select: {
          controlPaddingHorizontalSM: 10,
        },
        Button: {
          paddingInlineSM: 15,
        },
        Input: {
          paddingBlockSM: 1,
        },
      },
    }}>
    <AntdApp>
      <App />
    </AntdApp>
  </ConfigProvider>,
);
