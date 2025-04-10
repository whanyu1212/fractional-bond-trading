"use client";

import { BondCard } from "@/components/bond-card";

export default function Market() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8 py-12">
      <section className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 animate-fade-in">
          Market
        </h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto relative inline-block after:content-[''] after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-8 after:h-[2px] after:bg-purple-400 after:rounded-full">
          Browse available bonds and manage your trades.
        </p>
      </section>

      <section>
        <BondCard />
      </section>
    </div>
  );
}
