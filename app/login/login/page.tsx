"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!supabaseUrl || !supabaseKey) {
      setMsg("Faltan variables de Supabase en Vercel (URL o KEY).");
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
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
        Escribe tu email y te enviamos un enlace de acceso.
      </p>

      <form onSubmit={sendMagicLink} style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 8 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tuemail@..."
            style={{
              width: "100%",
              padding: 10,
              marginTop: 6,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
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
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>
      </form>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
