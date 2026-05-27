// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * CollaborativeDashboard
 *
 * Adds sharing + commenting to any dashboard.
 *
 * Sharing:   Serialises dashboard state (filters, active tab, etc.) into the
 *            URL hash so a link can be copied and shared. No backend required.
 *
 * Comments:  Thread stored in localStorage (keyed by dashboardId) so comments
 *            survive page refresh. In a real deployment replace the
 *            localStorage adapter with a server-side API call.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardComment {
  id:        string;
  author:    string;
  text:      string;
  createdAt: string; // ISO-8601
  resolved:  boolean;
}

export interface CollaborativeDashboardProps {
  /** Stable identifier for this dashboard (used as localStorage key). */
  dashboardId: string;
  /**
   * Arbitrary state to encode into the share URL.
   * Pass whatever describes the current dashboard view.
   */
  sharePayload?: Record<string, unknown>;
  /**
   * Called when the URL hash contains a `sharePayload` on mount.
   * Use this to restore the dashboard to the shared state.
   */
  onRestorePayload?: (payload: Record<string, unknown>) => void;
  children?: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function encodePayload(payload: Record<string, unknown>): string {
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

function decodePayload(encoded: string): Record<string, unknown> | null {
  try {
    return JSON.parse(decodeURIComponent(atob(encoded))) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const HASH_KEY = 'analytix_share';

function buildShareUrl(payload: Record<string, unknown>): string {
  const url   = new URL(window.location.href);
  const hash  = new URLSearchParams(url.hash.replace(/^#/, ''));
  hash.set(HASH_KEY, encodePayload(payload));
  url.hash = hash.toString();
  return url.toString();
}

function readSharePayloadFromHash(): Record<string, unknown> | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const enc  = hash.get(HASH_KEY);
  return enc ? decodePayload(enc) : null;
}

function storageKey(dashboardId: string) {
  return `analytix_comments_${dashboardId}`;
}

function loadComments(dashboardId: string): DashboardComment[] {
  try {
    const raw = localStorage.getItem(storageKey(dashboardId));
    return raw ? (JSON.parse(raw) as DashboardComment[]) : [];
  } catch {
    return [];
  }
}

function saveComments(dashboardId: string, comments: DashboardComment[]) {
  try {
    localStorage.setItem(storageKey(dashboardId), JSON.stringify(comments));
  } catch { /* storage quota */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CollaborativeDashboard({
  dashboardId,
  sharePayload,
  onRestorePayload,
  children,
}: CollaborativeDashboardProps) {
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [shareUrl,   setShareUrl]   = useState('');
  const [copied,     setCopied]     = useState(false);
  const [comments,   setComments]   = useState<DashboardComment[]>(() => loadComments(dashboardId));
  const [author,     setAuthor]     = useState(() => localStorage.getItem('analytix_author') ?? '');
  const [newText,    setNewText]    = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore from URL on mount
  useEffect(() => {
    const payload = readSharePayloadFromHash();
    if (payload && onRestorePayload) {
      onRestorePayload(payload);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep comments in sync with localStorage
  useEffect(() => {
    saveComments(dashboardId, comments);
  }, [dashboardId, comments]);

  // Rebuild share URL whenever sharePayload changes
  useEffect(() => {
    if (sharePayload) {
      setShareUrl(buildShareUrl(sharePayload));
    }
  }, [sharePayload]);

  const handleCopy = useCallback(async () => {
    const url = sharePayload ? buildShareUrl(sharePayload) : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setShareUrl(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sharePayload]);

  const handleAddComment = useCallback(() => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const displayAuthor = author.trim() || 'Anonymous';
    localStorage.setItem('analytix_author', displayAuthor);
    const comment: DashboardComment = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      author:    displayAuthor,
      text:      trimmed,
      createdAt: new Date().toISOString(),
      resolved:  false,
    };
    setComments((prev) => [...prev, comment]);
    setNewText('');
  }, [author, newText]);

  const toggleResolved = useCallback((id: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c)),
    );
  }, []);

  const deleteComment = useCallback((id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const openComments = comments.filter((c) => !c.resolved).length;

  return (
    <div className="collab-wrapper">
      {/* Floating action bar */}
      <div className="collab-fab" aria-label="Collaboration tools">
        <button
          className="collab-fab-btn"
          onClick={handleCopy}
          title="Copy shareable link"
          aria-label="Copy shareable link"
        >
          {copied ? '✓ Copied!' : '🔗 Share'}
        </button>
        <button
          className={`collab-fab-btn${panelOpen ? ' collab-fab-btn--active' : ''}`}
          onClick={() => setPanelOpen((v) => !v)}
          title="Toggle comments panel"
          aria-label={`Toggle comments (${openComments} open)`}
          aria-expanded={panelOpen}
        >
          💬 Comments{openComments > 0 && <span className="collab-badge">{openComments}</span>}
        </button>
      </div>

      {/* Comment panel */}
      {panelOpen && (
        <aside className="collab-panel" aria-label="Comments panel">
          <div className="collab-panel-header">
            <h3>Comments</h3>
            <button
              className="collab-panel-close"
              onClick={() => setPanelOpen(false)}
              aria-label="Close comments"
            >
              ✕
            </button>
          </div>

          {/* Share URL */}
          {shareUrl && (
            <div className="collab-share-row">
              <input
                className="collab-share-input"
                readOnly
                value={shareUrl}
                aria-label="Shareable URL"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button className="collab-copy-btn" onClick={handleCopy}>
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
          )}

          {/* Comment thread */}
          <div className="collab-thread" role="list" aria-label="Comment thread">
            {comments.length === 0 && (
              <p className="collab-empty">No comments yet. Be the first!</p>
            )}
            {comments.map((c) => (
              <div
                key={c.id}
                className={`collab-comment${c.resolved ? ' collab-comment--resolved' : ''}`}
                role="listitem"
              >
                <div className="collab-comment-meta">
                  <span className="collab-author">{c.author}</span>
                  <span className="collab-time">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                  {c.resolved && <span className="collab-resolved-badge">Resolved</span>}
                </div>
                <p className="collab-comment-text">{c.text}</p>
                <div className="collab-comment-actions">
                  <button
                    className="collab-action-btn"
                    onClick={() => toggleResolved(c.id)}
                    aria-label={c.resolved ? 'Reopen comment' : 'Mark as resolved'}
                  >
                    {c.resolved ? 'Reopen' : 'Resolve'}
                  </button>
                  <button
                    className="collab-action-btn collab-action-btn--danger"
                    onClick={() => deleteComment(c.id)}
                    aria-label="Delete comment"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* New comment form */}
          <div className="collab-new-comment">
            <input
              className="collab-author-input"
              placeholder="Your name"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              aria-label="Your name"
            />
            <textarea
              ref={inputRef}
              className="collab-textarea"
              placeholder="Add a comment…"
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment();
              }}
              aria-label="New comment text"
            />
            <button
              className="collab-submit-btn"
              onClick={handleAddComment}
              disabled={!newText.trim()}
            >
              Post comment
            </button>
          </div>
        </aside>
      )}

      {/* Dashboard content */}
      <div className="collab-content">{children}</div>
    </div>
  );
}
