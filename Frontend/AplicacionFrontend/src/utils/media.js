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
  const rawUrls = [
    exercise.imagenOriginalUrl,
    exercise.imagenUrl,
    exercise.gifUrl,
    exercise.imagenPaso1,
    exercise.imagenPaso2,
    exercise.imagenPaso3,
    getYoutubeThumbnail(exercise.videoUrl),
  ].filter(Boolean);
  const rawUrl = rawUrls[0] || "";
  const apiId = exercise.apiId || rawUrls.map(extractExerciseDbId).find(Boolean);
  const candidates = [];
  if (apiId) {
    candidates.push(`${API_BASE_URL}/api/ejercicios/imagen/${apiId}`);
  }
  rawUrls
    .map(resolveMediaUrl)
    .filter(Boolean)
    .forEach((resolvedRaw) => {
      if (!candidates.includes(resolvedRaw)) candidates.push(resolvedRaw);
    });
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

export const getYoutubeThumbnail = (url) => {
  if (!url || typeof url !== "string") return "";
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^?&/]+)/);
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
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
