<div align="center">
  <img src="assets/logo.svg" alt="WhisperShannon Logo" width="150" />
  <h1>WhisperShannon</h1>
</div>

专为语言学习者打造的交互式音频转录播放器。导入任意音频文件，让 [WhisperX](https://github.com/m-bain/whisperX) 生成单词级别的时间戳，并通过每一词皆可点击的同步字幕进行高效学习。

本项目最初为法语和西班牙语学习者设计，但完美支持 WhisperX 能够识别的**任何语言**。

---

## ✨ 核心特性

- **单词级同步** — 播放音频时，实时高亮当前正在读的单词。
- **点击即跳转** — 点击任意单词或句子，音频即可瞬间跳转至对应位置。
- **A-B 段复读** — 自由标记起止位置，支持无限次循环播放同一片段。
- **播放速度控制** — 提供 0.5× / 0.75× / 1× / 1.25× 多档变速。
- **全局快捷键** — `空格键 (Space)` 播放/暂停，`←` / `→` 在音频中后退/前进 3 秒。
- **个人磁带库** — 集中管理、快速访问你的所有音频及字幕记录。

---

## 🛠️ 环境依赖

| 依赖项 | 说明 |
|---|---|
| **Python 3.9+** | 必须已添加到系统环境变量 `PATH` 中。 |
| **whisperX** | 首次运行前需手动安装（详见下文）。 |
| **Node.js 18+** | 仅在首次构建前端页面时需要；[前往 nodejs.org](https://nodejs.org) |
| **ffmpeg** | whisperX 运行必需组件；[前往 ffmpeg.org](https://ffmpeg.org/download.html) |

> 提示：在首次成功运行之后，日常使用仅需 Python 和 whisperX 环境。

### 安装 whisperX

```bash
# CPU 环境（速度较慢，不需要 GPU）
pip install whisperx

# NVIDIA GPU 环境（推荐处理较长的音频文件）
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install whisperx
```

> 在搭载 Apple Silicon 的 macOS 设备上，使用 CPU 安装方式即可流畅运行。较新版本的 whisperX 会自动调用 `mps` 硬件加速。

---

## 🚀 快速开始

```bash
# 1. 克隆代码库
git clone https://github.com/your-username/WhisperShannon.git
cd WhisperShannon

# 2. 运行程序 (Mac / Linux 终端)
python3 start.py

# 2. 运行程序 (Windows 使用终端运行，或直接双击 start.bat)
python start.py
```

`start.py` 脚本将会自动执行以下流程：
1. 验证当前 Python 环境中是否成功安装了 whisperX。
2. 安装 FastAPI / uvicorn 等轻量级且快速的后端依赖。
3. 自动构建前端文件（需要安装 npm，仅在首次运行时执行）。
4. 在你的默认浏览器中自动打开 `http://localhost:8000`。

---

## 📖 使用说明

1. 点击网页上的 **新建磁带**。
2. 将所需的音频文件拖拽入识别区域 (支持 MP3, WAV, FLAC, M4A, … 等格式)。
3. 选择音频对应的语言，然后点击 **开始分析**。
4. 等待 WhisperX 处理完成（具体耗时取决于文件长度和你电脑的硬件性能）。
5. 播放器将自动开启 —— 点击任意单词即可跳转，设置 A/B 点即可复读。

---

## ⚙️ 工作原理

```text
音频文件
    │
    └─ WhisperX ──► 生成包含单词级时间戳的 JSON 数据
                            │
                     FastAPI 后端服务
                            │
                     React 播放器 ──► 捕获单词点击 → 执行跳转
                                      监听时间更新 → 单词高亮
```

**隐私保障**：所有数据处理均在本地设备上进行，绝不会将你的任何音频上传至云端服务器。

---

## 📁 项目结构

```text
WhisperShannon/
├── start.py                  ← 跨平台启动入口 (Mac/Windows/Linux)
├── start.sh                  ← macOS/Linux 的 Shell 启动脚本
├── start.bat                 ← Windows 批处理启动脚本
├── backend/
│   ├── main.py               ← FastAPI 应用程序主入口，处理静态文件路由
│   ├── processors/
│   │   └── whisperx_proc.py  ← WhisperX 转录与强制对齐逻辑
│   └── requirements.txt
└── frontend/
    └── src/
        ├── components/
        │   ├── HomePage.jsx
        │   ├── NewTapePage.jsx
        │   ├── ProcessingPage.jsx
        │   └── PlayerPage.jsx
        └── index.css
```

---

## 💻 开发者指南

若想在开发模式下分别运行前端和后端（支持热重载）：

```bash
# 终端 1 — 启动后端
cd backend
uvicorn main:app --reload --port 8000

# 终端 2 — 启动前端 (使用带有代理配置的 Vite 开发服务器)
cd frontend
npm install
npm run dev
# 访问地址 → http://localhost:5173
```

修改前端代码后，如需重新构建：

```bash
python3 start.py --build
# 或直接执行：
cd frontend && npm run build
```

---

## 🔧 启动参数

```text
python start.py --build       即使 dist/ 目录存在也强制重新构建前端
python start.py --no-browser  启动服务器时不自动打开浏览器
```

---

## 📄 许可证

本项目采用 MIT 许可证。
