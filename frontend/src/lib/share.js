export function encodeMeasurementsForUrl(measurements) {
  const jsonValue = JSON.stringify(measurements);
  return window.btoa(encodeURIComponent(jsonValue));
}

export function decodeMeasurementsFromUrl(encodedValue) {
  if (!encodedValue) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(window.atob(encodedValue)));
  } catch (error) {
    return null;
  }
}

export function buildShareUrl(measurements) {
  const url = new URL(window.location.href);
  url.searchParams.set("m", encodeMeasurementsForUrl(measurements));
  url.hash = "";
  return url.toString();
}

export function clearSharePayloadFromCurrentUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("m");
  window.history.replaceState({}, "", url.toString());
  return url.toString();
}
