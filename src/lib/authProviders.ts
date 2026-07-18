/** OAuth providers wired up in the Supabase dashboard. Shared by the auth
    server actions and the sign-in UI. Kept out of the "use server" actions
    module, which may only export async functions. */
export const OAUTH_PROVIDERS = ["google", "github"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
