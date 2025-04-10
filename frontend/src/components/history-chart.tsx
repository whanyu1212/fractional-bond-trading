// import React, { useEffect, useState } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";
// import {
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
//   ChartLegend,
//   ChartLegendContent,
// } from "./ui/chart";
// import { useReadContract } from "thirdweb/react";
// // import { contract, oracleContract } from "@/constants/contract";
// import { toEther } from "thirdweb";

// // To suppress the error "Maximum update depth exceeded" in development mode
// if (process.env.NODE_ENV === "development") {
//   const originalError = console.error;
//   console.error = (...args) => {
//     if (
//       typeof args[0] === "string" &&
//       args[0].includes("Maximum update depth exceeded")
//     ) {
//       return;
//     }
//     originalError(...args);
//   };
// }

// interface VoteChartProps {
//   index: number;
//   title: string;
//   category: "Currency" | "General";
// }

// interface VoteData {
//   date: string;
//   yes: number;
//   no: number;
// }

// export function VoteChart({ index, title, category }: VoteChartProps) {
//   const [voteData, setVoteData] = useState<VoteData[]>([]);
//   const [optionALabel, setOptionALabel] = useState<string>("Option A");
//   const [optionBLabel, setOptionBLabel] = useState<string>("Option B");
//   const [chartConfig, setChartConfig] = useState({
//     yes: { label: "Yes", color: "#00ff00" },
//     no: { label: "No", color: "#ff0000" },
//   });

//   const contractToUse = category === "Currency" ? oracleContract : contract;
//   const methodToUse =
//     category === "Currency"
//       ? "function getMarketInfo(uint256 _marketId) view returns (string assetSymbol, uint8 operator, uint256 targetPrice, uint256 endTime, uint256 duration, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)"
//       : "function getMarketInfo(uint256 _marketId) view returns (string question, uint256 endTime, uint256 duration, uint8 outcome, string optionA, string optionB, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved)";

//   // 读取市场信息
//   const { data: marketData } = useReadContract({
//     contract: contractToUse,
//     method: methodToUse,
//     params: [BigInt(index)],
//   });

//   // 读取所有投票数据
//   const { data: voteResults } = useReadContract({
//     contract: contractToUse,
//     method:
//       "function getAllVotesByDate(uint256 _marketId) view returns (uint256[] memory dates, uint256[] memory optionAVotes, uint256[] memory optionBVotes)",
//     params: [BigInt(index)],
//   });

//   useEffect(() => {
//     if (!marketData) return;

//     const market =
//       category === "Currency"
//         ? {
//             endTime: marketData[3],
//             duration: marketData[4],
//             optionA: "Yes",
//             optionB: "No",
//           }
//         : {
//             endTime: marketData[1],
//             duration: marketData[2],
//             optionA: marketData[4],
//             optionB: marketData[5],
//           };

//     setOptionALabel(market.optionA);
//     setOptionBLabel(market.optionB);

//     setChartConfig({
//       yes: { label: market.optionA, color: "#00ff00" },
//       no: { label: market.optionB, color: "#ff0000" },
//     });
//   }, [marketData, category]);

//   // 处理投票数据
//   useEffect(() => {
//     if (!voteResults) {
//       setVoteData([]);
//       return;
//     }

//     const [dates, optionAVotes, optionBVotes] = voteResults;
//     const votes: VoteData[] = dates.map((date: bigint, i: number) => {
//       const timestamp = Number(date) * 86400 * 1000; // 将天数转换为毫秒时间戳
//       return {
//         date: new Date(timestamp).toLocaleDateString(),
//         yes: optionAVotes[i] ? parseInt(toEther(optionAVotes[i])) : 0,
//         no: optionBVotes[i] ? parseInt(toEther(optionBVotes[i])) : 0,
//       };
//     });

//     setVoteData(votes);
//   }, [voteResults]);

//   return (
//     <div className="w-full h-96 mb-12">
//       {title && (
//         <h2 className="text-center text-xl font-semibold mb-4">{title}</h2>
//       )}
//       <ChartContainer config={chartConfig} className="w-full h-full">
//         <LineChart data={voteData}>
//           <CartesianGrid strokeDasharray="3 3" vertical={false} />
//           <XAxis dataKey="date" />
//           <YAxis />
//           <ChartTooltip content={<ChartTooltipContent />} />
//           <ChartLegend content={<ChartLegendContent />} verticalAlign="top" />
//           <Line
//             type="monotone"
//             dataKey="yes"
//             stroke={chartConfig.yes.color}
//             name={optionALabel}
//           />
//           <Line
//             type="monotone"
//             dataKey="no"
//             stroke={chartConfig.no.color}
//             name={optionBLabel}
//           />
//         </LineChart>
//       </ChartContainer>
//     </div>
//   );
// }
