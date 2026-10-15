// src/proxy.ts
// NY FIL. Next.js 16 proxy (afløser middleware.ts). Kører før hver side og opdaterer login-sessionen.

import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Alt undtagen statiske filer og billeder
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
