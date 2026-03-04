// ─── Rule Engine Types ───────────────────────────────────────────────

export type ConditionOperator = 'eq' | 'in' | 'contains';

export interface Condition {
  field: string;
  operator: ConditionOperator;
  value: string | string[];
}

export interface Variant {
  variantId: string;
  headline: string;
  flags: Record<string, boolean>;
}

export interface Rule {
  id: string;
  priority: number;
  conditions: Condition[];
  variant: Variant;
}

export interface RulesetConfig {
  siteId: string;
  configVersion: string;
  rules: Rule[];
  fallback: Variant;
}

// ─── Consent Types ───────────────────────────────────────────────────

export interface ConsentFlags {
  marketing: boolean;
  analytics?: boolean;
}

export const CONSENT_SAFE_FIELDS = [
  'country',
  'language',
  'deviceType',
  'referrerDomain',
] as const;

export type ConsentSafeField = (typeof CONSENT_SAFE_FIELDS)[number];

// ─── Decide API Types ────────────────────────────────────────────────

export interface VisitorContext {
  visitorId?: string;
  country?: string;
  language?: string;
  deviceType?: string;
  referrerDomain?: string;
  [key: string]: string | undefined;
}

export interface DecideRequest {
  siteId: string;
  url: string;
  visitor: VisitorContext;
  consent: ConsentFlags;
}

export interface DecideResponse {
  variantId: string;
  headline: string;
  flags: Record<string, boolean>;
  configVersion: string;
}

// ─── LLM Copy Assistant Types ────────────────────────────────────────

export interface AllowedClaim {
  id: string;
  text: string;
}

export interface LlmCopyRequest {
  siteId: string;
  tone?: string;
  targetAudience?: string;
}

export interface LlmCopyResponse {
  headline1: string;
  headline2: string;
  usedClaimIds: string[];
}
