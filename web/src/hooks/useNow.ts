import * as React from "react";

import { nowMinutes } from "@/lib/time";

/** Minutes since midnight, refreshed every half-minute so "now" lines and "free until" labels keep up. */
export function useNow() {
  const [now, setNow] = React.useState(nowMinutes);
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(nowMinutes()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}
