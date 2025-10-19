"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useThemeSettings } from "@/context/theme-context";
import { useSettings, useUpsertSettings } from "@/hooks/settings";

const themeOptions = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export default function SettingsClient() {
  const { data, isLoading } = useSettings();
  const upsert = useUpsertSettings();
  const { theme, setTheme, isLoading: themeSyncing } = useThemeSettings();

  const [aiPersona, setAiPersona] = useState("");
  const [aiStatus, setAiStatus] = useState<"idle" | "success" | "error">("idle");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationError, setNotificationError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.ai_persona !== undefined) {
      setAiPersona(data.ai_persona ?? "");
    }
  }, [data?.ai_persona]);

  useEffect(() => {
    if (typeof data?.notifications === "boolean") {
      setNotificationsEnabled(data.notifications);
    }
  }, [data?.notifications]);

  const isNotificationsPending = upsert.isPending;

  const handleNotificationChange = async (nextValue: boolean) => {
    setNotificationError(null);
    const previous = notificationsEnabled;
    setNotificationsEnabled(nextValue);
    try {
      await upsert.mutateAsync({ notifications: nextValue });
    } catch (error) {
      setNotificationsEnabled(previous);
      setNotificationError("Unable to update notifications. Try again.");
    }
  };

  const handleAiSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAiStatus("idle");
    try {
      await upsert.mutateAsync({ ai_persona: aiPersona.trim() ? aiPersona.trim() : null });
      setAiStatus("success");
    } catch (error) {
      setAiStatus("error");
    }
  };

  const isBusy = useMemo(() => isLoading || themeSyncing, [isLoading, themeSyncing]);

  return (
    <Tabs defaultValue="theme" className="mt-8">
      <div className="flex flex-col gap-6 md:flex-row">
        <TabsList className="w-full max-w-sm justify-start overflow-x-auto md:h-fit md:w-48 md:flex-col">
          <TabsTrigger value="theme">Theme</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="persona">AI Persona</TabsTrigger>
        </TabsList>
        <div className="flex-1">
          <TabsContent value="theme">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Select how the app should look and feel.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {themeOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={theme === option.value ? "default" : "outline"}
                      onClick={() => setTheme(option.value)}
                      disabled={themeSyncing}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
                {themeSyncing && <p className="text-sm text-muted-foreground">Syncing your theme preference…</p>}
                {isBusy && !themeSyncing && <p className="text-sm text-muted-foreground">Loading your saved preferences…</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Control whether coaching nudges land in your inbox.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-md border border-input bg-muted p-4">
                  <div>
                    <Label htmlFor="notifications" className="text-base">Enable notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive reminders and practice prompts.</p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={handleNotificationChange}
                    disabled={isNotificationsPending}
                  />
                </div>
                {notificationError ? (
                  <p className="text-sm text-destructive">{notificationError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Updates are saved instantly.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="persona">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>AI Persona</CardTitle>
                <CardDescription>Describe the tone, style, and priorities for your AI coaching assistant.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleAiSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="ai-persona">Coach instructions</Label>
                    <Textarea
                      id="ai-persona"
                      value={aiPersona}
                      onChange={(event) => setAiPersona(event.target.value)}
                      placeholder="e.g. Encourage reflective questions, keep responses under 4 sentences, celebrate small wins."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={upsert.isPending}>
                      {upsert.isPending ? "Saving…" : "Save persona"}
                    </Button>
                    {aiStatus === "success" && <span className="text-sm text-muted-foreground">Saved!</span>}
                    {aiStatus === "error" && <span className="text-sm text-destructive">Something went wrong.</span>}
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
