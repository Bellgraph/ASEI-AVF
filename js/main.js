/* =============================================================================
   MAIN.JS — Entry Point
   Wires the header and bottom bar, then hands off to each component's init().
   Runs after all scripts are loaded (deferred in index.html).
   ============================================================================= */

'use strict';

document.addEventListener('DOMContentLoaded', () => {

  // ── Header ─────────────────────────────────────────────────────────────────

  // Time and date come from the processor as serial joins
  Bridge.onSerial(Joins.System.Time.serial, v => {
    if (v) document.getElementById('header-time').textContent = v;
  });
  Bridge.onSerial(Joins.System.Date.serial, v => {
    if (v) document.getElementById('header-date').textContent = v;
  });


  // ── Bottom Bar — Left Buttons ───────────────────────────────────────────────

  Joins.BottomBar.Left.forEach(({ Visible, Active, Press, Icon }, idx) => {
    const btn = document.querySelector(`[data-left-btn="${idx}"]`);
    if (!btn) return;

    btn.addEventListener('pointerdown', () => Bridge.pulse(Press.digital));
    Bridge.onDigital(Visible.digital, v => btn.classList.toggle('is-hidden', !v));
    Bridge.onDigital(Active.digital,  v => btn.classList.toggle('is-active', v));
    Bridge.onSerial( Icon.serial,     v => {
      if (v) btn.querySelector('i').className = v;
    });
  });


  // ── Bottom Bar — Page Flip ──────────────────────────────────────────────────

  const pageFlipBtn = document.getElementById('pageflip-btn');
  const sections    = Array.from(document.querySelectorAll('.panel-section'));
  let   _currentSection = 0;

  pageFlipBtn?.addEventListener('pointerdown', () => {
    Bridge.pulse(Joins.BottomBar.PageFlip.Press.digital);

    // Advance to next section, wrap around
    _currentSection = (_currentSection + 1) % sections.length;
    sections[_currentSection]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  Bridge.onDigital(Joins.BottomBar.PageFlip.Visible.digital, v => {
    pageFlipBtn?.classList.toggle('is-hidden', !v);
  });

  // Direction feedback — up chevron when on last section (nowhere to go but up)
  Bridge.onDigital(Joins.BottomBar.PageFlip.Direction.digital, v => {
    const icon = pageFlipBtn?.querySelector('i');
    if (icon) icon.className = v ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
  });


  // ── Initialize Components ───────────────────────────────────────────────────

  PresetsUI.init(document.getElementById('preset-list'));
  ControlsPopupUI.init(document.getElementById('overlay-layer'));
  AreaSelectUI.init(document.getElementById('area-dropdown'));
  VolumeUI.init(document.getElementById('panel-footer'));


  // ── Dev convenience — expose Bridge globally for console testing ────────────
  // Remove before final deployment or gate behind a flag if preferred.
  if (typeof window !== 'undefined') {
    window._bridge = Bridge;
    console.info(
      '[main] Panel initialized.\n' +
      'Dev tip: window._bridge.mockReceive(type, join, value) to simulate signals.\n' +
      'Example: _bridge.mockReceive("s", 1, "10:42 AM")'
    );
  }

});
