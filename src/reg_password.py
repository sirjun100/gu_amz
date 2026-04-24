import random
import string

# 亚马逊注册密码：须含数字、大小写字母；特殊符号仅允许 . 与 @
_SPECIAL = ".@"


def generate_registration_password() -> str:
    upper = random.choice(string.ascii_uppercase)
    lower = random.choice(string.ascii_lowercase)
    spec = random.choice(_SPECIAL)
    digits = "".join(random.choices(string.digits, k=3))
    pool = string.ascii_letters + string.digits + _SPECIAL
    rest = "".join(random.choices(pool, k=5))
    chars = list(upper + lower + spec + digits + rest)
    random.shuffle(chars)
    return "".join(chars)
