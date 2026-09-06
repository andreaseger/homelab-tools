// Side-effect CSS imports are resolved by Bun's bundler, not by TypeScript.
// TS7 flags them (TS2882) without an ambient declaration.
declare module '*.css';
