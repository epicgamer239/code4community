"use client";

import { useEffect, useState } from "react";
import { formatSessionTime } from "@/lib/mathlab/formatSessionTime";

export default function ActiveSessionTimer({ startTime }) {
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const updateDuration = () => {
      const now = new Date();
      setDuration(Math.floor((now - startTime) / 1000));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="font-mono font-medium text-primary">
      {formatSessionTime(duration)}
    </span>
  );
}
