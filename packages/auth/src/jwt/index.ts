import { jwtVerify, SignJWT } from "jose";
import type { ArtKey } from "@moonwitness/types";

export type Payload = {
  userId: string;
  username: string;
  role?: "user" | "admin";
  artworkId?: string;
  artworkKey?: ArtKey;
  iat?: number;
  exp?: number;
};

export type JwtVerifyOptions = {
  secret?: string;
  /** Maximum age in seconds or string (default: 7d) */
  maxAge?: string | number;
};

export type JwtVerifyResult = {
  success: boolean;
  payload?: Payload;
  error?: Error;
};

export async function verifyJwt(
  token: string,
  secret: string,
  options?: JwtVerifyOptions,
): Promise<JwtVerifyResult> {
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), {
      maxTokenAge: options?.maxAge ?? "7d",
    });
    return { success: true, payload: payload as Payload };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

export async function signJwt(
  payload: Payload,
  secret: string,
  options?: { algorithm?: "HS256"; expiresIn?: string },
): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: options?.algorithm ?? "HS256" })
    .setIssuedAt()
    .setExpirationTime(options?.expiresIn ?? "7d")
    .sign(new TextEncoder().encode(secret));
}

export function createAuthPayload(
  userId: string,
  username: string,
  options?: {
    role?: "user" | "admin";
    artworkId?: string;
    artworkKey?: ArtKey;
  },
): Payload {
  return {
    userId,
    username,
    role: options?.role,
    artworkId: options?.artworkId,
    artworkKey: options?.artworkKey,
  };
}

export const signToken = signJwt;
export const verifyToken = verifyJwt;
