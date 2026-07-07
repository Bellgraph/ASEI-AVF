/* =============================================================================
   JOINS.JS — Signal Join Map
   Single source of truth for every join number in the project.
   To renumber a join, change it here. Nothing else needs to change.

   Structure mirrors the SIMPL Windows Signal Naming Standard v1.0:
     Address  — what area of the system this belongs to
     Descriptor — what the signal represents
     Suffix   — .tx (to processor), .rx (from processor), .fb (feedback)

   Convention used here:
     { digital }  — boolean join (CrComLib type 'b')
     { analog }   — numeric join  (CrComLib type 'n')
     { serial }   — string join   (CrComLib type 's')

   DIGITAL BLOCK LAYOUT
   ─────────────────────────────────────────────────────────
     1   –  19  : System / global
    20   –  59  : Area Select (8 slots × 5 joins/slot = 40, + 4 footer)
    60   –  99  : Bottom Bar
   100   – 227  : Preset List (16 slots × 8 joins/slot = 128)
   230   – 249  : [reserved buffer]
   250   – 399  : Controls Popup
   400   – 499  : [reserved — routing page, future]

   ANALOG BLOCK LAYOUT
     1         : Volume level (0–65535)

   SERIAL BLOCK LAYOUT
     1  –   2  : System (time, date)
     3  –  18  : Area Select labels + icons (8 slots × 2 serials/slot)
    19         : Preset section title
    20  –  51  : Preset List (16 slots × 2 serials/slot)
    52         : [reserved buffer]
    53  –  90  : Controls Popup
    91  –  95  : Bottom bar icons
    96         : Volume % label
   ============================================================================= */

'use strict';

const Joins = Object.freeze({


  // ─── SYSTEM ─────────────────────────────────────────────────────────────────
  System: {
    Time: { serial: 1 },     // s1  Processor sends formatted time string  e.g. "10:42 AM"
    Date: { serial: 2 },     // s2  Processor sends formatted date string  e.g. "June 30 2026"
  },


  // ─── AREA SELECT ────────────────────────────────────────────────────────────
  // The dropdown that appears when the Area Label row is tapped.
  // Up to 8 selectable area/combine/divide rows, plus a partition-sensor footer.
  //
  // Slot stride: 5 digital joins per slot  (visible, selected.fb, press, controls.visible, controls.press)
  //              2 serial  joins per slot  (icon, label)
  AreaSelect: {
    Toggle:  { digital: 1 },    // d1  Press -> toggle dropdown open/close
    Open:    { digital: 2 },    // d2  Feedback: processor reports dropdown should be shown

    PartitionSensor: {
      Visible:  { digital: 3 },  // d3  Row visibility
      Enable:   { digital: 4 },  // d4  Toggle press (tx to processor)
      Feedback: { digital: 5 },  // d5  Toggle state feedback (rx from processor)
      Info:     { digital: 6 },  // d6  Info button press
    },

    // Slots[0..7]
    // Slots[n].Visible.digital  = 20 + n*5
    // Slots[n].Selected.digital = 21 + n*5
    // Slots[n].Press.digital    = 22 + n*5
    // Slots[n].CtrlVisible.digital = 23 + n*5
    // Slots[n].CtrlPress.digital   = 24 + n*5
    // Slots[n].Icon.serial  = 3 + n*2
    // Slots[n].Label.serial = 4 + n*2
    Slots: Array.from({ length: 8 }, (_, n) => ({
      Visible:    { digital: 20 + n * 5 },
      Selected:   { digital: 21 + n * 5 },  // feedback from processor
      Press:      { digital: 22 + n * 5 },  // tx to processor
      CtrlVisible:{ digital: 23 + n * 5 },  // controls button visible
      CtrlPress:  { digital: 24 + n * 5 },  // controls button press
      Icon:       { serial:   3 + n * 2 },
      Label:      { serial:   4 + n * 2 },
    })),
  },


  // ─── BOTTOM BAR ─────────────────────────────────────────────────────────────
  // Left group: up to 4 dynamic icon buttons (mic mute, phone mute, camera mute…)
  // Center: page-flip button
  // Right: volume mute, down, up (fixed 3)

  BottomBar: {
    // Left[0..3]: each has visible, active.fb, press, icon serial
    // Left[n].Visible.digital = 60 + n*3
    // Left[n].Active.digital  = 61 + n*3
    // Left[n].Press.digital   = 62 + n*3
    // Left[n].Icon.serial     = 91 + n
    Left: Array.from({ length: 4 }, (_, n) => ({
      Visible: { digital: 60 + n * 3 },
      Active:  { digital: 61 + n * 3 },  // feedback — lit when muted/active
      Press:   { digital: 62 + n * 3 },
      Icon:    { serial:  91 + n },       // FA class or icon identifier from SIMPL
    })),

    PageFlip: {
      Visible:   { digital: 72 },
      Press:     { digital: 73 },
      Direction: { digital: 74 },  // feedback: true = up chevron, false = down chevron
      Icon:      { serial:  95 },
    },

    Volume: {
      Mute: { Visible: { digital: 75 }, Active: { digital: 76 }, Press: { digital: 77 } },
      Down: { Visible: { digital: 78 }, Press:  { digital: 79 } },
      Up:   { Visible: { digital: 80 }, Press:  { digital: 81 } },
      Level:    { analog: 1 },     // a1  0–65535 from processor
      LevelPct: { serial: 96 },    // s96 formatted "0%" string from processor
    },
  },


  // ─── PRESET LIST ────────────────────────────────────────────────────────────
  // The centerpiece. 16 slots, each independently controlled by SIMPL.
  // Slot stride: 8 digital joins, 2 serial joins.
  //
  // Slots[n].Visible.digital        = 100 + n*8
  // Slots[n].Press.digital          = 101 + n*8  (select this preset)
  // Slots[n].Selected.digital       = 102 + n*8  (feedback: this preset is active)
  // Slots[n].Stop.Visible.digital   = 103 + n*8
  // Slots[n].Stop.Press.digital     = 104 + n*8
  // Slots[n].Controls.Visible.digital = 105 + n*8
  // Slots[n].Controls.Press.digital   = 106 + n*8
  // Slots[n].[d107] reserved / buffer
  // Slots[n].Icon.serial  = 20 + n*2
  // Slots[n].Label.serial = 21 + n*2

  Presets: {
    SectionTitle: { serial: 19 },  // s19  "Present a Source" — dynamic from SIMPL

    Slots: Array.from({ length: 16 }, (_, n) => ({
      Visible:  { digital: 100 + n * 8 },
      Press:    { digital: 101 + n * 8 },
      Selected: { digital: 102 + n * 8 },
      Stop: {
        Visible: { digital: 103 + n * 8 },
        Press:   { digital: 104 + n * 8 },
      },
      Controls: {
        Visible: { digital: 105 + n * 8 },
        Press:   { digital: 106 + n * 8 },
      },
      Icon:  { serial: 20 + n * 2 },
      Label: { serial: 21 + n * 2 },
    })),
  },


  // ─── CONTROLS POPUP ─────────────────────────────────────────────────────────
  // One popup. All buttons always in the DOM. SIMPL drives visibility per button/group.
  // Context is set entirely by SIMPL before it sets Popup.Visible = 1.
  // This same popup is reused for presets AND routing page inputs/outputs.
  //
  // Base digital: 250
  // Base serial:  53

  Controls: {
    Popup: {
      Visible: { digital: 250 },  // SIMPL sets this to show/hide the popup
      Close:   { digital: 251 },  // Close button press (tx)
    },

    Title:  { serial: 53 },     // s53  "[Control Type]" label

    Menu: {
      Visible: { digital: 252 },   // hamburger button visible
      Press:   { digital: 253 },   // hamburger button press (opens list overlay)
      ListOpen:{ digital: 254 },   // feedback: list overlay is shown

      // Up to 6 items in the menu list overlay
      // List[n].Visible.digital  = 255 + n*3
      // List[n].Press.digital    = 256 + n*3
      // List[n].Selected.digital = 257 + n*3
      // List[n].Label.serial     = 54 + n
      List: Array.from({ length: 6 }, (_, n) => ({
        Visible:  { digital: 255 + n * 3 },
        Press:    { digital: 256 + n * 3 },
        Selected: { digital: 257 + n * 3 },
        Label:    { serial:  54 + n },
      })),
    },

    Mode: {
      Visible:  { digital: 275 },   // entire mode row visible
      Label:    { serial:  60 },    // s60  "Manual" / "Auto" etc.
      Press:    { digital: 276 },   // mode dropdown press (tx)
    },

    // D-Pad: each direction has individual visibility and press
    DPad: {
      Visible: { digital: 277 },   // entire dpad group visible
      Up:    { Press: { digital: 278 } },
      Down:  { Press: { digital: 279 } },
      Left:  { Press: { digital: 280 } },
      Right: { Press: { digital: 281 } },
    },

    Zoom: {
      Visible: { digital: 282 },   // zoom button group visible
      In:  { Press: { digital: 283 } },
      Out: { Press: { digital: 284 } },
    },

    Sizing: {
      Visible:  { digital: 285 },  // right-side sizing group visible
      Expand:   { Press: { digital: 286 } },
      Contract: { Press: { digital: 287 } },
    },

    TextDisplay: {
      Visible: { digital: 288 },
      Content: { serial:  61 },    // s61  text to display
    },

    DTMF: {
      Visible: { digital: 289 },   // entire keypad visible
      // Keys indexed: 1-9 = keys[0..8], * = keys[9], 0 = keys[10], # = keys[11]
      // Keys[n].Press.digital = 290 + n
      Keys: ['1','2','3','4','5','6','7','8','9','*','0','#'].map((key, n) => ({
        key,
        Press: { digital: 290 + n },
      })),
    },

    // Preset color buttons A, B, C, D
    PresetBtns: {
      Visible: { digital: 303 },   // row visible
      // Slots[n].Press.digital    = 304 + n
      // Slots[n].Selected.digital = 308 + n
      // Slots[n].Label.serial     = 62 + n
      Slots: ['A','B','C','D'].map((letter, n) => ({
        letter,
        Press:    { digital: 304 + n },
        Selected: { digital: 308 + n },
        Label:    { serial:  62 + n },
      })),
    },

    Call: {
      Visible: { digital: 312 },
      Press:   { digital: 313 },
      Active:  { digital: 314 },   // feedback: call in progress (turns red)
    },

    // Footer navigation prev/next
    Nav: {
      Prev: { Visible: { digital: 315 }, Press: { digital: 316 }, Label: { serial: 66 } },
      Next: { Visible: { digital: 317 }, Press: { digital: 318 }, Label: { serial: 67 } },
    },
  },


  // ─── RESERVED — ROUTING PAGE ────────────────────────────────────────────────
  // Placeholder block for the routing matrix page (future section).
  // Controls popup is reused here — no additional popup joins needed.
  // Routing: { ... }  — digital 400+, serial 100+

});
