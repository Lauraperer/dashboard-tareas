"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!supabaseUrl || !supabaseAnonKey) {
      setMessage(
        "Error de configuración: faltan las variables de Supabase en Vercel."
      );
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });
    setLoading(false);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage(
        "Te hemos enviado un email con un enlace para acceder (magic link)."
      );
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Login</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Introduce tu email y te enviaremos un enlace de acceso.
      </p>

      <form onSubmit={handleLogin} style={{ marginTop: 16 }}>
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

      {message && (
        <p style={{ marginTop: 12, whiteSpace: "pre-wrap" }}>{message}</p>
      )}
    </main>
  );
}
