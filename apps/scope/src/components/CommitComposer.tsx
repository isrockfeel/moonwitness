import { useEffect } from "react";
import { useCommitStore } from "../stores/commit";
import { useWorkspaceStore } from "../stores/workspace";

const TYPES = [
  "feat",
  "fix",
  "chore",
  "docs",
  "refactor",
  "test",
  "build",
  "ci",
  "perf",
  "style",
  "revert",
];

export function CommitComposer() {
  const { message, validation, suggestion, setMessage, validate, suggest } = useCommitStore();
  const root = useWorkspaceStore((s) => s.root);

  useEffect(() => {
    if (root) void suggest(root);
  }, [root, suggest]);

  const handleType = (type: string) => {
    const scope = suggestion ? `(${suggestion})` : "";
    setMessage(`${type}${scope}: `);
  };

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900 p-4">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Commit Composer
      </h2>

      <div className="mb-2 flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => handleType(t)}
            className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-700"
          >
            {t}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onBlur={() => void validate()}
        placeholder="feat(scope): add thing"
        className="mb-2 w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
      />

      {suggestion && (
        <p className="mb-2 text-xs text-slate-500">
          suggested scope: <span className="font-mono text-slate-300">{suggestion}</span>
        </p>
      )}

      {validation && (
        <div className="mb-2">
          {validation.valid ? (
            <p className="text-xs text-emerald-400">✓ valid conventional commit</p>
          ) : (
            <ul className="space-y-0.5">
              {validation.problems.map((p, i) => (
                <li key={i} className="text-xs text-red-400">
                  ✗ {p}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
