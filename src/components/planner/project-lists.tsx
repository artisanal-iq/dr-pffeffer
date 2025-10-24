"use client";

import React, { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaskOperations } from "@/context/tasks-context";
import { useTasks } from "@/hooks/tasks";
import { cn } from "@/lib/utils";
import type { Task, TaskContext } from "@/types/models";

import { ProjectNameSelector } from "./project-name-selector";

export const SINGLE_ACTIONS_LABEL = "Single actions";

export type GtdBucketKey = "next" | "waiting" | "someday";

export type ProjectBucket = {
  project: string;
  tasks: Task[];
  nextActions: Task[];
  waitingFor: Task[];
  someday: Task[];
};

const PRIORITY_RANK: Record<Task["priority"], number> = { high: 0, medium: 1, low: 2 };
const EMPTY_TASKS: Task[] = [];

function slugifyProjectName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "single-actions";
}

function normalizeTaskContext(context: TaskContext | null | undefined): TaskContext {
  if (!context) return {};
  return context;
}

export function getTaskProject(task: Task): string {
  const context = normalizeTaskContext(task.context);
  const raw = context["project"];
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return SINGLE_ACTIONS_LABEL;
}

export function isSomedayTask(task: Task): boolean {
  const context = normalizeTaskContext(task.context);
  return context["gtdList"] === "someday";
}

export function isWaitingTask(task: Task): boolean {
  const context = normalizeTaskContext(task.context);
  return Boolean(context["waitingOn"]);
}

export function sortNextActions(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const timeA = getSortableTime(a.scheduled_time);
    const timeB = getSortableTime(b.scheduled_time);
    if (timeA !== timeB) return timeA - timeB;
    const priorityA = PRIORITY_RANK[a.priority];
    const priorityB = PRIORITY_RANK[b.priority];
    if (priorityA !== priorityB) return priorityA - priorityB;
    return a.title.localeCompare(b.title);
  });
}

function getSortableTime(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return Number.POSITIVE_INFINITY;
  return timestamp;
}

function formatScheduledLabel(value: string | null): string {
  if (!value) return "Not scheduled";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Not scheduled";
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function splitTasksIntoBuckets(tasks: Task[]): {
  nextActions: Task[];
  waitingFor: Task[];
  someday: Task[];
} {
  const nextActions: Task[] = [];
  const waitingFor: Task[] = [];
  const someday: Task[] = [];

  for (const task of tasks) {
    if (isSomedayTask(task)) {
      someday.push(task);
      continue;
    }
    if (isWaitingTask(task)) {
      waitingFor.push(task);
      continue;
    }
    if (task.status !== "done") {
      nextActions.push(task);
    }
  }

  return {
    nextActions: sortNextActions(nextActions),
    waitingFor,
    someday,
  };
}

export function groupTasksByProject(tasks: Task[]): ProjectBucket[] {
  const projectMap = new Map<string, Task[]>();
  for (const task of tasks) {
    const projectName = getTaskProject(task);
    const list = projectMap.get(projectName);
    if (list) {
      list.push(task);
    } else {
      projectMap.set(projectName, [task]);
    }
  }

  const summaries: ProjectBucket[] = [];
  for (const [project, projectTasks] of projectMap) {
    const { nextActions, waitingFor, someday } = splitTasksIntoBuckets(projectTasks);
    summaries.push({ project, tasks: projectTasks, nextActions, waitingFor, someday });
  }

  return summaries.sort((a, b) => {
    if (a.project === SINGLE_ACTIONS_LABEL) return -1;
    if (b.project === SINGLE_ACTIONS_LABEL) return 1;
    return a.project.localeCompare(b.project);
  });
}

function getWaitingNote(task: Task): string {
  const context = normalizeTaskContext(task.context);
  const raw = context["waitingOn"];
  if (typeof raw === "string") return raw;
  if (raw) return "Awaiting update";
  return "";
}

function getBucketForTask(task: Task): GtdBucketKey {
  if (isSomedayTask(task)) return "someday";
  if (isWaitingTask(task)) return "waiting";
  return "next";
}

type ContextUpdates = {
  project?: string | null;
  gtdList?: string | null;
  waitingOn?: string | boolean | null;
};

function applyContextUpdates(task: Task, updates: ContextUpdates): TaskContext {
  const context = { ...normalizeTaskContext(task.context) } as Record<string, unknown>;
  if (updates.project !== undefined) {
    const value = updates.project?.trim();
    if (value) {
      context.project = value;
    } else {
      delete context.project;
    }
  }

  if (updates.gtdList !== undefined) {
    const value = updates.gtdList?.trim();
    if (value) {
      context.gtdList = value;
    } else {
      delete context.gtdList;
    }
  }

  if (updates.waitingOn !== undefined) {
    const waitingValue = updates.waitingOn;
    if (waitingValue === null || waitingValue === false || waitingValue === "") {
      delete context.waitingOn;
    } else {
      context.waitingOn = waitingValue;
    }
  }

  return context as TaskContext;
}

export function GtdProjectLists() {
  const { data, isLoading } = useTasks({ limit: 200 });
  const tasks = data?.items ?? EMPTY_TASKS;
  const { updateTask, createTask, isUpdating, isCreating } = useTaskOperations();

  const projects = useMemo(() => groupTasksByProject(tasks), [tasks]);
  const suggestions = useMemo(() => {
    const set = new Set<string>();
    for (const group of projects) {
      if (group.project !== SINGLE_ACTIONS_LABEL) {
        set.add(group.project);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [projects]);

  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleProjectChange = async (task: Task, projectName: string) => {
    setSubmittingId(task.id);
    try {
      const context = applyContextUpdates(task, { project: projectName || null });
      await updateTask(task.id, { context });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleBucketChange = async (task: Task, bucket: GtdBucketKey, waitingNote: string) => {
    setSubmittingId(task.id);
    try {
      if (bucket === "someday") {
        const context = applyContextUpdates(task, { gtdList: "someday", waitingOn: null });
        await updateTask(task.id, { context });
        return;
      }
      if (bucket === "waiting") {
        const note = waitingNote.trim().length > 0 ? waitingNote.trim() : "Awaiting update";
        const context = applyContextUpdates(task, { waitingOn: note, gtdList: null });
        await updateTask(task.id, { context });
        return;
      }
      const context = applyContextUpdates(task, { waitingOn: null, gtdList: null });
      await updateTask(task.id, { context });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleWaitingNoteBlur = async (task: Task, note: string) => {
    setSubmittingId(task.id);
    try {
      const trimmed = note.trim();
      const context = applyContextUpdates(task, {
        waitingOn: trimmed.length > 0 ? trimmed : "Awaiting update",
        gtdList: null,
      });
      await updateTask(task.id, { context });
    } finally {
      setSubmittingId(null);
    }
  };

  const handleCreateNextAction = async (projectName: string, title: string) => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const context = projectName === SINGLE_ACTIONS_LABEL ? undefined : { project: projectName };
    await createTask({
      title: trimmedTitle,
      status: "todo",
      priority: "medium",
      context,
    });
  };

  const isBusy = isLoading || isUpdating || isCreating;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>
          Stay focused on meaningful outcomes and keep the next move crystal clear.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading project overview…</p>
        ) : projects.length === 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">No projects yet.</p>
            <p className="text-sm text-muted-foreground">
              Capture a next action to kick off the first project or drop a task into the calendar.
            </p>
          </div>
        ) : (
          projects.map((group) => (
            <ProjectSection
              key={group.project}
              bucket={group}
              suggestions={suggestions}
              isSubmittingId={submittingId}
              onProjectChange={handleProjectChange}
              onBucketChange={handleBucketChange}
              onWaitingNoteBlur={handleWaitingNoteBlur}
              onCreateNextAction={handleCreateNextAction}
              isBusy={isBusy}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

type ProjectSectionProps = {
  bucket: ProjectBucket;
  suggestions: string[];
  isSubmittingId: string | null;
  isBusy: boolean;
  onProjectChange: (task: Task, projectName: string) => Promise<void>;
  onBucketChange: (task: Task, bucket: GtdBucketKey, waitingNote: string) => Promise<void>;
  onWaitingNoteBlur: (task: Task, note: string) => Promise<void>;
  onCreateNextAction: (projectName: string, title: string) => Promise<void>;
};

function ProjectSection({
  bucket,
  suggestions,
  isSubmittingId,
  isBusy,
  onProjectChange,
  onBucketChange,
  onWaitingNoteBlur,
  onCreateNextAction,
}: ProjectSectionProps) {
  const { project, nextActions, waitingFor, someday } = bucket;
  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">{project}</h3>
          <p className="text-sm text-muted-foreground">
            {project === SINGLE_ACTIONS_LABEL
              ? "Quick wins that keep momentum high."
              : "Guide this project by lining up its next bold step."}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-right text-xs font-medium uppercase text-muted-foreground">
          <div>
            <dt>Next</dt>
            <dd>{nextActions.length}</dd>
          </div>
          <div>
            <dt>Waiting</dt>
            <dd>{waitingFor.length}</dd>
          </div>
          <div>
            <dt>Someday</dt>
            <dd>{someday.length}</dd>
          </div>
        </dl>
      </header>
      <NewNextActionForm
        project={project}
        disabled={isBusy}
        onCreate={onCreateNextAction}
      />
      <BucketSection
        title="Next Actions"
        description="Line up the very next move so progress stays effortless."
        tasks={nextActions}
        emptyCopy="No next actions queued. Add one above to stay in motion."
        suggestions={suggestions}
        onProjectChange={onProjectChange}
        onBucketChange={onBucketChange}
        onWaitingNoteBlur={onWaitingNoteBlur}
        isSubmittingId={isSubmittingId}
      />
      <BucketSection
        title="Waiting For"
        description="Track follow-ups so nothing slips while you wait."
        tasks={waitingFor}
        emptyCopy="Nothing on hold. Reach out or move the work forward."
        suggestions={suggestions}
        onProjectChange={onProjectChange}
        onBucketChange={onBucketChange}
        onWaitingNoteBlur={onWaitingNoteBlur}
        isSubmittingId={isSubmittingId}
      />
      <BucketSection
        title="Someday / Maybe"
        description="Capture ideas so inspiration turns into action when the timing is right."
        tasks={someday}
        emptyCopy="No someday items yet. Dream ambitiously and jot them down."
        suggestions={suggestions}
        onProjectChange={onProjectChange}
        onBucketChange={onBucketChange}
        onWaitingNoteBlur={onWaitingNoteBlur}
        isSubmittingId={isSubmittingId}
      />
    </section>
  );
}

type BucketSectionProps = {
  title: string;
  description: string;
  emptyCopy: string;
  tasks: Task[];
  suggestions: string[];
  onProjectChange: (task: Task, projectName: string) => Promise<void>;
  onBucketChange: (task: Task, bucket: GtdBucketKey, waitingNote: string) => Promise<void>;
  onWaitingNoteBlur: (task: Task, note: string) => Promise<void>;
  isSubmittingId: string | null;
};

function BucketSection({
  title,
  description,
  emptyCopy,
  tasks,
  suggestions,
  onProjectChange,
  onBucketChange,
  onWaitingNoteBlur,
  isSubmittingId,
}: BucketSectionProps) {
  return (
    <section className="rounded-lg border p-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className="text-xs font-semibold uppercase text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span>
      </header>
      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyCopy}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tasks.map((task, index) => (
            <ProjectTaskRow
              key={task.id}
              task={task}
              suggestions={suggestions}
              highlight={index === 0 && title === "Next Actions"}
              onProjectChange={onProjectChange}
              onBucketChange={onBucketChange}
              onWaitingNoteBlur={onWaitingNoteBlur}
              isSubmitting={isSubmittingId === task.id}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

type ProjectTaskRowProps = {
  task: Task;
  suggestions: string[];
  highlight: boolean;
  onProjectChange: (task: Task, projectName: string) => Promise<void>;
  onBucketChange: (task: Task, bucket: GtdBucketKey, waitingNote: string) => Promise<void>;
  onWaitingNoteBlur: (task: Task, note: string) => Promise<void>;
  isSubmitting: boolean;
};

function ProjectTaskRow({
  task,
  suggestions,
  highlight,
  onProjectChange,
  onBucketChange,
  onWaitingNoteBlur,
  isSubmitting,
}: ProjectTaskRowProps) {
  const bucket = getBucketForTask(task);
  const [waitingNote, setWaitingNote] = useState(() => getWaitingNote(task));

  useEffect(() => {
    setWaitingNote(getWaitingNote(task));
  }, [task]);

  const scheduledLabel = formatScheduledLabel(task.scheduled_time);

  const projectName = getTaskProject(task);
  const projectValue = projectName === SINGLE_ACTIONS_LABEL ? "" : projectName;

  const handleProjectSubmit = (value: string) => onProjectChange(task, value);

  const handleBucketSelect = async (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as GtdBucketKey;
    if (value === bucket) return;
    await onBucketChange(task, value, waitingNote);
  };

  const handleWaitingBlur = async () => {
    if (bucket !== "waiting") return;
    await onWaitingNoteBlur(task, waitingNote);
  };

  return (
    <li
      className={cn(
        "space-y-3 rounded-md border p-3",
        highlight && "border-primary bg-primary/5",
        isSubmitting && "opacity-75"
      )}
      aria-busy={isSubmitting}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{task.title}</p>
          {highlight && <span className="text-xs font-semibold uppercase text-primary">Next up</span>}
        </div>
        <p className="text-xs text-muted-foreground">
          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} priority · {scheduledLabel}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`project-${task.id}`} className="text-xs font-medium text-muted-foreground">
            Assign project
          </label>
          <ProjectNameSelector
            id={`project-${task.id}`}
            value={projectValue}
            onSubmit={handleProjectSubmit}
            suggestions={suggestions}
            disabled={isSubmitting}
            placeholder="Single actions"
            ariaLabel={`Assign project for ${task.title}`}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`bucket-${task.id}`} className="text-xs font-medium text-muted-foreground">
            GTD bucket
          </label>
          <select
            id={`bucket-${task.id}`}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={bucket}
            onChange={handleBucketSelect}
            disabled={isSubmitting}
            aria-label={`Choose GTD bucket for ${task.title}`}
          >
            <option value="next">Next action</option>
            <option value="waiting">Waiting for</option>
            <option value="someday">Someday / maybe</option>
          </select>
          {bucket === "waiting" && (
            <div className="space-y-1">
              <label htmlFor={`waiting-${task.id}`} className="text-xs font-medium text-muted-foreground">
                Waiting on
              </label>
              <input
                id={`waiting-${task.id}`}
                value={waitingNote}
                onChange={(event) => setWaitingNote(event.target.value)}
                onBlur={handleWaitingBlur}
                disabled={isSubmitting}
                placeholder="Who or what are you waiting on?"
                aria-label={`Waiting on details for ${task.title}`}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

type NewNextActionFormProps = {
  project: string;
  disabled: boolean;
  onCreate: (project: string, title: string) => Promise<void>;
};

function NewNextActionForm({ project, disabled, onCreate }: NewNextActionFormProps) {
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputId = `new-task-${slugifyProjectName(project)}`;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setIsSubmitting(true);
    try {
      await onCreate(project, trimmed);
      setTitle("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="flex-1">
        <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
          New next action
        </label>
        <input
          id={inputId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={disabled || isSubmitting}
          placeholder={project === SINGLE_ACTIONS_LABEL ? "Capture the next quick win" : "What moves this project forward?"}
          aria-label={`Add a next action for ${project}`}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <button
        type="submit"
        disabled={disabled || isSubmitting}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70",
        )}
      >
        Add
      </button>
    </form>
  );
}
