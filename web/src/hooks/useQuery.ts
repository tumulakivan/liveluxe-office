import * as React from "react";

/**
 * Fetch on mount and whenever `deps` change; `reload` to refetch by hand.
 *
 * While a refetch for new deps is in flight the previous data is kept, but
 * flagged `stale`: it answers a different question (last week, not this one),
 * so screens should show a placeholder rather than present it as current.
 * A plain `reload` with the same deps does not mark data stale, so the 60s
 * schedule refresh never flickers.
 */
export function useQuery<T>(fetcher: () => Promise<T>, deps: React.DependencyList) {
  const key = JSON.stringify(deps);
  const [state, setState] = React.useState<{ data: T | undefined; key: string | null }>({ data: undefined, key: null });
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [tick, setTick] = React.useState(0);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    fetcher()
      .then((value) => {
        if (!live) return;
        setState({ data: value, key });
        setError(null);
      })
      .catch((e: Error) => live && setError(e))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  const reload = React.useCallback(() => setTick((t) => t + 1), []);
  const setData = React.useCallback((value: T) => setState((s) => ({ data: value, key: s.key })), []);

  const stale = state.key !== key;
  return {
    data: state.data,
    error,
    loading,
    stale,
    /** Nothing current to show yet: first load, or new deps still loading. Show a placeholder. */
    pending: state.data === undefined || stale,
    reload,
    setData,
  };
}
