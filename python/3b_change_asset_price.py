from pool_functions import purchase_asset, ALGO
from constants import dotenv_path, test_account_1
from dotenv import load_dotenv
import os
import time

load_dotenv(dotenv_path=dotenv_path)
test_asset = int(os.getenv('test_asset'))

test_account = test_account_1
for i in range(50):
    purchase_asset(
        asset_in=test_asset,
        asset_out=ALGO,
        buy_amount=4000,
        signing_account=test_account,
    )

