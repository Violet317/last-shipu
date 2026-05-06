#!/bin/bash
set -e

# ============================================================
# 膳语 (last-shipu) 后端部署脚本
# 适用于宝塔面板服务器
# 服务器: 115.159.57.123 | 域名: shanyushipu.top
# ============================================================

echo "🚀 开始部署膳语后端..."

PROJECT_DIR="/www/wwwroot/shanyushipu"
BACKUP_DIR="/www/backup/shanyushipu-$(date +%Y%m%d-%H%M%S)"

# 1. 创建项目目录
echo "📁 创建项目目录..."
mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

# 2. 检查 Node.js
echo "🔧 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 20+"
    echo "   宝塔面板 → 软件商店 → 搜索 node → 安装 Node.js 20"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "⚠️  Node.js 版本过低: $(node -v)，建议升级到 20+"
fi

echo "✅ Node.js 版本: $(node -v)"

# 3. 检查 pm2
echo "🔧 检查 pm2..."
if ! command -v pm2 &> /dev/null; then
    echo "📦 安装 pm2..."
    npm install -g pm2
fi

# 4. 备份旧版本（如果存在）
if [ -d "$PROJECT_DIR/backend" ]; then
    echo "💾 备份旧版本到 $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$PROJECT_DIR/backend" "$BACKUP_DIR/"
    cp -r "$PROJECT_DIR/data" "$BACKUP_DIR/" 2>/dev/null || true
fi

# 5. 等待用户上传代码
echo ""
echo "=========================================="
echo "📦 请将后端代码上传到服务器:"
echo "   目标路径: $PROJECT_DIR/backend"
echo ""
echo "   本地执行（PowerShell）:"
echo "   scp -r ./backend root@115.159.57.123:$PROJECT_DIR/"
echo ""
echo "   或者直接用宝塔面板的文件管理器上传"
echo "=========================================="
echo ""

read -p "代码上传完成后按回车继续..."

# 6. 安装依赖
echo "📦 安装后端依赖..."
cd "$PROJECT_DIR/backend"
npm install

# 7. 生成 Prisma Client
echo "🗄️  生成 Prisma Client..."
npx prisma generate

# 8. 部署数据库迁移
echo "🗄️  部署数据库迁移..."
npx prisma migrate deploy

# 9. 确保数据目录存在
mkdir -p "$PROJECT_DIR/backend/data"

# 10. 停止旧进程
echo "🛑 停止旧进程..."
pm2 delete last-shipu-api 2>/dev/null || true

# 11. 启动新进程
echo "▶️  启动后端服务..."
pm2 start "npx tsx src/server.ts" --name last-shipu-api --cwd "$PROJECT_DIR/backend"
pm2 save

# 12. 配置 pm2 开机自启
echo "🔌 配置开机自启..."
pm2 startup 2>/dev/null || true

echo ""
echo "=========================================="
echo "✅ 后端部署完成！"
echo ""
echo "🌐 健康检查: http://115.159.57.123:8787/health"
echo "🔑 API 地址: http://shanyushipu.top:8787"
echo ""
echo "📋 pm2 常用命令:"
echo "   pm2 status          查看状态"
echo "   pm2 logs last-shipu-api  查看日志"
echo "   pm2 restart last-shipu-api  重启"
echo "   pm2 stop last-shipu-api     停止"
echo "=========================================="
