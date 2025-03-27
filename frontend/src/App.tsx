import { Routes, Route } from "react-router-dom";
import Wallet from "./screens/Wallet/Wallet";

function App() {
  return (
    <Routes>
      <Route path="/wallet" element={<Wallet />} />
      {/* Other routes */}
    </Routes>
  );
}

export default App;
