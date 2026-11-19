/**
 * app.js
 * ------------------------------------------------------------
 * Main controller: renders the menus, records interactions,
 * trains the model and runs the adapter.
 * ------------------------------------------------------------
 */
(function () {
  "use strict";

  /** The tools offered by the dashboard. */
  const TOOLS = [
    { id: "email",    name: "Email",     body: "Your inbox has 4 unread messages." },
    { id: "calendar", name: "Calendar",  body: "Next meeting: Design review at 2:00 PM." },
    { id: "notes",    name: "Notes",     body: "Draft: adaptive UI research notes." },
    { id: "reports",  name: "Reports",   body: "Quarterly report is 80% complete." },
    { id: "tasks",    name: "Tasks",     body: "3 tasks are due today." },
    { id: "files",    name: "Files",     body: "Recent: prototype.fig, survey.csv." },
  ];
  const STORAGE_KEY = "adaptidash.v1";

  const model = new NextActionModel(TOOLS.map((t) => t.id));
  let previousTool = null;

  // Cached DOM references
  const $ = (id) => document.getElementById(id);
  const staticMenu = $("static-menu");
  const adaptiveMenu = $("adaptive-menu");
  const explanations = $("explanations");

  /** Loads saved state. Corrupt data falls back to a fresh start. */
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        model.load(saved.model);
        Adapter.fontScale = saved.fontScale || 1;
        Adapter.applyScale();
      }
    } catch (err) {
      console.warn("Saved state could not be read; starting fresh.", err);
    }
  }

  /** Saves the model and the scale to localStorage. */
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        model: model.toJSON(),
        fontScale: Adapter.fontScale,
      }));
    } catch (err) {
      console.warn("Unable to save state.", err);
    }
  }

  /** Creates one menu button for a tool. */
  function makeButton(tool) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = tool.name;
    btn.dataset.tool = tool.id;
    btn.addEventListener("click", () => openTool(tool));
    li.appendChild(btn);
    return li;
  }

  /** Adds a plain-language explanation of a UI change (newest first). */
  function explain(message) {
    const li = document.createElement("li");
    li.textContent = message;
    explanations.prepend(li);
    while (explanations.children.length > 5) explanations.lastChild.remove();
  }

  /** Draws the static menu once; it never changes after this. */
  function renderStaticMenu() {
    TOOLS.forEach((t) => staticMenu.appendChild(makeButton(t)));
  }

  /** Redraws the adaptive partition from the latest predictions. */
  function renderAdaptiveMenu() {
    adaptiveMenu.innerHTML = "";
    if (!$("toggle-adapt").checked) return;

    const time = NextActionModel.timeBucket(new Date().getHours());
    const ranked = model.predict(previousTool, time);
    const picks = Adapter.selectSuggestions(ranked, model.total);

    if (picks.length === 0) {
      const li = document.createElement("li");
      li.textContent = model.total < Adapter.MIN_TRAINING_EVENTS
        ? "Learning your habits…"
        : "No confident suggestions yet.";
      adaptiveMenu.appendChild(li);
      return;
    }
    picks.forEach((id) => {
      const tool = TOOLS.find((t) => t.id === id);
      const pct = Math.round(ranked.find((r) => r.label === id).prob * 100);
      const li = makeButton(tool);
      li.firstChild.setAttribute("aria-label", `${tool.name}, suggested, ${pct} percent likely`);
      adaptiveMenu.appendChild(li);
    });
  }

  /** Opens a tool, trains the model and re-adapts the UI. */
  function openTool(tool) {
    $("workspace-title").textContent = tool.name;
    $("workspace-body").textContent = tool.body;

    const time = NextActionModel.timeBucket(new Date().getHours());
    model.train(previousTool, time, tool.id);
    if (previousTool) {
      explain(`Learned: after ${previousTool} you often open ${tool.id} in the ${time}.`);
    }
    previousTool = tool.id;

    renderAdaptiveMenu();
    saveState();
  }

  /** Detects clicks that miss every interactive element. */
  function handleGlobalClick(e) {
    if (!$("toggle-access").checked) return;
    if (e.target.closest("button, a, input, label")) {
      Adapter.registerHit();
      return;
    }
    if (Adapter.registerMiss()) {
      explain(`Several missed clicks detected, so buttons were enlarged to ${Math.round(Adapter.fontScale * 100)}%.`);
      saveState();
    }
  }

  /** Shows environment suggestions one at a time. */
  function showSuggestions(queue) {
    const banner = $("suggestion");
    if (queue.length === 0) { banner.classList.add("hidden"); return; }
    const [current, ...rest] = queue;
    $("suggestion-text").textContent = current.text;
    banner.classList.remove("hidden");
    $("suggestion-accept").onclick = () => {
      current.apply();
      explain(`Applied at your request: ${current.id} preference.`);
      showSuggestions(rest);
    };
    $("suggestion-dismiss").onclick = () => showSuggestions(rest);
  }

  /** Sets up the user controls (the user can always override adaptation). */
  function bindControls() {
    $("toggle-adapt").addEventListener("change", renderAdaptiveMenu);
    $("reset").addEventListener("click", () => {
      model.reset();
      previousTool = null;
      Adapter.fontScale = 1;
      Adapter.applyScale();
      localStorage.removeItem(STORAGE_KEY);
      explain("All learned behavior was reset.");
      renderAdaptiveMenu();
    });
    document.addEventListener("click", handleGlobalClick);
  }

  // ---- Bootstrap ----
  document.addEventListener("DOMContentLoaded", () => {
    loadState();
    renderStaticMenu();
    bindControls();
    renderAdaptiveMenu();
    showSuggestions(Adapter.environmentSuggestions());
  });
})();
