import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { WagmiConfig, createClient, configureChains, chain } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

const queryClient = new QueryClient();

// Create a Wagmi client if needed
const { chains, provider } = configureChains(
  [chain.sepolia],
  [publicProvider()]
);
const wagmiClient = createClient({
  autoConnect: true,
  provider,
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiConfig client={wagmiClient}>
        <ThirdwebProvider activeChain="sepolia" clientId="375c0a5e53f901915a97d33376104ab1">
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ThirdwebProvider>
      </WagmiConfig>
    </QueryClientProvider>
  </React.StrictMode>
);
