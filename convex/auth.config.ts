import type { AuthConfig } from "convex/server";

/**
 * Clerk authentication configuration for Convex.
 * 
 * To find your Clerk JWT issuer domain:
 * 1. Go to your Clerk Dashboard: https://dashboard.clerk.com
 * 2. Select your application
 * 3. Go to "JWT Templates" or "API Keys"
 * 4. The issuer domain is typically: https://<your-clerk-domain>.clerk.accounts.dev
 * 
 * Set the CLERK_JWT_ISSUER_DOMAIN environment variable with your issuer domain,
 * or replace the domain value below with your actual Clerk JWT issuer.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || "https://clerk.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;

