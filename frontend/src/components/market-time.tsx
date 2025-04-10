import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MarketTimeProps {
  endTime: bigint;
  category: "Currency" | "General";
  isResolved: boolean;
  className?: string;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    second: "2-digit",
  });
};

const calculateTimeLeft = (endTime: number) => {
  const difference = endTime - new Date().getTime();
  let timeLeft = {};

  if (difference > 0) {
    timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  return timeLeft;
};

export function MarketTime({
  endTime,
  category,
  isResolved,
  className,
}: MarketTimeProps) {
  const [timeLeft, setTimeLeft] = useState(
    calculateTimeLeft(Number(endTime) * 1000)
  );
  const [resolveTimeLeft, setResolveTimeLeft] = useState(
    calculateTimeLeft(Number(endTime) * 1000 + 60 * 1000)
    // calculateTimeLeft(Number(endTime) * 1000 + 24 * 60 * 60 * 1000)
  );
  const isEnded = new Date(Number(endTime) * 1000) < new Date();
  const formattedDate = formatDate(
    new Date(Number(endTime) * 1000).toISOString()
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft(Number(endTime) * 1000));
      setResolveTimeLeft(
        calculateTimeLeft(Number(endTime) * 1000 + 60 * 1000)
        // calculateTimeLeft(Number(endTime) * 1000 + 24 * 60 * 60 * 1000)
      );
    }, 1000);

    return () => clearTimeout(timer);
  });

  //   const resolveTime = new Date(Number(endTime) * 1000);
  //   // resolve in 1 minute
  //   resolveTime.setMinutes(resolveTime.getMinutes() + 1);
  //   //   resolveTime.setHours(resolveTime.getHours() + 24);

  return (
    <div
      className={cn(
        "mb-2 w-fit px-2 py-1 rounded border text-xs",
        isEnded
          ? "bg-red-200 border-red-300 text-red-800"
          : "border-gray-300 text-gray-800",
        className
      )}
    >
      {isEnded
        ? `Ended: ${formattedDate}`
        : `Ends in: ${timeLeft.days}d ${timeLeft.hours}h ${timeLeft.minutes}m ${timeLeft.seconds}s`}
      {!isResolved && isEnded && category === "Currency" && (
        <div className="mt-1">
          Resolve in: {resolveTimeLeft.days}d {resolveTimeLeft.hours}h{" "}
          {resolveTimeLeft.minutes}m {resolveTimeLeft.seconds}s
        </div>
      )}
    </div>
  );
}
