/**
 * tabs.js — Tab switching for code examples and content panels
 * No dependencies. Auto-initialises all .tabs-container elements.
 */
(function () {
  'use strict';

  /**
   * Initialise a single tabs container.
   * Expected structure:
   *   <div class="tabs-container" data-tabs-id="my-tabs">
   *     <div class="tabs-header">
   *       <button class="tab-btn active" data-tab="tab1">Tab 1</button>
   *       <button class="tab-btn" data-tab="tab2">Tab 2</button>
   *     </div>
   *     <div class="tab-panel active" data-tab="tab1">…content…</div>
   *     <div class="tab-panel" data-tab="tab2">…content…</div>
   *   </div>
   */
  function initTabsContainer(container) {
    const buttons = container.querySelectorAll('.tab-btn');
    const panels = container.querySelectorAll('.tab-panel');

    if (!buttons.length || !panels.length) return;

    // Build a map: tabId → { btn, panel }
    var tabMap = {};

    buttons.forEach(function (btn) {
      var tabId = btn.getAttribute('data-tab');
      if (!tabId) return;
      if (!tabMap[tabId]) tabMap[tabId] = {};
      tabMap[tabId].btn = btn;
    });

    panels.forEach(function (panel) {
      var tabId = panel.getAttribute('data-tab');
      if (!tabId) return;
      if (!tabMap[tabId]) tabMap[tabId] = {};
      tabMap[tabId].panel = panel;
    });

    function activateTab(tabId) {
      // Deactivate all
      buttons.forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
      panels.forEach(function (p) { p.classList.remove('active'); p.hidden = true; });

      // Activate target
      var entry = tabMap[tabId];
      if (!entry) return;
      if (entry.btn) {
        entry.btn.classList.add('active');
        entry.btn.setAttribute('aria-selected', 'true');
      }
      if (entry.panel) {
        entry.panel.classList.add('active');
        entry.panel.hidden = false;
      }

      // Persist to sessionStorage keyed by container id
      var containerId = container.getAttribute('data-tabs-id') || container.id;
      if (containerId) {
        try { sessionStorage.setItem('tab:' + containerId, tabId); } catch (e) { /* ignore */ }
      }
    }

    // Attach click handlers
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tabId = btn.getAttribute('data-tab');
        if (tabId) activateTab(tabId);
      });

      // Keyboard navigation (arrow keys)
      btn.addEventListener('keydown', function (e) {
        var allBtns = Array.from(buttons);
        var currentIndex = allBtns.indexOf(btn);
        var targetIndex = -1;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          targetIndex = (currentIndex + 1) % allBtns.length;
          e.preventDefault();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          targetIndex = (currentIndex - 1 + allBtns.length) % allBtns.length;
          e.preventDefault();
        } else if (e.key === 'Home') {
          targetIndex = 0;
          e.preventDefault();
        } else if (e.key === 'End') {
          targetIndex = allBtns.length - 1;
          e.preventDefault();
        }

        if (targetIndex >= 0) {
          allBtns[targetIndex].focus();
          var tabId = allBtns[targetIndex].getAttribute('data-tab');
          if (tabId) activateTab(tabId);
        }
      });
    });

    // Restore persisted tab
    var containerId = container.getAttribute('data-tabs-id') || container.id;
    var restoredTab = null;
    if (containerId) {
      try { restoredTab = sessionStorage.getItem('tab:' + containerId); } catch (e) { /* ignore */ }
    }

    if (restoredTab && tabMap[restoredTab]) {
      activateTab(restoredTab);
    } else {
      // Activate the first tab marked active, or the first tab overall
      var initialActive = container.querySelector('.tab-btn.active');
      var initialTabId = initialActive
        ? initialActive.getAttribute('data-tab')
        : (buttons[0] ? buttons[0].getAttribute('data-tab') : null);

      if (initialTabId) {
        // Ensure panels are hidden first, then activate
        panels.forEach(function (p) { p.hidden = true; p.classList.remove('active'); });
        buttons.forEach(function (b) { b.classList.remove('active'); });
        activateTab(initialTabId);
      }
    }
  }

  // ── Init all tabs containers ───────────────────────────────
  function initAllTabs() {
    document.querySelectorAll('.tabs-container').forEach(initTabsContainer);
  }

  // ── Watch for dynamically added tabs ──────────────────────
  function observeDynamicTabs() {
    if (!window.MutationObserver) return;

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.classList && node.classList.contains('tabs-container')) {
            initTabsContainer(node);
          }
          // Also check descendants
          node.querySelectorAll && node.querySelectorAll('.tabs-container').forEach(initTabsContainer);
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    initAllTabs();
    observeDynamicTabs();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ── Public API ────────────────────────────────────────────
  window.AnalytixTabs = {
    init: initAllTabs,
    initContainer: initTabsContainer,
  };
})();
