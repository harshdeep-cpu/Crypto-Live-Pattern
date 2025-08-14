import React, { useEffect, useMemo, useState } from "react";
import io from "socket.io-client";
import Chart from "./Chart.jsx";

const SOCKET_URL = "http://localhost:4000";
const API_SEED = "http://localhost:4000/api/seed";

export default function App() {
  const [candles, setCandles] = useState([]);
  const [signals, setSignals] = useState([]);
  const [status, setStatus] = useState("Initializing…");
  const [connected, setConnected] = useState(false);

  // Transform to chart format
  const chartData = useMemo(
    () =>
      candles.map((k) => ({
        time: k.time / 1000, // seconds
        open: k.open,
        high: k.high,
        low: k.low,
        close: k.close,
      })),
    [candles]
  );

  useEffect(() => {
    let cancelled = false;

    // Seed via REST
    const loadSeed = async () => {
      try {
        setStatus("Fetching seed data…");
        const r = await fetch(API_SEED);
        const { candles: seed } = await r.json();
        if (!cancelled && Array.isArray(seed)) {
          setCandles(seed);
          setStatus(`Loaded ${seed.length} seed candles`);
        }
      } catch (e) {
        console.error("Seed fetch failed:", e);
        setStatus("Seed fetch failed (check server)");
      }
    };

    loadSeed();

    // Live via sockets
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on("connect", () => {
      setConnected(true);
      setStatus("Connected to server");
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setStatus("Disconnected — retrying…");
    });
    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err.message);
      setStatus(`Socket error: ${err.message}`);
    });

    // Server may send a seed too
    socket.on("seed", (seed) => {
      if (Array.isArray(seed) && seed.length) {
        setCandles(seed);
        setStatus(`Seed from socket: ${seed.length} candles`);
      }
    });

    socket.on("candle", ({ candle, closed }) => {
      if (!candle) return;
      setCandles((prev) => {
        if (!prev.length || prev[prev.length - 1].time < candle.time) {
          return [...prev, candle];
        } else {
          const copy = prev.slice();
          copy[copy.length - 1] = candle;
          return copy;
        }
      });
      if (closed) {
        setStatus(`Closed candle @ ${candle.time}`);
      }
    });

    socket.on("signal", (sig) => {
      if (!sig) return;
      setSignals((prev) => [...prev, sig]);
    });

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, []);

  return (
    <div className="wrap">
      <h1>Crypto Price Pattern Detection Dashboard</h1>
      <p className="sub">
        {connected ? "🟢 Live" : "🟡"} {status}
      </p>
      <Chart data={chartData} signals={signals} />
      <div className="legend">
        <span className="bull">Bullish engulfing</span>
        <span className="bear">Bearish engulfing</span>
        <span className="doji">Doji</span>
      </div>
      <p className="sub" style={{ marginTop: 12 }}>
        Candles: {candles.length} • Signals: {signals.length}
      </p>
    </div>
  );
}
