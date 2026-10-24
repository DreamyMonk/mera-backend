import "server-only";

// A readable device and rough location for security emails, from request
// headers (Vercel adds the IP-based location headers).

export function deviceFrom(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "a browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "an unknown system";
  return `${browser} on ${os}`;
}

export function locationFrom(req: Request) {
  const decode = (v: string | null) => {
    try {
      return v ? decodeURIComponent(v) : "";
    } catch {
      return v || "";
    }
  };
  const city = decode(req.headers.get("x-vercel-ip-city"));
  const country = req.headers.get("x-vercel-ip-country") || "";
  let countryName = country;
  try {
    countryName = country ? new Intl.DisplayNames(["en"], { type: "region" }).of(country) || country : "";
  } catch {
    // keep the code
  }
  return [city, countryName].filter(Boolean).join(", ") || "Unknown location";
}

export const signInMethod = (provider: string) =>
  provider === "google.com" ? "Google" : provider === "password" ? "Email and password" : provider === "custom" ? "Mira extension" : provider;
