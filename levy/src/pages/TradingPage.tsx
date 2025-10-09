import { useEffect, useRef, useState } from "react"
import { createLeveragedPosition, CreateNewPositionArgs, getUserPositions, getUserSpendableBalance, type LeveragedPosition } from "../helpers"
import { useWallet } from "@txnlab/use-wallet-react";
import './TradingPage.css';

export default function TradingPage() {

    const [positions, setPositions] = useState<LeveragedPosition[]>([]);

    const { activeAddress, transactionSigner, activeWallet } = useWallet();

    const defaultNewPositionArgs: CreateNewPositionArgs = {
        asset: undefined,
        depositAmount: 1,
        leverage: 2
    };

    const [selectingAsset, setSelectingAsset] = useState<boolean>(false);
    const assetOptionsRef = useRef<HTMLDivElement | null>(null);
    const [creatingNewPosition, setCreatingNewPosition] = useState<boolean>(false);
    const [selectedAsset, setSelectedAsset] = useState<AsaInfo | undefined>();
    const [spendableBalance, setSpendableBalance] = useState<number>(0);
    const [resetPage, setResetPage] = useState<boolean>(false);

    const [newPositionArgs, setNewPositionArgs] = useState<CreateNewPositionArgs>(defaultNewPositionArgs);



    useEffect(() => {
        if (!activeAddress || !transactionSigner) return;
        setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, address: activeAddress, signer: transactionSigner } : positionArgs);
        fetchAsaUrlInfo();
        fetchUsersPositions();
        fetchUserSpendableBalance();
    }, []);

    type AllAsaInfo = {
        [key: number]: AsaInfo;
    };

    type AsaInfo = {
        decimals: number;
        deleted: boolean;
        id: string;
        logo: { png: string, svg: string };
        name: string;
        total_amount: string;
        unit_name: string;
        url: string;
    };

    const [asaInfo, setAsaInfo] = useState<AsaInfo[]>([]);

    const fetchUsersPositions = async () => {
        if (!activeAddress) return;
        const userPositions: LeveragedPosition[] = await getUserPositions(activeAddress);
        setPositions(userPositions);
        return;
    };

    const fetchAsaUrlInfo = async () => {
        const testnet = true;

        const response = await fetch('https://asa-list.tinyman.org/assets.json');
        const data: AllAsaInfo = await response.json();

        const testnetInfo = [{
            decimals: 0,
            deleted: false,
            id: Object.entries(whiteListedAssets)[0][1].toString(),
            logo: { png: '', svg: '' },
            name: Object.entries(whiteListedAssets)[0][0],
            total_amount: '',
            unit_name: 'T1',
            url: ''
        }];

        let filteredData: AsaInfo[] = [];

        if (testnet) {
            filteredData = testnetInfo
        } else {
            filteredData =
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
                        };
                    };
                })
                    .filter((item) => item !== undefined);
        };

        setSelectedAsset(filteredData[0]);
        setAsaInfo(filteredData);
        setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, asset: BigInt(filteredData[0].id) } : positionArgs);
    };


    const fetchUserSpendableBalance = async () => {
        if (!activeAddress) return;
        const spendableBalance = await getUserSpendableBalance(activeAddress);
        setSpendableBalance(spendableBalance);
    };

    type Assets = {
        [key: string]: number;
    };

    // Mainnet
    // const whiteListedAssets: Assets = {
    //     'Tiny': 2200000000,
    //     'Alpha Arcade': 2726252423,
    //     'DeFi-nite': 400593267,
    //     'Haystack': 3160000000,
    //     'Defly': 470842789,
    //     'Power': 2994233666,
    //     'Vestige': 700965019,
    //     'Monko': 2494786278,
    //     'Coop': 796425061,
    //     'Orange': 1284444444,
    //     'Akita': 523683256,
    //     'CompX': 1732165149,
    //     'Vote': 452399768,
    //     'Polkagold': 1237529510,
    // };

    // Testnet
    const whiteListedAssets: Assets = {
        'Test': 746989253
    }
    const leverageOptions: number[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];


    const createPosition = async () => {
        if (!activeAddress) return;
        console.log(newPositionArgs)
        const txId = await createLeveragedPosition(activeAddress, transactionSigner, newPositionArgs);
        console.log(`Successfully Created Leveraged Position: ${txId}`)
    }



    return (
        <>
            <div id="disconnect-button"
                onClick={() => activeWallet?.disconnect()}
            >
                Disconnect
            </div>
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
                        <p className="option-label">Balance: {(spendableBalance / 10 ** 6).toLocaleString()}
                            <img id="balance-algo-icon" src="https://asa-list.tinyman.org/assets/0/icon.png"></img>
                        </p>
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
                                                <img className="asset-icon" src={selectedAsset.logo.png}
                                                    onError={(e) => {
                                                        (e.currentTarget as HTMLImageElement).src = "https://asa-list.tinyman.org/assets/icon-placeholder/icon.png"
                                                    }}
                                                />
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
                                                        <img className="asset-icon" src={asset.logo.png}
                                                            onError={(e) => {
                                                                (e.currentTarget as HTMLImageElement).src = "https://asa-list.tinyman.org/assets/icon-placeholder/icon.png"
                                                            }}
                                                        />
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
                                    <p> {(newPositionArgs.depositAmount ? newPositionArgs.depositAmount : 1).toLocaleString()}</p>
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
                            defaultValue={1}
                            max={spendableBalance / 10 ** 6}
                            min={0}
                            onChange={(e) => setNewPositionArgs(positionArgs => positionArgs ? { ...positionArgs, depositAmount: Number(e.target.value) } : positionArgs)}
                        >
                        </input>
                        <div id="leverage-options">
                            {leverageOptions.map((leverageOption) =>
                                <div key={leverageOption} className={newPositionArgs.leverage == leverageOption ? "leverage-option selected-leverage" : "leverage-option"}
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
                            <button id="submit-button"
                                onClick={async () => {
                                    await createPosition();
                                    setCreatingNewPosition(false);
                                    setResetPage(!resetPage)
                                }}
                            >Buy Long</button>
                        </div>
                    </div>
                </>
            }
            <div id="position-grid">
                {positions.length > 0 ?
                    positions.map((position) =>
                        <div className='grid-item' key={position.asset.toString()}>
                            <div className="grid-data">
                                <p>Risk Ratio: x%</p>
                                <p>Value: $x</p>
                                <p className="grid-data-item">Risking: {position.algoDeposit.toString()}
                                    <img id="balance-algo-icon" src="https://asa-list.tinyman.org/assets/0/icon.png"></img>
                                </p>
                                <p className="grid-data-item">Total: {(position.algoDeposit * position.leverage).toString()}
                                    <img id="balance-algo-icon" src="https://asa-list.tinyman.org/assets/0/icon.png"></img>
                                </p>
                                <p className="grid-data-item">Asset:
                                    <img id="balance-algo-icon" src={asaInfo.filter(asas => asas.id === position.asset.toString())[0].logo.png}
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://asa-list.tinyman.org/assets/icon-placeholder/icon.png" }}>

                                    </img>
                                </p>
                                <p>Asset ID: {position.asset.toString()}</p>
                                <p>Tokens Held: {position.assetAmount.toString()}</p>
                                <p>Leverage Multiplier: {position.leverage.toString()}x</p>
                                <img className='grid-image' src={`https://asa-list.tinyman.org/assets/${position.asset.toString()}/icon.png`}
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://asa-list.tinyman.org/assets/icon-placeholder/icon.png" }}>
                                </img>
                                <p className="warning-text">Liquidates at 70% Risk</p>
                            </div>
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