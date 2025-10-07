from algokit_utils import AlgorandClient, SigningAccount
from contract_files.LevyClient import LevyFactory, LevyClient, SourceMap
from dotenv import load_dotenv
from pathlib import Path
import json
import os

dotenv_path = './.env'
vite_dotenv_path = './levy/.env'
load_dotenv(dotenv_path=dotenv_path)
load_dotenv(dotenv_path=vite_dotenv_path)

algorand = AlgorandClient.testnet()

master_account = SigningAccount(
    private_key=os.getenv('master_sk'),
    address=os.getenv('master_pk')
)

test_account_1 = SigningAccount(
    private_key=os.getenv('sk_1'),
    address=os.getenv('pk_1')
)

test_account_2 = SigningAccount(
    private_key=os.getenv('sk_2'),
    address=os.getenv('pk_2')
)

levy_factory = LevyFactory(
    algorand=algorand,
    default_sender=master_account.address,
    default_signer=master_account.signer,
)

if os.getenv('test_asset'):
    test_asset = int(os.getenv('test_asset'))

def get_levy_client(signing_account: SigningAccount, algorand: AlgorandClient) -> LevyClient:
    levy_app_id = int(os.getenv('levy_app_id'))
    levy_client = algorand.client.get_typed_app_client_by_id(
        typed_client=LevyClient,
        default_sender=signing_account.address,
        default_signer=signing_account.signer,
        app_id=levy_app_id,
        approval_source_map=SourceMap(json.loads((Path(__file__) .parent / './contract_files/Levy.approval.puya.map').read_text()))
    )
    return levy_client
