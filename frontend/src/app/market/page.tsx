"use client";

import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/navbar";
import { BondCard } from "@/components/bond-card"; // Make sure to create this file with the BondCard component


export default function Market() {
    return (
      <div>
        <Toaster />
        <Navbar />

        <div className="container mx-auto py-6">
        <div className="flex flex-col space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Trade</h1>
          <p className="text-muted-foreground">
            Browse available bonds and manage your trades.
          </p>
        </div>
        
        <div className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Available Bonds</h2>
          <BondCard />
        </div>
      </div>



      </div>
    );
  }