"use client";

import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/lib/supabase";

export default function QRPage({ uid }: { uid: string }) {
  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .eq("id", uid)
        .maybeSingle();

      if (!error) setParticipant(data);
      setLoading(false);
    }

    fetchData();
  }, [uid]);

  if (loading) {
    return <p className="p-6 text-center">Loading...</p>;
  }

  if (!participant) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold">Invalid QR</h1>
        <p className="mt-2 text-gray-600">This ID doesn't exist.</p>
      </div>
    );
  }

  const qrValue = `https://rgqrscan.vercel.app/scan?id=${uid}`;

  const status = (value: boolean) => (
    <span className={value ? "text-green-500" : "text-red-500"}>
      {value ? "✔️" : "❌"}
    </span>
  );

  return (
    <div className="p-6 max-w-xl mx-auto text-center">
      <h1 className="text-3xl font-semibold mb-4">Your QR Code</h1>

      <div className="bg-white p-4 rounded-lg shadow mx-auto inline-block">
        <QRCodeCanvas value={qrValue} size={220} />
      </div>

      <p className="mt-4 text-lg font-semibold">{participant.name}</p>
      <p className="text-gray-600">{participant.email}</p>
      {participant.team && (
        <p className="text-gray-500 mt-1">Team: {participant.team}</p>
      )}

      <button
        className="mt-6 bg-black text-white px-4 py-2 rounded"
        onClick={() => {
          const canvas = document.querySelector("canvas") as HTMLCanvasElement;
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = `${uid}.png`;
          link.click();
        }}
      >
        Download QR
      </button>

      <div className="mt-10 p-4 bg-white rounded-xl shadow text-left space-y-2">
        <h2 className="text-xl font-semibold text-center mb-2">Event Status</h2>

        <div className="flex justify-between text-lg">
          <span>Attendance:</span> {status(participant.attendance_marked)}
        </div>
        <div className="flex justify-between text-lg">
          <span>Entry:</span> {status(participant.entry_marked)}
        </div>
        <div className="flex justify-between text-lg">
          <span>Breakfast:</span> {status(participant.breakfast)}
        </div>
        <div className="flex justify-between text-lg">
          <span>Lunch:</span> {status(participant.lunch)}
        </div>
        <div className="flex justify-between text-lg">
          <span>Dinner:</span> {status(participant.dinner)}
        </div>
      </div>

      <p className="mt-6 text-gray-500 text-sm text-center">
        Tip: Take a screenshot of this page for quick access.
      </p>
    </div>
  );
}
