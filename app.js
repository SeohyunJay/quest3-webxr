/* global AFRAME */
'use strict';
// Synthetic application pointer, not hardware-controller injection or IWER.
AFRAME.registerComponent('experiment', {
  init() {
    this.run = null;
    if (this.el.hasLoaded) this.setup();
    else this.el.addEventListener('loaded', () => this.setup(), {once: true});
  },
  setup() {
    this.mode = document.body.dataset.mode;
    this.rows = [];
    this.run = null;
    this.pending = null;
    this.pointer = document.getElementById('pointer');
    this.target = document.getElementById('target');
    this.shield = document.getElementById('shield');
    this.origin = new AFRAME.THREE.Vector3(0, 1.5, 0);
    this.direction = new AFRAME.THREE.Vector3(0, 0, -1);
    this.pose = new AFRAME.THREE.Vector3();
    this.quat = new AFRAME.THREE.Quaternion();
    this.shield.classList.toggle('interactive', this.mode === 'dos');
    // Both conditions render the identical transparent mesh. Only hit testing changes.
    this.pointer.setAttribute('raycaster', 'objects', '.interactive');
    for (const element of [this.target, this.shield]) {
      element.addEventListener('click', event => {
        if (!this.pending || event.detail.cursorEl !== this.pointer) return;
        this.pending.receivers.push(element.id);
      });
    }
    this.el.addEventListener('enter-vr', () => {
      // Reject physical controller events: scheduled custom down/up events are the input source.
      this.pointer.components.cursor.removeWebXREventListeners();
      this.start('quest-xr');
    });
    this.el.addEventListener('exit-vr', () => this.finish('aborted_exit_vr'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.finish('aborted_hidden');
    });
    document.getElementById('desktop').onclick = () => this.start('desktop-test');
    document.getElementById('stop').onclick = () => this.finish('aborted_by_user');
    document.getElementById('csv').onclick = () => this.download('csv');
    document.getElementById('json').onclick = () => this.download('json');
    this.ui('Ready. Enter VR for a headset run, or start a desktop test.');
    window.questLab = this;
  },
  ui(message) { document.getElementById('status').textContent = message; },
  record(event, extra = {}) {
    const now = performance.now();
    const row = {
      run_id: this.run.id, condition: this.mode, environment: this.run.environment,
      event, time_iso: new Date().toISOString(), monotonic_ms: now,
      epoch_ms: performance.timeOrigin + now,
      measurement_elapsed_ms: this.run.measureStart === null ? '' : now - this.run.measureStart,
      ...extra
    };
    this.rows.push(row);
    return row;
  },
  start(environment) {
    if (this.run && this.run.active) return;
    const now = performance.now();
    this.run = {
      id: crypto.randomUUID(), environment, active: true, warmupStart: now,
      build: '2026-11-12-cursor-sync-v2',
      measureStart: null, warmupMs: 15000, durationMs: 60000, intervalMs: 5000,
      nextAttempt: 0, attempts: 0, targetClicks: 0, blockedClicks: 0, failures: 0,
      userAgent: navigator.userAgent, aframe: AFRAME.version
    };
    this.record('warmup_start', {warmup_ms: 15000, duration_ms: 60000, interval_ms: 5000});
    this.ui('Warming up for 15 seconds. Keep your head still; do not press controller buttons.');
    document.getElementById('phase').setAttribute('value', 'WARMUP');
  },
  tick() {
    const run = this.run;
    if (!run || !run.active) return;
    const now = performance.now();
    if (run.measureStart === null) {
      if (now - run.warmupStart < run.warmupMs) return;
      run.measureStart = now;
      this.record('measurement_start');
      document.getElementById('phase').setAttribute('value', 'RECORDING');
      this.ui('Recording for 60 seconds. Twelve attempts, five seconds apart.');
    }
    const elapsed = now - run.measureStart;
    if (elapsed >= run.durationMs) {
      if (run.attempts !== 12) run.failures++;
      this.finish(run.failures ? 'invalid_run' : 'completed');
      return;
    }
    if (elapsed < run.nextAttempt) return;
    const scheduled = run.nextAttempt;
    // Never manufacture a burst of catch-up clicks after a stall.
    if (elapsed - scheduled > 250) {
      this.record('timing_failure', {scheduled_ms: scheduled, lateness_ms: elapsed - scheduled});
      this.finish('invalid_timing');
      return;
    }
    run.nextAttempt += run.intervalMs;
    this.attempt(scheduled);
  },
  attempt(scheduled) {
    const run = this.run;
    const raycaster = this.pointer.components.raycaster;
    this.el.object3D.updateMatrixWorld(true);
    raycaster.refreshObjects();
    // Refresh actual mesh intersections BEFORE sending cursor input.
    raycaster.checkIntersections();
    const hit = raycaster.intersections[0];
    const cursor = this.pointer.components.cursor;
    const cursorBefore = cursor.intersectedEl ? cursor.intersectedEl.id : '';
    // enter-vr clears cursor selection even if the fixed ray's hit is unchanged.
    // Reconcile from real intersections; do not force the intended target.
    if (cursor.intersectedEl !== (hit ? hit.object.el : null)) {
      cursor.clearCurrentIntersection(true);
      if (raycaster.intersections.length) {
        cursor.onIntersection({detail: {
          els: raycaster.intersectedEls,
          intersections: raycaster.intersections
        }});
      }
    }
    const attemptId = ++run.attempts;
    this.pending = {receivers: []};
    const camera = this.el.camera;
    camera.getWorldPosition(this.pose);
    camera.getWorldQuaternion(this.quat);
    this.record('input_attempt', {
      attempt_id: attemptId, scheduled_ms: scheduled,
      lateness_ms: performance.now() - run.measureStart - scheduled,
      input_source: 'scheduled_aframe_cursor', intended_target: 'target',
      hit_object: hit ? hit.object.el.id : '', hit_distance: hit ? hit.distance : '',
      cursor_before_sync: cursorBefore,
      cursor_after_sync: cursor.intersectedEl ? cursor.intersectedEl.id : '',
      pointer_x: 0, pointer_y: 1.5, pointer_z: 0,
      direction_x: 0, direction_y: 0, direction_z: -1,
      head_x: this.pose.x, head_y: this.pose.y, head_z: this.pose.z,
      head_qx: this.quat.x, head_qy: this.quat.y, head_qz: this.quat.z, head_qw: this.quat.w
    });
    // Same native A-Frame cursor path for both modes; never call target handlers directly.
    this.pointer.emit('trial-down', {}, false);
    this.pointer.emit('trial-up', {}, false);
    const receivers = this.pending.receivers;
    this.pending = null;
    const expected = this.mode === 'dos' ? 'shield' : 'target';
    const valid = receivers.length === 1 && receivers[0] === expected;
    if (receivers.includes('target')) run.targetClicks++;
    if (receivers.includes('shield')) run.blockedClicks++;
    if (!valid) run.failures++;
    this.record('input_result', {
      attempt_id: attemptId, received_by: receivers.join('|'),
      outcome: valid ? (this.mode === 'dos' ? 'blocked' : 'target_activated') : 'unexpected',
      expected_receiver: expected, valid
    });
    // No flashes, counters, console output, or text changes during measurement.
  },
  finish(reason) {
    const run = this.run;
    if (!run || !run.active) return;
    this.record('run_end', {
      reason, attempts: run.attempts, target_clicks: run.targetClicks,
      blocked_clicks: run.blockedClicks, failures: run.failures
    });
    run.active = false;
    run.reason = reason;
    document.getElementById('phase').setAttribute('value', 'FINISHED');
    this.ui(`${reason}: ${run.attempts} attempts; target ${run.targetClicks}; blocked ${run.blockedClicks}; failures ${run.failures}. Exit VR and export CSV + JSON.`);
  },
  download(format) {
    if (this.run && this.run.active) {
      this.ui('Stop or finish the run before exporting.');
      return;
    }
    if (!this.rows.length) { this.ui('No trials recorded yet.'); return; }
    let content;
    if (format === 'json') {
      content = JSON.stringify({schema: 1, latestRun: this.run, events: this.rows}, null, 2);
    } else {
      const keys = [...new Set(this.rows.flatMap(row => Object.keys(row)))];
      const quote = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
      content = [keys.map(quote).join(','), ...this.rows.map(row => keys.map(key => quote(row[key])).join(','))].join('\r\n');
    }
    const url = URL.createObjectURL(new Blob([content], {type: format === 'json' ? 'application/json' : 'text/csv'}));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `quest-${this.mode}-${Date.now()}.${format}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
});
