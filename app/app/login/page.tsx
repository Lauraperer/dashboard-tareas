"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/dashboard`
            : undefined,
      },
    });

    setLoading(false);
    setMsg(
      error
        ? `Error: ${error.message}`
        : "Te he enviado un email con un enlace para entrar (magic link)."
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Login</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Te enviaremos un enlace por email para entrar.
      </p>

      <form onSubmit={handleLogin} style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email
          <input
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuemail@..."
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #000",
            marginTop: 8,
            cursor: "pointer",
          }}
        >
          {loading ? "Enviando..." : "Enviar enlace de acceso"}
        </button>
      </form>

      {msg && (
        <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>
          {msg}
        </p>
      )}
    </main>
  );
}
