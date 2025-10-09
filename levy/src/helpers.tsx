import { AlgorandClient } from "@algorandfoundation/algokit-utils";
import { LevyClient } from './clients/LevyClient.ts';
import { ABIType, getApplicationAddress, type TransactionSigner } from "algosdk";

const LEVY_APP_ID = BigInt(import.meta.env.VITE_LEVY_APP_ID);

export type LeveragedPosition = {
    userAddress: string;
    asset: bigint;
    assetAmount: number;
    assetDecimals: bigint;
    algoDeposit: bigint;
    leverage: bigint;
};

const getAlgorandClient = (): AlgorandClient => {
    return AlgorandClient.testNet();
};

const getLevyAppClient = (algorand: AlgorandClient, activeAddress: string, transactionSigner: TransactionSigner): LevyClient => {
    return algorand.client.getTypedAppClientById(LevyClient,
        {
            appId: LEVY_APP_ID,
            defaultSender: activeAddress ? activeAddress : '',
            defaultSigner: transactionSigner,
        }
    );
};

const leverageBoxNameStruct = ABIType.from('(address,uint64)');
const leverageBoxValueStruct = ABIType.from('(uint64,uint64,uint64,uint8)');

const getUserPositions = async (activeAddress: string): Promise<LeveragedPosition[]> => {
    const algorand = getAlgorandClient();
    const boxNames = await algorand.app.getBoxNames(LEVY_APP_ID);

    const boxNamesRaw = boxNames.map((box) => box.nameRaw);
    console.log(boxNamesRaw)
    const usersBoxNames = boxNamesRaw
        .filter((box) => (leverageBoxNameStruct.decode(box) as [string, bigint])[0] === activeAddress);

    console.log(usersBoxNames)
    if (usersBoxNames.length > 0) {

        const userBoxValueInfo = await algorand.app.getBoxValuesFromABIType({
            appId: LEVY_APP_ID,
            boxNames: usersBoxNames,
            type: leverageBoxValueStruct
        }) as [bigint, bigint, bigint, bigint][];


        const usersPositionsInfo: LeveragedPosition[] = usersBoxNames.map((box, i): LeveragedPosition => {
            const [address, asset] = leverageBoxNameStruct.decode(box) as [string, bigint];
            const [algoDeposit, assetAmount, assetDecimals, leverage] = userBoxValueInfo[i];
            console.log(assetAmount, assetDecimals)
            return {
                userAddress: address,
                asset: asset,
                algoDeposit: algoDeposit / BigInt(10 ** 6),
                assetAmount: assetDecimals === BigInt(0) ? Number(assetAmount) : Number(assetAmount) / (10 ** Number(assetDecimals)),
                assetDecimals: assetDecimals,
                leverage: leverage
            };
        });

        return usersPositionsInfo;
    };
    return [];
};

const getUserSpendableBalance = async (address: string): Promise<number> => {
    const algorand = getAlgorandClient();
    const accountInfo = await algorand.account.getInformation(address);
    return Number(accountInfo.balance.microAlgo - accountInfo.minBalance.microAlgo);
};

export type CreateNewPositionArgs = {
    asset: bigint | undefined;
    depositAmount: number;
    leverage: number;
};

const createLeveragedPosition = async (
    activeAddress: string,
    transactionSigner: TransactionSigner,
    createNewPositionArgs: CreateNewPositionArgs
): Promise<string> => {

    if (!activeAddress) return '';
    if (!createNewPositionArgs.asset) return '';
    if (!createNewPositionArgs.depositAmount) return '';
    if (!createNewPositionArgs.leverage) return '';
    
    const algorand = getAlgorandClient();
    const levyClient = getLevyAppClient(algorand, activeAddress, transactionSigner);

    const asset = createNewPositionArgs.asset;
    const optedIntoAsset = await checkIfAppOptedIntoAsset(algorand, asset);
    const newGroup = levyClient.newGroup();

    if (!optedIntoAsset) {

        const mbrPayment = algorand.createTransaction.payment({
            amount: (0.1).algo(),
            sender: activeAddress,
            receiver: levyClient.appAddress,
            signer: transactionSigner,
        });

        newGroup.optIntoAsset({
            args: {
                asset: asset,
                mbrPayment: mbrPayment
            },
            maxFee: (5000).microAlgo()
        });
    };

    const algoDeposit = algorand.createTransaction.payment({
        amount: createNewPositionArgs.depositAmount.algo(),
        sender: activeAddress,
        receiver: levyClient.appAddress,
        signer: transactionSigner,
    });

    newGroup.createPosition({
        args: {
            algoDeposit: algoDeposit,
            asset: asset,
            leverage: createNewPositionArgs.leverage
        },
        maxFee: (5000).microAlgo()
    });
    console.log("Sending")
    const txnResponse = await newGroup.send({
        coverAppCallInnerTransactionFees: true,
        populateAppCallResources: true
    });
    console.log("sent transaction")
    return txnResponse.txIds[0];
};

const checkIfAppOptedIntoAsset = async (algorand: AlgorandClient, asset: bigint): Promise<boolean> => {
    const appAssets = (await algorand.account.getInformation(getApplicationAddress(LEVY_APP_ID))).assets;
    if (!appAssets) return false;
    let optedIntoAsset = false;
    for(const asa of appAssets) {
        if (asa.assetId === asset) {
            optedIntoAsset = true;
            break;
        };
    };
    return optedIntoAsset;
};

export {
    getUserPositions,
    getUserSpendableBalance,
    createLeveragedPosition
};