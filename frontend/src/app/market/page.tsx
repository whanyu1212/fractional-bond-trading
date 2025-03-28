import { Navbar } from "@/components/navbar";
import { Toaster } from "@/components/ui/toaster";
export default function Market() {
    return (
      <div>
        <Toaster />
        <Navbar />
        <h1>Market Page</h1>
        <p>Welcome to the Market page!</p>
      </div>
    );
  }