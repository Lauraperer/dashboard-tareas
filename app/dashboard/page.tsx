"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function toDateOnlyISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isOverdue(dueISO: string | null) {
  if (!dueISO) return false;
  const today = new Date();
  const todayISO = toDateOnlyISO(today);
  return dueISO < todayISO; // ISO date strings compare safely
}

function formatMinutesToHours(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

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

function priorityBadgeVariant(p: number): "destructive" | "default" | "secondary" {
  if (p === 1) return "destructive";
  if (p === 2) return "default";
  return "secondary";
}

function statusBadgeVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "done") return "secondary";
  if (s === "doing") return "default";
  return "outline";
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

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadUser() {
    // MODO PÚBLICO: no hay sesión real, así que “inventamos” un userId fijo para que funcione igual
    // Si más adelante pones PIN o auth, esto se puede cambiar.
    setUserId("public-user");
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

    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("clients").insert({
      user_id: userId,
      name,
    });

    setBusy(false);

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

    const minutes =
      newTaskMinutes.trim() === ""
        ? null
        : Math.max(1, Number(newTaskMinutes));

    const due = newTaskDue.trim() === "" ? null : newTaskDue;

    setBusy(true);
    setMsg(null);
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
    setBusy(false);

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

  async function setTaskStatus(taskId: string, nextStatus: string) {
    if (!userId) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", taskId)
      .eq("user_id", userId);

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }
    await loadTasks(userId, selectedClientId);
  }

  async function deleteTask(taskId: string) {
    if (!userId) return;

    setBusy(true);
    setMsg(null);
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userId);

    setBusy(false);

    if (error) {
      setMsg(error.message);
      return;
    }
    await loadTasks(userId, selectedClientId);
  }

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    clients.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [clients]);

  const filteredTasks = useMemo(() => {
    let t = [...tasks];

    if (filterStatus !== "ALL") {
      t = t.filter((x) => x.status === filterStatus);
    }

    const s = search.trim().toLowerCase();
    if (s) {
      t = t.filter((x) => {
        const clientName = x.client_id ? (clientNameById.get(x.client_id) ?? "") : "";
        return (
          x.title.toLowerCase().includes(s) ||
          clientName.toLowerCase().includes(s)
        );
      });
    }

    // Poner primero vencidas + alta prioridad
    t.sort((a, b) => {
      const ao = isOverdue(a.due_date) ? 1 : 0;
      const bo = isOverdue(b.due_date) ? 1 : 0;
      if (ao !== bo) return bo - ao; // overdue first
      if ((a.priority ?? 2) !== (b.priority ?? 2)) return (a.priority ?? 2) - (b.priority ?? 2); // 1 before 2 before 3
      const ad = a.due_date ?? "9999-12-31";
      const bd = b.due_date ?? "9999-12-31";
      return ad.localeCompare(bd);
    });

    return t;
  }, [tasks, filterStatus, search, clientNameById]);

  const stats = useMemo(() => {
    const todayISO = toDateOnlyISO(new Date());
    const pending = tasks.filter((t) => t.status !== "done").length;
    const overdue = tasks.filter((t) => t.status !== "done" && isOverdue(t.due_date)).length;
    const dueToday = tasks.filter((t) => t.status !== "done" && t.due_date === todayISO).length;
    const totalMin = tasks
      .filter((t) => t.status !== "done")
      .reduce((acc, t) => acc + (t.estimated_minutes ?? 0), 0);

    return { pending, overdue, dueToday, totalMin };
  }, [tasks]);

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tu tablero</h1>
          <p className="text-muted-foreground mt-1">
            Clientes → tareas con prioridad, fecha límite y tiempo estimado.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            (Modo público: cualquiera con el enlace puede entrar)
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => location.reload()} disabled={busy}>
            Actualizar
          </Button>
        </div>
      </header>

      {msg && (
        <div className="rounded-lg border p-3 text-sm">
          <span className="text-red-500 font-medium">{msg}</span>
        </div>
      )}

      {/* STATS */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-2xl">{stats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vencidas</CardDescription>
            <CardTitle className="text-2xl">{stats.overdue}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vence hoy</CardDescription>
            <CardTitle className="text-2xl">{stats.dueToday}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Tiempo estimado</CardDescription>
            <CardTitle className="text-2xl">
              {stats.totalMin > 0 ? formatMinutesToHours(stats.totalMin) : "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* CLIENTES */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Clientes</CardTitle>
            <CardDescription>Filtra tus tareas por cliente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Nuevo cliente…"
              />
              <Button onClick={addClient} disabled={busy || !newClientName.trim()}>
                Añadir
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Tip: crea “Let’s Talent”, “LIPASAM”, “Emocional”, “Autónoma”, “Jecama”, “LauraSonia”, “Familia”.
            </div>
          </CardContent>
        </Card>

        {/* TAREAS */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tareas</CardTitle>
            <CardDescription>Crea y prioriza con fecha y tiempo estimado</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Controls */}
            <div className="grid gap-2 md:grid-cols-3">
              <div className="md:col-span-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar tarea o cliente…"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="doing">En curso</SelectItem>
                  <SelectItem value="done">Hecha</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Add task */}
            <div className="grid gap-2 md:grid-cols-6">
              <div className="md:col-span-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Nueva tarea…"
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  type="date"
                  value={newTaskDue}
                  onChange={(e) => setNewTaskDue(e.target.value)}
                />
              </div>
              <div className="md:col-span-1">
                <Input
                  type="number"
                  min={1}
                  value={newTaskMinutes}
                  onChange={(e) => setNewTaskMinutes(e.target.value)}
                  placeholder="min"
                />
              </div>
              <div className="md:col-span-1">
                <Select
                  value={String(newTaskPriority)}
                  onValueChange={(v) => setNewTaskPriority(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Media</SelectItem>
                    <SelectItem value="3">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-1">
                <Button
                  className="w-full"
                  onClick={addTask}
                  disabled={busy || !newTaskTitle.trim()}
                >
                  Añadir
                </Button>
              </div>

              <div className="md:col-span-5">
                <Input
                  value={newTaskLink}
                  onChange={(e) => setNewTaskLink(e.target.value)}
                  placeholder="Link (Drive, doc, etc.)"
                />
              </div>
              <div className="md:col-span-1">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setNewTaskTitle("");
                    setNewTaskDue("");
                    setNewTaskMinutes("");
                    setNewTaskLink("");
                    setNewTaskPriority(2);
                  }}
                  disabled={busy}
                >
                  Limpiar
                </Button>
              </div>
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
              <div className="rounded-lg border p-6 text-sm text-muted-foreground">
                No hay tareas todavía (o no coinciden con los filtros).
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((t) => {
                  const overdue = t.status !== "done" && isOverdue(t.due_date);
                  const clientName = t.client_id ? clientNameById.get(t.client_id) : null;

                  return (
                    <div
                      key={t.id}
                      className={[
                        "rounded-xl border p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
                        overdue ? "border-red-300 bg-red-50/50" : "",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate">{t.title}</div>
                          <Badge variant={priorityBadgeVariant(t.priority)}>
                            Prioridad {priorityLabel(t.priority)}
                          </Badge>
                          <Badge variant={statusBadgeVariant(t.status)}>
                            {statusLabel(t.status)}
                          </Badge>
                          {overdue && <Badge variant="destructive">Vencida</Badge>}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                          {clientName && (
                            <span>
                              Cliente: <span className="text-foreground">{clientName}</span>
                            </span>
                          )}
                          {t.due_date && (
                            <span>
                              Vence: <span className="text-foreground">{t.due_date}</span>
                            </span>
                          )}
                          {t.estimated_minutes != null && (
                            <span>
                              Tiempo:{" "}
                              <span className="text-foreground">
                                {formatMinutesToHours(t.estimated_minutes)}
                              </span>
                            </span>
                          )}
                          {t.link && (
                            <a
                              className="underline underline-offset-4"
                              href={t.link}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Abrir link
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {t.status !== "done" ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setTaskStatus(t.id, "doing")}
                              disabled={busy}
                            >
                              En curso
                            </Button>
                            <Button
                              onClick={() => setTaskStatus(t.id, "done")}
                              disabled={busy}
                            >
                              Hecha
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            onClick={() => setTaskStatus(t.id, "pending")}
                            disabled={busy}
                          >
                            Reabrir
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          onClick={() => {
                            const ok = confirm("¿Borrar esta tarea?");
                            if (ok) deleteTask(t.id);
                          }}
                          disabled={busy}
                        >
                          Borrar
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

      <footer className="text-xs text-muted-foreground">
        Consejo: usa “Alta” para lo que vence pronto, y añade el link del Drive para abrirlo en 1 clic.
      </footer>
    </div>
  );
}
