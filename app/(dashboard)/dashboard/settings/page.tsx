"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
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

export default function SettingsPage() {
  const { user: clerkUser } = useUser();
  const user = useQuery(api.users.getCurrentUser);
  const updateUser = useMutation(api.users.updateUser);

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
