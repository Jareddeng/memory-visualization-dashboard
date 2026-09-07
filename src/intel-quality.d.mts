type RecordLike = { id: string; date: string; title: string; summary: string; url?: string };
export function validIntelUrl(value: unknown): string;
export function intelUrlKey(value: unknown): string;
export function isArticleUrl(value: unknown): boolean;
export function assertUniqueIntelUrls(records: RecordLike[]): void;
export function sameIntel(a: RecordLike, b: RecordLike): boolean;
export function dedupeIntel<T extends RecordLike>(records: T[]): T[];
export function mergeIntel<T extends RecordLike>(remote: T[], local: T[]): T[];
