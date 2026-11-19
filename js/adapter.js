/**
 * adapter.js
 * ------------------------------------------------------------
 * Turns model output and interaction signals into UI changes.
 * Design principles applied:
 *  - Split menus: adaptive items are copied into a separate
 *    area, and the static list never moves (Sears & Shneiderman,
 *    1994; Findlater & McGrenere, 2004).
 *  - Every change is explained to the user (Amershi et al., 2019).
 *  - Changes only happen when the model is confident (Gajos et al., 2008).
 * ------------------------------------------------------------
 */
const Adapter = {
  CONFIDENCE_THRESHOLD: 0.25, // minimum probability before promoting a tool
  MIN_TRAINING_EVENTS: 5,     // cold-start guard
  MAX_SUGGESTED: 3,
  MISS_LIMIT: 3,              // missed clicks before enlarging targets
  MAX_SCALE: 1.5,

  missCount: 0,
  fontScale: 1,

  /**
   * Chooses which tools to show in the adaptive partition.
   * @param {{label:string, prob:number}[]} ranked
   * @param {number} trainingEvents
   * @returns {string[]} tool IDs to promote
   */
  selectSuggestions(ranked, trainingEvents) {
    if (trainingEvents < this.MIN_TRAINING_EVENTS) return [];
    return ranked
      .filter((r) => r.prob >= this.CONFIDENCE_THRESHOLD)
      .slice(0, this.MAX_SUGGESTED)
      .map((r) => r.label);
  },

  /**
   * Records a click that hit no button. Repeated misses
   * suggest motor or visual difficulty (Wobbrock et al., 2011).
   * @returns {boolean} true if targets were enlarged
   */
  registerMiss() {
    this.missCount += 1;
    if (this.missCount >= this.MISS_LIMIT && this.fontScale < this.MAX_SCALE) {
      this.missCount = 0;
      this.fontScale = Math.min(this.MAX_SCALE, +(this.fontScale + 0.15).toFixed(2));
      this.applyScale();
      return true;
    }
    return false;
  },

  /** A successful click slowly lowers the miss count. */
  registerHit() {
    this.missCount = Math.max(0, this.missCount - 1);
  },

  /** Writes the scale to CSS custom properties. */
  applyScale() {
    const root = document.documentElement.style;
    root.setProperty("--font-scale", this.fontScale);
    root.setProperty("--target-min", `${Math.round(44 * this.fontScale)}px`);
  },

  /**
   * Reads operating-system preferences (MDN Web Docs, n.d.) and
   * returns suggestions. They are offered, never forced.
   * @returns {{id:string, text:string, apply:Function}[]}
   */
  environmentSuggestions() {
    const out = [];
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      out.push({
        id: "dark",
        text: "Your device uses dark mode. Switch AdaptiDash to a dark theme?",
        apply: () => document.body.classList.add("theme-dark"),
      });
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      out.push({
        id: "motion",
        text: "Your device prefers reduced motion. Turn off animations?",
        apply: () => document.body.classList.add("reduce-motion"),
      });
    }
    return out;
  },
};
