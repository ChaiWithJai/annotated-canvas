<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Annotated — UI + API Mockup</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root {
    --color-primary: #4338CA;
    --color-primary-hover: #3730A3;
    --color-background: #FCFCFC;
    --color-surface: #FFFFFF;
    --color-text: #171717;
    --color-text-muted: #737373;
    --color-text-subtle: #A3A3A3;
    --color-muted: #E5E5E5;
    --color-muted-strong: #D4D4D4;
    --color-accent: #FEE2E2;
    --color-accent-strong: #EF4444;
    --color-hover-bg: #F5F5F5;
    --font-sans: 'Instrument Sans', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --radius: 2px;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html, body {
    background: var(--color-background);
    color: var(--color-text);
    font-family: var(--font-sans);
    font-weight: 400;
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ============ DOC LAYOUT ============ */
  .doc {
    max-width: 1400px;
    margin: 0 auto;
    padding: 80px 48px 120px;
  }

  .doc-header {
    border-bottom: 1px solid var(--color-muted);
    padding-bottom: 40px;
    margin-bottom: 64px;
  }

  .doc-eyebrow {
    font-size: 12px;
    font-weight: 500;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }

  .doc-title {
    font-size: 56px;
    font-weight: 600;
    letter-spacing: -1.5px;
    line-height: 1.05;
    margin-bottom: 16px;
  }

  .doc-subtitle {
    font-size: 18px;
    color: var(--color-text-muted);
    max-width: 720px;
  }

  .legend {
    display: flex;
    gap: 24px;
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--color-muted);
    font-size: 13px;
    color: var(--color-text-muted);
    flex-wrap: wrap;
  }

  .legend-item { display: flex; align-items: center; gap: 8px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; }
  .legend-dot.api { background: var(--color-primary); }
  .legend-dot.event { background: #171717; }
  .legend-dot.note { background: var(--color-text-subtle); }

  /* ============ SCREEN SECTION ============ */
  .screen-section {
    margin-bottom: 96px;
  }

  .screen-header {
    display: flex;
    align-items: baseline;
    gap: 16px;
    margin-bottom: 32px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--color-muted);
  }

  .screen-num {
    font-family: var(--font-mono);
    font-size: 13px;
    color: var(--color-text-muted);
  }

  .screen-title {
    font-size: 28px;
    font-weight: 600;
    letter-spacing: -0.5px;
  }

  .screen-purpose {
    font-size: 14px;
    color: var(--color-text-muted);
    margin-left: auto;
    max-width: 480px;
    text-align: right;
  }

  .screen-stage {
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 32px;
    align-items: start;
  }

  .stage-canvas {
    background: var(--color-background);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    min-height: 600px;
    position: relative;
    overflow: hidden;
  }

  /* ============ API PANEL ============ */
  .api-panel {
    background: var(--color-surface);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    padding: 24px;
    position: sticky;
    top: 32px;
  }

  .api-panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--color-muted);
  }

  .endpoint {
    padding: 12px 0;
    border-bottom: 1px dashed var(--color-muted);
  }
  .endpoint:last-child { border-bottom: 0; }

  .endpoint-trigger {
    font-size: 11px;
    color: var(--color-text-subtle);
    text-transform: uppercase;
    letter-spacing: 0.8px;
    margin-bottom: 4px;
  }

  .endpoint-line {
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text);
    word-break: break-all;
  }

  .verb {
    display: inline-block;
    padding: 1px 6px;
    border-radius: var(--radius);
    font-size: 10px;
    font-weight: 600;
    margin-right: 6px;
    letter-spacing: 0.5px;
  }
  .verb-get { background: #DBEAFE; color: #1E40AF; }
  .verb-post { background: #DCFCE7; color: #166534; }
  .verb-put { background: #FEF3C7; color: #92400E; }
  .verb-del { background: var(--color-accent); color: var(--color-accent-strong); }
  .verb-ws { background: #F3E8FF; color: #6B21A8; }

  .endpoint-note {
    font-size: 11px;
    color: var(--color-text-muted);
    margin-top: 4px;
    line-height: 1.5;
  }

  /* ============ SCREEN 1 — SIDEBAR EXTENSION ============ */
  .browser-frame {
    background: #1A1A1A;
    padding: 0;
    height: 720px;
    display: grid;
    grid-template-rows: 36px 1fr;
  }
  .browser-chrome {
    background: #2A2A2A;
    display: flex;
    align-items: center;
    padding: 0 12px;
    gap: 6px;
  }
  .browser-dot {
    width: 12px; height: 12px;
    border-radius: 50%;
  }
  .browser-dot.r { background: #FF5F57; }
  .browser-dot.y { background: #FEBC2E; }
  .browser-dot.g { background: #28C840; }
  .browser-url {
    background: #1A1A1A;
    color: #999;
    font-family: var(--font-mono);
    font-size: 11px;
    padding: 4px 12px;
    border-radius: var(--radius);
    margin-left: 24px;
    flex: 1;
    max-width: 600px;
  }

  .browser-body {
    background: #FAFAFA;
    display: grid;
    grid-template-columns: 1fr 360px;
  }

  .host-page {
    padding: 32px;
    overflow: hidden;
    background: #0F0F0F;
    color: #EEE;
    position: relative;
  }
  .host-page-title {
    font-size: 18px;
    font-weight: 500;
    margin-bottom: 16px;
    color: #FFF;
  }
  .youtube-player {
    background: #000;
    aspect-ratio: 16/9;
    border-radius: var(--radius);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 16px;
    overflow: hidden;
  }
  .yt-playicon {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(8px);
  }
  .yt-progress {
    position: absolute;
    bottom: 12px; left: 12px; right: 12px;
    height: 4px;
    background: rgba(255,255,255,0.2);
    border-radius: 2px;
  }
  .yt-progress-fill {
    height: 100%;
    width: 34%;
    background: #FF0000;
    border-radius: 2px;
    position: relative;
  }
  .yt-progress-fill::after {
    content: '';
    position: absolute;
    right: -6px; top: -4px;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #FF0000;
  }
  .yt-clip-range {
    position: absolute;
    bottom: 12px;
    height: 4px;
    background: rgba(67, 56, 202, 0.6);
    border: 1px solid #4338CA;
    border-radius: 2px;
    left: 14%; width: 22%;
    box-shadow: 0 0 0 2px rgba(67, 56, 202, 0.15);
  }
  .yt-meta {
    color: #999;
    font-size: 13px;
  }

  /* The actual sidebar */
  .sidebar {
    background: var(--color-surface);
    border-left: 1px solid var(--color-muted);
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
  }
  .sidebar-source {
    padding: 16px;
    border-bottom: 1px solid var(--color-muted);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .source-favicon {
    width: 16px; height: 16px;
    background: #FF0000;
    border-radius: var(--radius);
    flex-shrink: 0;
  }
  .source-text {
    flex: 1;
    min-width: 0;
  }
  .source-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .source-domain {
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .sidebar-body {
    padding: 20px 16px;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .clip-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .timecode-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .timecode-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .timecode-label {
    font-size: 11px;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }
  .timecode-input {
    font-family: var(--font-mono);
    font-size: 14px;
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    padding: 8px 10px;
    background: var(--color-surface);
    color: var(--color-text);
    width: 100%;
  }
  .timecode-input:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  .clip-duration {
    font-size: 12px;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .commentary {
    border-left: 2px solid var(--color-muted);
    padding: 4px 0 4px 12px;
    transition: border-color 0.15s;
  }
  .commentary:focus-within {
    border-left-color: var(--color-primary);
  }
  .commentary textarea {
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    font-family: var(--font-sans);
    font-size: 15px;
    line-height: 1.6;
    color: var(--color-text);
    background: transparent;
    min-height: 100px;
  }
  .commentary textarea::placeholder {
    color: var(--color-text-subtle);
  }

  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--color-muted);
  }
  .btn-publish {
    width: 100%;
    background: var(--color-primary);
    color: #FFFFFF;
    border: none;
    padding: 12px 16px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-publish:hover { background: var(--color-primary-hover); }

  .auth-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .auth-prompt {
    font-size: 13px;
    color: var(--color-text-muted);
    margin-bottom: 4px;
  }
  .btn-oauth {
    width: 100%;
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-muted);
    padding: 10px 14px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: background 0.15s;
  }
  .btn-oauth:hover { background: var(--color-hover-bg); }

  .auth-status {
    font-size: 12px;
    color: var(--color-text-muted);
    padding: 8px 12px;
    background: var(--color-hover-bg);
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .auth-status-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #16A34A;
  }

  .clip-type-tag {
    display: inline-block;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--color-text-muted);
    border: 1px solid var(--color-muted);
    padding: 2px 8px;
    border-radius: var(--radius);
  }

  /* ============ SCREEN 2 — GLOBAL FEED ============ */
  .feed-frame {
    background: var(--color-background);
    min-height: 800px;
    display: flex;
    flex-direction: column;
  }
  .feed-nav {
    border-bottom: 1px solid var(--color-muted);
    padding: 20px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .feed-logo {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }
  .feed-nav-right {
    display: flex;
    align-items: center;
    gap: 24px;
  }
  .nav-tab {
    font-size: 14px;
    color: var(--color-text-muted);
    cursor: pointer;
  }
  .nav-tab.active {
    color: var(--color-text);
    font-weight: 500;
  }
  .nav-avatar {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: linear-gradient(135deg, #4338CA, #818CF8);
  }

  .feed-column {
    width: 640px;
    margin: 32px auto;
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .feed-card {
    background: var(--color-surface);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    padding: 24px;
    transition: border-color 0.15s;
  }
  .feed-card:hover {
    border-color: var(--color-muted-strong);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .card-avatar {
    width: 32px; height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .card-avatar.a1 { background: linear-gradient(135deg, #4338CA, #818CF8); }
  .card-avatar.a2 { background: linear-gradient(135deg, #171717, #525252); }
  .card-avatar.a3 { background: linear-gradient(135deg, #DC2626, #FCA5A5); }
  .card-author {
    font-size: 14px;
    font-weight: 600;
  }
  .card-handle {
    font-size: 13px;
    color: var(--color-text-muted);
  }
  .card-time {
    font-size: 13px;
    color: var(--color-text-muted);
    margin-left: auto;
  }

  .card-clip {
    background: var(--color-background);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    padding: 16px;
    margin-bottom: 16px;
  }
  .clip-text {
    font-size: 15px;
    line-height: 1.65;
    color: var(--color-text);
    font-style: italic;
    border-left: 2px solid var(--color-muted-strong);
    padding-left: 12px;
  }

  .clip-video {
    aspect-ratio: 16/9;
    background: #000;
    border-radius: var(--radius);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .clip-video-thumb {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6)),
      radial-gradient(circle at 30% 40%, #4338CA22, transparent 60%),
      #1a1a2e;
  }
  .clip-video-overlay {
    position: relative;
    color: #FFF;
    font-family: var(--font-mono);
    font-size: 12px;
    text-align: center;
  }
  .clip-video-overlay .play {
    width: 48px; height: 48px;
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(8px);
    margin: 0 auto 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .clip-timestamp {
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 11px;
    margin-top: 8px;
    letter-spacing: 0.5px;
  }

  .clip-audio {
    background: var(--color-text);
    color: #FFF;
    border-radius: var(--radius);
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .audio-play {
    width: 36px; height: 36px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .audio-wave {
    flex: 1;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .audio-wave span {
    flex: 1;
    background: rgba(255,255,255,0.4);
    border-radius: 1px;
  }
  .audio-time {
    font-family: var(--font-mono);
    font-size: 11px;
    color: rgba(255,255,255,0.7);
  }

  .card-commentary {
    font-size: 16px;
    line-height: 1.65;
    color: var(--color-text);
    margin-bottom: 16px;
  }

  .source-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-text-muted);
    border: 1px solid var(--color-muted);
    padding: 3px 8px;
    border-radius: var(--radius);
    text-decoration: none;
    margin-right: 8px;
  }
  .source-pill:hover {
    background: var(--color-hover-bg);
  }

  .engagement-bar {
    display: flex;
    gap: 24px;
    padding-top: 16px;
    border-top: 1px solid var(--color-muted);
    align-items: center;
  }
  .engage-action {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--color-text-muted);
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 0;
  }
  .engage-action:hover { color: var(--color-text); }
  .engage-action svg { width: 16px; height: 16px; }

  /* ============ SCREEN 3 — PERMALINK ============ */
  .permalink-frame {
    background: var(--color-background);
    min-height: 900px;
    padding: 32px 0 80px;
  }
  .permalink-nav {
    border-bottom: 1px solid var(--color-muted);
    padding: 0 32px 20px;
    margin-bottom: 64px;
    max-width: 800px;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .permalink-container {
    width: 800px;
    margin: 0 auto;
    padding: 0 32px;
  }

  .perma-meta-top {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
    font-size: 13px;
    color: var(--color-text-muted);
  }
  .perma-meta-top .card-avatar {
    width: 24px; height: 24px;
  }
  .perma-author { color: var(--color-text); font-weight: 500; }

  .perma-commentary {
    font-size: 32px;
    line-height: 1.35;
    font-weight: 500;
    letter-spacing: -0.5px;
    color: var(--color-text);
    margin-bottom: 48px;
  }

  .perma-clip {
    background: var(--color-background);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    padding: 32px;
    margin-bottom: 48px;
  }
  .perma-clip-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }
  .perma-clip-video {
    aspect-ratio: 16/9;
    background: #000;
    border-radius: var(--radius);
    margin-bottom: 16px;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .perma-source-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid var(--color-muted);
    font-size: 13px;
  }
  .perma-source-link {
    color: var(--color-text);
    text-decoration: none;
    border-bottom: 1px solid var(--color-muted-strong);
    padding-bottom: 1px;
  }
  .perma-source-link:hover {
    border-bottom-color: var(--color-text);
  }
  .perma-timecode {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-text-muted);
  }

  .perma-engagement {
    display: flex;
    gap: 32px;
    padding: 24px 0;
    border-top: 1px solid var(--color-muted);
    border-bottom: 1px solid var(--color-muted);
    margin-bottom: 32px;
  }

  .perma-discussion-header {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 24px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-text-muted);
  }

  .reply {
    border-bottom: 1px solid var(--color-muted);
    padding: 20px 0;
    display: flex;
    gap: 12px;
  }
  .reply-body {
    flex: 1;
  }
  .reply-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .reply-author { font-weight: 500; }
  .reply-time { color: var(--color-text-muted); }
  .reply-text {
    font-size: 14px;
    line-height: 1.6;
  }

  .perma-footer {
    margin-top: 48px;
    display: flex;
    justify-content: flex-end;
  }
  .file-claim {
    font-size: 12px;
    color: var(--color-text-muted);
    text-decoration: none;
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
  }
  .file-claim:hover {
    color: var(--color-accent-strong);
  }

  /* ============ SCREEN 4 — PROFILE ============ */
  .profile-frame {
    background: var(--color-background);
    min-height: 900px;
    padding: 32px 0 80px;
  }
  .profile-nav {
    border-bottom: 1px solid var(--color-muted);
    padding: 0 32px 20px;
    margin-bottom: 48px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1000px;
    margin-left: auto;
    margin-right: auto;
  }
  .profile-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 0 32px;
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 64px;
  }

  .profile-sidebar {
    position: sticky;
    top: 32px;
    align-self: start;
  }
  .profile-avatar {
    width: 100%;
    aspect-ratio: 1;
    background: linear-gradient(135deg, #4338CA, #818CF8);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
    margin-bottom: 20px;
  }
  .profile-name {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  .profile-handle {
    font-size: 14px;
    color: var(--color-text-muted);
    margin-bottom: 16px;
  }
  .profile-bio {
    font-size: 14px;
    line-height: 1.6;
    color: var(--color-text);
    margin-bottom: 20px;
  }
  .profile-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 24px;
    font-size: 14px;
  }
  .stat-num { font-weight: 600; }
  .stat-label { color: var(--color-text-muted); }
  .btn-follow {
    width: 100%;
    background: var(--color-text);
    color: #FFFFFF;
    border: 1px solid var(--color-text);
    padding: 10px 16px;
    border-radius: var(--radius);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .btn-follow:hover { opacity: 0.9; }

  .profile-feed {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  /* ============ FOOTER NOTE ============ */
  .arch-note {
    margin-top: 80px;
    padding: 32px;
    background: var(--color-surface);
    border: 1px solid var(--color-muted);
    border-radius: var(--radius);
  }
  .arch-note h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--color-text-muted);
  }
  .arch-note ul {
    list-style: none;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 32px;
  }
  .arch-note li {
    font-size: 13px;
    line-height: 1.6;
    padding-left: 16px;
    position: relative;
    color: var(--color-text);
  }
  .arch-note li::before {
    content: '—';
    position: absolute;
    left: 0;
    color: var(--color-text-muted);
  }
  .arch-note code {
    font-family: var(--font-mono);
    font-size: 12px;
    background: var(--color-hover-bg);
    padding: 1px 5px;
    border-radius: var(--radius);
  }

  /* responsive collapse */
  @media (max-width: 1100px) {
    .screen-stage { grid-template-columns: 1fr; }
    .api-panel { position: static; }
    .arch-note ul { grid-template-columns: 1fr; }
  }

</style>
</head>
<body>

<div class="doc">

  <!-- ============ DOC HEADER ============ -->
  <header class="doc-header">
    <div class="doc-eyebrow">Annotated · UI + API Surface · Sprint 0</div>
    <h1 class="doc-title">Four screens, every endpoint they touch.</h1>
    <p class="doc-subtitle">Mocks for the four MVP surfaces. Each button, form, and view is annotated with the REST endpoint it calls — so the frontend and the Worker contract get built off the same artifact.</p>
    <div class="legend">
      <div class="legend-item"><span class="legend-dot api"></span> REST endpoint (Workers)</div>
      <div class="legend-item"><span class="legend-dot event"></span> User-triggered event</div>
      <div class="legend-item"><span class="legend-dot note"></span> Implementation note</div>
    </div>
  </header>

  <!-- ============================================ -->
  <!-- SCREEN 1: SIDEBAR EXTENSION                  -->
  <!-- ============================================ -->
  <section class="screen-section">
    <div class="screen-header">
      <span class="screen-num">01</span>
      <h2 class="screen-title">Sidebar Extension</h2>
      <p class="screen-purpose">Capture a clip and draft an annotation directly over the source page. Lives in <code style="font-family:var(--font-mono);font-size:12px">chrome.sidePanel</code>.</p>
    </div>

    <div class="screen-stage">
      <div class="stage-canvas">
        <div class="browser-frame">
          <div class="browser-chrome">
            <div class="browser-dot r"></div>
            <div class="browser-dot y"></div>
            <div class="browser-dot g"></div>
            <div class="browser-url">youtube.com/watch?v=dQw4w9WgXcQ</div>
          </div>
          <div class="browser-body">
            <div class="host-page">
              <div class="host-page-title">How Hyperdrive accelerates Postgres at the edge</div>
              <div class="youtube-player">
                <div class="yt-clip-range"></div>
                <div class="yt-progress"><div class="yt-progress-fill"></div></div>
                <div class="yt-playicon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <div class="yt-meta">Cloudflare · 47K views · 3 days ago</div>
            </div>

            <div class="sidebar">
              <div class="sidebar-source">
                <div class="source-favicon"></div>
                <div class="source-text">
                  <div class="source-title">How Hyperdrive accelerates Postgres at the edge</div>
                  <div class="source-domain">youtube.com</div>
                </div>
              </div>

              <div class="sidebar-body">
                <div>
                  <span class="clip-type-tag">Video clip</span>
                </div>

                <div class="auth-status">
                  <div class="auth-status-dot"></div>
                  Signed in as @jai
                </div>

                <div class="clip-controls">
                  <div class="timecode-row">
                    <div class="timecode-field">
                      <label class="timecode-label">In</label>
                      <input class="timecode-input" value="01:23.500" />
                    </div>
                    <div class="timecode-field">
                      <label class="timecode-label">Out</label>
                      <input class="timecode-input" value="02:45.200" />
                    </div>
                  </div>
                  <div class="clip-duration">Duration · 01:21.700</div>
                </div>

                <div class="commentary">
                  <textarea placeholder="Add your perspective..." rows="5">Connection pooling at the edge is the unlock. Most teams reach for serverless without realizing the cold-start penalty kills it for SQL workloads — Hyperdrive flips that.</textarea>
                </div>
              </div>

              <div class="sidebar-footer">
                <button class="btn-publish">Publish to Canvas</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside class="api-panel">
        <div class="api-panel-title">Endpoints</div>

        <div class="endpoint">
          <div class="endpoint-trigger">On panel open</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/auth/me</div>
          <div class="endpoint-note">Returns current user from session cookie. <code style="font-family:var(--font-mono)">401</code> renders OAuth block.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Continue with X"</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/auth/x/start</div>
          <div class="endpoint-note">Worker returns OAuth URL → extension opens via <code>chrome.identity.launchWebAuthFlow</code>.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Continue with Google"</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/auth/google/start</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">OAuth callback</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/auth/&lbrace;provider&rbrace;/callback</div>
          <div class="endpoint-note">Sets <code>session</code> cookie. Stored in KV, TTL 30d.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Detect media on page</div>
          <div class="endpoint-line">— <em>client-side</em> —</div>
          <div class="endpoint-note">Content script reads <code>document.querySelector('video,audio')</code> + OG tags. No network call.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Resolve source metadata</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/sources/resolve</div>
          <div class="endpoint-note">Body: <code>&lbrace;url&rbrace;</code>. Returns canonical URL, title, OG image, content type. Cached in KV.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Publish to Canvas"</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations</div>
          <div class="endpoint-note">Body: <code>&lbrace;source_url, clip_type, start_ms, end_ms, selection_text, commentary&rbrace;</code>. Returns <code>&lbrace;id, permalink&rbrace;</code>. Enqueues feed-fan-out + OG-snapshot jobs.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Sign out</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/auth/logout</div>
        </div>
      </aside>
    </div>
  </section>

  <!-- ============================================ -->
  <!-- SCREEN 2: GLOBAL FEED                        -->
  <!-- ============================================ -->
  <section class="screen-section">
    <div class="screen-header">
      <span class="screen-num">02</span>
      <h2 class="screen-title">Global Feed</h2>
      <p class="screen-purpose">Public discovery. Chronological stream of annotations from the network and people you follow.</p>
    </div>

    <div class="screen-stage">
      <div class="stage-canvas">
        <div class="feed-frame">
          <div class="feed-nav">
            <div class="feed-logo">Annotated</div>
            <div class="feed-nav-right">
              <span class="nav-tab active">Following</span>
              <span class="nav-tab">Discover</span>
              <div class="nav-avatar"></div>
            </div>
          </div>

          <div class="feed-column">

            <!-- CARD 1: text clip -->
            <article class="feed-card">
              <div class="card-header">
                <div class="card-avatar a2"></div>
                <div>
                  <div class="card-author">Hamel Husain</div>
                  <div class="card-handle">@hamelsmu</div>
                </div>
                <div class="card-time">2h</div>
              </div>
              <div class="card-clip">
                <div class="clip-text">"The most important skill in evals isn't building the harness. It's looking at your data."</div>
              </div>
              <p class="card-commentary">This is the lesson everyone skips. Half the teams I work with are tuning agents they've never read the traces of. Read your damn data.</p>
              <div>
                <a href="#" class="source-pill">↗ hamel.dev</a>
                <a href="#" class="source-pill">essay</a>
              </div>
              <div class="engagement-bar">
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  127
                </button>
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  34
                </button>
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  18
                </button>
              </div>
            </article>

            <!-- CARD 2: video clip -->
            <article class="feed-card">
              <div class="card-header">
                <div class="card-avatar a1"></div>
                <div>
                  <div class="card-author">Jai</div>
                  <div class="card-handle">@chaiwithjai</div>
                </div>
                <div class="card-time">5h</div>
              </div>
              <div class="card-clip">
                <div class="clip-video">
                  <div class="clip-video-thumb"></div>
                  <div class="clip-video-overlay">
                    <div class="play">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    01:23 — 02:45
                  </div>
                </div>
                <div class="clip-timestamp">▸ youtube.com · 1m 22s clip from a 47-minute video</div>
              </div>
              <p class="card-commentary">Connection pooling at the edge is the unlock. Most teams reach for serverless without realizing the cold-start penalty kills it for SQL workloads — Hyperdrive flips that.</p>
              <div>
                <a href="#" class="source-pill">↗ youtube.com</a>
                <a href="#" class="source-pill">infra</a>
              </div>
              <div class="engagement-bar">
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  43
                </button>
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  12
                </button>
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  7
                </button>
              </div>
            </article>

            <!-- CARD 3: audio clip -->
            <article class="feed-card">
              <div class="card-header">
                <div class="card-avatar a3"></div>
                <div>
                  <div class="card-author">swyx</div>
                  <div class="card-handle">@swyx</div>
                </div>
                <div class="card-time">1d</div>
              </div>
              <div class="card-clip">
                <div class="clip-audio">
                  <div class="audio-play">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <div class="audio-wave">
                    <span style="height:30%"></span><span style="height:60%"></span><span style="height:80%"></span>
                    <span style="height:45%"></span><span style="height:90%"></span><span style="height:55%"></span>
                    <span style="height:70%"></span><span style="height:35%"></span><span style="height:85%"></span>
                    <span style="height:50%"></span><span style="height:65%"></span><span style="height:40%"></span>
                    <span style="height:75%"></span><span style="height:55%"></span><span style="height:60%"></span>
                  </div>
                  <span class="audio-time">42:10 — 43:30</span>
                </div>
              </div>
              <p class="card-commentary">Best framing I've heard for the agent-vs-workflow debate: most "agents" are workflows pretending. Build the workflow first, you'll know when you actually need branching.</p>
              <div>
                <a href="#" class="source-pill">↗ latent.space</a>
                <a href="#" class="source-pill">podcast</a>
              </div>
              <div class="engagement-bar">
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  89
                </button>
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                  21
                </button>
                <button class="engage-action">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  14
                </button>
              </div>
            </article>

          </div>
        </div>
      </div>

      <aside class="api-panel">
        <div class="api-panel-title">Endpoints</div>

        <div class="endpoint">
          <div class="endpoint-trigger">On feed mount (Following)</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/feed/following?cursor=&amp;limit=20</div>
          <div class="endpoint-note">Returns paginated annotations from followed users. Cursor-based.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Discover" tab</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/feed/discover?cursor=&amp;limit=20</div>
          <div class="endpoint-note">Network-wide chronological feed. Cached in KV per page.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Like icon</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations/&lbrace;id&rbrace;/like</div>
          <div class="endpoint-line"><span class="verb verb-del">DEL</span>/v1/annotations/&lbrace;id&rbrace;/like</div>
          <div class="endpoint-note">Counter lives in Durable Object per annotation.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Repost icon</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations/&lbrace;id&rbrace;/repost</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Discuss icon</div>
          <div class="endpoint-line">→ navigates to permalink</div>
          <div class="endpoint-note">Client-side route, no API call.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Source pill</div>
          <div class="endpoint-line">→ <code>window.open(source_url)</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Author name / avatar</div>
          <div class="endpoint-line">→ navigates to <code>/u/&lbrace;handle&rbrace;</code></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Top nav avatar</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/auth/me</div>
          <div class="endpoint-note">Cached in client store after sidebar load.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Live engagement updates</div>
          <div class="endpoint-line"><span class="verb verb-ws">WS</span>/v1/live/feed</div>
          <div class="endpoint-note">Optional. Durable Object pushes counter updates. Post-MVP.</div>
        </div>
      </aside>
    </div>
  </section>

  <!-- ============================================ -->
  <!-- SCREEN 3: PERMALINK                          -->
  <!-- ============================================ -->
  <section class="screen-section">
    <div class="screen-header">
      <span class="screen-num">03</span>
      <h2 class="screen-title">Annotation Permalink</h2>
      <p class="screen-purpose">Public landing page for one annotation. The shareable artifact. Where moderation lives.</p>
    </div>

    <div class="screen-stage">
      <div class="stage-canvas">
        <div class="permalink-frame">
          <div class="permalink-nav">
            <div class="feed-logo">Annotated</div>
            <div class="feed-nav-right">
              <span class="nav-tab">Feed</span>
              <div class="nav-avatar"></div>
            </div>
          </div>

          <div class="permalink-container">
            <div class="perma-meta-top">
              <div class="card-avatar a1"></div>
              <span class="perma-author">Jai</span>
              <span>·</span>
              <span>@chaiwithjai</span>
              <span>·</span>
              <span>Apr 30, 2026 · 5:14 PM</span>
            </div>

            <h1 class="perma-commentary">Connection pooling at the edge is the unlock. Most teams reach for serverless without realizing the cold-start penalty kills it for SQL workloads — Hyperdrive flips that.</h1>

            <div class="perma-clip">
              <div class="perma-clip-label">Clipped from</div>
              <div class="perma-clip-video">
                <div class="clip-video-thumb"></div>
                <div class="clip-video-overlay">
                  <div class="play">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>
              </div>
              <div class="perma-source-info">
                <a href="#" class="perma-source-link">How Hyperdrive accelerates Postgres at the edge — Cloudflare</a>
                <span class="perma-timecode">01:23 → 02:45</span>
              </div>
            </div>

            <div class="perma-engagement">
              <button class="engage-action">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                43 likes
              </button>
              <button class="engage-action">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                12 reposts
              </button>
            </div>

            <div class="perma-discussion-header">7 replies</div>

            <div class="reply">
              <div class="card-avatar a2"></div>
              <div class="reply-body">
                <div class="reply-meta">
                  <span class="reply-author">Anne Flanagan</span>
                  <span class="reply-time">@aflanagan · 3h</span>
                </div>
                <div class="reply-text">Same playbook applies to enterprise sales infra btw — the DB pattern shows up identically in CRM tooling.</div>
              </div>
            </div>

            <div class="reply">
              <div class="card-avatar a3"></div>
              <div class="reply-body">
                <div class="reply-meta">
                  <span class="reply-author">Gurjinder Singh</span>
                  <span class="reply-time">@gurj · 2h</span>
                </div>
                <div class="reply-text">Curious how this plays with Durable Objects for per-tenant state. Cold starts are the whole game.</div>
              </div>
            </div>

            <div class="perma-footer">
              <button class="file-claim">File a claim ↗</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="api-panel">
        <div class="api-panel-title">Endpoints</div>

        <div class="endpoint">
          <div class="endpoint-trigger">On page load</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/annotations/&lbrace;id&rbrace;</div>
          <div class="endpoint-note">Returns annotation, author, clip ref, engagement counters, source metadata.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Replies section</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/annotations/&lbrace;id&rbrace;/replies?cursor=</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Submit a reply</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations/&lbrace;id&rbrace;/replies</div>
          <div class="endpoint-note">Body: <code>&lbrace;text&rbrace;</code>.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Like / Repost</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations/&lbrace;id&rbrace;/like</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations/&lbrace;id&rbrace;/repost</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Source link</div>
          <div class="endpoint-line">→ <code>window.open(source_url)</code></div>
          <div class="endpoint-note">Optional analytics ping: <code>POST /v1/events/source-click</code>.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"File a claim" link</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/claims/types</div>
          <div class="endpoint-note">Returns DMCA / fair-use / impersonation options for the modal.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Submit claim</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/annotations/&lbrace;id&rbrace;/claims</div>
          <div class="endpoint-note">Body: <code>&lbrace;type, claimant_email, statement&rbrace;</code>. Enqueues moderation job. <strong>Notice mechanism — does not adjudicate.</strong></div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Author delete (own only)</div>
          <div class="endpoint-line"><span class="verb verb-del">DEL</span>/v1/annotations/&lbrace;id&rbrace;</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">SEO / OG metadata</div>
          <div class="endpoint-line">— <em>SSR via Worker</em> —</div>
          <div class="endpoint-note">Worker renders OG tags server-side from D1 query so links unfurl on X / Slack.</div>
        </div>
      </aside>
    </div>
  </section>

  <!-- ============================================ -->
  <!-- SCREEN 4: USER PROFILE                       -->
  <!-- ============================================ -->
  <section class="screen-section">
    <div class="screen-header">
      <span class="screen-num">04</span>
      <h2 class="screen-title">User Profile</h2>
      <p class="screen-purpose">A curator's gallery. Their annotations, stacked. Follow button anchors the relationship graph.</p>
    </div>

    <div class="screen-stage">
      <div class="stage-canvas">
        <div class="profile-frame">
          <div class="profile-nav">
            <div class="feed-logo">Annotated</div>
            <div class="feed-nav-right">
              <span class="nav-tab">Feed</span>
              <div class="nav-avatar"></div>
            </div>
          </div>

          <div class="profile-container">
            <div class="profile-sidebar">
              <div class="profile-avatar"></div>
              <div class="profile-name">Jai</div>
              <div class="profile-handle">@chaiwithjai</div>
              <div class="profile-bio">Product Engineer. Building Teacher's Pet — solving Bloom's two-sigma problem. GTM is my sweet science.</div>
              <div class="profile-stats">
                <div><span class="stat-num">2,847</span> <span class="stat-label">Followers</span></div>
                <div><span class="stat-num">412</span> <span class="stat-label">Following</span></div>
              </div>
              <button class="btn-follow">Follow</button>
            </div>

            <div class="profile-feed">

              <article class="feed-card">
                <div class="card-header">
                  <div class="card-avatar a1"></div>
                  <div>
                    <div class="card-author">Jai</div>
                    <div class="card-handle">@chaiwithjai</div>
                  </div>
                  <div class="card-time">5h</div>
                </div>
                <div class="card-clip">
                  <div class="clip-video">
                    <div class="clip-video-thumb"></div>
                    <div class="clip-video-overlay">
                      <div class="play">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                      01:23 — 02:45
                    </div>
                  </div>
                </div>
                <p class="card-commentary">Connection pooling at the edge is the unlock. Most teams reach for serverless without realizing the cold-start penalty kills it for SQL workloads — Hyperdrive flips that.</p>
                <div>
                  <a href="#" class="source-pill">↗ youtube.com</a>
                </div>
                <div class="engagement-bar">
                  <button class="engage-action">♡ 43</button>
                  <button class="engage-action">↻ 12</button>
                  <button class="engage-action">💬 7</button>
                </div>
              </article>

              <article class="feed-card">
                <div class="card-header">
                  <div class="card-avatar a1"></div>
                  <div>
                    <div class="card-author">Jai</div>
                    <div class="card-handle">@chaiwithjai</div>
                  </div>
                  <div class="card-time">2d</div>
                </div>
                <div class="card-clip">
                  <div class="clip-text">"Cohort structure is the instructional mechanism, not a delivery wrapper."</div>
                </div>
                <p class="card-commentary">The reason 90% of cohort courses fail is they treat the cohort like packaging. It's the engine. If your design works async, you didn't need a cohort — you made a course.</p>
                <div>
                  <a href="#" class="source-pill">↗ chaiwithjai.com</a>
                </div>
                <div class="engagement-bar">
                  <button class="engage-action">♡ 156</button>
                  <button class="engage-action">↻ 38</button>
                  <button class="engage-action">💬 24</button>
                </div>
              </article>

            </div>
          </div>
        </div>
      </div>

      <aside class="api-panel">
        <div class="api-panel-title">Endpoints</div>

        <div class="endpoint">
          <div class="endpoint-trigger">On profile load</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/users/&lbrace;handle&rbrace;</div>
          <div class="endpoint-note">Returns name, bio, avatar, follower/following counts, <code>is_following_viewer</code>.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Annotation list</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/users/&lbrace;handle&rbrace;/annotations?cursor=</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Follow" button</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/users/&lbrace;handle&rbrace;/follow</div>
          <div class="endpoint-line"><span class="verb verb-del">DEL</span>/v1/users/&lbrace;handle&rbrace;/follow</div>
          <div class="endpoint-note">Optimistic UI flip. Updates follower counter via Durable Object.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Followers" stat click</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/users/&lbrace;handle&rbrace;/followers?cursor=</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">"Following" stat click</div>
          <div class="endpoint-line"><span class="verb verb-get">GET</span>/v1/users/&lbrace;handle&rbrace;/following?cursor=</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Edit profile (own profile only)</div>
          <div class="endpoint-line"><span class="verb verb-put">PUT</span>/v1/users/me</div>
          <div class="endpoint-note">Body: <code>&lbrace;display_name, bio, avatar_url&rbrace;</code>. Avatar uploaded to R2 via signed URL.</div>
        </div>

        <div class="endpoint">
          <div class="endpoint-trigger">Avatar upload</div>
          <div class="endpoint-line"><span class="verb verb-post">POST</span>/v1/uploads/avatar/sign</div>
          <div class="endpoint-note">Returns presigned R2 URL. Client PUTs binary directly. Then PUT /v1/users/me with new URL.</div>
        </div>
      </aside>
    </div>
  </section>

  <!-- ============================================ -->
  <!-- ARCH NOTES                                    -->
  <!-- ============================================ -->
  <div class="arch-note">
    <h3>Cross-cutting contract notes</h3>
    <ul>
      <li>All endpoints are versioned <code>/v1/*</code> — frozen contract surface for the bounty submission.</li>
      <li>Auth is a session cookie (HTTP-only, SameSite=Lax) backed by KV. Bearer tokens are not used by the extension or web client.</li>
      <li>Engagement counters (likes, reposts, follower counts) are owned by Durable Objects, not D1, to avoid hot-row contention.</li>
      <li>Feed reads are cache-aside in KV with a short TTL. Writes purge by user-id key on publish.</li>
      <li>Clip storage is by reference: <code>(source_url, start_ms, end_ms, selection_text)</code>. No third-party media bytes are re-hosted.</li>
      <li>Every annotation row in D1 has <code>source_url NOT NULL</code>. The "always link back" invariant is enforced at the schema, not the UI.</li>
      <li>Claim submission enqueues to Cloudflare Queues. A moderator-facing surface (post-MVP) drains the queue. The system never adjudicates fair use.</li>
      <li>OG snapshots, source-page archive, and feed fan-out are all async jobs on the same Queue with idempotent consumers.</li>
    </ul>
  </div>

</div>

</body>
</html>
