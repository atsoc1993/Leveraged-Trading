from algosdk.account import generate_account
from dotenv import load_dotenv, set_key
from constants import dotenv_path

load_dotenv(dotenv_path=dotenv_path)
master_sk, master_pk = generate_account()
sk_1, pk_1 = generate_account()
sk_2, pk_2 = generate_account()

set_key(
    dotenv_path=dotenv_path,
    key_to_set='master_sk',
    value_to_set=master_sk     
)

set_key(
    dotenv_path=dotenv_path,
    key_to_set='master_pk',
    value_to_set=master_pk     
)

set_key(
    dotenv_path=dotenv_path,
    key_to_set='sk_1',
    value_to_set=sk_1     
)

set_key(
    dotenv_path=dotenv_path,
    key_to_set='pk_1',
    value_to_set=pk_1     
)

set_key(
    dotenv_path=dotenv_path,
    key_to_set='sk_2',
    value_to_set=sk_2     
)

set_key(
    dotenv_path=dotenv_path,
    key_to_set='pk_2',
    value_to_set=pk_2     
)