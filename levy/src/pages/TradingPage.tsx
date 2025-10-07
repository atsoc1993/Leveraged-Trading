import { useEffect, useState } from "react"
import { getUserPositions, type LeveragedPosition } from "../helpers"
import { useWallet } from "@txnlab/use-wallet-react";
import { TransactionSigner } from "algosdk";
import './TradingPage.css'

export default function TradingPage() {

    const [positions, setPositions] = useState<LeveragedPosition[]>([])

    const { activeAddress, transactionSigner } = useWallet();

    type CreateNewPositionArgs = {
        address: string,
        signer: TransactionSigner,
        asset: bigint,
        depositAmount: bigint,
        leverage: number
    };
    const [creatingNewPosition, setCreatingNewPosition] = useState<boolean>(false);
    const [selectingAsset, setSelectingAsset] = useState<boolean>(false);
    const [selectedAsset, setSelectedAsset] = useState<AsaInfo | undefined>()
    const [newPositionArgs, setNewPositionArgs] = useState<CreateNewPositionArgs | undefined>();


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
        setSelectedAsset(filteredData[0])
    };

    type Assets = {
        [key: string]: number
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

    useEffect(() => {
        fetchAsaUrlInfo();
        fetchUsersPositions();
    }, []);

    const fetchUsersPositions = async () => {
        if (!activeAddress) return;
        const userPositions: LeveragedPosition[] = await getUserPositions(activeAddress);
        setPositions(userPositions);
        return;
    };

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
                Create New Position
            </div>
            {creatingNewPosition &&
                <>

                    <div id="gray-background"></div>
                    <div id="create-new-position-modal">
                        <div id="asset-selection">
                            <p>Asset: </p>
                            <div id="asset-options-outer">
                                <div
                                    id="asset-options-wrapper"
                                    className={selectingAsset ? "" : "selecting"}
                                    onClick={() => setSelectingAsset(!selectingAsset)}
                                >
                                    <div id="asset-options">
                                        {selectedAsset && <div id="asset-option-wrapper" key={selectedAsset.name + 'w'}>
                                            <div key={selectedAsset.name} className="asset-option">
                                                <img className="asset-icon" src={selectedAsset.logo.png} />
                                                <p>{selectedAsset.name}</p>
                                            </div>
                                        </div>
                                        }
                                        {asaInfo.map((asset) => (
                                            <div id="asset-option-wrapper" key={asset.name + 'w'}
                                            onClick={() => setSelectedAsset(asset)}>
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