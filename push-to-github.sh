#!/bin/bash
# GitHub推送脚本

echo "=========================================="
echo "  Personal Dashboard - GitHub推送脚本"
echo "=========================================="
echo ""

# 提示输入GitHub用户名
read -p "请输入你的GitHub用户名: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ 用户名不能为空"
    exit 1
fi

REMOTE_URL="https://github.com/${GITHUB_USERNAME}/personal-dashboard.git"

echo ""
echo "📎 远程仓库地址: ${REMOTE_URL}"
echo ""

# 检查是否在正确的目录
cd /root/.openclaw/workspace/personal-dashboard

# 检查远程仓库是否已配置
if git remote | grep -q "origin"; then
    echo "📝 更新远程仓库地址..."
    git remote set-url origin ${REMOTE_URL}
else
    echo "📝 添加远程仓库..."
    git remote add origin ${REMOTE_URL}
fi

# 显示远程仓库配置
echo ""
echo "✅ 远程仓库配置:"
git remote -v
echo ""

# 推送代码
echo "🚀 正在推送代码到GitHub..."
echo ""

# 先尝试推送，如果失败可能是仓库不存在
git push -u origin main 2>&1 || {
    echo ""
    echo "⚠️ 推送失败，可能的原因:"
    echo "   1. GitHub仓库尚未创建"
    echo "   2. 仓库名称不是 'personal-dashboard'"
    echo "   3. 网络连接问题"
    echo ""
    echo "💡 请检查:"
    echo "   - 是否已在GitHub创建仓库: https://github.com/new"
    echo "   - 仓库名称是否为: personal-dashboard"
    echo "   - 是否使用正确的用户名: ${GITHUB_USERNAME}"
    echo ""
    exit 1
}

echo ""
echo "=========================================="
echo "  ✅ 推送成功!"
echo "=========================================="
echo ""
echo "📎 GitHub仓库地址:"
echo "   ${REMOTE_URL}"
echo ""
echo "下一步: 部署到Render"
echo "   https://dashboard.render.com"
echo ""
