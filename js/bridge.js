/* =============================================================================
   BRIDGE.JS — CrComLib Abstraction Layer
   The one and only place in the project that touches CrComLib directly.
   Everything else calls Bridge — nothing else calls CrComLib.

   In a deployed CH5 environment, CrComLib is loaded globally by the panel
   runtime before this script runs.

   In a browser/VSCode dev environment, there is no CrComLib. Bridge detects
   this and activates mock mode: subscriptions log to the console and publishes
   log their values. This means you can develop and test layout entirely in a
   browser without a processor connected.
   ============================================================================= */

'use strict';

const Bridge = (() => {

  // ── CrComLib reference ─────────────────────────────────────────────────────
  // Falls back to a no-op mock if the library isn't present (dev mode).
  const _lib = (typeof CrComLib !== 'undefined')
    ? CrComLib
    : _buildMock();

  function _buildMock() {
    const _subs = {};
    console.info(
      '%c[Bridge] CrComLib not found — running in dev/mock mode.\n' +
      'Use Bridge.mockReceive(type, join, value) to simulate processor signals.',
      'color: #5a5fc8; font-weight: bold;'
    );
    return {
      subscribeState(type, join, cb) {
        const id = `mock_${type}${join}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        if (!_subs[type + join]) _subs[type + join] = {};
        _subs[type + join][id] = cb;
        return id;
      },
      unsubscribeState(type, join, id) {
        if (_subs[type + join]) delete _subs[type + join][id];
      },
      publishEvent(type, join, value) {
        console.log(`[Bridge:tx] ${type}${join} = ${JSON.stringify(value)}`);
      },
      // Internal helper used by Bridge.mockReceive
      _triggerSubs(type, join, value) {
        const group = _subs[type + join];
        if (group) Object.values(group).forEach(cb => cb(value));
      },
    };
  }

  // Normalize join to string — CrComLib expects string join names
  const _j = join => String(join);


  // ── Public API ─────────────────────────────────────────────────────────────

  return {

    /**
     * Subscribe to a digital (boolean) feedback join.
     * Callback receives: (value: boolean)
     * Returns subscription ID — pass to Bridge.off() to unsubscribe.
     */
    onDigital(join, callback) {
      return _lib.subscribeState('b', _j(join), callback);
    },

    /**
     * Subscribe to an analog (number) feedback join.
     * Callback receives: (value: number)
     */
    onAnalog(join, callback) {
      return _lib.subscribeState('n', _j(join), callback);
    },

    /**
     * Subscribe to a serial (string) feedback join.
     * Callback receives: (value: string)
     */
    onSerial(join, callback) {
      return _lib.subscribeState('s', _j(join), callback);
    },

    /**
     * Unsubscribe a previously registered callback.
     * type: 'b' | 'n' | 's'
     */
    off(type, join, id) {
      _lib.unsubscribeState(type, _j(join), id);
    },

    /**
     * Send a digital signal to the processor.
     * value: boolean
     */
    sendDigital(join, value) {
      _lib.publishEvent('b', _j(join), value);
    },

    /**
     * Send a momentary digital pulse (true then false).
     * Use this for button presses unless the processor expects a maintained signal.
     */
    pulse(join) {
      _lib.publishEvent('b', _j(join), true);
      _lib.publishEvent('b', _j(join), false);
    },

    /**
     * Send an analog value.
     * value: number (0–65535 for Crestron standard volume/level range)
     */
    sendAnalog(join, value) {
      _lib.publishEvent('n', _j(join), value);
    },

    /**
     * Send a serial string.
     */
    sendSerial(join, value) {
      _lib.publishEvent('s', _j(join), value);
    },

    /**
     * DEV ONLY — simulate a signal arriving from the processor.
     * Lets you test feedback states in the browser without a processor.
     *
     * Examples:
     *   Bridge.mockReceive('s', 1, '10:42 AM')      // set time display
     *   Bridge.mockReceive('b', 102, true)           // select preset slot 0
     *   Bridge.mockReceive('n', 1, 32768)            // set volume to 50%
     */
    mockReceive(type, join, value) {
      if (typeof _lib._triggerSubs === 'function') {
        _lib._triggerSubs(type, _j(join), value);
      } else {
        console.warn('[Bridge.mockReceive] Not in mock mode — no effect.');
      }
    },

  };

})();
