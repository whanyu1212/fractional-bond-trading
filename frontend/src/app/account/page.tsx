import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { BondForm } from "@/components/createBond";

export default function MyAccount() {
    return (
      <div>
        <Toaster />
        <Navbar />
        <h1>My Account</h1>
        <p>Manage your account details here.</p>

        <BondForm />
      </div>
    );
  }