from algokit_utils import PaymentParams, AlgoAmount, AssetOptInParams, CommonAppCallParams, AlgorandClient
from contract_files.LevyClient import OptIntoAssetArgs, CreatePositionArgs
from constants import get_levy_client, test_account_1, algorand, test_asset

algorand = AlgorandClient.testnet()
levy_client = get_levy_client(signing_account=test_account_1, algorand=algorand)

deposit_amount = 1_000_000
leverage = 2
print(f'Creating {leverage}x Leveraged Long Position of Asset ID: {test_asset} with {(deposit_amount / 10**6):,.6f} Algo')

new_group = levy_client.new_group()

app_assets = algorand.account.get_information(levy_client.app_address).assets
opted_into_asset = False
for asset in app_assets:
    print(asset)
    if asset.get('asset-id') == test_asset:
        opted_into_asset = True

if not opted_into_asset:

    mbr_payment = algorand.create_transaction.payment(
        PaymentParams(
            sender=test_account_1.address,
            signer=test_account_1.signer,
            amount=AlgoAmount(micro_algo=100_000),
            receiver=levy_client.app_address,
            note='Opt In MBR Payment'
        )
    )

    new_group.opt_into_asset(
        args=OptIntoAssetArgs(
            asset=test_asset,
            mbr_payment=mbr_payment
        ),
        params=CommonAppCallParams(
            max_fee=AlgoAmount(micro_algo=10_000)
        )
    )

deposit = algorand.create_transaction.payment(
    PaymentParams(
        sender=test_account_1.address,
        signer=test_account_1.signer,
        amount=AlgoAmount(micro_algo=deposit_amount),
        receiver=levy_client.app_address
    )
)

new_group.create_position(
    args=CreatePositionArgs(
        algo_deposit=deposit,
        leverage=leverage,
        asset=test_asset
    ),
    params=CommonAppCallParams(
        max_fee=AlgoAmount(micro_algo=10_000)
    )
)

txn_response = new_group.send(
    send_params={
        'cover_app_call_inner_transaction_fees': True,
        'populate_app_call_resources': True
    }
)


print(f'Created Leverage Position: {txn_response.tx_ids}')