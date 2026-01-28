"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

function priorityLabel(p: number) {
  if (p === 1) return "Alta";
  if (p === 2) return "Media";
  return "Baja";
}

function statusLabel(s: string) {
  if (s === "pending") return "Pendiente";
  if (s === "doing") return "En curso";
  if (s === "done") return "Hecha";
  return s;
}

function isOverdue(due: string | null, status: string) {
  if (!due) return false;
  if (status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due + "T00:00:00");
  return dueDate < today;
}

function formatDue(due: string | null) {
  if (!due) return "—";
  try {
    const d = new Date(due + "T00:00:00");
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return due;
  }
}

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [tasks, setTasks] = useState<TaskRow[]>([]);

  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("due"); // due | priority | created

  const [newClientName, setNewClientName] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState<string>("");
  const [newTaskMinutes, setNewTaskMinutes] = useState<string>("");
  const [newTaskPriority, setNewTaskPriority] = useState<number>(2);
  const [newTaskLink, setNewTaskLink] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<"pending" | "doing" | "done">("pending");

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

  async function loadTasks(uid: string) {
    let q = supabase
      .from("tasks")
      .select("id,title,status,priority,due_date,estimated_minutes,link,client_id")
      .eq("user_id", uid);

    if (selectedClientId !== "ALL") q = q.eq("client_id", selectedClientId);
    if (filterStatus !== "ALL") q = q.eq("status", filterStatus);

    if (sortBy === "priority") {
      q = q.order("priority", { ascending: true }).order("due_date", { ascending: true, nullsFirst: false });
    } else if (sortBy === "due") {
      q = q.order("due_date", { ascending: true, nullsFirst: false }).order("priority", { ascending: true });
    } else {
      // created (si no tienes created_at en tasks, no pasa nada: dejamos por due/priority)
      q = q.order("due_date", { ascending: true, nullsFirst: false }).order("priority", { ascending: true });
    }

    const { data, error } = await q;

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
      await loadTasks(userId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setMsg(null);
      await loadTasks(userId);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId, filterStatus, sortBy]);

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

    const due = newTaskDue.trim() === "" ? null : newTaskDue.trim();
    const link = newTaskLink.trim() === "" ? null : newTaskLink.trim();

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      client_id: selectedClientId !== "ALL" ? selectedClientId : null,
      title,
      due_date: due,
      estimated_minutes: minutes,
      priority: newTaskPriority,
      link,
      status: newTaskStatus,
    });

    if (error) {
      setMsg(error.message);
      return;
    }

    setNewTaskTitle("");
    setNewTaskDue("");
    setNewTaskMinutes("");
    setNewTaskLink("");
    setNewTaskPriority(2);
    setNewTaskStatus("pending");

    await loadTasks(userId);
  }

  async function setStatus(taskId: string, status: string) {
    if (!userId) return;
    setMsg(null);

    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      setMsg(error.message);
      return;
    }
    await loadTasks(userId);
  }

  async function toggleDone(task: TaskRow) {
    const next = task.status === "done" ? "pending" : "done";
    await setStatus(task.id, next);
  }

  async function deleteTask(taskId: string) {
    if (!userId) return;
    setMsg(null);

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    if (error) {
      setMsg(error.message);
      return;
    }
    await loadTasks(userId);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  // resumen rápido
  const overdueCount = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;
  const totalMinutes = tasks.reduce((acc, t) => acc + (t.estimated_minutes ?? 0), 0);

  if (!userId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">No estás logueada. Ve a /auth/login.</p>
        {msg && <p className="mt-4 text-sm text-red-600">{msg}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Tu tablero</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Clientes → tareas con prioridad, fecha límite, tiempo estimado y link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border px-3 py-1">
              {tasks.length} tareas
            </span>
            <span className="rounded-full border px-3 py-1">
              {overdueCount} vencidas
            </span>
            <span className="rounded-full border px-3 py-1">
              {totalMinutes} min estimados
            </span>
          </div>
        </div>

        <Button variant="outline" onClick={logout}>
          Cerrar sesión
        </Button>
      </header>

      {msg && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {msg}
        </div>
      )}

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {/* CLIENTES */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Selecciona un cliente o crea uno nuevo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Filtrar por cliente</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="ALL">Todos</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Tip: crea “Let’s Talent”, “LIPASAM”, “Emocional”, “Autónoma”, “Jecama”, “LauraSonia”, “Familia”.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nuevo cliente</label>
              <div className="flex gap-2">
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ej: LIPASAM"
                />
                <Button onClick={addClient}>Añadir</Button>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <label className="text-sm font-medium">Vista</label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Estado</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="ALL">Todos</option>
                    <option value="pending">Pendiente</option>
                    <option value="doing">En curso</option>
                    <option value="done">Hecha</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Orden</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  >
                    <option value="due">Por fecha</option>
                    <option value="priority">Por prioridad</option>
                    <option value="created">Recientes</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TAREAS */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Tareas</CardTitle>
            <CardDescription>Añade tareas rápidas (10 min) o largas (10h). El tiempo es en minutos.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* CREAR TAREA */}
            <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Tarea</label>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ej: Evaluaciones de maestros (LIPASAM)"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Fecha límite</label>
                <Input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Tiempo (min)</label>
                <Input
                  type="number"
                  min={1}
                  value={newTaskMinutes}
                  onChange={(e) => setNewTaskMinutes(e.target.value)}
                  placeholder="60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Link (Drive, doc…)</label>
                <Input
                  value={newTaskLink}
                  onChange={(e) => setNewTaskLink(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Prioridad</label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value={1}>Alta</option>
                  <option value={2}>Media</option>
                  <option value={3}>Baja</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Estado</label>
                <select
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value as any)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="pending">Pendiente</option>
                  <option value="doing">En curso</option>
                  <option value="done">Hecha</option>
                </select>
              </div>

              <div className="md:col-span-4 flex justify-end">
                <Button onClick={addTask}>Añadir tarea</Button>
              </div>
            </div>

            {/* LISTA */}
            {tasks.length === 0 ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No hay tareas todavía.
              </div>
            ) : (
              <div className="grid gap-3">
                {tasks.map((t) => {
                  const overdue = isOverdue(t.due_date, t.status);
                  return (
                    <div
                      key={t.id}
                      className={[
                        "rounded-lg border p-4",
                        overdue ? "border-red-200 bg-red-50" : "",
                      ].join(" ")}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3
                              className={[
                                "font-semibold",
                                t.status === "done" ? "line-through opacity-70" : "",
                              ].join(" ")}
                            >
                              {t.title}
                            </h3>

                            <span className="rounded-full border px-2 py-0.5 text-xs">
                              {priorityLabel(t.priority)}
                            </span>

                            <span className="rounded-full border px-2 py-0.5 text-xs">
                              {statusLabel(t.status)}
                            </span>

                            {overdue && (
                              <span className="rounded-full border border-red-300 bg-white px-2 py-0.5 text-xs text-red-700">
                                Vencida
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span>Vence: {formatDue(t.due_date)}</span>
                            <span>⏱ {t.estimated_minutes ?? "—"} min</span>
                            {t.link ? (
                              <a
                                className="underline underline-offset-4"
                                href={t.link}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Abrir link
                              </a>
                            ) : (
                              <span>Link: —</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 md:justify-end">
                          <Button
                            variant="outline"
                            onClick={() => setStatus(t.id, "pending")}
                          >
                            Pendiente
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setStatus(t.id, "doing")}
                          >
                            En curso
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => toggleDone(t)}
                          >
                            {t.status === "done" ? "Reabrir" : "Hecha"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteTask(t.id)}
                          >
                            Borrar
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
