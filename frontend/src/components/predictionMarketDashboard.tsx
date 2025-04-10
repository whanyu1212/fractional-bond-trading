"use client";

import { useReadContract } from "thirdweb/react";
// import { contract, oracleContract } from "@/constants/contract";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketCard } from "./market-card";
import { Navbar } from "./navbar";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { Footer } from "./footer";
import { useState, useEffect } from "react";
// import { VoteChart } from "./history-chart";
import { Menu } from "./menu-bar";
import styled from "styled-components";

const ChartContainer = styled.div`
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.5s ease-out, opacity 0.5s ease-out;
  opacity: 0;

  &.show {
    max-height: 500px; /* 根据需要调整高度 */
    opacity: 1;
  }
`;

export default function PredictionMarketDashboard() {
  const [category, setCategory] = useState<"Currency" | "General">("Currency");
  const [marketCount, setMarketCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMarketIndex, setSelectedMarketIndex] = useState<number | null>(
    null
  ); // 添加状态来存储选中的市场索引
  const [chartTitle, setChartTitle] = useState(""); // 添加状态来存储图表标题
  const [showChart, setShowChart] = useState(false); // 添加状态来控制图表显示

  // const { data: generalMarketCount, isLoading: isLoadingGeneralCount } =
  //   useReadContract({
  //     contract: contract,
  //     method: "function marketCount() view returns (uint256)",
  //     params: [],
  //   });

  // const { data: currencyMarketCount, isLoading: isLoadingCurrencyCount } =
  //   useReadContract({
  //     contract: oracleContract,
  //     method: "function marketCount() view returns (uint256)",
  //     params: [],
  //   });

  useEffect(() => {
    // if (!isLoadingGeneralCount && !isLoadingCurrencyCount) {
    //   const count =
    //     category === "Currency" ? currencyMarketCount : generalMarketCount;
    //   const loading =
    //     category === "Currency"
    //       ? isLoadingCurrencyCount
    //       : isLoadingGeneralCount;

    //   setMarketCount(count ? Number(count) : 0);
    //   setIsLoading(loading);
    // }
  }, [category]);

  const handleMarketCardClick = (index: number, title: string) => {
    setSelectedMarketIndex(index); // 更新选中的市场索引
    setChartTitle(title); // 更新图表标题
    setShowChart(true); // 显示图表
  };

  // Show 6 skeleton cards while loading
  const skeletonCards = Array.from({ length: 6 }, (_, i) => (
    <MarketCardSkeleton key={`skeleton-${i}`} />
  ));

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow container mx-auto p-4">
        <Navbar />
        <Menu category={category} setCategory={setCategory} />
        {/* <ChartContainer className={showChart ? "show" : ""}>
          {showChart && selectedMarketIndex !== null && (
            <VoteChart
              index={selectedMarketIndex}
              title={chartTitle}
              category={category}
            />
          )}
        </ChartContainer> */}

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="pending">Pending Resolution</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          {isLoading ? (
            <TabsContent value="active" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {skeletonCards}
              </div>
            </TabsContent>
          ) : (
            <>
              <TabsContent value="active">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: Number(marketCount) }, (_, index) => (
                    <MarketCard
                      key={index}
                      index={index}
                      filter="active"
                      category={category}
                      onClick={handleMarketCardClick}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="pending">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: Number(marketCount) }, (_, index) => (
                    <MarketCard
                      key={index}
                      index={index}
                      filter="pending"
                      category={category}
                      onClick={handleMarketCardClick}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="resolved">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: Number(marketCount) }, (_, index) => (
                    <MarketCard
                      key={index}
                      index={index}
                      filter="resolved"
                      category={category}
                      onClick={handleMarketCardClick}
                    />
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
