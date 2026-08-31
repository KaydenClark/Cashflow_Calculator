import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import type { AppState, Scenario } from "./types";

interface DataContextValue {
  state: AppState | null;
  loading: boolean;
  error: string | null;
  scenario: Scenario;
  setScenario: (scenario: Scenario) => void;
  refresh: () => Promise<void>;
  saveAssumption: (key: string, value: number, effectiveDate?: string | null, notes?: string) => Promise<void>;
  classify: (fingerprint: string, category: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenario, setScenarioState] = useState<Scenario>("base");

  const load = async (selectedScenario = scenario) => {
    setLoading(true);
    setError(null);
    try {
      setState(await api.state(selectedScenario));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load local financial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(scenario); }, [scenario]);

  const value = useMemo<DataContextValue>(() => ({
    state,
    loading,
    error,
    scenario,
    setScenario: setScenarioState,
    refresh: () => load(scenario),
    saveAssumption: async (key, value, effectiveDate, notes) => {
      await api.assumption(key, value, effectiveDate, notes);
      await load(scenario);
    },
    classify: async (fingerprint, category) => {
      await api.classification(fingerprint, category);
      await load(scenario);
    },
  }), [state, loading, error, scenario]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error("useData must be used inside DataProvider");
  return value;
}
