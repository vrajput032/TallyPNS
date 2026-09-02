import type {
  SlackBillSession,
  SlackRawMaterialSession,
  SlackSession,
  SlackStockSession,
} from "./slack.types.js";

const sessions = new Map<string, SlackSession>();

export function getSession(slackUserId: string) {
  return sessions.get(slackUserId);
}

export function getBillSession(slackUserId: string) {
  const session = sessions.get(slackUserId);
  return session?.flow === "bill" ? session : undefined;
}

export function getStockSession(slackUserId: string) {
  const session = sessions.get(slackUserId);
  return session?.flow === "stock" ? session : undefined;
}

export function getRawMaterialSession(slackUserId: string) {
  const session = sessions.get(slackUserId);
  return session?.flow === "raw_material" ? session : undefined;
}

export function setSession(slackUserId: string, session: SlackSession) {
  sessions.set(slackUserId, session);
}

export function setBillSession(slackUserId: string, session: SlackBillSession) {
  sessions.set(slackUserId, session);
}

export function setStockSession(slackUserId: string, session: SlackStockSession) {
  sessions.set(slackUserId, session);
}

export function setRawMaterialSession(slackUserId: string, session: SlackRawMaterialSession) {
  sessions.set(slackUserId, session);
}

export function clearSession(slackUserId: string) {
  sessions.delete(slackUserId);
}
