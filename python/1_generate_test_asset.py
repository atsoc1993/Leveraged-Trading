from algokit_utils import AssetCreateParams, AssetOptInParams, AssetTransferParams
from constants import algorand, test_account_1, test_account_2, dotenv_path
from dotenv import load_dotenv, set_key
from pool_functions import bootstrap_tiny, add_initial_liquidity
from algokit_utils import SigningAccount
from algosdk.mnemonic import to_private_key
from algosdk.account import address_from_private_key
import os

load_dotenv(dotenv_path=dotenv_path)
print(f'Creating token . . .')
# pera_account_sk = to_private_key(os.getenv('pera_account_mnemonic'))
# pera_account_pk = address_from_private_key(pera_account_sk)
# pera_signing_account = SigningAccount(
#     private_key=pera_account_sk,
#     address=pera_account_pk,
# )


asset_creation_txn_response_1 = algorand.send.asset_create(
    params=AssetCreateParams(
        sender=test_account_1.address,
        signer=test_account_1.signer,
        asset_name='NEW TEST ASSET AVM MAIL',
        unit_name='TA1',
        total=1_000_000_000,
        decimals=6,
        manager=test_account_1.address,
        reserve=test_account_1.address
    )
)


set_key(dotenv_path=dotenv_path, key_to_set='test_asset', value_to_set=str(asset_creation_txn_response_1.asset_id))
print(f'Token Created: {asset_creation_txn_response_1.asset_id}, wrote to .env')

print(f'Funding Test Account 2 with some of this token . . .')
group = algorand.new_group()


group.add_asset_opt_in(
    params=AssetOptInParams(
        sender=test_account_2.address,
        signer=test_account_2.signer,
        asset_id=asset_creation_txn_response_1.asset_id,
    )
)

# group.add_asset_opt_in(
#     params=AssetOptInParams(
#         sender=pera_signing_account.address,
#         signer=pera_signing_account.signer,
#         asset_id=asset_creation_txn_response_1.asset_id,
#     )

# )

group.add_asset_transfer(
    params=AssetTransferParams(
        sender=test_account_1.address,
        signer=test_account_1.signer,
        asset_id=asset_creation_txn_response_1.asset_id,
        amount=200_000_000,
        receiver=test_account_2.address
    )
)

# group.add_asset_transfer(
#     params=AssetTransferParams(
#         sender=test_account_1.address,
#         signer=test_account_1.signer,
#         asset_id=asset_creation_txn_response_1.asset_id,
#         amount=200_000_000,
#         receiver=pera_signing_account.address
#     )
# )


group.send()


print(f'Bootstrapping Token to Tiny . . .')
bootstrap_tiny(asset_creation_txn_response_1.asset_id, test_account_1)
add_initial_liquidity(asset_creation_txn_response_1.asset_id, test_account_1)
