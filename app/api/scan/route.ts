import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { google } from "googleapis";

type ScanRequest = {
  qr: string;
  type: "attendance" | "entry" | "breakfast" | "lunch" | "dinner";
  scanner?: string;
};

const TYPE_TO_COLUMN: Record<ScanRequest["type"], string> = {
  attendance: "attendance_marked",
  entry: "entry_marked",
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
};

async function appendToGoogleSheet(row: any[]) {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!,
      private_key: process.env.GOOGLE_SERVICE_PRIVATE_KEY!.replace(
        /\\n/g,
        "\n"
      ),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: "Sheet1!A:F",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

function extractUid(payload: string) {
  try {
    const url = new URL(payload);
    const id = url.searchParams.get("id");
    if (id) return id;
  } catch (e) {
    console.error("not a complete url:", e);
  }
  return payload;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ScanRequest;
    if (!body || !body.qr || !body.type) {
      return NextResponse.json({
        success: false,
        message: "Missing qr or type",
      });
    }

    const uid = extractUid(body.qr).trim();
    const column = TYPE_TO_COLUMN[body.type];

    const { data: participant, error: pErr } = await supabase
      .from("participants")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (pErr) {
      console.error("Supabase fetch error:", pErr);
      return NextResponse.json({ success: false, message: "DB error" });
    }

    if (!participant) {
      return NextResponse.json({
        success: false,
        message: "Participant not found",
      });
    }

    if (participant[column] === true) {
      return NextResponse.json({
        success: false,
        already: true,
        message: `${participant.name ?? uid} already marked for ${body.type}`,
      });
    }

    const { error: uErr } = await supabase
      .from("participants")
      .update({ [column]: true })
      .eq("id", uid);

    if (uErr) {
      console.error("Supabase update error:", uErr);
      return NextResponse.json({ success: false, message: "Failed to update" });
    }

    await supabase.from("logs").insert({
      participant_id: uid,
      type: body.type,
      scanner: body.scanner ?? "unknown",
      metadata: {},
    });

    const row = [
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      uid,
      participant.name ?? "",
      body.type,
      body.scanner ?? "unknown",
      "SUCCESS",
    ];

    try {
      await appendToGoogleSheet(row);
    } catch (sheetErr) {
      console.error("Sheet update failed:", sheetErr);
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${body.type} for ${participant.name}`,
      participant,
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json({ success: false, message: "Server error" });
  }
}
