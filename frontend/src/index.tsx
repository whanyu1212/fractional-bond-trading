import ReactDOM from 'react-dom/client';

import { BrowserRouter } from 'react-router-dom';

import App from './App';

// const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

// root.render(
//   <BrowserRouter>
//     <App />
//   </BrowserRouter>
// );


import '@rainbow-me/rainbowkit/styles.css'

import { RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from './config'




const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider appInfo={{
          appName: '@懒人码农',
          learnMoreUrl: 'https://54web3.cc'
        }} coolMode showRecentTransactions={true} theme={{
          lightMode: lightTheme(),
          darkMode: darkTheme(),
        }}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
          
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  // </React.StrictMode>,
)
