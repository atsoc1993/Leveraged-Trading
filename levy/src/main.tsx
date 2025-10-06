import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { WalletId, NetworkId, WalletProvider, WalletManager } from '@txnlab/use-wallet-react'

const walletManager = new WalletManager({
  defaultNetwork: NetworkId.TESTNET,
  wallets: [
  WalletId.PERA,
  WalletId.LUTE,
  WalletId.DEFLY,
  // WalletId.KIBISIS,
  // WalletId.EXODUS,
  ],
});

createRoot(document.getElementById('root')!).render(
  <WalletProvider manager={walletManager}>
    <App />
  </WalletProvider>
)
