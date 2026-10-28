// One 15-second timer per pending chat request, with one shared reconnect animation while any
// timed-out request is still pending. The request itself is never cancelled or retried here.
export const SATELLITE_WAIT_MS = 15000;

export function createSatelliteWait({ delay = SATELLITE_WAIT_MS, onStart = () => {}, onStop = () => {} } = {}) {
  let visibleRequests = 0;
  let started = false;
  const requests = new Map();
  const removeVisible = (record) => {
    if (!record.shown) return;
    record.shown = false;
    visibleRequests = Math.max(0, visibleRequests - 1);
    if (visibleRequests === 0 && started) {
      started = false;
      onStop();
    }
  };
  return {
    async run(request, { excluded = false, id = null } = {}) {
      if (typeof request !== 'function') throw new TypeError('request must be a function');
      if (excluded) return request();
      const record = { settled: false, shown: false, responded: false, timer: 0 };
      if (id !== null) requests.set(id, record);
      let pending;
      try {
        pending = request();
      } catch (error) {
        if (id !== null && requests.get(id) === record) requests.delete(id);
        throw error;
      }
      // Arm after calling the request so its own timer is older at an exact-threshold tie.
      record.timer = setTimeout(() => {
        if (record.settled || record.responded) return;
        record.shown = true;
        visibleRequests += 1;
        if (!started) {
          started = true;
          onStart();
        }
      }, Math.max(0, delay) + 1);
      try {
        return await pending;
      } finally {
        record.settled = true;
        clearTimeout(record.timer);
        removeVisible(record);
        if (id !== null && requests.get(id) === record) requests.delete(id);
      }
    },
    response(id) {
      const record = requests.get(id);
      if (!record || record.responded || record.settled) return false;
      record.responded = true;
      clearTimeout(record.timer);
      removeVisible(record);
      return true;
    },
    get active() { return started; },
    get pendingTimedOut() { return visibleRequests; },
  };
}
