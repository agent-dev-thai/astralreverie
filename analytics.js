const MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,20}$/;
const EVENT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

export function normalizeMeasurementId(value) {
  const normalized = String(value || "").trim().toUpperCase();
  return MEASUREMENT_ID_PATTERN.test(normalized) ? normalized : "";
}

function privacyOptOut(navigatorRef, windowRef) {
  return navigatorRef?.globalPrivacyControl === true
    || navigatorRef?.doNotTrack === "1"
    || windowRef?.doNotTrack === "1";
}

export function createAnalyticsClient({
  documentRef = globalThis.document,
  windowRef = globalThis.window,
  navigatorRef = globalThis.navigator,
} = {}) {
  let enabled = false;
  let measurementId = "";
  let cleanPageLocation = "";

  function initialize({ disabled = false } = {}) {
    if (enabled) return true;
    const configuredId = normalizeMeasurementId(
      documentRef?.querySelector?.('meta[name="google-analytics-id"]')?.content,
    );
    if (disabled || !configuredId || !documentRef || !windowRef || privacyOptOut(navigatorRef, windowRef)) {
      return false;
    }

    windowRef.dataLayer = windowRef.dataLayer || [];
    windowRef.gtag = windowRef.gtag || function gtag() {
      windowRef.dataLayer.push(arguments);
    };

    windowRef.gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "granted",
    });
    windowRef.gtag("set", "ads_data_redaction", true);

    if (!documentRef.querySelector?.("script[data-google-analytics]")) {
      const script = documentRef.createElement("script");
      script.async = true;
      script.dataset.googleAnalytics = configuredId;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${configuredId}`;
      documentRef.head.append(script);
    }

    windowRef.gtag("js", new Date());
    windowRef.gtag("config", configuredId, {
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      send_page_view: false,
    });
    cleanPageLocation = `${windowRef.location.origin}${windowRef.location.pathname}`;
    windowRef.gtag("event", "page_view", {
      page_location: cleanPageLocation,
      page_title: documentRef.title,
    });

    enabled = true;
    measurementId = configuredId;
    return true;
  }

  function track(eventName, parameters = {}) {
    if (!enabled || !EVENT_NAME_PATTERN.test(eventName) || typeof windowRef?.gtag !== "function") {
      return false;
    }
    windowRef.gtag("event", eventName, {
      ...parameters,
      page_location: cleanPageLocation,
    });
    return true;
  }

  function status() {
    return { enabled, measurementId };
  }

  return Object.freeze({ initialize, status, track });
}

export const analytics = createAnalyticsClient();
