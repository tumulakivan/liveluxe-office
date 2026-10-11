import * as React from "react";

import { api, type RoomsInfo } from "@/lib/api";

// The rooms and opening hours change about never, so one fetch per page load
// is shared by every screen that needs them.
let cached: Promise<RoomsInfo> | null = null;

export function useRooms() {
  const [info, setInfo] = React.useState<RoomsInfo | null>(null);
  React.useEffect(() => {
    let live = true;
    cached ??= api.rooms().catch((error) => {
      cached = null;
      throw error;
    });
    cached.then((value) => live && setInfo(value)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return info;
}
