"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const getOrCreateUser = useMutation(api.users.getOrCreateUser);

  useEffect(() => {
    if (isLoaded && user) {
      // Determine the auth provider from external accounts
      const provider = user.externalAccounts?.[0]?.provider || "email";

      getOrCreateUser({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || "",
        name: user.fullName || user.username || "User",
        picture: user.imageUrl,
        username: user.username || user.id,
        locale: "en",
        provider: provider as "email" | "github" | "google" | "openid",
      }).catch((error) => {
        console.error("Failed to sync user:", error);
      });
    }
  }, [isLoaded, user, getOrCreateUser]);

  return null;
}
