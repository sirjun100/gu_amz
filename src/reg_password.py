import random
import string

_SPECIAL = "!@#$%^&*"


def generate_registration_password() -> str:
    upper = random.choice(string.ascii_uppercase)
    lower = random.choice(string.ascii_lowercase)
    spec = random.choice(_SPECIAL)
    digits = "".join(random.choices(string.digits, k=3))
    pool = string.ascii_letters + string.digits + _SPECIAL
    rest = "".join(random.choices(pool, k=4))
    chars = list(upper + lower + spec + digits + rest)
    random.shuffle(chars)
    return "".join(chars)
