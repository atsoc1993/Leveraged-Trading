import { useEffect, useRef, useState } from "react"
import { getUserPositions, getUserSpendableBalance, type LeveragedPosition } from "../helpers"
import { useWallet } from "@txnlab/use-wallet-react";
import { TransactionSigner } from "algosdk";
import './TradingPage.css'

export default function TradingPage() {

    const [positions, setPositions] = useState<LeveragedPosition[]>([])

    const { activeAddress, transactionSigner } = useWallet();

    type CreateNewPositionArgs = {
        address: string | undefined;
        signer: TransactionSigner | undefined;
        asset: bigint | undefined;
        depositAmount: number;
        leverage: number;
    };

    const defaultNewPositionArgs: CreateNewPositionArgs = {
        address: undefined,
        signer: undefined,
        asset: undefined,
        depositAmount: 0,
        leverage: 2
    }

    const [selectingAsset, setSelectingAsset] = useState<boolean>(false);
    const assetOptionsRef = useRef<HTMLDivElement | null>(null);
    const [creatingNewPosition, setCreatingNewPosition] = useState<boolean>(false);
    const [selectedAsset, setSelectedAsset] = useState<AsaInfo | undefined>();
    const [spendableBalance, setSpendableBalance] = useState<number>(0);

    const [newPositionArgs, setNewPositionArgs] = useState<CreateNewPositionArgs>(defaultNewPositionArgs);



    useEffect(() => {
        if (!activeAddress || !transactionSigner) return;

        setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, address: activeAddress, signer: transactionSigner } : positionArgs)
        fetchAsaUrlInfo();
        fetchUsersPositions();
        fetchUserSpendableBalance();
    }, []);

    type AllAsaInfo = {
        [key: number]: AsaInfo
    };

    type AsaInfo = {
        decimals: number
        deleted: boolean
        id: string
        logo: { png: string, svg: string }
        name: string
        total_amount: string
        unit_name: string
        url: string
    };

    const [asaInfo, setAsaInfo] = useState<AsaInfo[]>([]);

    const fetchUsersPositions = async () => {
        if (!activeAddress) return;
        const userPositions: LeveragedPosition[] = await getUserPositions(activeAddress);
        setPositions(userPositions);
        return;
    };

    const fetchAsaUrlInfo = async () => {
        const response = await fetch('https://asa-list.tinyman.org/assets.json');
        const data: AllAsaInfo = await response.json();

        const filteredData: AsaInfo[] =
            Object.entries(whiteListedAssets).map((asset): AsaInfo | undefined => {
                if (asset[1] in data) {
                    return {
                        decimals: data[asset[1]].decimals,
                        deleted: data[asset[1]].deleted,
                        id: data[asset[1]].id,
                        logo: data[asset[1]].logo,
                        name: data[asset[1]].name,
                        total_amount: data[asset[1]].total_amount,
                        unit_name: data[asset[1]].unit_name,
                        url: data[asset[1]].url
                    }
                }
            })
                .filter((item) => item !== undefined);

        setAsaInfo(filteredData);
        setSelectedAsset(filteredData[0]);
        setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, asset: BigInt(filteredData[0].id) } : positionArgs);
    };

    const fetchUserSpendableBalance = async () => {
        if (!activeAddress) return;
        const spendableBalance = await getUserSpendableBalance(activeAddress);
        setSpendableBalance(spendableBalance);
        setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, depositAmount: spendableBalance / 10 ** 6 } : positionArgs)
    }

    type Assets = {
        [key: string]: number;
    };

    const whiteListedAssets: Assets = {
        'Tiny': 2200000000,
        'Alpha Arcade': 2726252423,
        'DeFi-nite': 400593267,
        'Haystack': 3160000000,
        'Defly': 470842789,
        'Power': 2994233666,
        'Vestige': 700965019,
        'Monko': 2494786278,
        'Coop': 796425061,
        'Orange': 1284444444,
        'Akita': 523683256,
        'CompX': 1732165149,
        'Vote': 452399768,
        'Polkagold': 1237529510,
    };

    const leverageOptions: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10]


    // const createPosition = async () => {
    //     if (!activeAddress) return;
    //     const txId = createLeveragedPosition(newPositionArgs);
    //     console.log(`Successfully Created Leveraged Position: ${txId}`)
    // }



    return (
        <>
            <div id="create-new-position-button"
                onClick={() => setCreatingNewPosition(true)}
            >
                Create New Long Position
            </div>
            {creatingNewPosition &&
                <>

                    <div id="gray-background"></div>
                    <div id="create-new-position-modal">
                        <p className="option-label">Address: {activeAddress?.slice(0, 15)}...</p>
                        <p className="option-label">Balance: {(spendableBalance / 10 ** 6).toLocaleString()}</p>
                        <div id="asset-selection">
                            {/* <p className="option-label">Asset: </p> */}
                            <div id="asset-options-outer">
                                <div
                                    id="asset-options-wrapper"
                                    className={selectingAsset ? "selecting" : ""}
                                    ref={assetOptionsRef}

                                    onClick={() => {
                                        setSelectingAsset(!selectingAsset)
                                    }}
                                >
                                    <div id="asset-options">
                                        {selectedAsset && <div id="asset-option-wrapper" key={selectedAsset.name + 'w'}>
                                            <div key={selectedAsset.name} className="selected-asset-option">
                                                <img className="asset-icon" src={selectedAsset.logo.png} />
                                                <p>{selectedAsset.name}</p>
                                            </div>
                                        </div>
                                        }
                                        {asaInfo.map((asset) =>
                                            asset.id !== selectedAsset?.id && (
                                                <div id="asset-option-wrapper" key={asset.name + 'w'}

                                                    onClick={() => {
                                                        if (assetOptionsRef.current) {
                                                            assetOptionsRef.current.scrollTop = 0;
                                                        };
                                                        setSelectedAsset(asset);
                                                        setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, asset: BigInt(asset.id) } : positionArgs);
                                                        setTimeout(() => setSelectingAsset(false), 50);
                                                    }}
                                                >
                                                    <div key={asset.name} className="asset-option">
                                                        <img className="asset-icon" src={asset.logo.png} />
                                                        <p>{asset.name}</p>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id="algo-amounts">
                            <div className="algo-amount">
                                <p>Purchase Amount</p>
                                <div className="algo-amount-text">
                                    <p> {(newPositionArgs.depositAmount ? newPositionArgs.depositAmount : (spendableBalance / 10 ** 6) / 10).toLocaleString()}</p>
                                    <img className="asset-icon" src="https://asa-list.tinyman.org/assets/0/icon.png"></img>
                                </div>
                            </div>
                            <div className="algo-amount">
                                <p>Leverage Amount</p>
                                <div className="algo-amount-text">
                                    <p>{(newPositionArgs.leverage * (newPositionArgs.depositAmount)).toLocaleString()}</p>
                                    <img className="asset-icon" src="https://asa-list.tinyman.org/assets/0/icon.png"></img>
                                </div>
                            </div>
                        </div>
                        <input
                            id="leverage-amount-bar"
                            type="range"
                            defaultValue={(spendableBalance / 10 ** 6)}
                            max={spendableBalance / 10 ** 6}
                            min={0}
                            onChange={(e) => setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, depositAmount: Number(e.target.value) } : positionArgs)}
                        >
                        </input>
                        <div id="leverage-options">
                            {leverageOptions.map((leverageOption) =>
                                <div className={newPositionArgs.leverage == leverageOption ? "leverage-option selected-leverage" : "leverage-option"}
                                    onClick={() => setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, leverage: leverageOption } : positionArgs)}
                                >
                                    {leverageOption}x
                                </div>
                            )}
                        </div>
                        <div id="submit-or-cancel-options">
                            <button id="cancel-button"
                                onClick={async () => {
                                    setCreatingNewPosition(false);
                                    setNewPositionArgs(defaultNewPositionArgs);
                                    setSelectedAsset(asaInfo[0])
                                    setSelectingAsset(false);
                                    await fetchUserSpendableBalance();
                                }}
                            >Cancel</button>
                            <button id="submit-button">Buy Long</button>
                        </div>
                    </div>
                </>
            }
            <div id="position-grid">
                {positions.length > 0 ?
                    positions.map((position) =>
                        <div key={position.asset.toString()}>
                            <p>{position.algoDeposit.toString()}</p>
                            <p>{position.asset.toString()}</p>
                            <p>{position.assetAmount.toString()}</p>
                            <p>{position.leverage.toString()}</p>
                            <img src={`https://asa-list.tinyman.org/assets/${position.asset.toString()}/icon.png`}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://asa-list.tinyman.org/assets/icon-placeholder/icon.png" }}>
                            </img>
                        </div>
                    ) :
                    (
                        <h1 id="no-positions">No Positions</h1>
                    )
                }
            </div>
        </>
    )
}