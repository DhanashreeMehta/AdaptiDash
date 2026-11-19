/**
 * app.js (static baseline)
 * ------------------------------------------------------------
 * Non-adaptive version of AdaptiDash. It shows a fixed menu
 * and opens tools. It does not learn, predict, or change the UI.
 * Later commits build the adaptive features on top of this.
 * ------------------------------------------------------------
 */
(function () {
  "use strict";

  /** The tools offered by the dashboard. */
  const TOOLS = [
    { id: "email",    name: "Email",    body: "Your inbox has 4 unread messages." },
    { id: "calendar", name: "Calendar", body: "Next meeting: Design review at 2:00 PM." },
    { id: "notes",    name: "Notes",    body: "Draft: adaptive UI research notes." },
    { id: "reports",  name: "Reports",  body: "Quarterly report is 80% complete." },
    { id: "tasks",    name: "Tasks",    body: "3 tasks are due today." },
    { id: "files",    name: "Files",    body: "Recent: prototype.fig, survey.csv." },
  ];

  const $ = (id) => document.getElementById(id);

  /** Shows the selected tool in the workspace. */
  function openTool(tool) {
    $("workspace-title").textContent = tool.name;
    $("workspace-body").textContent = tool.body;
  }

  /** Draws the fixed menu, which looks the same for every user. */
  function renderMenu() {
    const menu = $("static-menu");
    TOOLS.forEach((tool) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = tool.name;
      btn.addEventListener("click", () => openTool(tool));
      li.appendChild(btn);
      menu.appendChild(li);
    });
  }

  document.addEventListener("DOMContentLoaded", renderMenu);
})();
