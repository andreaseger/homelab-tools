import { useCallback, useEffect, useRef, useState } from 'react';
import './index.css';
import { Sidebar } from './Sidebar';
import { SpecViewer } from './SpecViewer';

export interface SpecMeta {
  id: string;
  filename: string;
  title: string;
  version: string;
  type: 'openapi' | 'asyncapi';
}

export function App() {
  const [specs, setSpecs] = useState<SpecMeta[]>([]);
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [specVersion, setSpecVersion] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchSpecs = useCallback(async () => {
    try {
      const res = await fetch('/api/specs');
      const data: SpecMeta[] = await res.json();
      setSpecs(data);
      // Auto-select first if nothing selected
      setSelectedFilename((prev) => {
        if (prev && data.some((s) => s.filename === prev)) return prev;
        return data[0]?.filename ?? null;
      });
    } catch (err) {
      console.error('Failed to fetch specs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket for live reload
  useEffect(() => {
    function connect() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reload' || data.type === 'connected') {
            setSpecs(data.specs);
            setSpecVersion((v) => v + 1);
            setSelectedFilename((prev) => {
              if (prev && data.specs.some((s: SpecMeta) => s.filename === prev))
                return prev;
              return data.specs[0]?.filename ?? null;
            });
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onclose = () => {
        // Reconnect after 2 seconds
        setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();
    return () => {
      wsRef.current?.close();
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSpecs();
  }, [fetchSpecs]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-gray-500 font-medium">Loading specifications…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        specs={specs}
        selectedFilename={selectedFilename}
        onSelect={setSelectedFilename}
      />
      <main className="flex-1 overflow-auto bg-white">
        {selectedFilename ? (
          <SpecViewer filename={selectedFilename} specVersion={specVersion} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-lg font-medium">No specifications found</p>
              <p className="text-sm mt-1">
                Add YAML or JSON spec files to the specs directory
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
