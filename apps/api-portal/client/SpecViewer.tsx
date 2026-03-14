import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

declare global {
  interface Window {
    SwaggerEditor: {
      plugins: {
        EditorContentOrigin: unknown;
        EditorContentType: unknown;
        EditorPreviewAsyncAPI: unknown;
        SwaggerUIAdapter: unknown;
      };
    };
  }
}

interface SpecViewerProps {
  filename: string;
  specVersion: number;
}

export function SpecViewer({ filename, specVersion }: SpecViewerProps) {
  const SwaggerEditor = window.SwaggerEditor;

  return (
    <SwaggerUI
      key={`${filename}-${specVersion}`}
      url={`/api/specs/${encodeURIComponent(filename)}`}
      plugins={[
        SwaggerEditor.plugins.EditorContentOrigin,
        SwaggerEditor.plugins.EditorContentType,
        SwaggerEditor.plugins.EditorPreviewAsyncAPI,
        SwaggerEditor.plugins.SwaggerUIAdapter,
      ]}
      deepLinking
      defaultModelsExpandDepth={1}
      defaultModelExpandDepth={1}
      docExpansion="list"
      filter
      showExtensions
      showCommonExtensions
      tryItOutEnabled={false}
    />
  );
}
