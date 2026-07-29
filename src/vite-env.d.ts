/// <reference types="vite/client" />

interface Navigator {
  readonly connection?: {
    readonly effectiveType?: string;
  };
  readonly deviceMemory?: number;
}
