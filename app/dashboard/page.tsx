"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ClientRow = { id: string; name: string };
type TaskRow = {
  id: string;
  title: string;
  status: "pending" | "doing" | "done" | string;
  priority: number;
  due_date: string | null;
  estimated_minutes: number | null;
  link: string | null;
  client_id: string | null;
};

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [userId, setUserId] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [newClientName, setNewClientName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState<string>("");
  const [newTaskMinutes, setNewTaskMinutes] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<number>(2);
  const [newTaskLink, setNewTaskLink] = useState("");

  const [msg, setMsg] = useState<string | null>(null);

  async function loadUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setMsg(error.message);
      return;
    }
    setUserId(data.user?.id ?? null);
  }

  async function loadClients(uid: string) {
    const { data, error } = await supabase
      .from("clients")
      .select("id,name")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });

    if (error) {
      setMsg(error.message);
      return;
    }
    setClients((data ?? []) as ClientRow[]);
  }

  async function loadTasks(uid: string, clientId: string) {
    const q = supabase
      .from("tasks")
      .select("id,title,status,priority,due_date,estimated_minutes,link,client_id")
      .eq("user_id", uid)
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true });

    const { data, error } =
      clientId && clientId !== "ALL"
        ? await q.eq("client_id", clientId)
        : await q;

    if (error) {
      setMsg(error.message);
      return;
    }
    setTasks((data ?? []) as TaskRow[]);
  }

  useEffect(() => {
    (async () => {
      await loadUser();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setMsg(null);
      await loadClients(userId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setMsg(null);
      await loadTasks(userId, selectedClientId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedClientId]);

  async function addClient() {
    if (!userId) return;
    const name = newClientName.trim();
    if (!name) return;

    setMsg(null);
    const { error } = await supabase.from("clients").insert({
      user_id: userId,
      name,
    });

    if (error) {
      setMsg(error.message);
      return;
    }
    setNewClientName("");
    await loadClients(userId);
  }

  async function addTask() {
    if (!userId) return;
    const title = newTaskTitle.trim();
    if (!title) return;

    setMsg(null);
    const minutes =
      newTaskMinutes.trim() === "" ? null : Math.max(1, Number(newTaskMinutes));

    const due = newTaskDue.trim() === "" ? null : newTaskDue;

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      client_id: selectedClientId && selectedClientId !== "ALL" ? selectedClientId : null,
      title,
      due_date: due,
      estimated_minutes: minutes,
      priority: newTaskPriority,
      link: newTaskLink.trim() || null,
      status: "pending",
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewTaskTitle("");
    setNewTaskDue("");
    setNewTaskMinutes("");
    setNewTaskLink("");

    await loadTasks(userId, selectedClientId);
  }

  async function toggleDone(task: TaskRow) {
    if (!userId) return;
    const nextStatus = task.status === "done" ? "pending" : "done";

    setMsg(null);
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", task.id)
      .eq("user_id", userId);

    if (error) {
      setMsg(error.message);
      return;
    }
    await loadTasks(userId, selectedClientId);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!userId) {
    return (
      <main style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dashboard</h1>
        <p style={{ marginTop: 8 }}>No estás logueada. Ve a /login.</p>
        {msg && <p style={{ color: "crimson", marginTop: 12 }}>{msg}</p>}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>Tu tablero</h1>
          <p style={{ opacity: 0.75, marginTop: 6 }}>
            Clientes → tareas con prioridad, fecha límite y tiempo estimado.
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            border: "1px solid #000",
            borderRadius: 10,
            padding: "10px 12px",
            cursor: "pointer",
            height: 42,
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {msg && (
        <p style={{ marginTop: 12, color: "crimson", whiteSpace: "pre-wrap" }}>{msg}</p>
      )}

      <section style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        {/* CLIENTES */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Clientes</h2>

          <div style={{ marginTop: 10 }}>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            >
              <option value="">(elige un cliente)</option>
              <option value="ALL">Todos</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <input
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Nuevo cliente..."
              style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
            <button
              onClick={addClient}
              style={{
                border: "1px solid #000",
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              Añadir
            </button>
          </div>

          <div style={{ marginTop: 14, opacity: 0.8, fontSize: 13 }}>
            Tip: crea “Let’s Talent”, “LIPASAM”, “Emocional”, “Autónoma”, “Jecama”, “LauraSonia”, “Familia”.
          </div>
        </div>

        {/* TAREAS */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tareas</h2>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nueva tarea..."
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
            <input
              type="number"
              min={1}
              value={newTaskMinutes}
              onChange={(e) => setNewTaskMinutes(e.target.value)}
              placeholder="min"
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            />
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(Number(e.target.value))}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
            >
              <option value={1}>Alta</option>
              <option value={2}>Media</option>
              <option value={3}>Baja</option>
            </select>

            <input
              value={newTaskLink}
              onChange={(e) => setNewTaskLink(e.target.value)}
              placeholder="link (Drive, doc...)"
              style={{
                gridColumn: "1 / span 3",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            />
            <button
              onClick={addTask}
              style={{
                border: "1px solid #000",
                borderRadius: 10,
                padding: "10px 12px",
                cursor: "pointer",
              }}
            >
              Añadir tarea
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            {tasks.length === 0 ? (
              <p style={{ opacity: 0.75 }}>No hay tareas todavía.</p>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, textDecoration: t.status === "done" ? "line-through" : "none" }}>
                        {t.title}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.8, display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <span>Prioridad: {t.priority === 1 ? "Alta" : t.priority === 2 ? "Media" : "Baja"}</span>
                        {t.due_date && <span>Vence: {t.due_date}</span>}
                        {t.estimated_minutes != null && <span>⏱ {t.estimated_minutes} min</span>}
                        {t.link && (
                          <a href={t.link} target="_blank" rel="noreferrer">
                            Abrir link
                          </a>
                        )}
                        <span>Estado: {t.status}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleDone(t)}
                      style={{
                        border: "1px solid #000",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        minWidth: 120,
                      }}
                    >
                      {t.status === "done" ? "Reabrir" : "Hecha"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
