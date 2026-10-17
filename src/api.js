export const staticPreview = import.meta.env.VITE_STATIC_ADMIN === "true";
export async function api(path, options = {}) {
  if (staticPreview)
    throw Object.assign(
      new Error(
        "Sign-in and editing require the hosted API. This is a read-only static preview.",
      ),
      { status: 503 },
    );
  const response = await fetch(`/api${path}`, {
    signal: AbortSignal.timeout(10000),
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  }).catch(() => {
    throw Object.assign(
      new Error(
        "The local service is unavailable. Start the API, then try again.",
      ),
      { status: 503 },
    );
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Object.assign(
      new Error(
        "The local service is unavailable. Start the API, then try again.",
      ),
      { status: 503 },
    );
  }
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "The request could not be completed."),
      { status: response.status },
    );
  return data;
}
export const imageUrl = (value) =>
  value?.startsWith("/api/media/")
    ? value
    : `${import.meta.env.BASE_URL}images/real/${value}.webp`;
