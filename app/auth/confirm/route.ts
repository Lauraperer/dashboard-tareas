import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // Formato PKCE
  const code = url.searchParams.get("code");

  // Formato "token_hash"
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  const response = NextResponse.redirect(new URL("/dashboard", url.origin));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // 1) Si viene por PKCE
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
    return response;
  }

  // 2) Si viene por token_hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    if (error) {
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, url.origin)
      );
    }
    return response;
  }

  // 3) Si no viene nada útil
  return NextResponse.redirect(
    new URL(`/auth/error?error=${encodeURIComponent("No token hash or type")}`, url.origin)
  );
}
