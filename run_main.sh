#!/bin/bash

# 运行 main.py 的脚本
# 使用方法：./run_main.sh 或 bash run_main.sh

# 设置Python虚拟环境路径
VENV_PATH="/Users/apple/PRO/.venv"

# 检查虚拟环境是否存在
if [ ! -d "$VENV_PATH" ]; then
    echo "❌ 错误：虚拟环境不存在于 $VENV_PATH"
    echo "请检查路径或创建虚拟环境：python -m venv $VENV_PATH"
    exit 1
fi

# 激活虚拟环境的脚本路径
ACTIVATE_SCRIPT="$VENV_PATH/bin/activate"

if [ ! -f "$ACTIVATE_SCRIPT" ]; then
    echo "❌ 错误：激活脚本不存在：$ACTIVATE_SCRIPT"
    exit 1
fi

# 检查 main.py 是否存在
if [ ! -f "main.py" ]; then
    echo "❌ 错误：当前目录下找不到 main.py 文件"
    echo "当前目录：$(pwd)"
    exit 1
fi

echo "🐍 正在激活 Python 虚拟环境..."
echo "虚拟环境路径：$VENV_PATH"

# 激活虚拟环境
source "$ACTIVATE_SCRIPT"

if [ $? -ne 0 ]; then
    echo "❌ 错误：无法激活虚拟环境"
    exit 1
fi

echo "✅ 虚拟环境激活成功！"
echo "Python 路径：$(which python)"
echo "Python 版本：$(python --version)"

# 运行 main.py
echo "🚀 正在运行 main.py..."
echo "========================================"
python main.py
EXIT_CODE=$?
echo "========================================"

# 记录退出状态
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ main.py 执行成功！"
else
    echo "❌ main.py 执行失败，退出码：$EXIT_CODE"
fi

exit $EXIT_CODE