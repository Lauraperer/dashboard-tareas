"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type ClientRow = { id: string; name: string };

type TaskStatus = "todo" | "doing" | "done" | string;

type TaskRow = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: number;
  due_date: string | null;
  estimated_minutes: number | null;
  drive_url: string | null;
  client_id: string | null;
};

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [userOk, setUserOk] = useState<boolean>(false);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");

  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [newClientName, setNewClientName] = useState("");

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState<string>("");
  const [newTaskMinutes, setNewTaskMinutes] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<number>(2);
  const [newTaskDriveUrl, setNewTaskDriveUrl] = useState("");

  const [msg, setMsg] = useState<string | null>(null);

  async function checkUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setMsg(error.message);
      setUserOk(false);
      return;
    }
    setUserOk(!!data.user);
  }

  async function loadClients() {
    setMsg(null);
    const { data, error } = await supabase
      .from("clients")
      .select("id,name")
      .order("created_at", { ascending: true });

    if (error) {
      setMsg(error.message);
      return;
    }

    setClients((data ?? []) as ClientRow[]);
  }

  async function loadTasks(clientId: string) {
    setMsg(null);

    const q = supabase
      .from("tasks")
      .select("id,title,status,priority,due_date,estimated_minutes,drive_url,client_id")
      .order("due_date", { ascending: true })
      .order("priority", { ascending: true });

    const { data, error } =
      clientId && clientId !== "ALL" ? await q.eq("client_id", clientId) : await q;

    if (error) {
      setMsg(error.message);
      return;
    }

    setTasks((data ?? []) as TaskRow[]);
  }

  useEffect(() => {
    (async () => {
      await checkUser();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userOk) return;
    (async () => {
      await loadClients();
      await loadTasks(selectedClientId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userOk]);

  useEffect(() => {
    if (!userOk) return;
    (async () => {
      await loadTasks(selectedClientId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, userOk]);

  async function addClient() {
    if (!userOk) return;

    const name = newClientName.trim();
    if (!name) return;

    setMsg(null);

    const { error } = await supabase.from("clients").insert({ name });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewClientName("");
    await loadClients();
  }

  async function addTask() {
    if (!userOk) return;

    const title = newTaskTitle.trim();
    if (!title) return;

    setMsg(null);

    const minutes =
      newTaskMinutes.trim() === "" ? null : Math.max(1, Number(newTaskMinutes));

    const due = newTaskDue.trim() === "" ? null : newTaskDue;

    const { error } = await supabase.from("tasks").insert({
      client_id: selectedClientId && selectedClientId !== "ALL" ? selectedClientId : null,
      title,
      due_date: due,
      estimated_minutes: minutes,
      priority: newTaskPriority,
      drive_url: newTaskDriveUrl.trim() || null,
      status: "todo",
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewTaskTitle("");
    setNewTaskDue("");
    setNewTaskMinutes("");
    setNewTaskDriveUrl("");

    await loadTasks(selectedClientId);
  }

  async function cycleStatus(task: TaskRow) {
    if (!userOk) return;

    const next =
      task.status === "todo" ? "doing" : task.status === "doing" ? "done" : "todo";

    setMsg(null);

    const { error } = await supabase.from("tasks").update({ status: next }).eq("id", task.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    await loadTasks(selectedClientId);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (!userOk) {
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
            Clientes → tareas con prioridad, fecha límite, tiempo estimado y link a Drive.
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

      <section
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateColumns: "1fr 2fr",
          gap: 16,
        }}
      >
        {/* CLIENTES */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Clientes</h2>

          <div style={{ marginTop: 10 }}>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            >
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
              style={{
                flex: 1,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
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
            Tip: crea “Let’s Talent”, “Lipasam”, “Emocional”, “Autónoma”, “Jecama”, “LauraSonia”, “Familia”.
          </div>
        </div>

        {/* TAREAS */}
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tareas</h2>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              gap: 8,
            }}
          >
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Nueva tarea..."
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            />

            <input
              type="date"
              value={newTaskDue}
              onChange={(e) => setNewTaskDue(e.target.value)}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            />

            <input
              type="number"
              min={1}
              value={newTaskMinutes}
              onChange={(e) => setNewTaskMinutes(e.target.value)}
              placeholder="min"
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            />

            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(Number(e.target.value))}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #ccc",
              }}
            >
              <option value={1}>Alta</option>
              <option value={2}>Media</option>
              <option value={3}>Baja</option>
            </select>

            <input
              value={newTaskDriveUrl}
              onChange={(e) => setNewTaskDriveUrl(e.target.value)}
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
                      <div
                        style={{
                          fontWeight: 700,
                          textDecoration: t.status === "done" ? "line-through" : "none",
                        }}
                      >
                        {t.title}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 13,
                          opacity: 0.8,
                          display: "flex",
                          gap: 12,
                          flexWrap: "wrap",
                        }}
                      >
                        <span>
                          Prioridad:{" "}
                          {t.priority === 1 ? "Alta" : t.priority === 2 ? "Media" : "Baja"}
                        </span>
                        {t.due_date && <span>Vence: {t.due_date}</span>}
                        {t.estimated_minutes != null && <span>⏱ {t.estimated_minutes} min</span>}
                        {t.drive_url && (
                          <a href={t.drive_url} target="_blank" rel="noreferrer">
                            Abrir Drive
                          </a>
                        )}
                        <span>Estado: {t.status}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => cycleStatus(t)}
                      style={{
                        border: "1px solid #000",
                        borderRadius: 10,
                        padding: "10px 12px",
                        cursor: "pointer",
                        minWidth: 140,
                      }}
                    >
                      Pasar estado
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
