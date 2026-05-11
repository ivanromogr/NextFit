import { API_BASE_URL } from "../api/config";

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const cleanUrl = url.trim();
  if (!cleanUrl) return "";
  if (/^(data:|blob:)/i.test(cleanUrl)) return cleanUrl;
  if (/^https?:/i.test(cleanUrl)) return normalizeApiHost(cleanUrl);
  if (cleanUrl.startsWith("/")) return `${API_BASE_URL}${cleanUrl}`;
  return cleanUrl;
};

export const resolveExerciseImageUrl = (exercise) => {
  return getExerciseImageCandidates(exercise)[0] || "";
};

export const getExerciseImageCandidates = (exercise) => {
  if (!exercise) return [];
  const rawUrl = exercise.imagenOriginalUrl || exercise.imagenUrl || exercise.gifUrl || "";
  const apiId = exercise.apiId || extractExerciseDbId(rawUrl);
  const candidates = [];
  if (apiId) {
    candidates.push(`${API_BASE_URL}/api/ejercicios/imagen/${apiId}`);
  }
  const resolvedRaw = resolveMediaUrl(rawUrl);
  if (resolvedRaw && !candidates.includes(resolvedRaw)) {
    candidates.push(resolvedRaw);
  }
  return candidates;
};

const extractExerciseDbId = (url) => {
  if (!url || typeof url !== "string" || !url.includes("exerciseId=")) return "";
  try {
    return new URL(url).searchParams.get("exerciseId") || "";
  } catch {
    const match = url.match(/[?&]exerciseId=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
};

const normalizeApiHost = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/api/")) {
      const api = new URL(API_BASE_URL);
      if (parsed.origin !== api.origin) {
        return `${API_BASE_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    }
    return url;
  } catch {
    return url;
  }
};
