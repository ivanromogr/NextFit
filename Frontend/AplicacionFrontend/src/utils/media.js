import { API_BASE_URL } from "../api/config";

export const resolveMediaUrl = (url) => {
  if (!url || typeof url !== "string") return "";
  const cleanUrl = url.trim();
  if (!cleanUrl) return "";
  if (/^(https?:|data:|blob:)/i.test(cleanUrl)) return cleanUrl;
  if (cleanUrl.startsWith("/")) return `${API_BASE_URL}${cleanUrl}`;
  return cleanUrl;
};

export const resolveExerciseImageUrl = (exercise) => {
  if (!exercise) return "";
  const apiId = exercise.apiId || extractExerciseDbId(exercise.imagenUrl || exercise.gifUrl);
  if (apiId) {
    return `${API_BASE_URL}/api/ejercicios/imagen/${apiId}`;
  }
  return resolveMediaUrl(exercise.imagenUrl || exercise.gifUrl || "");
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
