/* =============================================================================
   UI/AREA-SELECT.JS — Area Selection Dropdown Component
   The dropdown that appears under the Area Label row.
   Up to 8 area slots + partition sensor footer.
   ============================================================================= */

'use strict';

const AreaSelectUI = (() => {

  const J = Joins.AreaSelect;
  const _subs = [];

  function init(dropdownEl) {
    // Build area slot items
    const listEl = dropdownEl.querySelector('.area-dropdown__list');

    J.Slots.forEach(({ Visible, Selected, Press, CtrlVisible, CtrlPress, Icon, Label }, idx) => {
      const item = document.createElement('button');
      item.className = 'area-dropdown__item is-hidden';
      item.dataset.areaSlot = idx;
      item.innerHTML = `
        <span class="area-item__icon"><i id="area-icon-${idx}" class="fa-solid fa-door-open"></i></span>
        <span class="area-item__label" id="area-label-${idx}">Area ${idx + 1}</span>
      `;
      item.addEventListener('pointerdown', () => Bridge.pulse(Press.digital));
      listEl.appendChild(item);

      _subs.push(Bridge.onDigital(Visible.digital,  v => item.classList.toggle('is-hidden', !v)));
      _subs.push(Bridge.onDigital(Selected.digital, v => item.classList.toggle('is-selected', v)));
      _subs.push(Bridge.onSerial(Icon.serial,  v => { if (v) document.getElementById(`area-icon-${idx}`).className = v; }));
      _subs.push(Bridge.onSerial(Label.serial, v => { if (v) document.getElementById(`area-label-${idx}`).textContent = v; }));
    });

    // Partition sensor footer
    const footer = dropdownEl.querySelector('.area-dropdown__footer');

    _subs.push(Bridge.onDigital(J.PartitionSensor.Visible.digital, v => {
      footer.classList.toggle('is-hidden', !v);
    }));

    const toggle = footer.querySelector('.toggle-switch input');
    toggle.addEventListener('change', () => {
      Bridge.sendDigital(J.PartitionSensor.Enable.digital, toggle.checked);
    });
    _subs.push(Bridge.onDigital(J.PartitionSensor.Feedback.digital, v => {
      toggle.checked = v;
    }));

    footer.querySelector('.info-btn')
      .addEventListener('pointerdown', () => Bridge.pulse(J.PartitionSensor.Info.digital));

    // Area toggle button (in header)
    const toggleBtn = document.getElementById('area-toggle-btn');
    toggleBtn.addEventListener('pointerdown', () => Bridge.pulse(J.Toggle.digital));

    _subs.push(Bridge.onDigital(J.Open.digital, v => {
      dropdownEl.classList.toggle('is-visible', v);
      toggleBtn.classList.toggle('is-open', v);
    }));

    // Area label text (above dropdown in header)
    // Uses the first Selected slot to drive the header label,
    // but SIMPL may also just push the formatted label as a serial
    // to a dedicated serial join — handled in main.js header bindings.
  }

  return { init };

})();


/* =============================================================================
   UI/VOLUME.JS — Volume Widget Component
   Floats above the footer when any volume button is pressed.
   A debounced timer hides it after inactivity.
   ============================================================================= */

const VolumeUI = (() => {

  const J = Joins.BottomBar.Volume;
  const _subs = [];

  let _hideTimer = null;
  let _widgetEl  = null;
  let _fillEl    = null;
  let _pctEl     = null;

  // How long after the last button press before the bar disappears (ms).
  // Adjust in one place here — no need to touch the HTML.
  const HIDE_DELAY_MS = 4000;

  function _showWidget() {
    _widgetEl.classList.add('is-visible');
    _resetTimer();
  }

  function _resetTimer() {
    clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
      _widgetEl.classList.remove('is-visible');
    }, HIDE_DELAY_MS);
  }

  function init(footerEl) {
    // Widget lives in the overlay layer so it floats above the footer
    _widgetEl = document.getElementById('volume-widget');
    _fillEl   = _widgetEl.querySelector('.volume-bar-fill');
    _pctEl    = _widgetEl.querySelector('.volume-pct-label');

    // Analog level from processor (0–65535)
    _subs.push(Bridge.onAnalog(J.Level.analog, v => {
      const pct = Math.round((v / 65535) * 100);
      _fillEl.style.width = `${pct}%`;
    }));

    // Formatted percent string from processor ("42%")
    _subs.push(Bridge.onSerial(J.LevelPct.serial, v => {
      if (v !== undefined) _pctEl.textContent = v;
    }));

    // Wire footer volume buttons — press shows widget, debounce extends it
    const muteBtn = footerEl.querySelector('[data-vol="mute"]');
    const downBtn = footerEl.querySelector('[data-vol="down"]');
    const upBtn   = footerEl.querySelector('[data-vol="up"]');

    muteBtn?.addEventListener('pointerdown', () => {
      Bridge.pulse(J.Mute.Press.digital);
      _showWidget();
    });
    downBtn?.addEventListener('pointerdown', () => {
      Bridge.pulse(J.Down.Press.digital);
      _showWidget();
    });
    upBtn?.addEventListener('pointerdown', () => {
      Bridge.pulse(J.Up.Press.digital);
      _showWidget();
    });

    // Visibility of each volume button from SIMPL
    _subs.push(Bridge.onDigital(J.Mute.Visible.digital, v => muteBtn?.classList.toggle('is-hidden', !v)));
    _subs.push(Bridge.onDigital(J.Down.Visible.digital, v => downBtn?.classList.toggle('is-hidden', !v)));
    _subs.push(Bridge.onDigital(J.Up.Visible.digital,   v => upBtn?.classList.toggle('is-hidden', !v)));

    // Mute active state feedback (lights up icon)
    _subs.push(Bridge.onDigital(J.Mute.Active.digital,  v => muteBtn?.classList.toggle('is-active', v)));
  }

  return { init };

})();
