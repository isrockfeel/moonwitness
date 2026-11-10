export type CrewRole = "admin" | "editor" | "viewer";

export interface CrewAccount {
  username: string;
  email: string;
  password: string;
  role: CrewRole;
  displayName: string;
}

// Hardcoded demo crew. Replace with a real user store before shipping.
export const CREW_ACCOUNTS: CrewAccount[] = [
  {
    username: "admin",
    email: "admin@moon.world",
    password: "admin123",
    role: "admin",
    displayName: "Empire Admin",
  },
  {
    username: "witness",
    email: "witness@moon.world",
    password: "moonwalk",
    role: "editor",
    displayName: "Chief Witness",
  },
  {
    username: "observer",
    email: "observer@moon.world",
    password: "lookonly",
    role: "viewer",
    displayName: "Signal Observer",
  },
];

export type AuthResult =
  | { ok: true; account: CrewAccount }
  | { ok: false; field: "identifier" | "password" | "credentials"; message: string };

export function authenticate(identifier: string, password: string): AuthResult {
  const needle = identifier.trim().toLowerCase();
  if (needle.length === 0) {
    return { ok: false, field: "identifier", message: "Enter your username or email." };
  }
  if (password.length === 0) {
    return { ok: false, field: "password", message: "Enter your password." };
  }

  const account = CREW_ACCOUNTS.find(
    (a) => a.username.toLowerCase() === needle || a.email.toLowerCase() === needle,
  );
  if (!account || account.password !== password) {
    return {
      ok: false,
      field: "credentials",
      message: "Wrong identity or password. The shadow stays closed.",
    };
  }
  return { ok: true, account };
}

export function roleLabel(role: string): string {
  return `${role.charAt(0).toUpperCase()}${role.slice(1)} // Empire`;
}
