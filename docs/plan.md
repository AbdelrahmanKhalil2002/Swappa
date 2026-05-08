# Swappa — Project Plan

## Project Overview

Swappa is an eCommerce platform for interchangeable-heel shoes. The product's core differentiator is a modular heel system — customers configure and purchase base shoes paired with swappable heel styles that physically click in and out.

The platform consists of two web applications under one domain:

- **Storefront** — `swappa.com` — customer-facing shopping experience
- **Admin Panel** — `admin.swappa.com` — full ERP-style operations hub

Both apps share a single backend API and database. All modules stay in sync — an order placed on the storefront updates inventory, triggers manufacturing demand, feeds accounting, and logs to audit trails automatically.

---

## Architecture Overview

```
monorepo/
├── apps/
│   ├── storefront/          # Customer website (Next.js)
│   ├── admin/               # Admin panel (Next.js)
│   ├── api/                 # Backend API (NestJS)
│   └── factory-app/         # Factory floor PWA (Next.js PWA)
├── packages/
│   ├── ui/                  # Shared UI components
│   ├── types/               # Shared TypeScript types & Prisma client
│   └── utils/               # Shared utilities
```

**Domain setup:**
- `swappa.com` → Storefront
- `admin.swappa.com` → Admin panel
- `factory.swappa.com` → Factory floor PWA (internal)
- All served behind Cloudflare reverse proxy

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Storefront | Next.js 14+ (App Router) | SSR/SSG for SEO, Core Web Vitals |
| Admin Panel | Next.js 14+ | Consistent stack, fast iteration |
| Factory PWA | Next.js PWA | Offline-capable, installable on factory devices |
| Admin UI | shadcn/ui + Ant Design | Rich data tables, forms, charts |
| Backend API | NestJS (Node.js, TypeScript) | Modular, scalable, decorator-based |
| Database | PostgreSQL | Relational integrity for ERP-style data |
| ORM | Prisma | Type-safe queries, clean migrations |
| Cache | Redis | Sessions, rate limiting, queues |
| Job Queue | BullMQ (Redis) | Background jobs, email, notifications, reports |
| File Storage | Cloudflare R2 | Product images, QC photos, invoices, exports |
| Auth | JWT + Refresh Tokens | Separate auth contexts: customer / admin / factory |
| Payments | Stripe | Cards, Apple Pay, Google Pay, webhooks, refunds |
| Email | Resend + React Email | Transactional emails with branded templates |
| Shipping | EasyPost / ShipStation | Multi-carrier: DHL, Aramex, Bosta, SMSA |
| Monorepo | Turborepo | Shared packages, fast parallel builds |
| CI/CD | GitHub Actions | Lint, type-check, test, deploy pipeline |
| Deployment | Vercel (frontends) + Railway (API) | Managed, scalable |
| Monitoring | Sentry + Grafana | Error tracking, performance dashboards |

---

## Feature Scope

### Storefront

- Homepage: hero, featured products, lookbook, promotions banner
- Product catalog with filters: size, color, heel style, height, price
- **Heel Configurator** — interactive visual builder: pick base shoe → pick heel style → see combined preview → add to cart
- **Digital Size Profile** — customer enters foot measurements once; system recommends correct size per model and tracks if returns are size-related
- Product detail pages: image gallery, 360 viewer (Phase 2: AR), compatibility info, size guide, reviews
- Cart: persisted for logged-in users, localStorage for guests, real-time stock validation
- Wishlist and saved configurations
- Guest and authenticated checkout
- Stripe payment: cards, Apple Pay, Google Pay
- Coupon codes and automatic discounts at checkout
- Order confirmation email with itemized summary
- Customer account: order history, return requests, saved addresses, size profile, loyalty points
- Order tracking page with real-time carrier status
- **Heel Care & Mechanism Guide** — dedicated content section: how to click/detach heels, cleaning, storage. Reduces support tickets, builds trust.
- Product reviews with photos
- Multi-language (i18n) and multi-currency
- Responsive design, mobile-first

---

### Admin Panel — ERP Modules

Organized as discrete modules with a sidebar navigator — similar to Odoo's app structure. Each module has its own permission scope.

---

#### Module 1 — Dashboard

- Live KPIs: revenue today/week/month, orders, low-stock alerts, production status, open support tickets
- Sales trend chart (daily, weekly, monthly, year-over-year)
- Top-selling base shoes and heel styles
- Manufacturing throughput vs. target
- Recent orders feed and alert center

---

#### Module 2 — Catalog & Products

- Base shoe management: name, SKU, description, category, tags, SEO metadata
- Heel style management: name, type (stiletto, block, wedge, flat), height, material
- **Heel Compatibility Matrix** — define which heel styles fit which base shoes (many-to-many); validation prevents incompatible combinations from being ordered
- Product variant management: size, color, material per (base shoe + heel style) combination
- Bulk price editing and pricing rules
- Media management: multi-image upload per variant, video, 360-degree viewer assets
- Product status: draft, active, archived

**Core data model:**
```
BaseShoe → HeelStyle (via HeelCompatibility)
ProductVariant (baseShoeId + heelStyleId + size + color)
HeelCompatibility (baseShoeId, heelStyleId, isCompatible, notes)
```

---

#### Module 3 — Media & Asset Management

- Centralized media library (Cloudflare R2)
- Upload, tag, and organize images and videos per product/variant
- Variant-level image assignment (e.g. specific image per color)
- 360-degree viewer asset sets
- QC defect photo storage (linked to production records)
- Image optimization pipeline on upload

---

#### Module 4 — Inventory (Advanced)

- Stock tracked per: SKU × size × color × heel style × warehouse location
- Stock states: available, reserved (pending order), damaged, quarantine (QC hold)
- Real-time deduction on order placement; restoration on cancellation or return approval
- Manual stock adjustments with reason codes
- Write-off recording (damaged, expired, lost)
- Low-stock threshold per SKU with configurable alerts
- Stocktaking tool: expected vs. physical count reconciliation
- Stock movement log: every change recorded with timestamp and actor
- *(Multi-warehouse routing: Phase 2)*

---

#### Module 5 — Raw Materials Management

Track everything that goes into making the shoes — not just finished goods.

- Material catalog: leather, heel components, magnetic locking mechanism, adhesive, packaging, accessories
- Stock level per material with unit of measure
- Minimum stock threshold and reorder alerts
- Material cost per unit (updated on each purchase)
- Consumption tracking: deduct materials when a production order is started
- Wastage recording and wastage rate per material
- Supplier linkage per material
- Material movement log

---

#### Module 6 — Manufacturing Module

Full production lifecycle tracking. This is what separates Swappa from a simple inventory system.

**Production Stages (configurable per product):**
```
Material Prep → Cutting → Assembly → Mechanism Installation → QC → Finishing → Packaging → Ready
```

Features:
- Production orders: create, schedule, assign to team/worker
- Bill of Materials (BOM) per product variant — defines exact material quantities needed
- Raw material auto-reservation when production order is confirmed
- Stage-by-stage progress tracking with timestamps
- Units: planned / in-progress / completed / defective / rejected
- **Production Cost Calculator** — auto-calculates per unit:
  - Raw materials cost (from BOM × current material prices)
  - Labor cost (hours × hourly rate)
  - Packaging cost
  - Overhead allocation
  - → outputs: unit cost, batch cost, target margin check
- Defect logging with quantity and defect type
- Failed batch management: quarantine or scrap
- Production throughput reports: actual vs. planned output per period
- Inventory auto-increase when production order is marked complete

---

#### Module 7 — Quality Control

A dedicated QC workflow separate from manufacturing stages.

- QC checklist per product type (configurable):
  - Heel lock mechanism test (click in / click out)
  - Stability test (load bearing)
  - Visual inspection (stitching, finish, color consistency)
  - Packaging integrity
- **Damage Tagging Standard**: structured defect taxonomy — defect type → severity → required photo. QC workers must photograph each defect with a label before logging. Photos stored in media library and linked to production record.
- QC approval flow: QC Inspector submits → QC Manager reviews → approve (moves to packaging) or reject (moves to rework/scrap)
- Failed unit tracking: defect type, batch, date, inspector
- Defect rate reporting per product, per batch, per inspector
- Rework orders for repairable units
- Scrap accounting: scrapped units feed into loss calculations in finance

---

#### Module 8 — Procurement & Suppliers

- Supplier directory: company info, contact, categories supplied, payment terms
- **Supplier Portal** — suppliers get a limited login to:
  - View open purchase orders addressed to them
  - Update expected delivery dates
  - Upload delivery documents and material certificates
  - View payment status
- Purchase order creation: select supplier, materials, quantities, expected delivery
- Purchase order PDF export and email send
- Goods receipt: record what arrived, flag shortages or damage
- Raw material stock auto-update on receipt
- Supplier performance dashboard:
  - On-time delivery rate
  - Material defect rate
  - Average lead time
  - Price trends over time
- Cost comparison across suppliers for the same material

---

#### Module 9 — Orders Management

- Full order list with lifecycle status: placed → confirmed → packed → shipped → delivered → closed
- Order detail view: customer, items (base shoe + heel style + size + color), payment, address, timeline
- Manual order creation (phone sales, in-person)
- Order editing (before packing) and cancellation
- Packing slip and shipping label generation
- Bulk actions: confirm, print labels, mark shipped
- Order notes (internal and customer-visible)
- Payment status tracking: paid, pending, failed, refunded

---

#### Module 10 — Returns & Exchange Logic

Returns are high-frequency in footwear. This module handles the full lifecycle.

- **Return types**: full return, size exchange, heel style exchange, warranty claim
- Customer-initiated return request from account page or admin-created manually
- Return reasons tracked: wrong size, defective, changed mind, wrong item, mechanism issue
- **Digital Size Profile integration**: if return reason is "wrong size," system flags if the customer's size profile predicted a different size — feeds into recommendation improvement
- RMA (Return Merchandise Authorization) generation
- Return inspection workflow: item received → inspected → condition assessed → decision made
- Resolution options: refund to original payment, store credit, exchange dispatch
- Stripe refund execution directly from admin
- **Warranty tracking**: each order has a warranty start date; system flags if return is within warranty window
- Returned item restocking (if condition is resalable) or scrapping (links to QC)
- Return reason analytics: most returned size, most returned model, most common defect type

---

#### Module 11 — Shipping & Delivery

- **Carriers**: DHL, Aramex, Bosta, SMSA — integrated via EasyPost or ShipStation
- Architecture designed from day one to add/remove carriers via config, not code changes
- Auto rate shopping: fastest and cheapest options surfaced per order
- Shipping label generation per order or in bulk
- Real-time tracking sync via carrier webhook → order status updated automatically
- Customer tracking page: live status with carrier events
- Delivery SLA monitoring: configurable per carrier/zone; breach triggers alert
- Failed delivery management: re-dispatch workflow
- Shipping cost recording feeds into order profitability calculation

---

#### Module 12 — CRM & Customer Profiles

- Customer directory with full profile:
  - Order history and lifetime value
  - Preferred sizes and heel styles (from order history)
  - **Digital Size Profile**: foot measurements entered by customer
  - Return history and return frequency
  - Support ticket history
  - Communication log
  - Internal notes and tags
- Customer segmentation: VIP, at-risk, new, repeat, high-return-rate
- Merge duplicate accounts
- Manual communication log entry
- Customer export (CSV) for marketing tools
- Klaviyo / Mailchimp segment push integration

---

#### Module 13 — Customer Support

- Support ticket intake: customer-submitted or admin-created
- Ticket categories: order issue, return, size question, mechanism help, payment, other
- Priority levels: low, normal, high, urgent
- Assignment to support agents
- Internal notes vs. customer-visible replies
- Link ticket to order, return, or product
- SLA tracking per priority level; breach alerts
- Ticket escalation rules
- Agent performance metrics: response time, resolution time, tickets closed
- **Heel Care & Mechanism Guide integration**: support agents can paste relevant guide sections directly into ticket replies

---

#### Module 14 — Reviews & Content Moderation

- All submitted reviews with star rating, text, and photos
- Moderation queue: approve, reject, flag as spam
- Admin reply to reviews (public)
- Bulk moderation actions
- Review analytics: average rating per product, rating distribution, photo submission rate
- Spam detection (flagged for review if content matches patterns)
- Negative review alert: auto-notify support if 1–2 star review submitted

---

#### Module 15 — Promotions & Discounts

- Coupon codes: fixed amount, percentage, free shipping, product-specific
- Automatic discounts: cart total rules, buy-X-get-Y, volume pricing
- Flash sales: time-limited with countdown, inventory cap, automatic expiry
- Bundle promotions: base shoe + heel styles packaged at a discount
- Promotion stacking rules (can multiple discounts combine?)
- Loyalty points redemption at checkout
- Promotion usage analytics: redemption count, revenue generated, margin impact
- Affiliate tracking: UTM-linked referral codes with commission tracking

---

#### Module 16 — Accounting & Finance

Full double-entry accounting synced with the rest of the system.

- **Chart of accounts** — configurable account structure
- **Auto journal entries** triggered by system events:
  - Order paid → revenue entry
  - Refund issued → refund entry
  - Purchase order received → inventory asset + payable entry
  - Production completed → COGS entry based on production cost
  - Scrap recorded → loss entry
- **Income & expense tracking** with categories (manual entries + auto from operations)
- **Profit & Loss statement** (by day, month, quarter, year)
- **COGS calculation** pulled from manufacturing cost data
- **Revenue breakdown**: by product, by heel style, by category, by channel
- **Cashflow view**: inflows vs. outflows over time
- **Tax configuration**: VAT rates by product type and region; auto-applied at checkout
- **Invoice generation** (PDF): for B2B/wholesale orders
- **Payroll tracking**: employee salary records and monthly payroll entries
- **Refund accounting**: refunds reflected in revenue and cash accounts
- **Reports export**: PDF and Excel for all financial reports
- QuickBooks / Xero-compatible export format

---

#### Module 17 — HR & Roles

- Employee directory: name, role, department, contact
- **Role-Based Access Control (RBAC)** — granular permissions:
  - Factory worker → manufacturing and QC modules only
  - Accountant → finance module only
  - Support agent → orders, returns, support modules only
  - Warehouse staff → inventory module only
  - Supplier → supplier portal only (external, limited)
  - Full admin → everything
- Role editor: create custom roles and assign module-level permissions (read / write / delete)
- Invite new admin users by email
- Deactivate and offboard users
- Activity feed per employee (what they did and when)

---

#### Module 18 — Notifications & Alerts

- In-app notification center with unread count
- Configurable alert rules per module:
  - Inventory: SKU below threshold
  - Manufacturing: production order delayed, defect rate exceeded
  - Orders: SLA breach, failed payment
  - Returns: high return rate on a product
  - Finance: expense category overspent
  - Support: ticket SLA breach
- Delivery channels: in-app, email, Slack webhook
- Notification history and read status
- Alert frequency controls (no duplicate alerts within X minutes)

---

#### Module 19 — Analytics & Reporting

Beyond basic dashboards — queryable, drillable data.

**Sales:**
- Revenue by product, heel style, category, size, color, period
- Best-selling base shoes and heel styles
- Most profitable model (revenue minus COGS)
- Average order value trends
- Conversion funnel: visitors → add to cart → checkout → purchase

**Inventory & Manufacturing:**
- Manufacturing waste report: scrapped units, material wastage, cost of waste
- Defect rate by product, batch, and inspector
- Production throughput vs. planned
- Slow-moving SKUs (low sales velocity vs. stock level)

**Customer:**
- Repeat purchase rate and cohort retention
- Customer lifetime value distribution
- Most returned size per model
- Return reason breakdown
- Digital Size Profile accuracy: did the size recommendation prevent returns?

**Finance:**
- P&L trend charts
- Expense category breakdown
- Manufacturing cost vs. selling price margin analysis
- Break-even analysis per product

**Custom report builder**: select columns, date range, filters → export to PDF or Excel.
**Scheduled reports**: configure delivery to email on a weekly or monthly schedule.

---

#### Module 20 — Audit Logs

- Immutable log of every create / update / delete action across all modules
- Logged fields: actor, timestamp, module, record ID, action type, before state, after state
- Searchable by actor, module, date range, action type
- Non-deletable: admins cannot erase log entries
- Export for compliance

---

#### Module 21 — Integrations Hub

- **Payments**: Stripe (primary), PayPal (optional)
- **Shipping**: EasyPost or ShipStation → DHL, Aramex, Bosta, SMSA
- **Email**: Resend / SendGrid
- **Marketing**: Klaviyo or Mailchimp customer segment sync
- **Social commerce**: Meta and TikTok product catalog sync
- **Accounting export**: QuickBooks / Xero format
- **SMS**: Twilio (order confirmation, shipping updates)
- **Analytics**: Google Analytics 4, Meta Pixel on storefront
- **Webhooks manager**: configure outbound webhooks per system event to any external URL

---

#### Module 22 — Settings & Configuration

- Store identity: name, logo, brand colors, timezone, default currency, default language
- Tax rules per product type and region
- Shipping zones and base rates
- Payment method configuration
- Email template editor (branded transactional emails)
- Notification rule configuration
- Manufacturing stage definitions (configurable per product type)
- QC checklist editor

---

### Factory Floor Mobile PWA

A separate lightweight app for production workers — installable on tablets or phones on the factory floor. Does not require a full admin login.

- Worker logs in with a factory-specific PIN or QR code scan
- View assigned production orders for today
- Update production stage: tap to advance a batch to the next stage
- Log completed units and defective units
- Submit QC inspection: tap through checklist items, photograph defects using device camera
- Defect photo is automatically tagged with: defect type, batch ID, worker ID, timestamp, and uploaded to media library
- Offline-capable: actions queue locally if Wi-Fi drops, sync on reconnect
- Read-only view of their own production history

Workers never see financial data, other modules, or customer information.

---

## Additional Features (Suggested)

| Feature | Description | Value |
|---|---|---|
| **Heel Rental / Subscription** | Monthly heel drop subscription — customer receives a new heel style each season, returns previous | Recurring revenue, reduces one-time purchase barrier |
| **Custom Bundles** | Customer builds their own bundle: base shoe + 2–3 heel styles, shown at a discount | Increases AOV, reinforces the interchangeable concept |
| **Gift Cards** | Purchasable gift cards redeemable at checkout | Gifting use case, especially for seasonal peaks |
| **Store Credit System** | Issue store credit for returns, compensation, or loyalty; tracked per customer wallet | Keeps refund revenue in-store |
| **Loyalty Tiers** | Bronze / Silver / Gold / Platinum tiers with escalating perks (free shipping, early access, bonus points) | Drives repeat purchase and brand attachment |
| **Affiliate & Influencer Program** | Unique referral links with commission tracking; payouts managed in admin | Scales marketing without upfront ad spend |
| **B2B / Wholesale Portal** | Separate pricing tiers, minimum order quantities, and invoice-based checkout for retail partners | Opens a second revenue channel |
| **Sustainability Module** | Track: % recycled materials, carbon offset per shipment, ethical sourcing certifications per supplier | Brand differentiation; increasingly expected by consumers |
| **Style & Outfit Suggestions** | Curated outfit pairings per shoe — editorial content, not AI-generated (Phase 2 can add AI) | Increases engagement, reduces bounce, supports upsell |
| **AR Try-On** | Camera-based virtual try-on on the storefront product page | Strong conversion tool for a visual product *(Phase 2)* |

---

## Phase 2 — Future Features

These are excluded from the initial launch plan but should be considered in architecture decisions today (don't design yourself into a corner).

| Feature | Notes |
|---|---|
| **Multi-Warehouse** | Cairo warehouse confirmed as Phase 1. Schema should support `warehouseId` from day one even if only one warehouse is used at launch |
| **AI Sales Forecasting** | Predict demand per SKU based on historical velocity and seasonality |
| **AI Restock Suggestions** | Auto-suggest purchase orders and production orders when stock is predicted to run low |
| **Slow Product Detection** | Flag SKUs with high stock and declining sales velocity before they become a cash flow problem |
| **Smart Size Recommendations** | ML model trained on purchase + return data to improve size suggestions per customer |
| **AI Fashion Assistant** | Storefront chatbot: "I need a heel for a wedding" → product suggestions |
| **AR Try-On** | Camera-based virtual fitting on product pages |
| **Predictive Quality Control** | Detect defect pattern trends before they escalate (e.g. defect rate rising on a batch) |

---

## Sprint Plan

17 sprints × 2 weeks = **34 weeks (~8.5 months)** for full production launch.

With a team of 2–3 developers, sprints 5–10 can run in parallel across team members once the core data model from Sprint 4 is in place.

### Progress

| Sprint | Status |
|---|---|
| 0 — Foundation & DevOps | ✅ Complete |
| 1 — Auth & RBAC | ✅ Complete |
| 2 — Product Catalog + Heel Compatibility Matrix | ✅ Complete |
| 3 — Heel Configurator + Media + Size Profile | ✅ Complete (image optimization deferred to Sprint 17) |
| 4 — Cart, Checkout & Payments | ✅ Complete (emails + inventory reservation deferred) |
| 5 — Advanced Inventory | ✅ Complete (multi-warehouse deferred to Phase 2) |
| 6–17 | ⏳ Not started |

---

### Sprint 0 — Foundation & DevOps (Weeks 1–2) ✅

**Goal:** Everything scaffolded and deployed before writing a single feature.

- [x] Initialize Turborepo monorepo
- [x] Scaffold `apps/storefront`, `apps/admin`, `apps/api`, `apps/factory-app`
- [x] Set up `packages/ui`, `packages/types`, `packages/utils`
- [x] Configure TypeScript, ESLint, Prettier across all packages
- [x] Initialize PostgreSQL (local + staging), run Prisma init
- [x] Set up Redis locally and on staging
- [x] Configure GitHub Actions: lint → type-check → test → deploy pipeline
- [x] Deploy all apps to Vercel and Railway (empty shells)
- [x] Configure DNS: `swappa.com`, `admin.swappa.com`, `factory.swappa.com`
- [x] Set up Cloudflare R2 bucket for media storage
- [x] Set up Stripe account, configure test and live keys
- [x] Set up Sentry error tracking on all apps
- [x] Set up Resend account and verify sending domain

**Deliverable:** Running monorepo, all apps live on staging URLs, CI/CD passing.

---

### Sprint 1 — Auth & Role-Based Access (Weeks 3–4) ✅

**Goal:** Secure, separate auth for customers, admins, and factory workers.

- [x] Prisma schema: `Customer`, `AdminUser`, `FactoryWorker`, `Role`, `Permission`, `RolePermission`
- [x] Customer auth: register, login, email verification, forgot/reset password
- [x] Admin auth: invite-only registration (email invite), login, role assignment
- [x] Factory worker auth: PIN-based login for PWA
- [x] JWT + refresh token flow for all three auth contexts
- [x] RBAC middleware on API: every route checks caller's module permissions
- [x] Admin: user management UI — invite, assign role, deactivate, view activity
- [x] Admin: role editor — create roles, assign module-level read/write/delete permissions
- [x] Customer account page: profile settings, password change

**Deliverable:** Secure auth across all apps; RBAC enforced at API level.

---

### Sprint 2 — Product Catalog + Heel Compatibility Matrix (Weeks 5–6) ✅

**Goal:** Core data model defined. Compatibility system working. Products visible on storefront.

- [x] Prisma schema: `BaseShoe`, `HeelStyle`, `HeelCompatibility`, `ProductVariant`, `Category`, `ProductMedia`
- [x] `HeelCompatibility` table: (baseShoeId, heelStyleId, isCompatible, notes) — the compatibility matrix
- [x] API: validation layer that rejects incompatible base shoe + heel style combinations at order time
- [x] Admin: base shoe CRUD with image upload
- [x] Admin: heel style CRUD with type, height, material fields
- [x] Admin: **Compatibility Matrix editor** — visual grid showing which heels fit which shoes; toggle compatibility per pair; bulk-enable all
- [x] Admin: product variant management (size, color, material per combination)
- [x] Admin: category management and product tagging
- [x] Admin: SEO metadata per product
- [x] Storefront: product listing page with filters (size, color, heel style, height, price)
- [x] Storefront: product detail page — show compatible heel styles for this base shoe
- [x] Storefront: category navigation

**Deliverable:** Products live. Compatibility enforced. Incompatible combos blocked at API and UI level.

---

### Sprint 3 — Heel Configurator UI + Media Management (Weeks 7–8) 🔄

**Goal:** The core product experience: visual heel building. Media library operational.

- [x] Admin: media upload per product/variant — proxy upload through API to Cloudflare R2 (single `POST /media/upload`; no browser-to-R2 CORS issues)
- [x] Admin: centralized media library (`/media`) — paginated asset grid, filter by GALLERY / 360° Frame, delete, upload; entity links back to shoe/heel-style
- [x] Admin: 360-degree frame upload — tab on shoe detail page; bulk upload, frame number badges, hint text
- [x] Storefront: **Heel Configurator** — interactive heel picker below product details; layered CSS preview (base shoe + transparent heel overlay if `layerImageUrl` set); live price update; selected heel badge; compatible heels only
- [x] Storefront: **Digital Size Profile** — collapsible prompt on product page; EU sizing chart (218–280 mm); localStorage persistence; in-stock check against available variants; `PATCH /profile/me/size` saves to account when logged in
- [x] Storefront: 360-degree product viewer — drag-to-rotate viewer using uploaded frame sequences; touch support; frame counter; falls back to gallery if fewer than 3 frames
- [x] Storefront: **Heel Care & Mechanism Guide** — `/heel-care` standalone content page; 5 sections (click in, remove, clean, mechanism, storage); FAQ; linked from product detail page
- [ ] Image optimization pipeline (compress and serve via CDN on upload)

**Deliverable:** Configurator live. Media library operational. Size recommendations working.

---

### Sprint 4 — Cart, Checkout & Payments (Weeks 9–10) ✅

**Goal:** Full purchase flow. Revenue flowing.

- [x] Prisma schema: `Order`, `OrderItem`, `Coupon` — cart is localStorage-only (no server-side cart table)
- [x] Cart: localStorage persistence for guests and logged-in users; coupon code support
- [x] Cart page: update quantity, remove item, apply coupon code, order summary sidebar
- [x] Coupon validation API (`POST /checkout/coupon/validate`) with usage limits, expiry, min order amount
- [x] Checkout flow: address → shipping method (Standard free over EGP 500 / Express EGP 120) → payment
- [x] Stripe integration: Payment Intents, card payments via `CardElement`
- [x] Guest checkout (no account required — email captured at checkout)
- [x] Stripe webhook handling: `payment_intent.succeeded` → order PAID/CONFIRMED + coupon increment; `payment_intent.payment_failed` → FAILED
- [x] Order creation on payment intent creation (pending → confirmed on webhook)
- [x] Order confirmation page (`/checkout/success`) with order details
- [x] Customer order history page (`/account/orders`) and order detail (`/account/orders/[id]`)
- [x] Admin: orders list with status filter, search, pagination
- [x] Admin: order detail view with status control (update order status from detail page)
- [x] Admin sidebar: Orders link activated
- [ ] Order confirmation email (customer) and new order notification (admin) — deferred to Sprint 15
- [ ] Inventory reservation on checkout start — deferred to Sprint 5

**Deliverable:** Customers can buy. Orders reach admin. Revenue is live.

---

### Sprint 5 — Advanced Inventory (Weeks 11–12) ✅

**Goal:** Real-time, granular inventory tracking across all dimensions.

- [x] Prisma schema: `StockLevel` (quantity + reserved per variant), `StockMovement`, `AppSetting`
- [x] `StockMovementType` enum: RECEIVED, RESERVED, RELEASED, ADJUSTMENT, WRITE_OFF, STOCKTAKE
- [x] Every stock change writes a `StockMovement` row automatically (transactional, with before/after snapshot)
- [x] Stock reserved on `payment_intent.succeeded` webhook per order item
- [x] Stock released on order cancel (via `release()` method, called when orders are cancelled)
- [x] `InventoryService`: receive, reserve, release, adjust, writeOff, stocktake operations
- [x] Admin: inventory list — search by SKU/name, low-stock filter, available/reserved/total columns
- [x] Admin: inventory detail page — receive stock, manual adjustment (+ or - with reason), write-off, movement log
- [x] Admin: stocktaking tool — full variant list with expected count, physical count input, variance column, bulk submit
- [x] Admin: low-stock threshold configurable via Settings page (`AppSetting` key-value store)
- [x] Admin: Settings page — global low-stock threshold input
- [x] Admin sidebar: Inventory + Settings links activated
- [x] `GET /settings`, `PATCH /settings` endpoints (admin-only)
- [x] `GET /inventory`, `GET /inventory/stocktake`, `POST /inventory/stocktake`, `GET /inventory/:id`, `GET /inventory/:id/movements`, `POST /inventory/:id/receive`, `PATCH /inventory/:id/adjust`, `POST /inventory/:id/write-off`
- [ ] Multi-warehouse routing — deferred to Phase 2 (`warehouseId` can be added to `StockLevel` when needed)

**Deliverable:** Inventory live, accurate, and auditable.

---

### Sprint 6 — Raw Materials Management (Weeks 13–14)

**Goal:** Track everything that goes into the shoes, not just the finished product.

- [ ] Prisma schema: `RawMaterial`, `MaterialStock`, `MaterialMovement`, `MaterialSupplierPrice`
- [ ] Material catalog: leather types, heel components, magnetic locking mechanisms, adhesive, packaging, accessories
- [ ] Stock level per material with unit of measure (meters, units, kg, liters)
- [ ] Minimum stock threshold and reorder alert per material
- [ ] Material cost per unit (updated on each goods receipt)
- [ ] Admin: material stock adjustment and write-off
- [ ] Admin: material movement log (every deduction and receipt recorded)
- [ ] Wastage recording: log material waste with reason (cutting offcuts, spillage, defect)
- [ ] Wastage rate report per material

**Deliverable:** Raw materials tracked from arrival to consumption.

---

### Sprint 7 — Manufacturing Module + QC + Factory PWA (Weeks 15–16)

**Goal:** Full production lifecycle. QC enforced. Factory workers operational on PWA.

**Manufacturing:**
- [ ] Prisma schema: `ProductionOrder`, `ProductionStage`, `BOM`, `BOMLine`, `ProductionCost`
- [ ] Bill of Materials editor per product variant: define material + quantity per unit
- [ ] Production order creation: product, target quantity, schedule date, assigned team
- [ ] Raw material auto-reservation when production order is confirmed
- [ ] Stage-by-stage tracking: Material Prep → Cutting → Assembly → Mechanism Install → QC → Finishing → Packaging → Ready
- [ ] Units tracking per order: planned / in-progress / completed / defective / rejected
- [ ] **Production Cost Calculator** — auto-calculates per unit and per batch:
  - Materials cost (BOM quantities × current material prices)
  - Labor cost (hours logged × hourly rate)
  - Packaging cost
  - Overhead allocation (configurable percentage)
  - Output: unit cost, batch total cost, margin vs. selling price
- [ ] Inventory auto-increment when production order completed
- [ ] Production throughput report: planned vs. actual per period

**Quality Control:**
- [ ] QC checklist per product type (configurable in settings): heel lock test, stability test, visual inspection, packaging check
- [ ] **Damage Tagging Standard**: for each defect logged, worker must select defect type → severity → photograph the defect. Photo auto-tagged with batch ID, worker ID, timestamp.
- [ ] QC approval workflow: Inspector submits → QC Manager reviews → approve (proceed) or reject (rework / scrap)
- [ ] Failed unit resolution: rework order or scrap entry
- [ ] Scrap accounting: scrapped units logged as loss, fed to finance module
- [ ] Defect rate dashboard: by product, batch, defect type, inspector

**Factory Floor PWA:**
- [ ] PWA setup: installable on Android/iOS tablets and phones
- [ ] Factory worker PIN login
- [ ] View today's assigned production orders and current stage
- [ ] Advance a batch to the next production stage (single tap)
- [ ] Log completed and defective unit counts
- [ ] QC checklist UI: tap through checklist items; camera capture for defect photos
- [ ] Offline mode: queue actions locally, sync on reconnect
- [ ] No access to financial data, customer data, or other modules

**Deliverable:** Manufacturing fully tracked. QC enforced. Factory workers on PWA.

---

### Sprint 8 — Procurement & Suppliers + Supplier Portal (Weeks 17–18)

**Goal:** End-to-end procurement from PO creation to goods receipt.

- [ ] Prisma schema: `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `GoodsReceipt`, `SupplierDocument`
- [ ] Supplier directory: company info, contacts, payment terms, materials supplied, certifications
- [ ] Purchase order creation: select supplier, add material lines, set expected delivery
- [ ] PO PDF generation and email send to supplier
- [ ] Goods receipt: record what arrived, flag shortages or damaged materials
- [ ] Raw material stock auto-update on goods receipt
- [ ] Supplier performance metrics: on-time rate, defect rate, average lead time, price trend
- [ ] Cost comparison view across suppliers for the same material
- [ ] **Supplier Portal** (external, limited login):
  - Suppliers receive email invite with login link
  - View open POs addressed to them
  - Update expected delivery date
  - Upload delivery documents and material certificates
  - View payment status (paid / pending)
  - Cannot see any other part of the admin panel

**Deliverable:** Procurement tracked start to finish. Suppliers self-serve via portal.

---

### Sprint 9 — Shipping, Fulfillment & Returns (Weeks 19–20)

**Goal:** Orders get out the door. Returns handled end-to-end.

**Shipping:**
- [ ] EasyPost or ShipStation API integration
- [ ] Carrier configuration: DHL, Aramex, Bosta, SMSA — each as a pluggable connector
- [ ] Auto rate shopping: fastest and cheapest options per order, displayed to fulfillment team
- [ ] Shipping label generation (single and bulk)
- [ ] Tracking number sync: carrier webhook updates order status in real time
- [ ] Customer tracking page: live carrier events displayed
- [ ] Delivery SLA monitoring: breach triggers admin alert
- [ ] Failed delivery workflow: re-dispatch queue

**Returns & Exchange:**
- [ ] Prisma schema: `Return`, `ReturnItem`, `ReturnInspection`, `Refund`, `WarrantyClaim`
- [ ] Customer: submit return request from account (select order, item, return type, reason)
- [ ] Return types: full return, size exchange, heel style exchange, warranty claim
- [ ] Return reason capture: wrong size, defective mechanism, changed mind, wrong item received, other
- [ ] **Size Profile integration**: if reason is wrong size, system checks if size profile prediction matches what was ordered — flags discrepancy for size recommendation improvement
- [ ] **Warranty tracking**: system checks order date against warranty window; flags in-warranty claims automatically
- [ ] RMA generation (PDF) sent to customer
- [ ] Inspection workflow: received → inspected → condition assessed (resalable / rework / scrap) → resolution selected
- [ ] Resolution: Stripe refund, store credit issue, or exchange dispatch
- [ ] Restocked items: return to available inventory; scrapped items: logged to finance
- [ ] Return reason analytics: most returned model, most returned size, most common defect

**Deliverable:** Orders shipped. Returns handled with full traceability.

---

### Sprint 10 — CRM, Customer Support & Reviews (Weeks 21–22)

**Goal:** Full customer relationship tooling and content moderation.

**CRM:**
- [ ] Admin: customer profile — order history, lifetime value, preferred sizes, heel styles, size profile, return history, tags
- [ ] Customer segmentation: VIP (high LTV), at-risk (long since last order), high-return-rate, new
- [ ] Merge duplicate accounts
- [ ] Customer export (CSV) for Klaviyo / Mailchimp push
- [ ] Internal notes and tags per customer

**Support:**
- [ ] Prisma schema: `SupportTicket`, `TicketMessage`, `TicketTag`
- [ ] Customer: submit ticket from account page (select category and order if relevant)
- [ ] Admin: ticket list, assignment, reply, internal notes, status (open / pending / resolved / closed)
- [ ] SLA timers per priority: urgent (2h), high (8h), normal (24h), low (72h)
- [ ] SLA breach alert to support manager
- [ ] Agent paste from Heel Care Guide: quick-insert relevant guide sections into reply
- [ ] Ticket escalation (reassign + notify manager)
- [ ] Agent performance report: avg response time, resolution time, tickets closed per day

**Reviews:**
- [ ] Prisma schema: `Review`, `ReviewMedia`
- [ ] Customer: submit review with star rating, text, optional photos
- [ ] Admin: moderation queue (approve / reject / flag)
- [ ] Admin: reply to review (public)
- [ ] Storefront: display approved reviews on product pages
- [ ] Negative review alert: 1–2 star review triggers admin notification

**Deliverable:** CRM, support, and review systems live.

---

### Sprint 11 — Accounting & Finance (Weeks 23–24)

**Goal:** Full double-entry accounting synced with the rest of the system.

- [ ] Prisma schema: `Account`, `JournalEntry`, `JournalLine`, `Invoice`, `TaxRate`, `PayrollRecord`
- [ ] Chart of accounts setup (assets, liabilities, revenue, COGS, expenses)
- [ ] Auto journal entries on system events:
  - Order paid → revenue + receivable
  - Refund issued → revenue reversal + refund payable
  - Goods receipt → inventory asset + accounts payable
  - Production order completed → COGS (from production cost calculator)
  - Scrap recorded → loss entry
  - Payroll run → payroll expense entry
- [ ] Manual income/expense entry with category and account
- [ ] Profit & Loss report (configurable date range)
- [ ] Revenue breakdown by product, heel style, category, channel
- [ ] COGS pulled from manufacturing module cost data
- [ ] Cashflow view: inflows vs. outflows over time
- [ ] Tax configuration: VAT rates by product type; auto-applied at checkout and in invoices
- [ ] Invoice generation (PDF) for B2B orders
- [ ] Payroll: employee salary records, monthly payroll run
- [ ] Refund accounting: refunds correctly reflected in revenue and cash accounts
- [ ] Break-even analysis per product (manufacturing cost vs. selling price)
- [ ] Export: PDF and Excel for all financial reports
- [ ] QuickBooks / Xero-compatible data export

**Deliverable:** Finance module live with P&L, invoicing, COGS, tax, and payroll.

---

### Sprint 12 — Analytics & Reporting (Weeks 25–26)

**Goal:** Deep, queryable analytics across all parts of the system.

- [ ] Admin dashboard: live KPIs with configurable date ranges
- [ ] Sales analytics: revenue by product / heel style / size / color / period / channel
- [ ] Best-selling heel styles and base shoes (by units and by revenue)
- [ ] Most profitable model (revenue minus COGS)
- [ ] Manufacturing waste report: scrap cost, material wastage cost, defect rate trend
- [ ] Customer analytics: repeat purchase rate, cohort retention, LTV distribution, churn indicators
- [ ] Most returned size per model; return reason distribution
- [ ] Size Profile accuracy report: did recommendation reduce returns?
- [ ] Slow-moving SKU report: high inventory + declining sales velocity
- [ ] Supplier analytics: lead time trends, defect rates, cost changes over time
- [ ] Custom report builder: column selection, date range, group-by, filters
- [ ] Export to PDF and Excel
- [ ] Scheduled report delivery: configure email delivery weekly or monthly

**Deliverable:** Full analytics suite. Every module has meaningful data outputs.

---

### Sprint 13 — Promotions, Loyalty & Storefront Polish (Weeks 27–28)

**Goal:** Retention mechanics live. Storefront complete and polished.

- [ ] Prisma schema: `Coupon`, `Promotion`, `LoyaltyAccount`, `LoyaltyTransaction`, `GiftCard`, `StoreCredit`
- [ ] Coupon codes: fixed, percentage, free shipping, product-specific, usage limits
- [ ] Automatic discounts: cart total rules, buy-X-get-Y, volume pricing
- [ ] Flash sales: time-limited, inventory-capped, auto-expiry
- [ ] Bundle promotions: base shoe + heel style package pricing
- [ ] **Loyalty points**: earn X points per EGP spent; redeem at checkout; balance visible in customer account
- [ ] **Loyalty tiers**: Bronze / Silver / Gold / Platinum based on LTV; tier perks configurable
- [ ] Gift cards: purchasable and redeemable at checkout
- [ ] Store credit: issuable from admin (returns, compensation); tracked per customer wallet
- [ ] Affiliate tracking: referral codes with commission calculation; payouts tracked in admin
- [ ] Storefront: homepage editorial sections (hero banner, lookbook, featured collections, bestsellers)
- [ ] Storefront: multi-language (i18n) — at minimum Arabic and English
- [ ] Storefront: multi-currency with live exchange rates
- [ ] Storefront: Heel Care & Mechanism Guide fully styled and linked from product pages
- [ ] Storefront: Digital Size Profile onboarding prompt for new customers after first purchase

**Deliverable:** Full retention stack live. Storefront production-ready.

---

### Sprint 14 — Security, RBAC Enforcement & Audit Logs (Weeks 29–30)

**Goal:** Production-grade security and compliance. Every action traceable.

- [ ] Full RBAC enforcement audit: every API route, every admin action verified against caller's permissions
- [ ] Audit log: immutable table capturing every write action (actor, timestamp, module, record, before/after state)
- [ ] Admin: audit log viewer — search by actor, module, date range, action type
- [ ] Audit log non-deletable: no admin permission can erase entries
- [ ] Rate limiting on all public API endpoints and auth routes
- [ ] Input validation audit: all endpoints use strict DTO validation (NestJS class-validator)
- [ ] SQL injection protection audit (Prisma parameterized queries throughout)
- [ ] CSRF protection on mutation endpoints
- [ ] Secrets rotation and environment variable hardening checklist
- [ ] GDPR compliance: customer data export endpoint; account deletion endpoint (soft delete + anonymize)
- [ ] Supplier portal security: confirm suppliers can only see their own POs and data
- [ ] Factory PWA security: confirm workers cannot access any data outside their scope

**Deliverable:** Security hardened. Every action logged. RBAC enforced everywhere.

---

### Sprint 15 — External Integrations (Weeks 31–32)

**Goal:** Swappa connected to the broader tools ecosystem.

- [ ] Shipping: EasyPost or ShipStation final integration with DHL, Aramex, Bosta, SMSA tested end-to-end
- [ ] Payment: PayPal as secondary option (Stripe primary confirmed)
- [ ] SMS notifications via Twilio: order confirmed, order shipped, delivery attempted
- [ ] Email marketing: Klaviyo or Mailchimp — customer segment push on purchase, return, VIP tier upgrade
- [ ] Social commerce: Meta and TikTok product catalog sync for ad campaigns
- [ ] Google Analytics 4 + Meta Pixel on storefront
- [ ] Admin: webhooks manager — configure outbound webhooks per system event (order placed, stock low, production completed) to any URL
- [ ] Accounting export: QuickBooks / Xero format download from finance module

**Deliverable:** Swappa connected to shipping, marketing, and analytics ecosystem.

---

### Sprint 16 — Notifications, Alerts & Final Module Polish (Weeks 33–34)

**Goal:** Proactive alerting across all modules. Any remaining polish and edge cases.

- [ ] In-app notification center with real-time unread count (WebSocket or polling)
- [ ] Configurable alert rules: low stock, SLA breach, defect rate spike, high return rate, negative review, expense overspend
- [ ] Delivery: in-app + email + Slack webhook (admin configures per rule)
- [ ] Notification history and read/unread state
- [ ] Alert deduplication: no duplicate alerts within configurable window
- [ ] Full end-to-end regression pass: confirm all modules interact correctly (e.g. production order complete → inventory + COGS + analytics all update)
- [ ] Edge case hardening from internal QA pass
- [ ] Admin module UX polish: loading states, empty states, error boundaries

**Deliverable:** System-wide alerting live. All modules polished and interacting correctly.

---

### Sprint 17 — Testing, Performance & Launch (Weeks 35–36)

**Goal:** Ship to production. Fast, stable, and monitored.

- [ ] End-to-end tests (Playwright): full purchase flow, heel configurator, checkout, return, admin order management
- [ ] API integration tests: auth, order creation, compatibility validation, production cost calculation
- [ ] Unit tests: RBAC logic, cost calculator, compatibility matrix validator
- [ ] Load testing (k6): storefront and API under peak traffic simulation
- [ ] Database query optimization: slow query log review, index audit
- [ ] Image optimization: Next.js Image component + CDN cache headers on all media
- [ ] Redis caching: product catalog, inventory counts, active promotions
- [ ] Lighthouse audit: target 90+ on performance, accessibility, SEO
- [ ] Sentry error monitoring verified on all apps
- [ ] Final security review checklist
- [ ] Staging → production DNS cutover
- [ ] Smoke test checklist on live production (place real test order, process return, check admin)
- [ ] Runbook documented for on-call incidents

**Deliverable:** Swappa live in production. Monitored, tested, fast.

---

## Sprint Summary

| Sprint | Focus | Weeks |
|---|---|---|
| 0 | Foundation & DevOps | 1–2 |
| 1 | Auth & RBAC | 3–4 |
| 2 | Product Catalog + Heel Compatibility Matrix | 5–6 |
| 3 | Heel Configurator + Media + Size Profile | 7–8 |
| 4 | Cart, Checkout & Payments | 9–10 |
| 5 | Advanced Inventory | 11–12 |
| 6 | Raw Materials Management | 13–14 |
| 7 | Manufacturing + QC + Factory PWA | 15–16 |
| 8 | Procurement + Suppliers + Supplier Portal | 17–18 |
| 9 | Shipping, Fulfillment & Returns | 19–20 |
| 10 | CRM, Support & Reviews | 21–22 |
| 11 | Accounting & Finance | 23–24 |
| 12 | Analytics & Reporting | 25–26 |
| 13 | Promotions, Loyalty & Storefront Polish | 27–28 |
| 14 | Security, RBAC Enforcement & Audit Logs | 29–30 |
| 15 | External Integrations | 31–32 |
| 16 | Notifications, Alerts & Module Polish | 33–34 |
| 17 | Testing, Performance & Launch | 35–36 |

**Total: 36 weeks (~9 months) for full production launch.**

> Sprints 5–10 (Inventory through CRM) can run in parallel across team members. With a team of 2–3 developers working in parallel workstreams, the realistic timeline compresses to 5–6 months.

---

## Phase 2 — Post-Launch Roadmap

| Feature | Description |
|---|---|
| **Multi-Warehouse** | Warehouse Cairo confirmed as Phase 1. `warehouseId` already in schema — Phase 2 adds routing logic and transfer orders |
| **AI Sales Forecasting** | Predict demand per SKU by season using historical order data |
| **AI Restock Suggestions** | Auto-generate POs and production orders when stock predicted to run low |
| **Slow Product Detection** | Alert when a SKU has high inventory + declining velocity before it becomes dead stock |
| **Smart Size Recommendations** | ML model trained on size profile + purchase + return data |
| **AI Fashion Assistant** | Storefront chatbot for style recommendations |
| **AR Try-On** | Camera-based virtual fitting on product pages |
| **Predictive QC** | Detect rising defect patterns in a batch before the full run is affected |
| **Sustainability Module** | Track recycled material %, carbon offset, ethical sourcing certifications |
| **Heel Rental / Subscription** | Monthly heel drop program; return previous, receive new |
| **B2B / Wholesale Portal** | Separate pricing tiers and invoice checkout for retail partners |
