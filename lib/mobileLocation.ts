export type LocationFailure = { code: number; message: string };

// Browser timeouts do not include time spent waiting for permission. Some
// embedded mobile browsers never call either callback, so bound each attempt
// ourselves and ignore late results after retry, close or manual selection.
export function requestMobilePosition(
  geolocation: Pick<Geolocation, 'getCurrentPosition'> | undefined,
  onSuccess: PositionCallback,
  onError: (error: LocationFailure) => void,
  isCurrent: () => boolean,
) {
  let finished = false;
  let attempt = 0;
  let timer: ReturnType<typeof setTimeout>;
  const cancel = () => { finished = true; attempt++; clearTimeout(timer); };
  const fail = (error: LocationFailure) => {
    if (finished || !isCurrent()) return;
    cancel();
    onError(error);
  };
  const request = (highAccuracy: boolean) => {
    if (finished || !isCurrent()) return;
    const currentAttempt = ++attempt;
    clearTimeout(timer);
    const timeout = highAccuracy ? 12000 : 10000;
    const retryOrFail = (error: LocationFailure) => {
      if (finished || currentAttempt !== attempt || !isCurrent()) return;
      if (error.code !== 1 && !highAccuracy) request(true);
      else fail(error);
    };
    timer = setTimeout(() => retryOrFail({ code: 3, message: 'Location request timed out' }), timeout);
    try {
      geolocation!.getCurrentPosition(position => {
        if (finished || currentAttempt !== attempt || !isCurrent()) return;
        cancel();
        onSuccess(position);
      }, retryOrFail, { enableHighAccuracy: highAccuracy, timeout, maximumAge: 120000 });
    } catch {
      fail({ code: 2, message: 'Location is unavailable in this browser' });
    }
  };
  if (geolocation) request(false);
  else fail({ code: 2, message: 'Location is not supported on this device' });
  return cancel;
}
