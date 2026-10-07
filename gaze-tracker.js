(() => {
  'use strict';
  if (parent === window) return;
  let stream, stopped = false, ready = false, lastEyes = 0, lastRecordedEyes = 0;
  const send = data => parent.postMessage({ channel: 'hytex-gaze', ...data }, location.origin);
  function stop() {
    stopped = true;
    stream?.getTracks().forEach(track => track.stop());
    window.webgazer?.pause();
  }
  window.addEventListener('pagehide', stop);
  const fail = () => { if (!stopped) { stop(); send({ type: 'error' }); } };
  window.addEventListener('error', fail);
  window.addEventListener('unhandledrejection', fail);
  window.addEventListener('message', event => {
    if (event.source !== parent || event.origin !== location.origin || event.data?.channel !== 'hytex-gaze') return;
    if (event.data.type === 'stop') stop();
    if (event.data.type === 'sample' && ready && !stopped) {
      const { x, y } = event.data;
      const accepted = performance.now() - lastEyes < 250 && lastEyes > lastRecordedEyes && Number.isFinite(x) && Number.isFinite(y);
      // Each automatic sample must use a fresh camera frame, not a repeated eye patch.
      if (accepted) {
        webgazer.recordScreenPosition(x, y, 'click');
        lastRecordedEyes = lastEyes;
      }
      send({ type: 'sampled', step: event.data.step, accepted });
    }
  });
  async function begin() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (stopped) { stop(); return; }
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', () => { stop(); send({ type: 'error' }); }));
      // Reuse the owned stream so cancellation can release it even while the model loads.
      navigator.mediaDevices.getUserMedia = async () => {
        if (stopped) throw new Error('Stopped');
        return stream;
      };
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = './assets/vendor/webgazer.js'; script.onload = resolve; script.onerror = reject;
        document.head.append(script);
      });
      if (stopped) return;
      webgazer.params.faceMeshSolutionPath = new URL('./assets/vendor/mediapipe/face_mesh', location.href).href;
      webgazer.saveDataAcrossSessions(false).showVideoPreview(false).showPredictionPoints(false);
      // One adaptive filter in the page owns smoothing; avoid stacked Kalman lag.
      webgazer.applyKalmanFilter(false);
      webgazer.showFaceOverlay(false).showFaceFeedbackBox(false);
      const tracker = webgazer.getTracker();
      const getEyes = tracker.getEyePatches.bind(tracker);
      tracker.getEyePatches = async (...args) => {
        const eyes = await getEyes(...args);
        lastEyes = eyes ? performance.now() : 0;
        return eyes;
      };
      webgazer.setGazeListener(data => {
        if (stopped) return;
        send({ type: 'gaze', valid: !!data?.eyeFeatures, x: data?.x, y: data?.y });
      });
      await webgazer.begin();
      if (stopped) { stop(); return; }
      webgazer.removeMouseEventListeners();
      ready = true; send({ type: 'ready' });
    } catch (error) {
      console.warn('Gaze initialization failed:', error?.name, error?.message);
      stop(); send({ type: 'error', denied: error?.name === 'NotAllowedError' });
    }
  }
  begin();
})();
