import { useEffect } from "react";
import { useWorkspaceStore } from "./stores/workspace";
import { useRadioStore } from "./stores/radio";
import { Dashboard } from "./components/Dashboard";
import { Dock } from "./components/Dock";

export function App() {
  const loadWorkspace = useWorkspaceStore((s) => s.load);
  const connectRadio = useRadioStore((s) => s.connect);

  useEffect(() => {
    void loadWorkspace();
    void connectRadio();
  }, [loadWorkspace, connectRadio]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Dashboard />
      <Dock />
    </div>
  );
}
