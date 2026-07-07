/* =============================================================================
   UI/CONTROLS-POPUP.JS — Controls Popup Component
   One popup that serves every context (presets, routing, area controls).
   All possible buttons exist in the DOM always.
   SIMPL configures content and drives visibility joins before setting
   Controls.Popup.Visible = 1.

   Every group's visibility is an independent digital join.
   No JS logic decides what's shown — that's entirely SIMPL's job.
   ============================================================================= */

'use strict';

const ControlsPopupUI = (() => {

  const J = Joins.Controls;
  const _subs = [];
  let _popupEl = null;
  let _scrimEl = null;

  // ── Build DOM ───────────────────────────────────────────────────────────────

  function _build() {
    const popup = document.createElement('div');
    popup.id = 'controls-popup';
    popup.className = 'overlay-popup controls-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');

    popup.innerHTML = `

      <!-- Header -->
      <div class="controls-popup__header">
        <button id="ctrl-menu-btn"  class="controls-popup__menu-btn  is-hidden" aria-label="Menu">
          <i class="fa-solid fa-bars"></i>
        </button>
        <h3 id="ctrl-title" class="controls-popup__title">[Control Type]</h3>
        <button id="ctrl-close-btn" class="controls-popup__close-btn" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <!-- Mode row -->
      <div id="ctrl-mode-row" class="controls-popup__mode-row is-hidden">
        <span class="controls-popup__mode-label">Control Mode</span>
        <button id="ctrl-mode-btn" class="controls-popup__mode-btn">
          <span id="ctrl-mode-label">Manual</span>
          <i class="fa-solid fa-chevron-down" id="ctrl-mode-chevron"></i>
        </button>
      </div>

      <!-- Content zone — all groups coexist here; SIMPL drives visibility -->
      <div class="controls-popup__content">

        <!-- D-Pad -->
        <div id="ctrl-dpad" class="controls-dpad is-hidden">
          <button class="dpad-btn dpad-btn--up"    data-dpad="up"    aria-label="Up"><i class="fa-solid fa-chevron-up"></i></button>
          <button class="dpad-btn dpad-btn--left"  data-dpad="left"  aria-label="Left"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="dpad-btn dpad-btn--right" data-dpad="right" aria-label="Right"><i class="fa-solid fa-chevron-right"></i></button>
          <button class="dpad-btn dpad-btn--down"  data-dpad="down"  aria-label="Down"><i class="fa-solid fa-chevron-down"></i></button>
        </div>

        <!-- Zoom buttons -->
        <div id="ctrl-zoom" class="controls-zoom is-hidden">
          <div class="ctrl-btn-group">
            <button id="ctrl-zoom-in"  class="ctrl-btn" aria-label="Zoom in"><i class="fa-solid fa-magnifying-glass-plus"></i></button>
            <button id="ctrl-zoom-out" class="ctrl-btn" aria-label="Zoom out"><i class="fa-solid fa-magnifying-glass-minus"></i></button>
          </div>
        </div>

        <!-- Sizing buttons -->
        <div id="ctrl-sizing" class="controls-sizing is-hidden">
          <div class="ctrl-btn-group">
            <button id="ctrl-expand"   class="ctrl-btn" aria-label="Expand"><i class="fa-solid fa-expand"></i></button>
            <button id="ctrl-contract" class="ctrl-btn" aria-label="Contract"><i class="fa-solid fa-compress"></i></button>
          </div>
        </div>

        <!-- Text display (overlays content zone) -->
        <div id="ctrl-text-display" class="controls-text-display is-hidden">
          <p id="ctrl-text-content"></p>
        </div>

        <!-- DTMF keypad (overlays content zone) -->
        <div id="ctrl-dtmf" class="controls-dtmf is-hidden">
          <!-- Keys built by JS below -->
        </div>

      </div>

      <!-- Preset color buttons row -->
      <div id="ctrl-preset-btns" class="controls-preset-btns is-hidden">
        <!-- Slots built by JS below -->
      </div>

      <!-- Footer navigation -->
      <div class="controls-popup__nav">
        <button id="ctrl-nav-prev" class="controls-popup__nav-btn is-hidden" aria-label="Previous">
          <i class="fa-solid fa-chevron-left"></i>
          <span id="ctrl-nav-prev-label"></span>
        </button>
        <button id="ctrl-nav-next" class="controls-popup__nav-btn is-hidden" aria-label="Next">
          <span id="ctrl-nav-next-label"></span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      <!-- Menu list overlay (inside popup, shown when hamburger pressed) -->
      <div id="ctrl-menu-list" class="controls-menu-list is-hidden">
        <!-- Items built by JS below -->
      </div>

    `;

    return popup;
  }

  // ── Build sub-components ────────────────────────────────────────────────────

  function _buildDTMF(container) {
    const keys = J.DTMF.Keys;
    const subLabels = { '2':'abc','3':'def','4':'ghi','5':'jkl','6':'mno',
                        '7':'pqrs','8':'tuv','9':'wxyz','*':'','0':'+','#':'' };
    keys.forEach(({ key, Press }) => {
      const btn = document.createElement('button');
      btn.className = 'dtmf-key';
      btn.setAttribute('aria-label', key);
      btn.innerHTML = `
        <span class="dtmf-key__main">${key}</span>
        ${subLabels[key] ? `<span class="dtmf-key__sub">[${subLabels[key]}]</span>` : ''}
      `;
      btn.addEventListener('pointerdown', () => Bridge.pulse(Press.digital));
      container.appendChild(btn);
    });
  }

  function _buildPresetBtns(container) {
    const colors = ['a','b','c','d'];
    const callBtn = document.createElement('button');
    callBtn.id = 'ctrl-call-btn';
    callBtn.className = 'controls-call-btn is-hidden';
    callBtn.setAttribute('aria-label', 'Call');
    callBtn.innerHTML = '<i class="fa-solid fa-phone"></i>';
    callBtn.addEventListener('pointerdown', () => Bridge.pulse(J.Call.Press.digital));

    J.PresetBtns.Slots.forEach(({ letter, Press, Selected }, idx) => {
      const btn = document.createElement('button');
      btn.className = 'preset-color-btn';
      btn.dataset.presetLetter = letter;
      btn.setAttribute('aria-label', `Preset ${letter}`);
      btn.innerHTML = `
        <span class="preset-color-dot preset-color-dot--${colors[idx]}"></span>
        <span class="preset-color-label" id="ctrl-prst-label-${letter}">Prst ${letter}</span>
      `;
      btn.addEventListener('pointerdown', () => Bridge.pulse(Press.digital));

      // Insert call button in center position (after B, before C)
      if (idx === 2) container.appendChild(callBtn);
      container.appendChild(btn);
    });
  }

  function _buildMenuList(container) {
    J.Menu.List.forEach(({ Visible, Press, Selected, Label }, idx) => {
      const item = document.createElement('button');
      item.className = 'controls-menu-list__item is-hidden';
      item.dataset.menuItem = idx;
      item.innerHTML = `
        <i class="fa-solid fa-check item-check"></i>
        <span class="item-label" id="ctrl-menu-label-${idx}"></span>
      `;
      item.addEventListener('pointerdown', () => Bridge.pulse(Press.digital));
      container.appendChild(item);
    });
  }

  // ── Subscribe to SIMPL signals ──────────────────────────────────────────────

  function _bindSignals() {
    const J = Joins.Controls;

    // Popup show/hide
    _subs.push(Bridge.onDigital(J.Popup.Visible.digital, v => {
      _popupEl.classList.toggle('is-visible', v);
      _scrimEl.classList.toggle('is-visible', v);
      document.getElementById('overlay-layer').style.pointerEvents = v ? 'auto' : 'none';
    }));

    // Close button
    document.getElementById('ctrl-close-btn')
      .addEventListener('pointerdown', () => Bridge.pulse(J.Popup.Close.digital));

    // Scrim tap also closes
    _scrimEl.addEventListener('pointerdown', () => Bridge.pulse(J.Popup.Close.digital));

    // Title
    _subs.push(Bridge.onSerial(J.Title.serial, v => {
      if (v) document.getElementById('ctrl-title').textContent = v;
    }));

    // Mode row visibility + label
    _subs.push(Bridge.onDigital(J.Mode.Visible.digital, v => {
      document.getElementById('ctrl-mode-row').classList.toggle('is-hidden', !v);
    }));
    _subs.push(Bridge.onSerial(J.Mode.Label.serial, v => {
      if (v) document.getElementById('ctrl-mode-label').textContent = v;
    }));
    document.getElementById('ctrl-mode-btn')
      .addEventListener('pointerdown', () => Bridge.pulse(J.Mode.Press.digital));

    // Menu button
    _subs.push(Bridge.onDigital(J.Menu.Visible.digital, v => {
      document.getElementById('ctrl-menu-btn').classList.toggle('is-hidden', !v);
    }));
    _subs.push(Bridge.onDigital(J.Menu.ListOpen.digital, v => {
      document.getElementById('ctrl-menu-list').classList.toggle('is-hidden', !v);
    }));
    document.getElementById('ctrl-menu-btn')
      .addEventListener('pointerdown', () => Bridge.pulse(J.Menu.Press.digital));

    // Menu list items
    J.Menu.List.forEach(({ Visible, Selected, Label }, idx) => {
      const item = document.querySelector(`[data-menu-item="${idx}"]`);
      _subs.push(Bridge.onDigital(Visible.digital, v  => item.classList.toggle('is-hidden', !v)));
      _subs.push(Bridge.onDigital(Selected.digital, v => item.classList.toggle('is-selected', v)));
      _subs.push(Bridge.onSerial(Label.serial, v => {
        if (v) document.getElementById(`ctrl-menu-label-${idx}`).textContent = v;
      }));
    });

    // D-Pad
    _subs.push(Bridge.onDigital(J.DPad.Visible.digital, v => {
      document.getElementById('ctrl-dpad').classList.toggle('is-hidden', !v);
    }));
    ['up','down','left','right'].forEach(dir => {
      const btn = document.querySelector(`[data-dpad="${dir}"]`);
      btn.addEventListener('pointerdown', () => Bridge.pulse(J.DPad[dir.charAt(0).toUpperCase() + dir.slice(1)].Press.digital));
    });

    // Zoom
    _subs.push(Bridge.onDigital(J.Zoom.Visible.digital, v => {
      document.getElementById('ctrl-zoom').classList.toggle('is-hidden', !v);
    }));
    document.getElementById('ctrl-zoom-in').addEventListener('pointerdown',  () => Bridge.pulse(J.Zoom.In.Press.digital));
    document.getElementById('ctrl-zoom-out').addEventListener('pointerdown', () => Bridge.pulse(J.Zoom.Out.Press.digital));

    // Sizing
    _subs.push(Bridge.onDigital(J.Sizing.Visible.digital, v => {
      document.getElementById('ctrl-sizing').classList.toggle('is-hidden', !v);
    }));
    document.getElementById('ctrl-expand').addEventListener('pointerdown',   () => Bridge.pulse(J.Sizing.Expand.Press.digital));
    document.getElementById('ctrl-contract').addEventListener('pointerdown', () => Bridge.pulse(J.Sizing.Contract.Press.digital));

    // Text display
    _subs.push(Bridge.onDigital(J.TextDisplay.Visible.digital, v => {
      document.getElementById('ctrl-text-display').classList.toggle('is-hidden', !v);
    }));
    _subs.push(Bridge.onSerial(J.TextDisplay.Content.serial, v => {
      if (v !== undefined) document.getElementById('ctrl-text-content').textContent = v;
    }));

    // DTMF keypad
    _subs.push(Bridge.onDigital(J.DTMF.Visible.digital, v => {
      document.getElementById('ctrl-dtmf').classList.toggle('is-hidden', !v);
    }));

    // Preset color buttons
    _subs.push(Bridge.onDigital(J.PresetBtns.Visible.digital, v => {
      document.getElementById('ctrl-preset-btns').classList.toggle('is-hidden', !v);
    }));
    J.PresetBtns.Slots.forEach(({ letter, Selected, Label }) => {
      const btn = document.querySelector(`[data-preset-letter="${letter}"]`);
      _subs.push(Bridge.onDigital(Selected.digital, v => btn.classList.toggle('is-selected', v)));
      _subs.push(Bridge.onSerial(Label.serial, v => {
        if (v) document.getElementById(`ctrl-prst-label-${letter}`).textContent = v;
      }));
    });

    // Call button
    _subs.push(Bridge.onDigital(J.Call.Visible.digital, v => {
      document.getElementById('ctrl-call-btn').classList.toggle('is-hidden', !v);
    }));
    _subs.push(Bridge.onDigital(J.Call.Active.digital, v => {
      document.getElementById('ctrl-call-btn').classList.toggle('is-active', v);
    }));

    // Nav prev/next
    const navPrev = document.getElementById('ctrl-nav-prev');
    const navNext = document.getElementById('ctrl-nav-next');
    _subs.push(Bridge.onDigital(J.Nav.Prev.Visible.digital, v => navPrev.classList.toggle('is-hidden', !v)));
    _subs.push(Bridge.onDigital(J.Nav.Next.Visible.digital, v => navNext.classList.toggle('is-hidden', !v)));
    _subs.push(Bridge.onSerial(J.Nav.Prev.Label.serial, v => { if (v) document.getElementById('ctrl-nav-prev-label').textContent = v; }));
    _subs.push(Bridge.onSerial(J.Nav.Next.Label.serial, v => { if (v) document.getElementById('ctrl-nav-next-label').textContent = v; }));
    navPrev.addEventListener('pointerdown', () => Bridge.pulse(J.Nav.Prev.Press.digital));
    navNext.addEventListener('pointerdown', () => Bridge.pulse(J.Nav.Next.Press.digital));
  }

  // ── Public ──────────────────────────────────────────────────────────────────

  function init(overlayLayer) {
    _scrimEl = document.createElement('div');
    _scrimEl.className = 'overlay-scrim';
    overlayLayer.appendChild(_scrimEl);

    _popupEl = _build();
    overlayLayer.appendChild(_popupEl);

    // Build dynamic sub-components
    _buildDTMF(document.getElementById('ctrl-dtmf'));
    _buildPresetBtns(document.getElementById('ctrl-preset-btns'));
    _buildMenuList(document.getElementById('ctrl-menu-list'));

    _bindSignals();
  }

  return { init };

})();
