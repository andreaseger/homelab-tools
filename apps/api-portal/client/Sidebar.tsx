import type { SpecMeta } from './types';

interface SidebarProps {
  specs: SpecMeta[];
  selectedFilename: string | null;
  onSelect: (filename: string) => void;
}

export function Sidebar({ specs, selectedFilename, onSelect }: SidebarProps) {
  return (
    <aside className="w-72 flex-shrink-0 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col h-screen">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-semibold text-base tracking-tight">
              API Portal
            </h1>
            <p className="text-slate-400 text-xs">
              {specs.length} specification{specs.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Spec list */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll py-3 px-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-2 mb-2">
          Specifications
        </p>
        <ul className="space-y-1">
          {specs.map((spec) => {
            const isSelected = spec.filename === selectedFilename;
            return (
              <li key={spec.filename}>
                <button
                  onClick={() => onSelect(spec.filename)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group cursor-pointer
                    ${
                      isSelected
                        ? 'bg-white/10 text-white shadow-sm'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }
                  `}
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`
                        inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mt-0.5 flex-shrink-0
                        ${
                          spec.type === 'openapi'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-violet-500/20 text-violet-400'
                        }
                      `}
                    >
                      {spec.type === 'openapi' ? 'REST' : 'Async'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {spec.title}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        v{spec.version}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <p className="text-[10px] text-slate-600 text-center">
          Powered by SwaggerUI &amp; Swagger Editor
        </p>
      </div>
    </aside>
  );
}
