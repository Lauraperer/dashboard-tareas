"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isOverdue(due: string | null, status: string) {
  if (!due) return false;
  if (status === "done") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dd = new Date(due);
  dd.setHours(0, 0, 0, 0);
  return dd < today;
}

function priorityLabel(p: number) {
  return p === 1 ? "Alta" : p === 2 ? "Media" : "Baja";
}

function priorityPillClass(p: number) {
  // no dependemos de colores del theme; Tailwind estándar
  if (p === 1) return "bg-red-100 text-red-800 border-red-200";
  if (p === 2) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

export default function DashboardPage() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [userId, setUserId] = useState<string | null>(null);

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("ALL");

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
      clientId && clientId !== "ALL" ? await q.eq("client_id", clientId) : await q;

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
      client_id:
        selectedClientId && selectedClientId !== "ALL" ? selectedClientId : null,
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
    window.location.href = "/auth/login";
  }

  const pendingCount = tasks.filter((t) => t.status !== "done").length;
  const overdueCount = tasks.filter((t) => isOverdue(t.due_date, t.status)).length;

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <main className="mx-auto max-w-5xl px-6 py-10">
          <Card className="border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-700">
                No estás logueada. Ve a <span className="font-semibold">/auth/login</span>.
              </p>
              {msg && <p className="mt-3 text-sm text-red-600">{msg}</p>}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* HEADER */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Tu tablero
            </h1>
            <p className="mt-2 text-slate-600">
              {formatToday()}
            </p>
            <p className="mt-2 text-slate-600">
              Clientes → tareas con prioridad, fecha límite y tiempo estimado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">
              Pendientes: <span className="font-semibold">{pendingCount}</span>
            </div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 shadow-sm">
              Vencidas:{" "}
              <span className={`font-semibold ${overdueCount > 0 ? "text-red-600" : ""}`}>
                {overdueCount}
              </span>
            </div>

            <Button variant="outline" onClick={logout}>
              Cerrar sesión
            </Button>
          </div>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {msg}
          </div>
        )}

        {/* GRID */}
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* CLIENTES */}
          <Card className="lg:col-span-2 border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Clientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Ver tareas de
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-300"
                >
                  <option value="ALL">Todos</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Nuevo cliente..."
                  className="h-11 rounded-xl"
                />
                <Button onClick={addClient} className="h-11 rounded-xl">
                  Añadir
                </Button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <div className="font-semibold">Tip</div>
                <div className="mt-1 opacity-90">
                  Crea “Let’s Talent”, “LIPASAM”, “Emocional”, “Autónoma”, “Jecama”, “LauraSonia”, “Familia”.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TAREAS */}
          <Card className="lg:col-span-3 border-slate-200/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Tareas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* FORM */}
              <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Nueva tarea..."
                    className="h-11 rounded-xl md:col-span-2"
                  />
                  <Input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={newTaskMinutes}
                    onChange={(e) => setNewTaskMinutes(e.target.value)}
                    placeholder="min"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-4">
                  <Input
                    value={newTaskLink}
                    onChange={(e) => setNewTaskLink(e.target.value)}
                    placeholder="link (Drive, doc...)"
                    className="h-11 rounded-xl md:col-span-3"
                  />

                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(Number(e.target.value))}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value={1}>Alta</option>
                    <option value={2}>Media</option>
                    <option value={3}>Baja</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <Button onClick={addTask} className="rounded-xl">
                    Añadir tarea
                  </Button>
                </div>
              </div>

              {/* LIST */}
              {tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <div className="text-lg font-semibold text-slate-800">
                    No hay tareas todavía
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Crea tu primera tarea arriba y empieza a vaciar la cabeza ✨
                  </div>
                </div>
              ) : (
                <div className="grid gap-3">
                  {tasks.map((t) => {
                    const overdue = isOverdue(t.due_date, t.status);
                    return (
                      <div
                        key={t.id}
                        className={[
                          "rounded-2xl border bg-white p-4 shadow-sm transition",
                          "hover:shadow-md",
                          overdue ? "border-red-200 bg-red-50/40" : "border-slate-200",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3
                                className={[
                                  "truncate text-base font-bold text-slate-900",
                                  t.status === "done" ? "line-through opacity-60" : "",
                                ].join(" ")}
                                title={t.title}
                              >
                                {t.title}
                              </h3>

                              <span
                                className={[
                                  "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                                  priorityPillClass(t.priority),
                                ].join(" ")}
                              >
                                {priorityLabel(t.priority)}
                              </span>

                              {overdue && (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                                  Vencida
                                </span>
                              )}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                              {t.due_date && (
                                <span>
                                  📅 <span className="font-medium">Vence:</span>{" "}
                                  {t.due_date}
                                </span>
                              )}
                              {t.estimated_minutes != null && (
                                <span>
                                  ⏱ <span className="font-medium">
                                    {t.estimated_minutes} min
                                  </span>
                                </span>
                              )}
                              <span>
                                ✅ <span className="font-medium">Estado:</span>{" "}
                                {t.status}
                              </span>

                              {t.link && (
                                <a
                                  href={t.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-medium text-slate-900 underline underline-offset-4 hover:opacity-80"
                                >
                                  Abrir link
                                </a>
                              )}
                            </div>
                          </div>

                          <Button
                            variant={t.status === "done" ? "outline" : "default"}
                            onClick={() => toggleDone(t)}
                            className="rounded-xl"
                          >
                            {t.status === "done" ? "Reabrir" : "Hecha"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
