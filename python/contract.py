from algopy import ARC4Contract, arc4, subroutine, BoxMap, gtxn, Bytes, itxn, OnCompleteAction, Account, UInt64, op, Txn, Global, Asset
from algopy.arc4 import abimethod, Struct, Address

class UserLeverageBoxName(Struct):
    user: Address
    asset: arc4.UInt64

class UserLeverageBoxValue(Struct):
    algo_deposit: arc4.UInt64
    asset_amount: arc4.UInt64
    leverage: arc4.UInt8

class Levy(ARC4Contract):
    def __init__(self) -> None:
        self.tinyman_router = UInt64(148607000) #testnet
        #self.tinyman_router = UInt64(1002541853) #mainnet
        self.user_leveraged_positions = BoxMap(UserLeverageBoxName, UserLeverageBoxValue, key_prefix='')
        self.pool_logicsig_template = op.base64_decode(op.Base64.StdEncoding, b"BoAYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgQBbNQA0ADEYEkQxGYEBEkSBAUM=")
        self.liquidation_threshold = UInt64(7000)
        self.scaled_base_percentage = UInt64(10_000)
        self.fee = UInt64(1000)

    @abimethod
    def opt_into_asset(self, asset: Asset, mbr_payment: gtxn.PaymentTransaction) -> None:
        assert mbr_payment.amount == 100_000
        assert mbr_payment.receiver == Global.current_application_address
        if not Global.current_application_address.is_opted_in(asset):
            itxn.AssetTransfer(
                asset_receiver=Global.current_application_address,
                xfer_asset=asset
            ).submit()

    @abimethod
    def create_position(self, algo_deposit: gtxn.PaymentTransaction, leverage: arc4.UInt8, asset: arc4.UInt64) -> None:
        self.validate_payment(algo_deposit)
        leverage_amount = algo_deposit.amount * leverage.as_uint64()
        purchased_amount = self.purchase_asset(algo_amount=leverage_amount, asset=asset)
        user_box_name = self.getBoxName(asset)
        user_box_value = self.getBoxValue(algo_deposit, leverage, purchased_amount)
        self.user_leveraged_positions[user_box_name] = user_box_value.copy()

    @subroutine
    def getBoxName(self, asset: arc4.UInt64) -> UserLeverageBoxName:
        return UserLeverageBoxName(
            user=Address(Txn.sender),
            asset=asset
        )
    
    @subroutine
    def getBoxValue(self, algo_deposit: gtxn.PaymentTransaction, leverage: arc4.UInt8, purchased_amount: arc4.UInt64) -> UserLeverageBoxValue:
        return UserLeverageBoxValue(
            algo_deposit=arc4.UInt64(algo_deposit.amount),
            leverage=leverage,
            asset_amount=purchased_amount
        )
    
    @subroutine
    def validate_payment(self, payment: gtxn.PaymentTransaction) -> None:
        assert payment.receiver == Global.current_application_address
        assert payment.amount >= 1_000_000, "Minimum 1 Algo Deposit"

    @subroutine
    def purchase_asset(self, algo_amount: UInt64, asset: arc4.UInt64) -> arc4.UInt64:

        pool_address = self.get_logicsig_address(asset)
        
        arg_1 = Bytes(b'swap')
        arg_2 = Bytes(b'fixed-input')
        arg_3 = arc4.UInt64(0).bytes

        args = (arg_1, arg_2, arg_3)

        purchase_entry_asset = itxn.Payment(
            receiver=pool_address,
            amount=algo_amount,
        )
        
        entry_asset_buy = itxn.ApplicationCall(
            app_id=self.tinyman_router,
            on_completion=OnCompleteAction.NoOp,
            app_args=args,
            accounts=(pool_address,),
            assets=(Asset(asset.as_uint64()),)
        )

        tx_1, tx_2 = itxn.submit_txns(purchase_entry_asset, entry_asset_buy)

        asset_amount = arc4.UInt64.from_bytes(tx_2.logs(5)[-8:])
        return asset_amount

    @subroutine
    def get_logicsig_address(self, asset: arc4.UInt64) -> Account:
        program_bytes = self.pool_logicsig_template

        program_bytes = (
            program_bytes[0:3] + 
            arc4.UInt64(self.tinyman_router).bytes +
            asset.bytes +
            arc4.UInt64(0).bytes + 
            program_bytes[27:]
        )

        return Account.from_bytes(op.sha512_256(b'Program' + program_bytes))
    

    @abimethod
    def check_position(self, user_box_name: UserLeverageBoxName) -> tuple[bool, UInt64, UInt64, UInt64, UInt64]: #return whether to liquidate and the current value
        assert Txn.sender == Global.creator_address
        leverage_box_value = self.user_leveraged_positions[user_box_name].copy()
        initial_algo_amount = leverage_box_value.algo_deposit.as_uint64()
        leverage = leverage_box_value.leverage.as_uint64()
        asset_holdings_amount = leverage_box_value.asset_amount

        pool_address = self.get_logicsig_address(user_box_name.asset)

        sell_asset = itxn.AssetTransfer(
            xfer_asset=user_box_name.asset.as_uint64(),
            asset_amount=asset_holdings_amount.as_uint64(),
            asset_receiver=pool_address
        )

        arg_1 = Bytes(b'swap')
        arg_2 = Bytes(b'fixed-input')
        arg_3 = arc4.UInt64(0).bytes

        asset_sell = itxn.ApplicationCall(
            app_id=self.tinyman_router,
            on_completion=OnCompleteAction.NoOp,
            app_args=(arg_1, arg_2, arg_3),
            accounts=(pool_address,),
            assets=(Asset(user_box_name.asset.as_uint64()),)
        )

        tx_1, tx_2 = itxn.submit_txns(sell_asset, asset_sell)

        algo_received_if_position_closed = arc4.UInt64.from_bytes(tx_2.logs(5)[-8:]).as_uint64()

        initial_position = initial_algo_amount * leverage
        debt = initial_position - initial_algo_amount


        scaled_position = algo_received_if_position_closed * self.scaled_base_percentage 
        scaled_liquidation_threshold = initial_position * self.liquidation_threshold 

        if scaled_position <= scaled_liquidation_threshold:
            return True, algo_received_if_position_closed, initial_algo_amount, initial_position, leverage
        else:
            return False, algo_received_if_position_closed, initial_algo_amount, initial_position, leverage
        

    @abimethod
    def liquidate(self, user_box_name: UserLeverageBoxName) -> None: 
        assert Txn.sender == Global.creator_address
        user_box_value = self.user_leveraged_positions[user_box_name].copy()

        algo_received_after_closing_position = self.sell_asset(user_box_name, user_box_value)

        self.dispense_liquidation_outputs(
            user_box_name,
            user_box_value,
            algo_received_after_closing_position
        )

    @subroutine
    def sell_asset(
        self,
        user_box_name: UserLeverageBoxName, 
        user_box_value: UserLeverageBoxValue,
    ) -> UInt64:
        
        pool_address = self.get_logicsig_address(user_box_name.asset)
        asset_holdings_amount = user_box_value.asset_amount

        sell_asset = itxn.AssetTransfer(
            xfer_asset=user_box_name.asset.as_uint64(),
            asset_amount=asset_holdings_amount.as_uint64(),
            asset_receiver=pool_address
        )

        arg_1 = Bytes(b'swap')
        arg_2 = Bytes(b'fixed-input')
        arg_3 = arc4.UInt64(0).bytes

        asset_sell = itxn.ApplicationCall(
            app_id=self.tinyman_router,
            on_completion=OnCompleteAction.NoOp,
            app_args=(arg_1, arg_2, arg_3),
            accounts=(pool_address,),
            assets=(Asset(user_box_name.asset.as_uint64()),)
        )

        sell_asset_axfer_result, sell_asset_app_call_result = itxn.submit_txns(sell_asset, asset_sell)
        return arc4.UInt64.from_bytes(sell_asset_app_call_result.logs(5)[-8:]).as_uint64()

    
    @subroutine
    def dispense_liquidation_outputs(
        self,
        user_box_name: UserLeverageBoxName, 
        user_box_value: UserLeverageBoxValue,
        algo_received_after_closing_position: UInt64
    ) -> None:
        
        initial_algo_amount = user_box_value.algo_deposit.as_uint64()
        leverage = user_box_value.leverage.as_uint64()

        initial_position = initial_algo_amount * leverage
        debt = initial_position - initial_algo_amount
        
        if algo_received_after_closing_position < initial_algo_amount:
            del self.user_leveraged_positions[user_box_name]
        
        else:
            user_remaining_funds = algo_received_after_closing_position - debt
            fee = (initial_position * self.fee) // 10_000
            if fee > user_remaining_funds:
                del self.user_leveraged_positions[user_box_name]
            else:
                itxn.Payment(
                    receiver=user_box_name.user.native,
                    amount=user_remaining_funds - fee
                ).submit()