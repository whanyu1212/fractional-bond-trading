"use client";

import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { BondCard } from "@/components/bond-card";

export default function Market() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Toaster />
      <Navbar />
      <div className="container mx-auto py-10 px-4">
        {/* 页面标题 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 drop-shadow-sm">
            Market
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Browse available bonds and manage your trades.
          </p>
          <div className="mt-2 w-20 h-1 mx-auto bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
        </div>

        {/* 主体内容 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          <h2 className="text-2xl font-semibold text-blue-700 mb-6">
            Available Bonds
          </h2>
          <BondCard />
        </div>
      </div>
    </div>
  );
}
