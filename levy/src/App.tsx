import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react';
import './App.css'

export default function App() {

  const [selectingWallet, setSelectingWallet] = useState<boolean>(false);

  const { activeAddress, wallets } = useWallet();

  return (
    <>
      {!selectingWallet ? activeAddress ? (
        <h1>Connected Wallet: {activeAddress} </h1>
      ) : (
        <button
          onClick={() => setSelectingWallet(true)}>
          Connect Wallet
        </button>
      ) : null
      }
      {selectingWallet &&
        <>
          <div id='gray-background'></div>
          <div id='wallet-selection'>
            {wallets.map((wallet) =>
              <div key={wallet.id + 'b'} className='wallet-button'
                onClick={async () => await wallet.connect()}>
                <p key={wallet.id + 'p'}>
                  {wallet.id}
                </p>
                <img key={wallet.id + 'img'} className='wallet-icon' src={wallet.metadata.icon}></img>
              </div>
            )}
          </div>
        </>
      }
    </>
  )
}