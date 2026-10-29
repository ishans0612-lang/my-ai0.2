* {
  box-sizing: border-box;
}

:root {
  --bg-deep: #020d1e;
  --bg-mid: #0a1d36;
  --panel: rgba(12, 29, 52, 0.88);
  --panel-soft: rgba(19, 39, 69, 0.8);
  --accent: #7ecbff;
  --accent-strong: #8fa7ff;
  --highlight: #d5f0ff;
  --text: #edf7ff;
  --muted: #a8bdd9;
  --success: #7ef0c8;
  --warning: #f8c36b;
  --danger: #ff778d;
  --shadow: rgba(7, 17, 31, 0.6);
}

html, body {
  margin: 0;
  min-height: 100%;
  font-family: Inter, "Segoe UI", sans-serif;
  background:
    radial-gradient(circle at top, rgba(81, 125, 255, 0.3), transparent 30%),
    linear-gradient(180deg, #020b16 0%, #061c35 45%, #020d1e 100%);
  color: var(--text);
}

body {
  min-height: 100vh;
}

button, input {
  font: inherit;
}

button {
  cursor: pointer;
  border: none;
  border-radius: 12px;
  transition: transform 0.18s ease, filter 0.18s ease, background 0.2s ease;
}

button:hover {
  filter: brightness(1.06);
}

button:active {
  transform: translateY(1px) scale(0.995);
}

.app-shell {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  min-height: 100vh;
  gap: 18px;
  padding: 18px;
}

.sidebar,
.viewer-panel,
.chat-panel,
.panel {
  background: var(--panel);
  border: 1px solid rgba(136, 196, 255, 0.14);
  box-shadow: 0 18px 40px var(--shadow);
  backdrop-filter: blur(14px);
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border-radius: 22px;
}

.brand-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px 10px;
}

.brand-mark {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
  color: #041728;
  font-size: 1.4rem;
  font-weight: 800;
  border-radius: 16px;
  box-shadow: 0 16px 30px rgba(118, 161, 255, 0.35);
}

.brand-wrap h1,
.chat-header h2,
.section-header h2 {
  margin: 0;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
}

.panel {
  padding: 16px;
  border-radius: 18px;
  background: var(--panel-soft);
}

.section-header {
  margin-bottom: 12px;
}

.file-picker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(140, 166, 255, 0.12);
  border: 1px solid rgba(144, 189, 255, 0.2);
  font-weight: 700;
  color: var(--text);
  text-align: center;
  cursor: pointer;
}

.file-picker input {
  display: none;
}

.button-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.button-row.compact > * {
  flex: 1;
}

.primary {
  background: linear-gradient(135deg, #7ecbff, #8aa2ff);
  color: #041527;
  font-weight: 800;
  padding: 11px 16px;
}

button:not(.primary) {
  background: rgba(146, 168, 215, 0.14);
  color: var(--text);
  padding: 11px 16px;
  border: 1px solid rgba(152, 191, 255, 0.18);
}

.field-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 0.9rem;
  color: var(--muted);
}

.field-wrap input {
  background: rgba(10, 24, 42, 0.8);
  color: var(--text);
  border: 1px solid rgba(120, 164, 232, 0.18);
  border-radius: 10px;
  padding: 11px 12px;
}

.status-card {
  margin-top: 12px;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 0.88rem;
  line-height: 1.4;
}

.status-card.neutral {
  background: rgba(121, 157, 210, 0.1);
  color: var(--text);
}

.status-card.success {
  background: rgba(126, 240, 200, 0.08);
  color: #c2ffe8;
}

.status-card.error {
  background: rgba(255, 119, 141, 0.1);
  color: #ffc0ce;
}

.switch-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  color: var(--muted);
}

.switch-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.content-panel {
  display: grid;
  grid-template-rows: minmax(340px, 1.1fr) minmax(230px, 0.9fr);
  gap: 18px;
}

.viewer-panel {
  position: relative;
  display: flex;
  align-items: stretch;
  border-radius: 24px;
  overflow: hidden;
  min-height: 360px;
  background: radial-gradient(circle at top, rgba(46, 96, 170, 0.32), rgba(10, 14, 22, 0.8) 40%);
}

#viewer-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.viewer-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  justify-content: flex-end;
  padding: 14px;
  align-items: flex-start;
}

.viewer-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.viewer-badges span {
  background: rgba(12, 22, 38, 0.66);
  color: var(--highlight);
  border: 1px solid rgba(135, 192, 255, 0.18);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  padding: 14px 14px 12px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 6px 4px 0;
}

.text-button {
  background: transparent;
  border: 0;
  color: var(--muted);
  padding: 6px 8px;
}

.chat-messages {
  flex: 1;
  min-height: 160px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 4px 8px;
}

.message {
  max-width: min(80%, 660px);
  padding: 12px 14px;
  border-radius: 16px;
  line-height: 1.5;
  font-size: 0.96rem;
}

.message.user {
  background: rgba(128, 157, 255, 0.18);
  align-self: flex-end;
  border-bottom-right-radius: 6px;
}

.message.assistant {
  background: rgba(111, 150, 195, 0.14);
  align-self: flex-start;
  border-bottom-left-radius: 6px;
}

.composer {
  display: flex;
  gap: 10px;
  align-items: center;
  border-top: 1px solid rgba(148, 185, 242, 0.16);
  padding-top: 12px;
}

#chat-input {
  flex: 1;
  background: rgba(8, 20, 35, 0.82);
  color: var(--text);
  border: 1px solid rgba(150, 188, 255, 0.15);
  border-radius: 12px;
  padding: 12px 14px;
}

.icon-button {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  border-radius: 12px;
  font-size: 1.1rem;
}

@media (max-width: 980px) {
  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    order: 2;
  }

  .content-panel {
    order: 1;
  }
}

@media (max-width: 560px) {
  .app-shell {
    padding: 12px;
    gap: 12px;
  }

  .sidebar,
  .chat-panel,
  .viewer-panel {
    border-radius: 18px;
  }

  .composer {
    flex-wrap: wrap;
  }

  #chat-input {
    width: 100%;
    flex-basis: 100%;
  }

  #send-btn {
    flex: 1;
  }
}
