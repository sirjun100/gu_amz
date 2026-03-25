#!/usr/bin/env python3
"""
启动 Telegram API 自动注册工具 (网页模式)
"""

import asyncio
import logging
import os
import platform
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

# 系统代理设置
system_name = platform.system()
if system_name == 'Linux':
    print("当前系统是 Linux, 开启代理 http://127.0.0.1:40000")
    os.environ["HTTP_PROXY"] = "http://127.0.0.1:40000"
    os.environ["HTTPS_PROXY"] = "http://127.0.0.1:40000"
else:
    print(f"当前系统是 {system_name}")

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

from flask import Flask, render_template, request, jsonify
from src.core import TelegramRegistrar
from src.utils import save_result

app = Flask(__name__)

# 存储会话数据
sessions = {}

@app.route('/')
def index():
    """首页"""
    return render_template('index.html')

@app.route('/send_code', methods=['POST'])
def send_code():
    """发送验证码"""
    phone = request.form.get('phone', '').strip()
    if not phone.startswith('+'):
        return jsonify({'ok': False, 'error': '手机号必须以 + 开头（国际格式）'})
    
    try:
        async def send_code_async():
            reg = TelegramRegistrar()
            result = await reg.send_code(phone)
            await reg.close()
            return result
        
        result = asyncio.run(send_code_async())
        
        if not result['ok']:
            return jsonify({'ok': False, 'error': f'发送验证码失败: {result["error"]}'})
        
        # 存储会话数据
        session_id = phone
        sessions[session_id] = {
            'phone': phone,
            'random_hash': result['random_hash']
        }
        
        return jsonify({'ok': True, 'message': '验证码已发送，请查看您的 Telegram 消息'})
    except Exception as e:
        logging.exception("发送验证码异常")
        return jsonify({'ok': False, 'error': f'发生错误: {e}'})

@app.route('/login', methods=['POST'])
def login():
    """登录并获取应用信息"""
    phone = request.form.get('phone', '').strip()
    code = request.form.get('code', '').strip()
    
    if not code:
        return jsonify({'ok': False, 'error': '验证码不能为空'})
    
    # 获取会话数据
    session_id = phone
    if session_id not in sessions:
        return jsonify({'ok': False, 'error': '会话已过期，请重新发送验证码'})
    
    session_data = sessions[session_id]
    random_hash = session_data['random_hash']
    
    try:
        async def login_async():
            reg = TelegramRegistrar()
            # 登录
            result = await reg.login(phone, random_hash, code)
            if not result['ok']:
                await reg.close()
                return result
            
            # 获取或创建应用
            result = await reg.get_or_create_app()
            await reg.close()
            return result
        
        result = asyncio.run(login_async())
        
        if not result['ok']:
            return jsonify({'ok': False, 'error': f'获取应用信息失败: {result["error"]}'})
        
        # 保存结果
        filepath = save_result(phone, result)
        
        # 清除会话
        del sessions[session_id]
        
        return jsonify({
            'ok': True,
            'api_id': result.get('api_id'),
            'api_hash': result.get('api_hash'),
            'app_title': result.get('app_title', 'N/A'),
            'file_path': str(filepath)
        })
    except Exception as e:
        logging.exception("登录异常")
        return jsonify({'ok': False, 'error': f'发生错误: {e}'})

if __name__ == '__main__':
    # 创建 templates 目录
    import os
    os.makedirs('templates', exist_ok=True)
    
    # 创建 index.html 文件
    with open('templates/index.html', 'w', encoding='utf-8') as f:
        f.write('''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Telegram API 自动注册工具</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-weight: bold;
            color: #555;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        button {
            width: 100%;
            padding: 12px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 16px;
            cursor: pointer;
        }
        button:hover {
            background-color: #45a049;
        }
        .result {
            margin-top: 30px;
            padding: 20px;
            background-color: #f0f8ff;
            border-radius: 4px;
            border-left: 4px solid #4CAF50;
        }
        .error {
            margin-top: 10px;
            padding: 10px;
            background-color: #ffebee;
            border-radius: 4px;
            border-left: 4px solid #f44336;
            color: #c62828;
        }
        .success {
            margin-top: 10px;
            padding: 10px;
            background-color: #e8f5e8;
            border-radius: 4px;
            border-left: 4px solid #4CAF50;
            color: #2e7d32;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Telegram API 自动注册工具</h1>
        
        <form id="register-form">
            <div class="form-group">
                <label for="phone">手机号（国际格式）</label>
                <input type="text" id="phone" name="phone" placeholder="例如: +8613800138000" required>
            </div>
            
            <button type="button" id="send-code-btn">发送验证码</button>
            
            <div id="code-section" style="display: none; margin-top: 20px;">
                <div class="form-group">
                    <label for="code">验证码</label>
                    <input type="text" id="code" name="code" placeholder="请输入收到的验证码" required>
                </div>
                <button type="button" id="login-btn">登录并获取 API 信息</button>
            </div>
        </form>
        
        <div id="result" class="result" style="display: none;"></div>
        <div id="message"></div>
    </div>
    
    <script>
        document.getElementById('send-code-btn').addEventListener('click', async function() {
            const phone = document.getElementById('phone').value.trim();
            const messageDiv = document.getElementById('message');
            
            if (!phone) {
                messageDiv.innerHTML = '<div class="error">请输入手机号</div>';
                return;
            }
            
            if (!phone.startsWith('+')) {
                messageDiv.innerHTML = '<div class="error">手机号必须以 + 开头（国际格式）</div>';
                return;
            }
            
            messageDiv.innerHTML = '<div class="success">正在发送验证码，请稍候...</div>';
            
            try {
                const response = await fetch('/send_code', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `phone=${encodeURIComponent(phone)}`
                });
                
                const result = await response.json();
                if (result.ok) {
                    messageDiv.innerHTML = '<div class="success">' + result.message + '</div>';
                    document.getElementById('code-section').style.display = 'block';
                } else {
                    messageDiv.innerHTML = '<div class="error">' + result.error + '</div>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="error">发生错误，请重试</div>';
                console.error(error);
            }
        });
        
        document.getElementById('login-btn').addEventListener('click', async function() {
            const phone = document.getElementById('phone').value.trim();
            const code = document.getElementById('code').value.trim();
            const messageDiv = document.getElementById('message');
            const resultDiv = document.getElementById('result');
            
            if (!code) {
                messageDiv.innerHTML = '<div class="error">请输入验证码</div>';
                return;
            }
            
            messageDiv.innerHTML = '<div class="success">正在登录，请稍候...</div>';
            
            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: `phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`
                });
                
                const result = await response.json();
                if (result.ok) {
                    messageDiv.innerHTML = '<div class="success">注册成功！</div>';
                    resultDiv.innerHTML = `
                        <h3>API 信息</h3>
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <p style="margin: 0; flex: 1;"><strong>api_id:</strong> <span id="api-id">${result.api_id}</span></p>
                        </div>
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <p style="margin: 0; flex: 1;"><strong>api_hash:</strong> <span id="api-hash">${result.api_hash}</span></p>
                        </div>
                        <p><strong>app_title:</strong> ${result.app_title}</p>
                        <p>API 其他信息访问 <a href="https://my.telegram.org" target="_blank">https://my.telegram.org</a> 查看</p>
                        <div style="margin-top: 20px;">
                            <button onclick="copyAllInfo('${result.api_id}', '${result.api_hash}', '${result.app_title}')" style="padding: 10px 20px; font-size: 14px; background-color: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">一键复制所有信息</button>
                        </div>
                    `;
                    resultDiv.style.display = 'block';
                } else {
                    messageDiv.innerHTML = '<div class="error">' + result.error + '</div>';
                }
            } catch (error) {
                messageDiv.innerHTML = '<div class="error">发生错误，请重试</div>';
                console.error(error);
            }
        });
        
        function copyAllInfo(apiId, apiHash, appTitle) {
            // 构建纯文本格式的信息
            const info = `api_id: ${apiId}\napi_hash: ${apiHash}\napp_title: ${appTitle}`;
            
            // 兼容性处理，支持 Safari 和 Chrome 浏览器
            if (navigator.clipboard && window.isSecureContext) {
                // 现代浏览器
                navigator.clipboard.writeText(info)
                    .then(() => {
                        showCopySuccess();
                    })
                    .catch(err => {
                        console.error('复制失败:', err);
                        fallbackCopyTextToClipboard(info);
                    });
            } else {
                // 兼容旧浏览器
                fallbackCopyTextToClipboard(info);
            }
        }
        
        function fallbackCopyTextToClipboard(text) {
            // 创建临时文本区域
            const textArea = document.createElement('textarea');
            textArea.value = text;
            
            // 确保文本区域不在屏幕上可见
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            
            // 选择文本
            textArea.focus();
            textArea.select();
            
            try {
                // 执行复制命令
                const successful = document.execCommand('copy');
                if (successful) {
                    showCopySuccess();
                } else {
                    console.error('复制失败');
                }
            } catch (err) {
                console.error('复制失败:', err);
            } finally {
                // 清理临时文本区域
                document.body.removeChild(textArea);
            }
        }
        
        function showCopySuccess() {
            // 显示复制成功的提示
            const messageDiv = document.getElementById('message');
            messageDiv.innerHTML = '<div class="success">一键复制成功！</div>';
            setTimeout(() => {
                messageDiv.innerHTML = '';
            }, 2000);
        }
    </script>
</body>
</html>
''')
    
    print("✅ 网页端已启动，访问 http://0.0.0.0:6688")
    app.run(debug=True, host='0.0.0.0', port=6688)
