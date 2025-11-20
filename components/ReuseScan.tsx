"use client";

import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";

type ScannerProps = {
  scanType: "attendance" | "entry" | "breakfast" | "lunch" | "dinner";
  scannerId?: string;
};

export default function ReuseScan({ scanType, scannerId }: ScannerProps) {
  const [scanned, setScanned] = useState<string>("");
  const [status, setStatus] = useState<{ type: string; text?: string }>({
    type: "idle",
  });
  const [lastUid, setLastUid] = useState<string | null>(null);

  function extractUid(payload: string) {
    try {
      const url = new URL(payload);
      const id = url.searchParams.get("id");
      if (id) return id;
    } catch (e) {}
    return payload;
  }

  async function handleDecode(decodedObj: any) {
    if (!decodedObj) return;
    const raw = decodedObj.rawValue;
    if (!raw) return;

    const uid = extractUid(raw.trim());

    setScanned(uid);

    if (uid === lastUid) return;
    setLastUid(uid);

    setStatus({ type: "loading", text: "Verifying..." });

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qr: raw,
          type: scanType,
          scanner: scannerId ?? "device-1",
        }),
      });

      const json = await res.json();

      if (json.success) {
        setStatus({ type: "success", text: json.message });
      } else if (json.already) {
        setStatus({ type: "already", text: json.message });
      } else {
        setStatus({ type: "error", text: json.message });
      }
    } catch (e) {
      setStatus({ type: "error", text: "Server or network error" });
    }

    setTimeout(() => setLastUid(null), 2000);
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-3 capitalize">
        {scanType} RepoGenesis Scanner
      </h2>

      <div className="w-full rounded overflow-hidden border">
        <Scanner
          onScan={(result) => {
            if (Array.isArray(result)) {
              handleDecode(result[0]);
            } else {
              handleDecode(result);
            }
          }}
          onError={(err) => {
            console.error("QR error:", err);
            setStatus({ type: "error", text: "Camera error" });
          }}
          constraints={{ facingMode: "environment" }}
        />
      </div>

      <div className="mt-4 bg-white p-3 rounded shadow-sm">
        <p className="text-sm text-gray-600">Scanned:</p>
        <p className="font-mono break-all">{scanned || "---"}</p>

        {status.type === "loading" && (
          <p className="mt-2 text-yellow-600">{status.text}</p>
        )}
        {status.type === "success" && (
          <p className="mt-2 text-green-600">{status.text}</p>
        )}
        {status.type === "already" && (
          <p className="mt-2 text-amber-600">{status.text}</p>
        )}
        {status.type === "error" && (
          <p className="mt-2 text-red-600">{status.text}</p>
        )}
      </div>
    </div>
  );
}
