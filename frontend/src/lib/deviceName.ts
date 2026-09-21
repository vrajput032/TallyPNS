/** Friendly label for the current browser/device (browsers do not expose the OS hostname). */
export function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown device";

  const ua = navigator.userAgent;
  const uaData = (
    navigator as Navigator & {
      userAgentData?: { brands?: { brand: string; version: string }[]; mobile?: boolean; platform?: string };
    }
  ).userAgentData;

  let browser = "Browser";
  if (uaData?.brands?.length) {
    const brand =
      uaData.brands.find((b) => /chrome|chromium|edge|opera|brave/i.test(b.brand) && !/not/i.test(b.brand)) ??
      uaData.brands.find((b) => !/not|chromium/i.test(b.brand)) ??
      uaData.brands[0];
    if (brand?.brand) browser = brand.brand.replace(/^Google\s+/i, "").replace(/^Microsoft\s+/i, "");
  } else if (/Edg\//.test(ua)) {
    browser = "Edge";
  } else if (/OPR\/|Opera/.test(ua)) {
    browser = "Opera";
  } else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) {
    browser = "Chrome";
  } else if (/Firefox\//.test(ua)) {
    browser = "Firefox";
  } else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) {
    browser = "Safari";
  }

  let device = "Unknown";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) device = uaData?.mobile === false ? "Android tablet" : "Android";
  else if (uaData?.platform) {
    const platform = uaData.platform;
    if (/mac/i.test(platform)) device = "Mac";
    else if (/win/i.test(platform)) device = "Windows";
    else if (/linux/i.test(platform)) device = "Linux";
    else if (/android/i.test(platform)) device = "Android";
    else if (/iphone|ios/i.test(platform)) device = "iPhone";
    else device = platform;
  } else if (/Mac OS X|Macintosh/.test(ua)) device = "Mac";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Linux/.test(ua)) device = "Linux";

  const label = `${browser} on ${device}`.trim();
  return label.slice(0, 80) || "Unknown device";
}
