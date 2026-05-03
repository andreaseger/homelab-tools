export interface SpecMeta {
  id: string;
  filename: string;
  title: string;
  version: string;
  type: 'openapi' | 'asyncapi';
}

declare global {
  interface Window {
    React: typeof import('react');
    ReactDOM: typeof import('react-dom');
    SwaggerEditor: {
      plugins: {
        EditorContentOrigin: any;
        EditorContentType: any;
        EditorPreviewAsyncAPI: any;
        SwaggerUIAdapter: any;
      };
    };
  }
}
