from constants import levy_factory, dotenv_path, vite_dotenv_path, algorand, master_account
from algokit_utils import PaymentParams, AlgoAmount
from dotenv import load_dotenv, set_key


print(f'Creating Leverage App . . .')
levy_client, deploy_response = levy_factory.send.create.bare()
print(f'Created Leverage App, App ID: {levy_client.app_id}')
set_key(
    dotenv_path=dotenv_path, 
    key_to_set='levy_app_id', 
    value_to_set=str(levy_client.app_id)
)
set_key(
    dotenv_path=vite_dotenv_path, 
    key_to_set='VITE_LEVY_APP_ID', 
    value_to_set=str(levy_client.app_id)
)

print(f'Funding Account MBR to Leverage App . . .')
fund_levy_client = algorand.send.payment(
    params=PaymentParams(
        sender=master_account.address,
        signer=master_account.signer,
        amount=AlgoAmount(micro_algo=100_000),
        receiver=levy_client.app_address,
        validity_window=1000
    )
)
print(f'Funded Leverage App.')
