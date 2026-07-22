const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const htmlHeaders = {
  ...corsHeaders,
  "Cache-Control": "no-store",
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

function config() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  }

  return { anonKey, supabaseUrl };
}

function publicSharedTripPageUrl() {
  return Deno.env.get("PUBLIC_TRIP_SHARE_PAGE_URL")?.trim().replace(/\/+$/, "") ?? "";
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function callRpc(name: string, body: Record<string, unknown>) {
  const { anonKey, supabaseUrl } = config();
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      error: payload?.message ?? "Request failed.",
    };
  }

  return payload;
}

function html() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TransTrak Shared Trip</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7fb;
      --card: #ffffff;
      --text: #172033;
      --muted: #627085;
      --primary: #0b7a75;
      --danger: #c2410c;
      --line: #d9dee8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.5;
    }
    main {
      width: min(760px, calc(100% - 32px));
      margin: 0 auto;
      padding: 28px 0 44px;
    }
    header {
      margin-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: clamp(1.7rem, 4vw, 2.3rem);
    }
    h2 {
      margin: 0 0 12px;
      font-size: 1.05rem;
    }
    p { margin: 0; }
    .muted { color: var(--muted); }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 12px;
      margin-top: 14px;
      padding: 18px;
      box-shadow: 0 12px 30px rgba(23, 32, 51, 0.06);
    }
    .grid {
      display: grid;
      gap: 12px;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    }
    .field {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px;
    }
    .label {
      color: var(--muted);
      display: block;
      font-size: 0.76rem;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .value {
      font-weight: 700;
      overflow-wrap: anywhere;
    }
    a.button,
    button {
      align-items: center;
      background: var(--primary);
      border: 0;
      border-radius: 10px;
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      font-weight: 800;
      justify-content: center;
      min-height: 46px;
      padding: 0 16px;
      text-decoration: none;
      width: 100%;
    }
    button.secondary {
      background: transparent;
      border: 1px solid var(--danger);
      color: var(--danger);
    }
    input, select, textarea {
      border: 1px solid var(--line);
      border-radius: 10px;
      color: var(--text);
      font: inherit;
      margin-top: 6px;
      min-height: 46px;
      padding: 10px 12px;
      width: 100%;
    }
    textarea { min-height: 110px; resize: vertical; }
    form { display: grid; gap: 12px; }
    .notice {
      background: #ecfdf5;
      border: 1px solid #99f6e4;
      border-radius: 10px;
      color: #065f46;
      margin-top: 12px;
      padding: 12px;
    }
    .error {
      background: #fff7ed;
      border-color: #fed7aa;
      color: var(--danger);
    }
    .hidden { display: none; }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>TransTrak Shared Trip</h1>
      <p class="muted">Temporary safety view shared by a passenger.</p>
    </header>

    <section id="state" class="card">
      <p id="stateText">Loading trip details...</p>
    </section>

    <section id="content" class="hidden">
      <section class="card">
        <h2>Trip</h2>
        <div class="grid">
          <div class="field"><span class="label">Pickup</span><p id="pickup" class="value"></p></div>
          <div class="field"><span class="label">Destination</span><p id="destination" class="value"></p></div>
          <div class="field"><span class="label">Status</span><p id="status" class="value"></p></div>
          <div class="field"><span class="label">Expires</span><p id="expires" class="value"></p></div>
        </div>
      </section>

      <section class="card">
        <h2>Driver and Vehicle</h2>
        <div class="grid">
          <div class="field"><span class="label">Driver</span><p id="driver" class="value"></p></div>
          <div class="field"><span class="label">Phone</span><p id="driverPhone" class="value"></p></div>
          <div class="field"><span class="label">Vehicle</span><p id="vehicle" class="value"></p></div>
          <div class="field"><span class="label">Plate</span><p id="plate" class="value"></p></div>
        </div>
      </section>

      <section id="locationCard" class="card hidden">
        <h2>Latest Driver Location</h2>
        <p id="locationTime" class="muted"></p>
        <p class="muted">Location is shown only while the trip is active and a recent update is available.</p>
        <p style="margin-top: 12px;"><a id="mapLink" class="button" href="#" target="_blank" rel="noreferrer">Open in Google Maps</a></p>
      </section>

      <section class="card">
        <h2>Report a Safety Concern</h2>
        <p class="muted">Use this only for genuine concerns about this shared trip. The report goes to TransTrak administrators.</p>
        <form id="reportForm">
          <label>Name<input id="reporterName" required minlength="2" autocomplete="name" /></label>
          <label>Phone number<input id="reporterPhone" required minlength="6" inputmode="tel" autocomplete="tel" /></label>
          <label>Relationship to passenger<input id="relationship" placeholder="Parent, friend, sibling, colleague" /></label>
          <label>Concern type
            <select id="concernType" required>
              <option>Passenger cannot be reached</option>
              <option>Trip is taking too long</option>
              <option>Route or location looks unusual</option>
              <option>Driver or vehicle information concern</option>
              <option>Possible emergency</option>
              <option>Other safety concern</option>
            </select>
          </label>
          <label>Description<textarea id="description" required minlength="15" placeholder="Explain what happened and what action you need."></textarea></label>
          <button type="submit">Submit safety report</button>
        </form>
        <div id="reportMessage" class="notice hidden"></div>
      </section>
    </section>
  </main>

  <script>
    const token = new URLSearchParams(window.location.search).get("token");
    const endpoint = window.location.origin + window.location.pathname;
    const statusLabels = {
      1000: "Pending",
      2000: "Accepted / Active",
      3000: "Rejected",
      4000: "Cancelled",
      5000: "Completed"
    };

    function text(id, value) {
      document.getElementById(id).textContent = value || "Not available";
    }

    function formatDate(value) {
      return value ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(value)) : "Not available";
    }

    function setState(message, isError) {
      const state = document.getElementById("state");
      state.classList.toggle("error", Boolean(isError));
      document.getElementById("stateText").textContent = message;
    }

    async function loadTrip() {
      if (!token) {
        setState("This safety link is missing its access token.", true);
        return;
      }

      const response = await fetch(endpoint + "?format=json&token=" + encodeURIComponent(token));
      const payload = await response.json();

      if (!payload.ok) {
        setState("This safety link is invalid, expired, or revoked.", true);
        return;
      }

      document.getElementById("state").classList.add("hidden");
      document.getElementById("content").classList.remove("hidden");

      text("pickup", payload.trip.pickupName);
      text("destination", payload.trip.destinationName);
      text("status", statusLabels[payload.trip.statusId] || "Unknown");
      text("expires", formatDate(payload.expiresAt));
      text("driver", payload.driver.name);
      text("driverPhone", payload.driver.phone);
      text("vehicle", payload.driver.vehicleLabel);
      text("plate", payload.driver.plateNumber);

      if (payload.driver.latestLocation) {
        const loc = payload.driver.latestLocation;
        document.getElementById("locationCard").classList.remove("hidden");
        text("locationTime", "Last update: " + formatDate(loc.recordedAt));
        document.getElementById("mapLink").href =
          "https://www.google.com/maps/search/?api=1&query=" +
          encodeURIComponent(loc.latitude + "," + loc.longitude);
      }
    }

    document.getElementById("reportForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.getElementById("reportMessage");
      message.className = "notice";
      message.textContent = "Submitting report...";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reporterName: document.getElementById("reporterName").value,
          reporterPhone: document.getElementById("reporterPhone").value,
          reporterRelationship: document.getElementById("relationship").value,
          concernType: document.getElementById("concernType").value,
          description: document.getElementById("description").value
        })
      });
      const payload = await response.json();

      if (!payload.ok) {
        message.className = "notice error";
        message.textContent = payload.error || "The report could not be submitted.";
        return;
      }

      message.textContent = "Safety report submitted. A TransTrak administrator can now review this trip.";
      document.getElementById("reportForm").reset();
    });

    loadTrip().catch(() => setState("Could not load the shared trip. Check your internet connection and try again.", true));
  </script>
</body>
</html>`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(request.url);

  try {
    if (request.method === "POST") {
      const body = await request.json();
      const payload = await callRpc("submit_shared_trip_report", {
        p_token: body.token,
        p_reporter_name: body.reporterName,
        p_reporter_phone: body.reporterPhone,
        p_reporter_relationship: body.reporterRelationship,
        p_concern_type: body.concernType,
        p_description: body.description,
      });

      return jsonResponse(payload, payload?.ok === false ? 400 : 200);
    }

    if (url.searchParams.get("format") === "json") {
      const payload = await callRpc("get_shared_trip", {
        p_token: url.searchParams.get("token") ?? "",
      });

      return jsonResponse(payload, payload?.ok === false ? 404 : 200);
    }

    const publicPageUrl = publicSharedTripPageUrl();

    if (publicPageUrl) {
      const redirectUrl = new URL(publicPageUrl);
      const token = url.searchParams.get("token");

      if (token) {
        redirectUrl.searchParams.set("token", token);
      }

      redirectUrl.searchParams.set("api", `${url.origin}${url.pathname}`);

      return Response.redirect(redirectUrl.toString(), 302);
    }

    return jsonResponse(
      {
        ok: false,
        error:
          "This Edge Function is a JSON API. Set PUBLIC_TRIP_SHARE_PAGE_URL to redirect users to the hosted shared-trip page.",
      },
      400
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected server error.",
      },
      500
    );
  }
});
