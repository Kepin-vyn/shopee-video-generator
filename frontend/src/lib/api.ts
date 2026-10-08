/**
 * Typed API client for the Shopee Video Generator backend.
 * All endpoints that require auth automatically inject the stored JWT token.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

// ── Token storage (browser-only) ─────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("access_token");
}

// ── Fetch wrapper ─────────────────────────────────────────────────────────────

interface FetchOptions extends RequestInit {
  auth?: boolean; // default true — attach Bearer token
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { auth = true, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    ...(extraHeaders as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON bodies (not FormData)
  if (rest.body && !(rest.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${API_BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, { headers, ...rest });
  } catch (networkErr) {
    // Network error — backend unreachable
    console.error(`[api] Network error on ${rest.method ?? "GET"} ${url}:`, networkErr);
    throw new Error(
      `Cannot reach backend at ${API_BASE}. Make sure the backend server is running on port 8000.`,
    );
  }

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const payload = await res.json();
      detail = (payload as { detail?: string }).detail ?? detail;
    } catch {
      // response body not JSON
    }
    console.error(`[api] ${rest.method ?? "GET"} ${url} → ${res.status}: ${detail}`);
    throw new Error(detail);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function register(payload: AuthPayload): Promise<{ id: string; email: string }> {
  return apiFetch("/auth/register", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
}

export async function login(payload: AuthPayload): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: JSON.stringify(payload),
  });
  setToken(data.access_token);
  return data;
}

export function logout(): void {
  clearToken();
  window.location.href = "/login";
}

// ── Batches ───────────────────────────────────────────────────────────────────

export interface Batch {
  id: string;
  name: string | null;
  total_images: number;
  total_videos: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export async function createBatch(name?: string): Promise<Batch> {
  const params = new URLSearchParams();
  if (name) params.set("name", name);
  return apiFetch(`/batches?${params.toString()}`, { method: "POST" });
}

export async function uploadImages(batchId: string, files: File[]): Promise<{ uploaded: number; total_images: number; total_videos: number }> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return apiFetch(`/batches/${batchId}/images`, { method: "POST", body: formData });
}

export interface GroupImage {
  id: string;
  sequence: number;
  original_filename: string;
  image_type: string;
  detection_confidence?: number;
}

export interface Group {
  video_sequence: number;
  image_ids: string[];
  images: GroupImage[];
}

export interface GroupingResult {
  batch_id: string;
  total_images: number;
  complete_videos: number;
  leftover_images: number;
  groups: Group[];
}

export async function computeGrouping(batchId: string): Promise<GroupingResult> {
  return apiFetch(`/batches/${batchId}/group`, { method: "POST" });
}

export async function getGroups(batchId: string): Promise<GroupingResult> {
  return apiFetch(`/batches/${batchId}/groups`);
}

export async function updateGroups(batchId: string, groups: { video_sequence: number; image_ids: string[] }[]): Promise<void> {
  return apiFetch(`/batches/${batchId}/groups`, {
    method: "PATCH",
    body: JSON.stringify({ groups }),
  });
}

export async function generateBatch(batchId: string): Promise<{ status: string }> {
  return apiFetch(`/batches/${batchId}/generate`, { method: "POST" });
}

export interface BatchStatus {
  batch_id: string;
  status: string;
  total_videos: number;
  completed: number;
  failed: number;
  progress: number;
}

export async function getBatchStatus(batchId: string): Promise<BatchStatus> {
  return apiFetch(`/batches/${batchId}/status`);
}

export interface VideoRecord {
  id: string;
  sequence: number;
  status: string;
  music_id?: string;
  output_path?: string;
  duration_seconds?: number;
  error_message?: string;
}

export async function getBatchVideos(batchId: string): Promise<VideoRecord[]> {
  return apiFetch(`/batches/${batchId}/videos`);
}

export async function regenerateVideo(videoId: string): Promise<void> {
  return apiFetch(`/batches/videos/${videoId}/regenerate`, { method: "POST" });
}

export function batchDownloadUrl(batchId: string): string {
  const token = getToken();
  return `${API_BASE}/batches/${batchId}/download${token ? `?token=${token}` : ""}`;
}

export function videoDownloadUrl(videoId: string): string {
  const token = getToken();
  return `${API_BASE}/batches/videos/${videoId}/download${token ? `?token=${token}` : ""}`;
}

/** Stream URL usable directly in <video src> or <a href> — passes token as query param */
export function videoStreamUrl(videoId: string): string {
  const token = getToken();
  return `${API_BASE}/batches/videos/${videoId}/stream${token ? `?token=${token}` : ""}`;
}

/** Stream URL usable directly in <audio src> — passes token as query param */
export function musicStreamUrl(musicId: string): string {
  const token = getToken();
  return `${API_BASE}/music/${musicId}/stream${token ? `?token=${token}` : ""}`;
}

// ── Batches list ──────────────────────────────────────────────────────────────

export async function listBatches(): Promise<Batch[]> {
  return apiFetch("/batches");
}

// ── Music ─────────────────────────────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  original_filename: string;
  mime_type: string;
  duration_seconds?: number;
  created_at: string;
}

export async function uploadMusic(file: File): Promise<MusicTrack> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch("/music", { method: "POST", body: formData });
}

export async function listMusic(): Promise<MusicTrack[]> {
  return apiFetch("/music");
}

export function musicPreviewUrl(musicId: string): string {
  const token = getToken();
  return `${API_BASE}/music/${musicId}/stream${token ? `?token=${token}` : ""}`;
}

export async function downloadBatchZip(batchId: string): Promise<void> {
  const token = getToken();
  const url = `${API_BASE}/batches/${batchId}/download${token ? `?token=${token}` : ""}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `batch_${batchId.slice(0, 8)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function deleteMusic(musicId: string): Promise<void> {
  return apiFetch(`/music/${musicId}`, { method: "DELETE" });
}
