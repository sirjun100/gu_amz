import urllib.parse
import hashlib
import requests
import os
import logging

class OkayPay:
    def __init__(self, shop_id=None, token=None):
        self.id = int(shop_id or os.getenv("OKPAY_ID", ""))
        self.token = token or os.getenv("OKPAY_TOKEN", "")
        self.base_url = 'https://api.okaypay.me/shop/'
        
    def sign(self, data):
        data['id'] = self.id
        filtered_data = {k: v for k, v in data.items() if v is not None and v != ''}
        sorted_data = sorted(filtered_data.items())
        
        query_str = urllib.parse.urlencode(sorted_data, quote_via=urllib.parse.quote)
        decoded_str = urllib.parse.unquote(query_str)
        sign_str = decoded_str + '&token=' + self.token
        
        signature = hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
        
        signed_dict = dict(sorted_data)
        signed_dict['sign'] = signature
        
        # 打印签名相关信息
        logging.info(f"Sign data: {filtered_data}")
        logging.info(f"Sorted data: {sorted_data}")
        logging.info(f"Query string: {query_str}")
        logging.info(f"Decoded string: {decoded_str}")
        logging.info(f"Sign string: {sign_str}")
        logging.info(f"Signature: {signature}")
        logging.info(f"Signed data: {signed_dict}")
        
        return signed_dict
    
    def get_pay_link(self, unique_id, amount, coin="USDT", name="Telegram API"):
        url = self.base_url + 'payLink'
        params = {
            'unique_id': unique_id,
            'name': name,
            'amount': amount,
            'coin': coin,
            'return_url': os.getenv("OKPAY_RETURN_URL", "https://t.me/r7tg1")
        }
        
        # 打印初始化信息
        logging.info(f"OkayPay initialized with ID: {self.id}, Token: {self.token}")
        logging.info(f"Request URL: {url}")
        logging.info(f"Request params: {params}")
        
        signed_data = self.sign(params)
        
        try:
            logging.info(f"Sending request to: {url}")
            logging.info(f"Request data: {signed_data}")
            
            response = requests.post(
                url,
                data=signed_data,
                headers={'User-Agent': 'HTTP CLIENT'},
                timeout=10,
                verify=False
            )
            
            logging.info(f"Response status code: {response.status_code}")
            logging.info(f"Response content: {response.text}")
            
            result = response.json()
            logging.info(f"Response JSON: {result}")
            
            if result.get('code') == 200 and 'data' in result:
                return result['data'].get('pay_url'), result['data'].get('order_id')
            else:
                logging.error(f"API Error: {result.get('msg')}")
            return None, None
        except Exception as e:
            logging.error(f"Request Failed: {e}")
            import traceback
            logging.error(f"Traceback: {traceback.format_exc()}")
            return None, None
            
    def check_order(self, order_id):
        url = self.base_url + 'checkTransferByTxid'
        params = {
            'id': self.id,
            'txid': order_id
        }
        signed_data = self.sign(params)
        try:
            response = requests.post(
                url,
                data=signed_data,
                timeout=5,
                verify=False,
                proxies={"http": None, "https": None}
            )
            result = response.json()
            logging.info(f"轮询订单 {order_id} 结果: {result}")
            if result.get('code') == 200 and 'data' in result:
                return str(result['data'].get('status')) == '1'
            return False
        except Exception as e:
            logging.error(f"查询订单异常: {e}")
            return False