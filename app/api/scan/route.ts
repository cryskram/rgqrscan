import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
      return NextResponse.json(
        { success: false, message: "Database error" },
        { status: 500 }
      );
    }

    if (!participant) {
      return NextResponse.json(
        { success: false, message: "Participant not found" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { success: false, message: "Failed to update participant" },
        { status: 500 }
      );
    }
    const { error: logErr } = await supabase.from("logs").insert({
      participant_id: uid,
      type: body.type,
      scanner: body.scanner ?? "unknown",
      metadata: {},
    });

    if (logErr) {
      console.error("Supabase log insert error:", logErr);
      return NextResponse.json({
        success: true,
        message: `Marked ${body.type} for ${participant.name} (log failed)`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${body.type} for ${participant.name}`,
      participant,
    });
  } catch (err) {
    console.error("Server error:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}
