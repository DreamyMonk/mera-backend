// Shapes shared by the API routes and the web pages.

export type Plan = {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // shown to users; 0 = free
  monthlyCreditUsd: number; // AI usage allowed per month, in US dollars of model cost
  maxBusinesses: number;
  proactive: boolean; // proactive page checks allowed
  active: boolean; // visible and selectable
  isDefault: boolean;
  order: number;
};

export type UserStatus = "active" | "blocked";

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  planId: string | null;
  status: UserStatus;
  quotaOverrideUsd: number | null;
  createdAt: number;
  lastActiveAt: number;
};

export type Usage = {
  month: string; // YYYY-MM
  costMicros: number; // millionths of a US dollar
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export type Business = { id: string; name: string; about: string; createdAt: number; updatedAt: number };

export type Note = { id: string; text: string; category: string; due: string; date: string };

export type TranscriptItem = { kind: string; text: string; at?: number };

export type ChatSummary = { id: string; businessId: string; title: string; createdAt: number; updatedAt: number; itemCount: number; preview: string };
