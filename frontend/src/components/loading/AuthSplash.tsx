import { ColdStartLoader } from "@/components/loading/ColdStartLoader";

export function AuthSplash({ message = "Loading your data" }: { message?: string }) {
  return <ColdStartLoader headline={message.replace(/\.\.\.$/, "")} variant="fullscreen" size="large" />;
}
