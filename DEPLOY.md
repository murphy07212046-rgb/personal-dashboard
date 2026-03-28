# 个人工作台部署指南

## 📁 项目文件结构

```
personal-dashboard/
├── server.js              # Node.js 后端服务
├── package.json           # 依赖配置
├── public/                # 前端文件
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── README.md
```

## 🚀 部署方式

### 方式一：本地运行（最简单）

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
node server.js

# 3. 访问 http://localhost:3000
```

---

### 方式二：部署到 Render（推荐）

Render 提供免费的数据库和永久免费的 Web 服务。

**步骤：**

1. 在 GitHub 创建一个新仓库
2. 将项目代码推送到 GitHub
3. 登录 [Render](https://render.com)（用 GitHub 账号）
4. 点击 "New +" → "Web Service"
5. 选择你的 GitHub 仓库
6. 配置：
   - **Name**: personal-dashboard
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free
7. 点击 "Create Web Service"

等待部署完成，Render 会给你分配一个 `xxx.onrender.com` 的永久域名！

---

### 方式三：部署到 Railway

Railway 也提供免费的托管服务。

**步骤：**

1. 登录 [Railway](https://railway.app)（用 GitHub 账号）
2. 点击 "New Project" → "Deploy from GitHub repo"
3. 选择你的仓库
4. Railway 会自动检测并部署
5. 生成域名后即可访问

---

### 方式四：使用 Docker 部署

**创建 Dockerfile：**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

**构建和运行：**

```bash
# 构建镜像
docker build -t personal-dashboard .

# 运行容器
docker run -d -p 3000:3000 --name dashboard personal-dashboard

# 访问 http://localhost:3000
```

---

### 方式五：部署到自有服务器/VPS

```bash
# 1. 上传代码到服务器
scp -r personal-dashboard user@your-server:/opt/

# 2. SSH 登录服务器
ssh user@your-server

# 3. 安装依赖并启动
cd /opt/personal-dashboard
npm install

# 4. 使用 PM2 保持运行
npm install -g pm2
pm2 start server.js --name dashboard
pm2 save
pm2 startup

# 5. 配置 Nginx 反向代理（可选）
```

**Nginx 配置示例：**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 🔧 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `NODE_ENV` | 环境模式 | development |

---

## 📊 功能截图

### 总览页面
- 统计卡片（待办任务、已完成、收藏网址）
- 今日待办快速预览
- 快速访问收藏网址

### 待办事项
- 添加待办（支持优先级、截止日期）
- 完成/编辑/删除
- 筛选（全部/进行中/已完成）

### 日历视图
- 月历展示
- 待办日期标记
- 月份切换

### 网址收藏
- 分类管理（工作/学习/娱乐/工具/其他）
- 快速访问
- 图标标识

---

## 💾 数据存储

- 使用 **SQLite** 数据库存储所有数据
- 数据库文件：`data.db`
- 部署时注意备份此文件！

---

## ⚠️ 注意事项

1. **免费服务限制**：Render/Railway 的免费服务在长时间无访问后会休眠，首次访问需要等待几秒唤醒
2. **数据持久化**：使用 SQLite，确保部署环境支持文件写入
3. **安全性**：生产环境建议添加身份验证（如 HTTP Basic Auth）

---

## 🛠️ 技术栈

- **前端**：HTML5 + CSS3 + Vanilla JavaScript
- **后端**：Node.js + Express
- **数据库**：SQLite3
- **主题**：暗色主题，响应式设计

---

有问题随时联系我！
