import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "reader" | "editor" | "admin";
    } & DefaultSession["user"];
  }

  interface User {
    role: "reader" | "editor" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "reader" | "editor" | "admin";
  }
}
