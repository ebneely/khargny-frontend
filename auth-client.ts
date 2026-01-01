import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
    baseURL: "http://localhost:3001", // Backend URL
});

export const { signIn, signUp, signOut, useSession } = authClient;
