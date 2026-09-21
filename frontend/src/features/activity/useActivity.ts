import { useListQuery } from "@/store/hooks/useReduxData";
import { fetchActivity } from "@/store/slices/activitySlice";
import type { ActivityLog } from "./types";

export function useActivity() {
  return useListQuery<ActivityLog>((s) => s.activity, fetchActivity);
}
