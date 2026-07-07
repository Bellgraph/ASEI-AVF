/* =============================================================================
   UI/PRESETS.JS — Preset List Component
   Builds and manages the horizontal list of 16 preset slots.
   All DOM is created once at init. SIMPL drives everything after that
   via digital/serial joins subscribed here.
   ============================================================================= */

'use strict';

const PresetsUI = (() => {

  const SLOT_COUNT = Joins.Presets.Slots.length;  // 16

  // Track subscriptions for cleanup
  const _subs = [];

  // DOM element references, indexed by slot
  const _slots = [];   // { root, mainBtn, controlsBtn, stopBtn, icon, label, stopIcon }

  // ── Build DOM ───────────────────────────────────────────────────────────────

  function _buildSlot(index) {
    const j = Joins.Presets.Slots[index];

    const root = document.createElement('div');
    root.className = 'preset-slot is-hidden';
    root.dataset.slot = index;

    // Controls button (upper-right arrow icon)
    const controlsBtn = document.createElement('button');
    controlsBtn.className = 'preset-slot__controls-btn is-hidden';
    controlsBtn.setAttribute('aria-label', `Controls for preset ${index + 1}`);
    controlsBtn.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square"></i>';
    controlsBtn.addEventListener('pointerdown', () => Bridge.pulse(j.Controls.Press.digital));

    // Main select button
    const mainBtn = document.createElement('button');
    mainBtn.className = 'preset-slot__main';
    mainBtn.setAttribute('aria-label', `Select preset ${index + 1}`);
    mainBtn.addEventListener('pointerdown', () => Bridge.pulse(j.Press.digital));

    const iconSpan = document.createElement('span');
    iconSpan.className = 'preset-slot__icon';
    iconSpan.innerHTML = '<i class="fa-solid fa-laptop"></i>';  // default; overridden by serial

    const labelSpan = document.createElement('span');
    labelSpan.className = 'preset-slot__label';
    labelSpan.textContent = `Preset ${index + 1}`;

    mainBtn.append(iconSpan, labelSpan);

    // Stop section
    const stopWrap = document.createElement('div');
    stopWrap.className = 'preset-slot__stop is-hidden';

    const stopBtn = document.createElement('button');
    stopBtn.className = 'preset-slot__stop-icon';
    stopBtn.setAttribute('aria-label', 'Stop');
    stopBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';
    stopBtn.addEventListener('pointerdown', () => Bridge.pulse(j.Stop.Press.digital));

    const stopLabel = document.createElement('span');
    stopLabel.className = 'preset-slot__stop-label';
    stopLabel.textContent = 'Stop';

    stopWrap.append(stopBtn, stopLabel);
    root.append(controlsBtn, mainBtn, stopWrap);

    return {
      root,
      mainBtn,
      controlsBtn,
      stopWrap,
      stopBtn,
      iconSpan,
      labelSpan,
    };
  }

  // ── Subscribe to SIMPL signals ──────────────────────────────────────────────

  function _bindSlot(index, els) {
    const j = Joins.Presets.Slots[index];

    // Visibility
    _subs.push(Bridge.onDigital(j.Visible.digital, v => {
      els.root.classList.toggle('is-hidden', !v);
    }));

    // Selected feedback
    _subs.push(Bridge.onDigital(j.Selected.digital, v => {
      els.root.classList.toggle('is-selected-card', v);
      els.mainBtn.classList.toggle('is-selected', v);  // keeps icon/label color change
    }));

    // Stop button visibility
    _subs.push(Bridge.onDigital(j.Stop.Visible.digital, v => {
      els.stopWrap.classList.toggle('is-hidden', !v);
    }));

    // Controls button visibility
    _subs.push(Bridge.onDigital(j.Controls.Visible.digital, v => {
      els.controlsBtn.classList.toggle('is-hidden', !v);
    }));

    // Icon (SIMPL sends FontAwesome class string, e.g. "fa-solid fa-laptop")
    _subs.push(Bridge.onSerial(j.Icon.serial, v => {
      if (v) els.iconSpan.innerHTML = `<i class="${v}"></i>`;
    }));

    // Label
    _subs.push(Bridge.onSerial(j.Label.serial, v => {
      if (v !== undefined) els.labelSpan.textContent = v;
    }));
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  function init(listEl) {
    // Section title
    _subs.push(Bridge.onSerial(Joins.Presets.SectionTitle.serial, v => {
      const titleEl = document.getElementById('preset-section-title');
      if (titleEl && v) titleEl.textContent = v;
    }));

    // Build all 16 slots
    for (let i = 0; i < SLOT_COUNT; i++) {
      const els = _buildSlot(i);
      _slots.push(els);
      _bindSlot(i, els);
      listEl.appendChild(els.root);
    }
  }

  return { init };

})();
