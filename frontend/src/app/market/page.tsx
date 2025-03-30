"use client";

import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { BondCard } from "@/components/bond-card"; // Ensure this component is implemented

export default function Market() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster />
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-800 sm:text-5xl">
            Market
          </h1>
          <p className="mt-3 text-xl text-gray-600">
            Browse available bonds and manage your trades.
          </p>
        </div>

        <div className="mt-12 bg-white rounded-xl p-6 shadow-xl border border-gray-200">
          <h2 className="text-2xl font-semibold text-blue-700 mb-6">
            Available Bonds
          </h2>
          <BondCard />
        </div>
      </div>
    </div>
  );
}
