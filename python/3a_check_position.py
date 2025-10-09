from pool_functions import get_asset_price, ALGO
from constants import dotenv_path, get_levy_client, master_account
from contract_files.LevyClient import CheckPositionArgs, UserLeverageBoxName, LiquidateArgs
from algokit_utils import ABIType, CommonAppCallParams, AlgoAmount, AlgorandClient
from dotenv import load_dotenv
import time
import os

load_dotenv(dotenv_path=dotenv_path)
levy_app_id = int(os.getenv('levy_app_id'))
test_asset = int(os.getenv('test_asset'))
box_name_struct = ABIType.from_string('(address,uint64)')
box_value_struct = ABIType.from_string('(uint64,uint64,uint64,uint8)')

while True:
    time.sleep(3)
    algorand = AlgorandClient.testnet()
    levy_client = get_levy_client(signing_account=master_account, algorand=algorand)
    levy_boxes = algorand.app.get_box_names(levy_app_id)
    for box in levy_boxes:
        user, asset = box_name_struct.decode(box.name_raw)
        algo_deposit, asset_amount, asset_decimals, leverage = algorand.app.get_box_value_from_abi_type(
            app_id=levy_app_id, 
            box_name=box.name_raw, 
            abi_type=box_value_struct
        )

        new_group = levy_client.new_group()
        user_box_name_arg = UserLeverageBoxName(
            user=user,
            asset=asset
        )

        new_group.check_position(
            args=CheckPositionArgs(
                user_box_name=UserLeverageBoxName(
                    user=user,
                    asset=asset
                )
            ),
            params=CommonAppCallParams(
                extra_fee=AlgoAmount(micro_algo=5_000),
            )
        )

        sim_response = new_group.simulate(
            allow_unnamed_resources=True,
        )
        asset_price = get_asset_price(ALGO, test_asset)
        print(f'Asset Price: {asset_price} Algo')
        liquidate, algo_received_if_position_closed, initial_algo_amount, initial_position, leverage = sim_response.returns[0].value


        print(f'User {user[:5]}... is {(algo_received_if_position_closed / initial_position) * 100}% liquidation ratio\n')

        if liquidate:
            print(f'User is at or below 70% liquidation ratio')
            levy_client = get_levy_client(signing_account=master_account, algorand=algorand)

            txn_response = levy_client.send.liquidate(
                args=LiquidateArgs(
                    user_box_name=user_box_name_arg
                ),
                params=CommonAppCallParams(
                    max_fee=AlgoAmount(micro_algo=20_000)
                ),
                send_params={
                    'cover_app_call_inner_transaction_fees': True,
                    'populate_app_call_resources': True
                }
            )

            print(f'Liquidated User: {txn_response.tx_id}')


