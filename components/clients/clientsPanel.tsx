"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Client = {
  id: string;
  name: string;
};

export default function ClientsPanel() {
  const supabase = supabaseBrowser();
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (data) setClients(data);
  }

  async function addClient() {
    if (!name.trim()) return;

    await supabase.from("clients").insert({ name });
    setName("");
    loadClients();
  }

  return (
    <section style={{ maxWidth: 420 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700 }}>Clientes</h2>

      <ul style={{ marginTop: 10 }}>
        {clients.map((c) => (
          <li key={c.id}>• {c.name}</li>
        ))}
      </ul>

      <div style={{ marginTop: 12 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nuevo cliente"
        />
        <button onClick={addClient} style={{ marginLeft: 8 }}>
          Añadir
        </button>
      </div>
    </section>
  );
}
