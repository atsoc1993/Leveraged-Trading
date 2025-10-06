import { type Dispatch, type SetStateAction } from "react"
import { useWallet } from '@txnlab/use-wallet-react'
import { FaSkullCrossbones } from 'react-icons/fa';

type Props = {
    selectingWallet: boolean
    setSelectingWallet: Dispatch<SetStateAction<boolean>>
}

export default function WalletModal({ selectingWallet, setSelectingWallet }: Props) {
  const { wallets } = useWallet();

    return (
        <>
          <button
            id='connect-button'
            className={selectingWallet ? 'shrink' : ''}
            onClick={() => setSelectingWallet(true)}>
            {!selectingWallet ? 'Connect Wallet' : ''}
          </button>

          <>
            <div id='wallet-selection'
              className={selectingWallet ? '' : 'shrink'}>
              {wallets.map((wallet) =>
                <div key={wallet.id + 'b'} className={selectingWallet ? 'wallet-button' : 'wallet-button shrink'}
                onClick={async () => await wallet.connect()}>
                  <p key={wallet.id + 'p'}
                    className={selectingWallet ? '' : 'shrink'}>
                    {wallet.id}
                  </p>
                  <img key={wallet.id + 'img'}
                    className={selectingWallet ? 'wallet-icon' : 'wallet-icon shrink'}
                    src={wallet.metadata.icon}></img>
                </div>
              )}
              <div className={selectingWallet ? 'wallet-button' : 'wallet-button shrink'}
                onClick={async () => setSelectingWallet(false)}>
                <p
                  className={selectingWallet ? '' : 'shrink'}>
                  Cancel
                </p>
                <FaSkullCrossbones style={{alignSelf: 'center', width: '15%', height: '15%'}}/>
              </div>

            </div>
          </>
        </>
)
}