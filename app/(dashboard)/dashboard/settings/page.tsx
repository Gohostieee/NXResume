"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from "@/constants/llm";
import { useOpenAiStore } from "@/stores/openai";

export default function SettingsPage() {
  useUser();
  const user = useQuery(api.users.getCurrentUser);
  const { apiKey, setApiKey, model, setModel, maxTokens, setMaxTokens } =
    useOpenAiStore();
  const [apiKeyInput, setApiKeyInput] = useState(apiKey ?? "");
  const [modelInput, setModelInput] = useState(model ?? DEFAULT_MODEL);
  const [maxTokensInput, setMaxTokensInput] = useState(
    String(maxTokens ?? DEFAULT_MAX_TOKENS),
  );

  useEffect(() => setApiKeyInput(apiKey ?? ""), [apiKey]);
  useEffect(() => setModelInput(model ?? DEFAULT_MODEL), [model]);
  useEffect(() => {
    setMaxTokensInput(String(maxTokens ?? DEFAULT_MAX_TOKENS));
  }, [maxTokens]);

  const handleSaveAiSettings = () => {
    const trimmedKey = apiKeyInput.trim();
    const trimmedModel = modelInput.trim();
    const parsedMaxTokens = Number.parseInt(maxTokensInput, 10);

    setApiKey(trimmedKey.length > 0 ? trimmedKey : null);
    setModel(trimmedModel.length > 0 ? trimmedModel : DEFAULT_MODEL);
    setMaxTokens(
      Number.isFinite(parsedMaxTokens) && parsedMaxTokens > 0
        ? parsedMaxTokens
        : DEFAULT_MAX_TOKENS,
    );
  };

  const handleClearApiKey = () => {
    setApiKey(null);
    setApiKeyInput("");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-foreground/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-foreground/60">Manage your account settings.</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Your profile information from Clerk.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input value={user.name} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input value={user.username} disabled />
            </div>
            <p className="text-sm text-foreground/60">
              To update your profile, please use the Clerk user button in the
              sidebar.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>
              Customize your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Language</Label>
              <Input value={user.locale} disabled />
              <p className="text-sm text-foreground/60">
                Language preferences will be available soon.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Settings</CardTitle>
            <CardDescription>
              Bring your own OpenAI key for AI-powered resume edits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>OpenAI API Key</Label>
              <Input
                type="password"
                value={apiKeyInput}
                placeholder="sk-..."
                onChange={(event) => setApiKeyInput(event.target.value)}
              />
              <p className="text-sm text-foreground/60">
                Stored locally in your browser. It is only sent when you run an AI action.
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Model</Label>
              <Input
                value={modelInput}
                placeholder={DEFAULT_MODEL}
                onChange={(event) => setModelInput(event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                min={1}
                value={maxTokensInput}
                onChange={(event) => setMaxTokensInput(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleSaveAiSettings}>
                Save AI Settings
              </Button>
              <Button type="button" variant="outline" onClick={handleClearApiKey}>
                Clear API Key
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-error/50">
          <CardHeader>
            <CardTitle className="text-error">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions for your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="error" disabled>
              Delete Account
            </Button>
            <p className="mt-2 text-sm text-foreground/60">
              Account deletion is handled through Clerk. Please contact support
              if you need to delete your account.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
