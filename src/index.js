// ── 1. Helper ──────────────────────────────────────────────────────────
async function apiFetch(env, method, path, params) {
  const url = new URL(`https://${env.CTM_API_HOST}/${env.CTM_BASE_PATH}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    }
  }
  const auth = btoa(`${env.CTM_ACCESS_KEY}:${env.CTM_SECRET_KEY}`);
  const res = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CTM API ${res.status}: ${body}`);
  }
  return res.json();
}

// ── 2. TOOLS ───────────────────────────────────────────────────────────
const TOOLS = {
  ctm_api__list_accounts: {
    description:
      "List all CTM accounts accessible with the current credentials. Returns account IDs, names, and status.",
    params: {},
  },

  ctm_api__list_calls: {
    description:
      "List calls and form submissions (activities) for a CTM account. Supports date filtering and pagination. Returns caller info, source, duration, status, and tracking data. Use this to answer questions like 'how many leads this week' or 'show me recent calls'.",
    params: {
      account_id: {
        type: "string",
        description: "CTM account ID (required)",
        required: true,
      },
      start_date: {
        type: "string",
        description:
          "Filter activities on or after this date. ISO 8601 format, e.g. 2026-09-01",
        required: false,
      },
      end_date: {
        type: "string",
        description:
          "Filter activities on or before this date. ISO 8601 format, e.g. 2026-09-25",
        required: false,
      },
      page: {
        type: "number",
        description: "Page number for pagination (default 1)",
        required: false,
      },
      per_page: {
        type: "number",
        description:
          "Results per page, max 100 (default 25)",
        required: false,
      },
      search: {
        type: "string",
        description:
          "Search term to filter activities (caller name, number, etc.)",
        required: false,
      },
      direction: {
        type: "string",
        description:
          "Filter by call direction: inbound, outbound. Omit for all.",
        required: false,
      },
      status: {
        type: "string",
        description:
          "Filter by call status: answered, missed, voicemail. Omit for all.",
        required: false,
      },
    },
  },

  ctm_api__get_call: {
    description:
      "Get full details of a single call or form submission by its ID. Returns caller info, source, duration, recording URL, transcription link, tags, notes, UTM data, and more.",
    params: {
      account_id: {
        type: "string",
        description: "CTM account ID (required)",
        required: true,
      },
      call_id: {
        type: "string",
        description: "The call/activity ID or SID (required)",
        required: true,
      },
    },
  },

  ctm_api__list_sources: {
    description:
      "List tracking sources configured for a CTM account. Shows source names, IDs, and associated tracking numbers. Useful for understanding which channels are tracked.",
    params: {
      account_id: {
        type: "string",
        description: "CTM account ID (required)",
        required: true,
      },
    },
  },

  ctm_api__list_numbers: {
    description:
      "List tracking phone numbers for a CTM account. Shows number, label, source, and routing info.",
    params: {
      account_id: {
        type: "string",
        description: "CTM account ID (required)",
        required: true,
      },
    },
  },

  ctm_api__get_call_recording: {
    description:
      "Get the recording URL for a specific call. Returns a direct link to the call recording audio.",
    params: {
      account_id: {
        type: "string",
        description: "CTM account ID (required)",
        required: true,
      },
      call_sid: {
        type: "string",
        description:
          "The call SID (starts with CA, required)",
        required: true,
      },
    },
  },

  ctm_api__list_form_reactions: {
    description:
      "List form submissions (form reactor activities) for a CTM account. These are web form leads that were pushed into CTM. Supports date filtering and pagination.",
    params: {
      account_id: {
        type: "string",
        description: "CTM account ID (required)",
        required: true,
      },
      start_date: {
        type: "string",
        description: "Filter on or after this date. ISO 8601 format.",
        required: false,
      },
      end_date: {
        type: "string",
        description: "Filter on or before this date. ISO 8601 format.",
        required: false,
      },
      page: {
        type: "number",
        description: "Page number (default 1)",
        required: false,
      },
      per_page: {
        type: "number",
        description: "Results per page, max 100 (default 25)",
        required: false,
      },
    },
  },
};

// ── 3. executeTool ─────────────────────────────────────────────────────
async function executeTool(env, name, args) {
  switch (name) {
    case "ctm_api__list_accounts": {
      return apiFetch(env, "GET", "/accounts.json");
    }

    case "ctm_api__list_calls": {
      const p = {};
      if (args.page) p.page = args.page;
      if (args.per_page) p.per_page = args.per_page;
      if (args.start_date) p.start_date = args.start_date;
      if (args.end_date) p.end_date = args.end_date;
      if (args.search) p.search = args.search;
      if (args.direction) p.direction = args.direction;
      if (args.status) p.status = args.status;
      return apiFetch(
        env,
        "GET",
        `/accounts/${args.account_id}/calls.json`,
        p
      );
    }

    case "ctm_api__get_call": {
      return apiFetch(
        env,
        "GET",
        `/accounts/${args.account_id}/calls/${args.call_id}.json`
      );
    }

    case "ctm_api__list_sources": {
      return apiFetch(
        env,
        "GET",
        `/accounts/${args.account_id}/sources.json`
      );
    }

    case "ctm_api__list_numbers": {
      return apiFetch(
        env,
        "GET",
        `/accounts/${args.account_id}/numbers.json`
      );
    }

    case "ctm_api__get_call_recording": {
      return {
        recording_url: `https://${env.CTM_API_HOST}/${env.CTM_BASE_PATH}/accounts/${args.account_id}/calls/${args.call_sid}/recording`,
      };
    }

    case "ctm_api__list_form_reactions": {
      const p = { search_type: "form_post" };
      if (args.page) p.page = args.page;
      if (args.per_page) p.per_page = args.per_page;
      if (args.start_date) p.start_date = args.start_date;
      if (args.end_date) p.end_date = args.end_date;
      return apiFetch(
        env,
        "GET",
        `/accounts/${args.account_id}/calls.json`,
        p
      );
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ── 4. handleRpc ───────────────────────────────────────────────────────
async function handleRpc(request, env) {
  const body = await request.json();
  const { id, method, params } = body;

  if (method === "tools/list") {
    const tools = Object.entries(TOOLS).map(([name, t]) => ({
      name,
      description: t.description,
      inputSchema: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(t.params).map(([k, v]) => [
            k,
            { type: v.type, description: v.description },
          ])
        ),
        required: Object.entries(t.params)
          .filter(([, v]) => v.required)
          .map(([k]) => k),
      },
    }));
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id, result: { tools } }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  if (method === "tools/call") {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};
    try {
      const result = await executeTool(env, toolName, toolArgs);
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `Error: ${err.message}` }],
            isError: true,
          },
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  }

  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

// ── 5. Worker entry ────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", tools: Object.keys(TOOLS).length }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Auth check
    const authHeader = request.headers.get("Authorization") || "";
    const expected = `Bearer ${env.MCP_AUTH_TOKEN}`;
    if (authHeader !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // MCP endpoint
    if (url.pathname === "/mcp" && request.method === "POST") {
      return handleRpc(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};
