import { useEffect, useRef } from "react";

interface SpecViewerProps {
  filename: string;
  specVersion: number;
}

export function SpecViewer({ filename, specVersion }: SpecViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous SwaggerUI instance
    containerRef.current.innerHTML = "";

    const targetId = `swagger-ui-${Date.now()}`;
    const target = document.createElement("div");
    target.id = targetId;
    containerRef.current.appendChild(target);

    try {
      // The imported UMD scripts attach themselves to the window object
      // @ts-expect-error
      const SwaggerUI = window.SwaggerUIBundle;
      // @ts-expect-error
      const SwaggerEditor = window.SwaggerEditor;
      // @ts-expect-error
      const SwaggerUIStandalonePreset = window.SwaggerUIStandalonePreset;

      SwaggerUI({
        url: `/api/specs/${encodeURIComponent(filename)}`,
        domNode: target,
        presets: [SwaggerUI.presets.apis, SwaggerUIStandalonePreset],
        plugins: [
          SwaggerEditor.plugins.EditorContentOrigin,
          SwaggerEditor.plugins.EditorContentType,
          SwaggerEditor.plugins.EditorPreviewAsyncAPI,
          SwaggerEditor.plugins.SwaggerUIAdapter,
          SwaggerUI.plugins.DownloadUrl,
        ],
        layout: "StandaloneLayout",
        deepLinking: true,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        docExpansion: "list",
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        tryItOutEnabled: false,
      });
    } catch (err) {
      console.error("Failed to initialize SwaggerUI:", err);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="padding: 2rem; color: #ef4444;">
            <h3 style="font-size: 1.25rem; font-weight: 600;">Failed to render specification</h3>
            <p style="margin-top: 0.5rem; color: #6b7280;">${String(err)}</p>
          </div>
        `;
      }
    }

    return () => {
      // Cleanup on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [filename, specVersion]);

  return (
    <div
      ref={containerRef}
      className="min-h-screen"
    />
  );
}
