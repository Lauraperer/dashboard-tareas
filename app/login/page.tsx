"use client";

import React, { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const supabase = supabaseBrowser();

    const { error } = await supabase.auth.signInWithOtp({
  email,
  options: {
    emailRedirectTo:
      "https://dashboard-tareas-jwkildnwo-lauras-projects-b4d96bb2.vercel.app/auth/confirm",
  },
});

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Te hemos enviado el enlace de acceso.");
    }

    setLoading(false);
  }

  return (
    <main style={{ padding: 24, maxWidth: 520, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Login</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Introduce tu email y te enviaremos un enlace de acceso.
      </p>

      <form onSubmit={handleLogin} style={{ marginTop: 18, display: "grid", gap: 10 }}>
        <label style={{ fontWeight: 600 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="tu@email.com"
          required
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ccc",
            fontSize: 16,
          }}
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 6,
            padding: 12,
            borderRadius: 10,
            border: "1px solid #000",
            cursor: "pointer",
            fontSize: 16,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Enviando..." : "Enviar enlace"}
        </button>

        {message && (
          <p style={{ marginTop: 8, color: message.includes("Error") ? "crimson" : "black" }}>
            {message}
          </p>
        )}
      </form>
    </main>
  );
}
