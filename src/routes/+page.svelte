<script lang="ts">
  // Settings stub — input capture and preferences land in a later task.
</script>

<main class="settings">
  <header>
    <p class="brand">z-key-cast</p>
    <h1>Settings</h1>
    <p class="lead">Corner HUD overlay is running. Global input capture comes next.</p>
  </header>

  <section>
    <h2>Display</h2>
    <label>
      Corner
      <select disabled>
        <option selected>Bottom right</option>
        <option>Bottom left</option>
        <option>Top right</option>
        <option>Top left</option>
      </select>
    </label>
  </section>

  <section>
    <h2>Capture</h2>
    <p class="muted">Keyboard + mouse hooks are not wired yet.</p>
  </section>
</main>

<style>
  :global(html, body) {
    margin: 0;
    min-height: 100%;
    background:
      radial-gradient(circle at 12% 18%, rgba(56, 189, 248, 0.18), transparent 42%),
      radial-gradient(circle at 88% 12%, rgba(251, 146, 60, 0.16), transparent 36%),
      linear-gradient(160deg, #0f172a 0%, #1e293b 55%, #0b1220 100%);
    color: #e2e8f0;
    font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
  }

  .settings {
    box-sizing: border-box;
    padding: 28px 24px 32px;
    display: grid;
    gap: 28px;
  }

  .brand {
    margin: 0 0 8px;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7dd3fc;
  }

  h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }

  .lead {
    margin: 10px 0 0;
    color: #94a3b8;
    line-height: 1.5;
  }

  section {
    display: grid;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 13px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #64748b;
  }

  label {
    display: grid;
    gap: 8px;
    font-size: 14px;
  }

  select {
    width: 100%;
    border: 1px solid #334155;
    border-radius: 10px;
    background: #0f172a;
    color: #e2e8f0;
    padding: 10px 12px;
  }

  .muted {
    margin: 0;
    color: #94a3b8;
    font-size: 14px;
  }
</style>
