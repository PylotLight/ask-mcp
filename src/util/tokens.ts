import { randomBytes, randomUUID } from "node:crypto"

export function newFormToken(): string {
  return randomBytes(16).toString("base64url")
}

export function newRequestId(): string {
  return randomUUID().replaceAll("-", "").slice(0, 24)
}
