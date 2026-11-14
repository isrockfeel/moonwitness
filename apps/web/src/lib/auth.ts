export type CrewRole = "admin" | "editor" | "viewer";

export interface CrewAccount {
  id: number;
  username: string;
  email: string;
  role: CrewRole;
  displayName: string;
}

export type AuthResult =
  | { ok: true; account: CrewAccount }
  | { ok: false; field: "identifier" | "password" | "credentials"; message: string };

export async function authenticate(identifier: string, password: string): Promise<AuthResult> {
  const needle = identifier.trim().toLowerCase();
  if (needle.length === 0) {
    return { ok: false, field: "identifier", message: "Enter your username or email." };
  }
  if (password.length === 0) {
    return { ok: false, field: "password", message: "Enter your password." };
  }

  try {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        ok: false,
        field: "credentials",
        message: data.message || "Identitas atau kata sandi salah",
      };
    }

    return { ok: true, account: data.user };
  } catch {
    return {
      ok: false,
      field: "credentials",
      message: "Tidak dapat menghubungi server. Coba lagi nanti.",
    };
  }
}

export function roleLabel(role: string): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} // Empire`;
}
