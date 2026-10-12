// Anzeige des Client-Updaters; Ereignisse kommen vom Hauptprozess (src/updater.js über preload.js).
(function () {
  const $ = (id) => document.getElementById(id);
  const mb = (n) => (n / 1e6).toFixed(1);

  function setProgress(p) {
    p = Math.max(0, Math.min(1, p));
    $('fill').style.transform = `scaleX(${p})`;      // transform statt width: kein Layout je Schritt
    $('percent').textContent = `${Math.floor(p * 100)}%`;
  }
  function eta(s) {
    if (!isFinite(s) || s <= 0) return '';
    return s < 60 ? `${Math.ceil(s)} s left` : `${Math.ceil(s / 60)} min left`;
  }
  function detail(...parts) {
    $('detail').innerHTML = '';
    for (const p of parts.filter(Boolean)) {
      const span = document.createElement('span');
      span.textContent = p;
      $('detail').append(span);
    }
  }
  function show(phase, text) {
    document.body.className = phase;
    $('statusText').textContent = text;
    $('repair').disabled = phase === 'check' || phase === 'download';   // nicht mitten in einen Abgleich
  }
  function buttons(visible, offline) {
    $('buttons').classList.toggle('show', visible);
    $('offline').style.display = offline ? '' : 'none';
  }

  $('retry').onclick = () => window.updater.retry();
  $('offline').onclick = () => window.updater.playOffline();
  $('repair').onclick = () => window.updater.repair();
  $('log').onclick = () => window.updater.openLog();

  window.updater.onEvent((ev) => {
    switch (ev.phase) {
      case 'check':
        show('check', 'Checking for updates');
        $('percent').textContent = '';
        $('fill').style.transform = '';
        detail();
        $('file').textContent = '';
        buttons(false);
        break;
      case 'notes':
        $('version').textContent = `Game files ${ev.version}`;
        $('notesText').textContent = ev.notes;
        $('notes').classList.toggle('show', !!ev.notes);
        break;
      case 'download': {
        show('download', `Downloading ${ev.done} of ${ev.total} files`);
        setProgress(ev.totalBytes ? ev.bytes / ev.totalBytes : ev.done / Math.max(1, ev.total));
        const left = ev.speed > 0 ? (ev.totalBytes - ev.bytes) / ev.speed : NaN;
        detail(`${mb(ev.bytes)} of ${mb(ev.totalBytes)} MB`, ev.speed > 0 ? `${mb(ev.speed)} MB/s` : '', eta(left));
        $('file').textContent = ev.file || '';
        break;
      }
      case 'done':
        show('done', ev.updated ? 'Updated, entering the world' : 'Entering the world');
        setProgress(1);
        detail();
        $('file').textContent = '';
        break;
      case 'error':
        show('error', ev.unreachable ? "Can't reach the server" : 'Update failed');
        $('percent').textContent = '';
        detail(ev.message);
        $('file').textContent = ev.offline ? 'You can still play with the files you already have.' : '';
        buttons(true, ev.offline);
        break;
    }
  });
})();
