// src/lib/supabase/proxy.ts
// NY FIL. Holder login-sessionen frisk ved hver forespørgsel og sender ikke-loggede brugere til /login.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Sider man kan se uden at være logget ind
const PUBLIC_PATHS = ["/", "/login", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(p + "/")));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            response.headers.set(key, value)
          );
        },
      },
    }
  );

  // Må ikke fjernes: verificerer og fornyer sessionen
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;

  // Ikke logget ind på en beskyttet side → til login
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Allerede logget ind og på login-siden → til feedet
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/feed";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
