import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { LevyClient } from './clients/LevyClient.ts';
import { useWallet } from '@txnlab/use-wallet-react';
import { ABIType } from "algosdk";

const LEVY_APP_ID = import.meta.env.VITE_LEVY_APP_ID;

const { activeAddress, transactionSigner } = useWallet();

export type LeveragedPosition = {
    userAddress: string,
    asset: bigint,
    algoDeposit: bigint,
    assetAmount: bigint,
    leverage: bigint
};

const getAlgorandClient = (): AlgorandClient => {
    return AlgorandClient.mainNet();
};

const getLevyAppClient = (algorand: AlgorandClient): LevyClient => {
    return algorand.client.getTypedAppClientById(LevyClient,
        {
            appId: LEVY_APP_ID,
            defaultSender: activeAddress ? activeAddress : '',
            defaultSigner: transactionSigner,
        }
    );
};

const leverageBoxNameStruct = ABIType.from('(address,uint64)')
const leverageBoxValueStruct = ABIType.from('(uint64,uint64,uint8)')

const getUserPositions = async (): Promise<LeveragedPosition[]> => {
    const algorand = getAlgorandClient();
    const boxNames = await algorand.app.getBoxNames(LEVY_APP_ID);

    const boxNamesRaw = boxNames.map((box) => box.nameRaw);

    const usersBoxNames = boxNamesRaw
    .filter((box) => leverageBoxNameStruct.decode(box) as [string, bigint][0] === activeAddress);

    if (usersBoxNames.length > 0) {

        const userBoxValueInfo = await algorand.app.getBoxValuesFromABIType({
            appId: LEVY_APP_ID,
            boxNames: usersBoxNames,
            type: leverageBoxValueStruct
        }) as [bigint, bigint, bigint][];

        const usersPositionsInfo: LeveragedPosition[] = usersBoxNames.map((box, i): LeveragedPosition => {
            const [address, asset] = leverageBoxNameStruct.decode(box) as [string, bigint];
            const [algoDeposit, assetAmount, leverage] = userBoxValueInfo[i];
            return {
                userAddress: address,
                asset: asset,
                algoDeposit: algoDeposit,
                assetAmount: assetAmount,
                leverage: leverage
            };
        })

        return usersPositionsInfo;
    };''
    return [];
};

const createPosition = async (algoDepositAmount: number, asset: bigint, leverage: number): Promise<string> => {
    if (!activeAddress) return ''

    const algorand = getAlgorandClient();
    const levyClient = getLevyAppClient(algorand);

    const algoDeposit = algorand.createTransaction.payment({
        amount: algoDepositAmount.microAlgo(),
        sender: activeAddress,
        receiver: levyClient.appAddress,
        signer: transactionSigner,
    });

    const txnResponse = await levyClient.send.createPosition({
        args: {
            algoDeposit: algoDeposit,
            asset: asset,
            leverage: leverage
        },
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true,
        maxFee: (5000).microAlgo()
    });

    return txnResponse.txIds[0];
}

export {
    getUserPositions,
    createPosition,
};