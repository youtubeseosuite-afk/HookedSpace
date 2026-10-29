// src/app/auth/callback/route.ts
// OPDATERET (bortviste Google-brugere sendes til /bortvist). Modtager brugeren efter Google-login eller bekræftelsesmail og opretter sessionen.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // Supabase sender "User is banned" tilbage, hvis brugeren er bortvist
  const errorText = `${searchParams.get("error_description") ?? ""} ${searchParams.get("error_code") ?? ""}`.toLowerCase();
  if (errorText.includes("banned")) {
    return NextResponse.redirect(`${origin}/bortvist`);
  }
  const nextParam = searchParams.get("next") ?? "/feed";

  // Kun interne stier, så callbacken ikke kan bruges til at sende folk videre til andre sites
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/feed";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    if (error.message.toLowerCase().includes("banned")) {
      return NextResponse.redirect(`${origin}/bortvist`);
    }
  }

  return NextResponse.redirect(`${origin}/login?fejl=login`);
}
