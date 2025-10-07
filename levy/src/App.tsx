import { useWallet } from '@txnlab/use-wallet-react'
import { useState } from 'react';
import './App.css'
import WalletModal from './components/WalletModal';
import TradingPage from './pages/TradingPage';

export default function App() {

  const [selectingWallet, setSelectingWallet] = useState<boolean>(false);

  const { activeAddress } = useWallet();

  return (
    <>
      {!activeAddress ? 
      <WalletModal selectingWallet={selectingWallet} setSelectingWallet={setSelectingWallet}/>
    : <TradingPage/>
    }
    </>
  )
}