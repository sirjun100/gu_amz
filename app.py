   from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
import sqlite3
import pandas as pd
import datetime
import random
import string
import os
import sys

# 添加 src 目录到 Python 路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from db import db as db_instance

app = Flask(__name__, template_folder='app/templates')
app.secret_key = 'your-secret-key'
db_path = "db/tgapi.db"

# 数据库连接函数
def get_db():
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

# 生成卡密
def generate_card_code(length=12):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

# 路由
@app.route('/')
def index():
    return redirect(url_for('dashboard'))

@app.route('/dashboard')
def dashboard():
    # 获取系统信息
    conn = get_db()
    total_users = pd.read_sql('SELECT COUNT(*) as count FROM users', conn).iloc[0]['count']
    total_orders = pd.read_sql('SELECT COUNT(*) as count FROM orders', conn).iloc[0]['count']
    total_codes = pd.read_sql('SELECT COUNT(*) as count FROM codes', conn).iloc[0]['count']
    total_applications = pd.read_sql('SELECT SUM(total_applications) as count FROM users', conn).iloc[0]['count'] or 0
    conn.close()
    
    return render_template('dashboard.html', 
                         total_users=total_users,
                         total_orders=total_orders,
                         total_codes=total_codes,
                         total_applications=total_applications)

@app.route('/users')
def users():
    page = request.args.get('page', 1, type=int)
    per_page = 15
    offset = (page - 1) * per_page
    
    conn = get_db()
    # 获取用户总数
    total_users = pd.read_sql('SELECT COUNT(*) as count FROM users', conn).iloc[0]['count']
    # 获取当前页的用户数据
    users_df = pd.read_sql('SELECT * FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', conn, params=[per_page, offset])
    conn.close()
    
    total_pages = (total_users + per_page - 1) // per_page
    
    return render_template('users.html', 
                         users=users_df.to_dict('records'),
                         page=page,
                         total_pages=total_pages,
                         per_page=per_page,
                         total_users=total_users)

@app.route('/add_balance', methods=['POST'])
def add_balance():
    user_id = request.form['user_id']
    amount = float(request.form['amount'])
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET balance = balance + ? WHERE telegram_id = ?', (amount, user_id))
    conn.commit()
    conn.close()
    
    flash(f'已为用户 {user_id} 添加 {amount}u 余额', 'success')
    return redirect(url_for('users'))

@app.route('/orders')
def orders():
    page = request.args.get('page', 1, type=int)
    per_page = 15
    offset = (page - 1) * per_page
    
    conn = get_db()
    # 获取订单总数
    total_orders = pd.read_sql('SELECT COUNT(*) as count FROM orders', conn).iloc[0]['count']
    # 获取当前页的订单数据
    orders_df = pd.read_sql('SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?', conn, params=[per_page, offset])
    conn.close()
    
    total_pages = (total_orders + per_page - 1) // per_page
    
    return render_template('orders.html', 
                         orders=orders_df.to_dict('records'),
                         page=page,
                         total_pages=total_pages,
                         per_page=per_page,
                         total_orders=total_orders)

@app.route('/codes')
def codes():
    page = request.args.get('page', 1, type=int)
    per_page = 15
    offset = (page - 1) * per_page
    
    conn = get_db()
    # 获取卡密总数
    total_codes = pd.read_sql('SELECT COUNT(*) as count FROM codes', conn).iloc[0]['count']
    # 获取当前页的卡密数据
    codes_df = pd.read_sql('SELECT * FROM codes ORDER BY created_at DESC LIMIT ? OFFSET ?', conn, params=[per_page, offset])
    conn.close()
    
    total_pages = (total_codes + per_page - 1) // per_page
    
    return render_template('codes.html', 
                         codes=codes_df.to_dict('records'),
                         page=page,
                         total_pages=total_pages,
                         per_page=per_page,
                         total_codes=total_codes)

@app.route('/generate_codes', methods=['POST'])
def generate_codes():
    value = float(request.form['value'])
    count = int(request.form['count'])
    
    conn = get_db()
    cursor = conn.cursor()
    
    for _ in range(count):
        code = generate_card_code()
        cursor.execute('INSERT INTO codes (code, value) VALUES (?, ?)', (code, value))
    
    conn.commit()
    conn.close()
    
    flash(f'成功生成 {count} 个价值 {value}u 的卡密', 'success')
    return redirect(url_for('codes'))

@app.route('/api')
def api():
    page = request.args.get('page', 1, type=int)
    per_page = 15
    offset = (page - 1) * per_page
    
    conn = get_db()
    # 获取API申请记录总数
    total_applications = pd.read_sql('SELECT COUNT(*) as count FROM api_applications', conn).iloc[0]['count']
    # 获取当前页的API申请记录数据
    api_df = pd.read_sql('SELECT * FROM api_applications ORDER BY created_at DESC LIMIT ? OFFSET ?', conn, params=[per_page, offset])
    conn.close()
    
    total_pages = (total_applications + per_page - 1) // per_page
    
    return render_template('api.html', 
                         api_applications=api_df.to_dict('records'),
                         page=page,
                         total_pages=total_pages,
                         per_page=per_page,
                         total_applications=total_applications)

@app.route('/settings')
def settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT key, value FROM config')
    config = dict(cursor.fetchall())
    conn.close()
    
    return render_template('settings.html', config=config)

@app.route('/save_settings', methods=['POST'])
def save_settings():
    conn = get_db()
    cursor = conn.cursor()
    
    # 保存配置
    for key, value in request.form.items():
        if key in ['OKPAY_WEBHOOK_URL', 'TRC20_ADDRESS', 'PRICE_1', 'PRICE_5', 'BONUS_THRESHOLD', 'BONUS_RATE']:
            cursor.execute('INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)', (key, value))
    
    conn.commit()
    conn.close()
    
    flash('配置已保存', 'success')
    return redirect(url_for('settings'))

if __name__ == '__main__':
    # 确保数据库目录存在
    if not os.path.exists('db'):
        os.makedirs('db')
    
    # 初始化数据库
    db_instance.init_tables()
    
    # 启动 Flask 应用
    app.run(debug=True, host='0.0.0.0', port=5002)