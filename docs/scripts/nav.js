/**
 * nav.js — Mobile nav toggle + active section highlighting
 * No dependencies. Runs on DOMContentLoaded.
 */
(function () {
  'use strict';

  // ── Mobile hamburger toggle ────────────────────────────────
  function initHamburger() {
    const hamburger = document.querySelector('.header-hamburger');
    const nav = document.querySelector('.header-nav');
    const sidebar = document.querySelector('.sidebar');

    if (!hamburger) return;

    hamburger.addEventListener('click', function () {
      const isOpen = hamburger.classList.toggle('open');
      if (nav) nav.classList.toggle('open', isOpen);

      // Also open sidebar on mobile if present
      if (sidebar && window.innerWidth <= 768) {
        sidebar.classList.toggle('open', isOpen);
      }

      hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Close nav when clicking outside
    document.addEventListener('click', function (e) {
      if (
        hamburger.classList.contains('open') &&
        !hamburger.contains(e.target) &&
        (!nav || !nav.contains(e.target)) &&
        (!sidebar || !sidebar.contains(e.target))
      ) {
        hamburger.classList.remove('open');
        if (nav) nav.classList.remove('open');
        if (sidebar) sidebar.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on resize past mobile breakpoint
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) {
        hamburger.classList.remove('open');
        if (nav) nav.classList.remove('open');
        if (sidebar) sidebar.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Active header nav link ─────────────────────────────────
  function initActiveHeaderLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.header-nav-link');

    links.forEach(function (link) {
      const href = link.getAttribute('href') || '';
      const linkFile = href.split('/').pop();
      if (
        linkFile === currentPath ||
        (currentPath === '' && linkFile === 'index.html') ||
        (currentPath === 'index.html' && linkFile === '')
      ) {
        link.classList.add('active');
      }
    });
  }

  // ── Active sidebar link ────────────────────────────────────
  function initActiveSidebarLink() {
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.sidebar-link');

    links.forEach(function (link) {
      const href = link.getAttribute('href') || '';
      const linkFile = href.split('/').pop().split('#')[0] || 'index.html';
      if (linkFile === currentPath) {
        link.classList.add('active');
      }
    });
  }

  // ── Intersection Observer — active section in on-page nav ──
  function initActiveSectionHighlight() {
    const onPageLinks = document.querySelectorAll('.on-page-nav-link');
    if (!onPageLinks.length) return;

    const sectionIds = Array.from(onPageLinks)
      .map(function (link) {
        return link.getAttribute('href').replace('#', '');
      })
      .filter(Boolean);

    const sections = sectionIds
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if (!sections.length) return;

    let currentActive = null;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            const link = document.querySelector('.on-page-nav-link[href="#' + id + '"]');
            if (link && link !== currentActive) {
              if (currentActive) currentActive.classList.remove('active');
              link.classList.add('active');
              currentActive = link;
            }
          }
        });
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0
      }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  // ── Sidebar sub-section highlight based on hash ────────────
  function initHashHighlight() {
    function updateHashLinks() {
      const hash = window.location.hash;
      if (!hash) return;
      document.querySelectorAll('.sidebar-sub-link').forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === hash);
      });
    }

    updateHashLinks();
    window.addEventListener('hashchange', updateHashLinks);
  }

  // ── Smooth scroll for anchor links ────────────────────────
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const headerHeight = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '64',
        10
      );

      const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
      window.scrollTo({ top, behavior: 'smooth' });

      // Update URL without scroll jump
      history.pushState(null, '', href);
    });
  }

  // ── Copy code buttons ─────────────────────────────────────
  function initCopyButtons() {
    document.querySelectorAll('.code-copy-btn, .install-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        // Find the associated code block
        const wrapper = btn.closest('.code-block-wrapper, .install-block');
        const code = wrapper ? wrapper.querySelector('pre, code') : null;
        if (!code) return;

        const text = code.innerText || code.textContent || '';

        navigator.clipboard.writeText(text.trim()).then(function () {
          const original = btn.textContent;
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove('copied');
          }, 2000);
        }).catch(function () {
          // Fallback for older browsers
          const textarea = document.createElement('textarea');
          textarea.value = text.trim();
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);

          const original = btn.textContent;
          btn.textContent = 'Copied!';
          btn.classList.add('copied');
          setTimeout(function () {
            btn.textContent = original;
            btn.classList.remove('copied');
          }, 2000);
        });
      });
    });
  }

  // ── Animate elements on scroll ────────────────────────────
  function initScrollAnimations() {
    const animatables = document.querySelectorAll(
      '.feature-card, .example-card, .step, .arch-box'
    );
    if (!animatables.length) return;

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry, i) {
          if (entry.isIntersecting) {
            setTimeout(function () {
              entry.target.classList.add('animate-fade-in');
            }, i * 60);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    animatables.forEach(function (el) {
      el.style.opacity = '0';
      observer.observe(el);
    });
  }

  // ── Init all ──────────────────────────────────────────────
  function init() {
    initHamburger();
    initActiveHeaderLink();
    initActiveSidebarLink();
    initActiveSectionHighlight();
    initHashHighlight();
    initSmoothScroll();
    initCopyButtons();
    initScrollAnimations();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
