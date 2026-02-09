import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { requirePatient } from "@/lib/api-auth-utils";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseServiceKey || supabaseServiceKey.trim() === "") {
  throw new Error(
    "SUPABASE_SERVICE_ROLE_KEY is missing or empty. Set it in your environment so the change-password API can use the Supabase service role client."
  );
}
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authResult = requirePatient(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const { data: dbUser, error: fetchError } = await supabaseAdmin
      .from("users")
      .select("id, password_hash")
      .eq("id", user.id)
      .eq("role", "patient")
      .single();

    if (fetchError || !dbUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    const passwordHash = dbUser.password_hash as string | null;
    if (!passwordHash) {
      return NextResponse.json(
        { success: false, message: "Cannot change password for this account. Please use password reset." },
        { status: 400 }
      );
    }

    const currentMatch = await bcrypt.compare(currentPassword, passwordHash);
    if (!currentMatch) {
      return NextResponse.json(
        { success: false, message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    const saltRounds = 12;
    const newHash = await bcrypt.hash(newPassword, saltRounds);

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ password_hash: newHash, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json(
        { success: false, message: "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("[change-password] Error changing password:", error);
    return NextResponse.json(
      { success: false, message: "Failed to change password" },
      { status: 500 }
    );
  }
}
