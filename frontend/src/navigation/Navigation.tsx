import { Routes, Route } from "react-router-dom";

// Pages
import Homepage from "../components/Widgets/Homepage/Homepage";
import MarketScreen from "../screens/Market/MarketScreen";
import SigninScreen from "../screens/Members/SigninScreen";
import SignupScreen from "../screens/Members/SignupScreen";
import ForgotScreen from "../screens/Members/ForgotScreen";
import ProfileScreen from "../screens/Members/ProfileScreen";
import CapitalScreen from "../screens/Capital/CapitalScreen";
import DashboardScreen from "../screens/Dashboard/DashboardScreen";
import TransactionsScreen from "../screens/Transactions/TransactionsScreen";
import Wallet from "../screens/Wallet/Wallet";

const Navigation: React.FC = () => (
  <Routes>
    <Route path="/" element={<Homepage />} />
    <Route path="/signin" element={<SigninScreen />} />
    <Route path="/signup" element={<SignupScreen />} />
    <Route path="/market" element={<MarketScreen />} />
    <Route path="/members" element={<ProfileScreen />} />
    <Route path="/capital" element={<CapitalScreen />} />
    <Route path="/dashboard" element={<DashboardScreen />} />
    <Route path="/transactions" element={<TransactionsScreen />} />
    <Route path="/members/forgot-password" element={<ForgotScreen />} />
    <Route path="/wallet" element={<Wallet />} />
  </Routes>
);

export default Navigation;
