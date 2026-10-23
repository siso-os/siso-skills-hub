# siso-lsp — worked examples

Five canonical cases. In each, the **bad** path is the Grep/Read habit that
leaks tokens; the **good** path uses `siso-lsp`. Pick the matching example
when the user's request looks similar.

---

## 1. "Where is `processOrder` defined?"

Bad — leaks ~6.5K tokens:

```
Grep "processOrder"        # → 14 hits across 9 files
Read src/api/checkout.ts   # 240 lines just to see the import
Read src/lib/orders.ts     # 410 lines to find the actual decl
```

Good — ~580 tokens:

```bash
siso-lsp def processOrder
# → src/lib/orders.ts:42:17  export async function processOrder(o: Order): Promise<Receipt> {
```

One line. Now Read `src/lib/orders.ts` only if you need the body.

---

## 2. "What calls `useAuthGuard`?"

Bad — leaks ~1.5K tokens, often misses dynamic re-exports:

```
Grep "useAuthGuard" --glob "*.ts*"
# → 22 matches; need to dedupe imports vs call sites by hand
```

Good:

```bash
siso-lsp refs useAuthGuard
# → src/hooks/useAuthGuard.ts:8:14   (declaration)
#   src/pages/dashboard.tsx:12:9     useAuthGuard()
#   src/pages/admin.tsx:5:11         useAuthGuard()
#   src/components/Topbar.tsx:18:24  useAuthGuard({ silent: true })
```

LSP knows declarations vs uses. Grep doesn't.

---

## 3. "What's the type of `cart` on line 88 of `Checkout.tsx`?"

Bad — leaks ~2.5K tokens reading the whole component to chase `useState`
back to its inferred type:

```
Read src/components/Checkout.tsx       # 320 lines
Grep "type Cart"                       # 4 candidates
Read src/types/cart.ts                 # 80 more lines
```

Good — one call, ~60 tokens:

```bash
siso-lsp hover src/components/Checkout.tsx:88:14
# → src/components/Checkout.tsx:88:14    const cart = useCart();
#       const cart: { items: CartItem[]; total: number; coupon?: Coupon }
```

---

## 4. "Find every workspace symbol that mentions `TaskList`."

Bad:

```
Grep "TaskList" --glob "*.ts*" --output_mode content
# → 90+ lines of import noise + JSX
```

Good — fuzzy workspace symbol search, dedup'd, kind-tagged:

```bash
siso-lsp symbols TaskList
# → src/components/TaskList.tsx:14:14   Class TaskList
#   src/components/TaskList.tsx:9:18    Interface TaskListProps
#   src/lib/api.ts:67:17                Function fetchTaskList
#   src/state/tasks.ts:23:14            Variable taskListAtom  [tasksStore]
```

Use this **first** when you don't know the exact name yet.

---

## 5. "Who calls `dispatchPayment` and what does it call?"

Bad — needs two passes, leaks ~7.5K tokens:

```
Grep "dispatchPayment("                # callers
Read src/lib/payments.ts               # to see what it calls
# manually trace each helper
```

Good:

```bash
siso-lsp calls dispatchPayment
# # dispatchPayment
#
# ## incoming
#   src/api/checkout.ts:104:9   handleSubmit          await dispatchPayment(cart, user)
#   src/jobs/retry.ts:33:5      retryFailedPayment    dispatchPayment(p.cart, p.user)
#
# ## outgoing
#   src/lib/stripe.ts:18:23     stripeCharge           const charge = await stripeCharge(...)
#   src/lib/audit.ts:7:23       writeAuditLog          await writeAuditLog({ kind: 'pay', ... })
#   src/lib/notify.ts:12:23     sendReceiptEmail       await sendReceiptEmail(user, charge)
```

Two perspectives, one call. Grep can't model "outgoing" — it can only see the
text body, not the resolved call targets.

---

## Heuristic — when in doubt

```
Question:                  Subcommand:
"where is X"               def
"who uses / calls X"       refs   (or calls for both directions)
"what type / what does X   hover  (need file:line:col — get it from def first)
 return"
"any symbol like ___"      symbols
"why isn't this compiling" diag
```

If a subcommand returns `(no …)`, the LSP genuinely doesn't see the symbol —
either the project root is wrong (try `--root`), the language is wrong
(try `--lang`), or you really do need to Grep. Don't Grep first.
