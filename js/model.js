/**
 * model.js
 * ------------------------------------------------------------
 * A small Naive Bayes classifier that learns as it goes and
 * predicts which tool the user will pick next.
 *
 * Features: (1) the tool used just before, (2) the time-of-day bucket.
 * Label:    the tool the user picked next.
 *
 * Laplace (add-one) smoothing stops unseen combinations from
 * getting a probability of zero (Manning et al., 2008).
 * ------------------------------------------------------------
 */
class NextActionModel {
  /**
   * @param {string[]} labels - every tool ID the model can predict
   */
  constructor(labels) {
    this.labels = labels;
    this.reset();
  }

  /** Clears all learned counts. */
  reset() {
    this.labelCounts = {};      // count(label)
    this.prevCounts = {};       // count(prev | label)
    this.timeCounts = {};       // count(timeBucket | label)
    this.total = 0;
    this.labels.forEach((l) => {
      this.labelCounts[l] = 0;
      this.prevCounts[l] = {};
      this.timeCounts[l] = {};
    });
  }

  /**
   * Turns an hour (0–23) into a coarse bucket so the model
   * spots daily patterns without needing much data.
   * @param {number} hour
   * @returns {string}
   */
  static timeBucket(hour) {
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  }

  /**
   * Updates the counts with one observed event (learning as it goes).
   * @param {string|null} prev  - previous tool, or null at session start
   * @param {string} time       - time bucket
   * @param {string} label      - the tool actually chosen
   */
  train(prev, time, label) {
    const p = prev || "START";
    this.labelCounts[label] += 1;
    this.prevCounts[label][p] = (this.prevCounts[label][p] || 0) + 1;
    this.timeCounts[label][time] = (this.timeCounts[label][time] || 0) + 1;
    this.total += 1;
  }

  /**
   * Returns every label ranked by posterior probability.
   * Uses log-space to avoid floating-point underflow.
   * @returns {{label: string, prob: number}[]}
   */
  predict(prev, time) {
    const p = prev || "START";
    const k = this.labels.length;
    const VOCAB_PREV = k + 1;   // all tools + "START"
    const VOCAB_TIME = 3;       // morning/afternoon/evening

    const logScores = this.labels.map((l) => {
      const n = this.labelCounts[l];
      const prior = Math.log((n + 1) / (this.total + k));
      const likePrev = Math.log(((this.prevCounts[l][p] || 0) + 1) / (n + VOCAB_PREV));
      const likeTime = Math.log(((this.timeCounts[l][time] || 0) + 1) / (n + VOCAB_TIME));
      return { label: l, log: prior + likePrev + likeTime };
    });

    // Softmax-style normalization back to probabilities
    const max = Math.max(...logScores.map((s) => s.log));
    const exps = logScores.map((s) => ({ label: s.label, e: Math.exp(s.log - max) }));
    const sum = exps.reduce((a, s) => a + s.e, 0);

    return exps
      .map((s) => ({ label: s.label, prob: s.e / sum }))
      .sort((a, b) => b.prob - a.prob);
  }

  /** Converts the model state to JSON so it can be saved to localStorage. */
  toJSON() {
    return {
      labelCounts: this.labelCounts,
      prevCounts: this.prevCounts,
      timeCounts: this.timeCounts,
      total: this.total,
    };
  }

  /** Restores saved state. Bad or missing data is ignored safely. */
  load(state) {
    if (!state || typeof state.total !== "number") return;
    Object.assign(this, state);
  }
}
