/** Request header set by `middleware.ts` for `/app?session_id=…` (layouts cannot read searchParams). */
export const STRIPE_CHECKOUT_SESSION_HEADER = "x-dap-stripe-session-id";

/** Current path + search (e.g. `/queue?x=1`) for `login?next=` from server layouts. */
export const DAP_PATHNAME_HEADER = "x-dap-pathname";
