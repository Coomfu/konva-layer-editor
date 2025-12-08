# Konva Layer Editor

<p align="center">
  <strong>🎨 基于 Konva.js 和 React 的强大图层编辑器</strong>
</p>

<p align="center">
  <img src="./example.png" alt="界面预览" width="800" />
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用说明">使用说明</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#许可证">许可证</a>
</p>

---

## ✨ 功能特性

### 🖼️ 图层管理
- **多图层支持** - 同时处理多个图片图层
- **拖拽排序** - 基于 dnd-kit 的直观图层排序
- **显示/隐藏** - 一键切换图层可见性
- **多选操作** - 支持 Shift+点击 / Cmd+点击 多选
- **复制粘贴** - 快捷键复制粘贴图层 (Cmd+C / Cmd+V)

### 🎯 变换编辑
- **自由变换** - 拖拽控制点进行缩放、旋转、移动
- **图片裁剪** - 向内拖拽变换锚点裁剪图片
- **适应画布** - 自动缩放图层以适应画布大小

### ✂️ 抠图工具
- **画笔工具** - 可调节大小的画笔绘制选区蒙版
- **橡皮擦** - 擦除蒙版以精细调整选区
- **反选功能** - 快速反转蒙版选区
- **确认抠图** - 提取涂抹区域为新图层

### 🔄 历史记录
- **撤销/重做** - 完整的历史记录追踪
- **快捷键支持** - Cmd+Z / Cmd+Shift+Z 快速操作

### 📤 导出功能
- **单层导出** - 将单个图层下载为 PNG
- **批量导出** - 将所有图层打包为 ZIP 文件下载
- **图层合并** - 将多个图层合并为一个

### 🎮 视图控制
- **缩放控制** - 滚轮或按钮进行缩放
- **平移视图** - 轻松导航大型画布
- **适应视图** - 自动适配画布到视窗

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/Coomfu/konva-layer-editor.git

# 进入项目目录
cd konva-layer-editor

# 安装依赖
pnpm install
# 或
npm install

# 启动开发服务器
pnpm dev
# 或
npm run dev
```

## 💻 使用说明

1. **添加图片** - 点击上传按钮或拖拽图片到画布
2. **选择图层** - 点击画布中的图层或图层面板
3. **变换操作** - 使用变换控制点进行缩放/旋转
4. **抠图操作** - 切换到抠图模式，涂抹选区
5. **导出作品** - 下载为 PNG 或 ZIP 文件

### ⌨️ 快捷键

| 快捷键 | 操作 |
|--------|------|
| `Cmd/Ctrl + C` | 复制选中图层 |
| `Cmd/Ctrl + V` | 粘贴图层 |
| `Cmd/Ctrl + Z` | 撤销 |
| `Cmd/Ctrl + Shift + Z` | 重做 |
| `Delete / Backspace` | 删除选中图层 |
| `滚轮` | 平移 |
| `Ctrl + 滚轮或多指缩放` | 缩放 |

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **框架** | React 18 |
| **画布库** | Konva.js + react-konva |
| **UI 组件** | Ant Design 5 |
| **状态管理** | React Context |
| **拖拽排序** | dnd-kit |
| **构建工具** | Vite |
| **开发语言** | TypeScript |
| **样式方案** | SCSS |

## 📁 项目结构

```
src/
├── components/
│   ├── ControlBar/       # 顶部控制栏（缩放、导出）
│   ├── Panel/            # 右侧面板（图层、历史）
│   ├── ToolBar/          # 左侧工具栏（抠图、扩展、合并）
│   ├── LayerImage.tsx    # 单个图层渲染
│   ├── Transformer.tsx   # 变换控制点组件
│   └── Viewport.tsx      # 主画布视窗
├── hooks/
│   ├── useEditor.ts      # 核心编辑器逻辑
│   ├── useHistoryManager.ts  # 撤销/重做功能
│   ├── useLayerManager.ts    # 图层操作
│   ├── useKeyManager.ts      # 快捷键管理
│   └── useZoom.ts        # 缩放和平移控制
├── context/              # React Context 状态管理
├── type/                 # TypeScript 类型定义
└── utils/                # 工具函数
```

## 🤝 参与贡献

欢迎提交 Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加某个很棒的功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Coomfu">Coomfu</a>
</p>
