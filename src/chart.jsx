import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

// NOTE: You have lightweight-charts v4 in package.json,
// so addCandlestickSeries() is correct for v4.
// If you move to v5, switch to chart.addSeries(CandlestickSeries, {})

export default function Chart({ data, signals }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      // Give container a height so chart can render
      containerRef.current.style.height = "480px";

      const chart = createChart(containerRef.current, {
        height: 480,
        rightPriceScale: { visible: true },
        timeScale: {
          rightOffset: 2,
          secondsVisible: true,
          tickMarkFormatter: (t) => t,
        },
        layout: {
          textColor: "#222",
          background: { type: "solid", color: "#ffffff" },
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { visible: true },
        },
      });

      const candleSeries = chart.addCandlestickSeries();
      chartRef.current = chart;
      seriesRef.current = candleSeries;

      // Resize handling
      const resize = () => {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      };
      resize();
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;

    // Data must be in { time: number (seconds), open, high, low, close }
    if (!Array.isArray(data) || data.length === 0) return;
    const ok = data.every(
      (d) =>
        typeof d.time === "number" &&
        ["open", "high", "low", "close"].every((k) => typeof d[k] === "number")
    );
    if (!ok) {
      console.warn("Chart: bad data format", data.slice(0, 3));
      return;
    }

    seriesRef.current.setData(data);

    // Convert signals to markers
    const markers = (signals || []).map((s) => {
      let shape = "arrowUp";
      let position = "belowBar";
      if (s.type?.includes("bearish")) {
        shape = "arrowDown";
        position = "aboveBar";
      } else if (s.type?.includes("doji")) {
        shape = "circle";
        position = "belowBar";
      }
      return {
        time: s.time / 1000,
        shape,
        position,
        text: s.type?.toUpperCase(),
      };
    });

    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "480px",
          border: "1px solid #eee",
          borderRadius: 12,
        }}
      />
    );
  });
}
