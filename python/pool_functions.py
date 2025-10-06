from algokit_utils import AlgorandClient, PaymentParams, AlgoAmount, AppCallParams, LogicSigAccount, AssetOptInParams, AssetTransferParams, SigningAccount
from algosdk.logic import get_application_address
from algosdk.transaction import OnComplete
from constants import dotenv_path, test_account_1
from dotenv import load_dotenv
from base64 import b64decode

load_dotenv(dotenv_path=dotenv_path)


TINYMAN_ROUTER = 148607000 #testnet
#TINYMAN_ROUTER = 1002541853 #mainnet

POOL_LOGICSIG_TEMPLATE = (
    "BoAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQBbNQA0ADEYEkQxGYEBEkSBAUM="
)

ALGO = 0

def get_pool_logicsig(
    asset_a_id: int, asset_b_id: int
) -> LogicSigAccount:
    

    assets = [asset_a_id, asset_b_id]
    asset_1_id = max(assets)
    asset_2_id = min(assets)

    program = bytearray(b64decode(POOL_LOGICSIG_TEMPLATE))
    program[3:11] = TINYMAN_ROUTER.to_bytes(8, "big")
    program[11:19] = asset_1_id.to_bytes(8, "big")
    program[19:27] = asset_2_id.to_bytes(8, "big")
    return LogicSigAccount(program=program, args=None)

def bootstrap_tiny(asset_id: int, test_account: SigningAccount):

    algorand = AlgorandClient.testnet()
    
    TINYMAN_ROUTER_ADDRESS = get_application_address(TINYMAN_ROUTER)


    logic_sig = get_pool_logicsig(asset_id, ALGO)
    pool_address = logic_sig.address

    group = algorand.new_group()

    bootstrap_fee = PaymentParams(
        sender=test_account.address,
        signer=test_account.signer,
        receiver=pool_address,
        amount=AlgoAmount(algo=1)
    )


    group.add_payment(
        params=bootstrap_fee
    )

    bootstrap_app_call = AppCallParams(
        args=[b'bootstrap'],
        app_id=TINYMAN_ROUTER,
        on_complete=OnComplete.OptInOC,
        sender=pool_address,
        rekey_to=TINYMAN_ROUTER_ADDRESS,
        signer=logic_sig.signer,
        max_fee=AlgoAmount(micro_algo=10_000),
        asset_references=[asset_id, ALGO]
    )

    group.add_app_call(
        params=bootstrap_app_call,
    )

    txn_response = group.send(
        params={
            'cover_app_call_inner_transaction_fees': True,
        }
    )
    print("Token Bootstrapped: ", txn_response.tx_ids[0])


def add_initial_liquidity(asset_id: int, signing_account: SigningAccount):

    algorand = AlgorandClient.testnet()
    
    logic_sig = get_pool_logicsig(asset_id, ALGO)
    pool_address = logic_sig.address

    local_states = algorand.app.get_local_state(TINYMAN_ROUTER, pool_address)
    LP_token = local_states.get('pool_token_asset_id').value
    asset_a = local_states.get('asset_1_id').value

    group = algorand.new_group()

    group.add_asset_opt_in(
        params=AssetOptInParams(
            sender=signing_account.address,
            signer=signing_account.signer,
            asset_id=LP_token,
        )
    )

    group.add_asset_transfer(
        params=AssetTransferParams(
            sender=signing_account.address,
            signer=signing_account.signer,
            amount=1_000_000,
            receiver=pool_address,
            asset_id=asset_a
        )
    )

    group.add_payment(
        params=PaymentParams(
            sender=signing_account.address,
            signer=signing_account.signer,
            amount=AlgoAmount(micro_algo=1_000_000),
            receiver=pool_address
        )
    )



    add_lp_app_call = AppCallParams(
            args=[b'add_initial_liquidity'],
            app_id=TINYMAN_ROUTER,
            on_complete=OnComplete.NoOpOC,
            sender=signing_account.address,
            signer=signing_account.signer,
            max_fee=AlgoAmount(micro_algo=10_000),
            asset_references=[LP_token],
            account_references=[pool_address]
        )

    group.add_app_call(
        params=add_lp_app_call,
    )

    txn_response = group.send(
        params={
            'cover_app_call_inner_transaction_fees': True,
        }
    )
    print("Added Initial Liquidity: ", txn_response.tx_ids[0])


def get_asset_price(
        asset_a_id: int, asset_b_id: int
) -> float:
    
    
    pool_logicsig = get_pool_logicsig(asset_a_id, asset_b_id)
    pool_address = pool_logicsig.address

    algorand = AlgorandClient.testnet()

    local_states = algorand.app.get_local_state(
        app_id=TINYMAN_ROUTER,
        address=pool_address
    )

    asset_1_reserves = local_states.get('asset_1_reserves').value
    asset_2_reserves = local_states.get('asset_2_reserves').value


    return asset_2_reserves / asset_1_reserves


def purchase_asset(asset_in: int, asset_out: int, buy_amount: int, signing_account: SigningAccount) -> str:
    pool_address = get_pool_logicsig(asset_in, asset_out).address
    algorand = AlgorandClient.testnet()
    new_group = algorand.new_group()

    arg_1 = b'swap'
    arg_2 = b'fixed-input'
    arg_3 = (0).to_bytes(8, 'big')

    args = [arg_1, arg_2, arg_3]


    if asset_in == 0:
        new_group.add_payment(
            params=PaymentParams(
                sender=signing_account.address,
                signer=signing_account.signer,
                amount=AlgoAmount(micro_algo=buy_amount),
                receiver=pool_address,            
            )
        )

    else:
        new_group.add_asset_transfer(
            params=AssetTransferParams(
                sender=signing_account.address,
                signer=signing_account.signer,
                amount=buy_amount,
                asset_id=asset_in,
                receiver=pool_address
            )
        )

    new_group.add_app_call(
        params=AppCallParams(
            sender=signing_account.address,
            signer=signing_account.signer,
            app_id=TINYMAN_ROUTER,
            args=args,
            account_references=[pool_address],
            on_complete=OnComplete.NoOpOC,
            extra_fee=AlgoAmount(micro_algo=1000)
        )
    )

    tx_id = new_group.send().tx_ids[0]

    return tx_id

