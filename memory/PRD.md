# Resto — Premium Arabic Chalet Booking Platform

## Original Problem Statement
Build "Resto" — Arabic-only luxury chalet booking platform with admin/owner/customer roles, unique chalet URLs + QR codes, reviews & 5-star ratings, in-app notifications, advanced search & filters, featured chalets, booking workflow (request → owner accept/reject → pay on arrival).

## User Choices (Final)
- Customer auth: **phone number only, no verification**
- Owner auth: **email + password**
- Admin auth: **email + password via dedicated `/admin/login`**
- Notifications: **in-app only** (no email/SMS service)
- Image storage: **Emergent Object Storage**
- Payment: **cash on arrival** (no online payment)
- Language: **Arabic only, full RTL**

## Architecture
- **Backend**: FastAPI + Motor (MongoDB async). Modules: `server.py`, `models.py`, `auth.py`, `storage.py`, `db.py`, `utils.py`, `notifications.py`. JWT bearer auth, bcrypt password hashing. Emergent Object Storage for images.
- **Frontend**: React 19 + React Router + Tailwind + shadcn/ui. RTL Arabic with El Messiri (headings) + Tajawal (body). Color palette: Forest Green `#1A362D` + Muted Gold `#C6A87C` + Warm Bone `#F9F8F6`.
- **Database**: MongoDB collections: `users`, `chalets`, `bookings`, `reviews`, `notifications`, `files`.

## User Personas
1. **Customer (Guest)** — discovers chalets, books via phone-only login, manages bookings, leaves reviews after accepted bookings.
2. **Owner (Merchant)** — registers via email/password, manages chalets, accepts/rejects booking requests, receives notifications.
3. **Admin** — moderates platform, features chalets, removes inappropriate reviews, full user/booking visibility.

## Core Requirements (Static)
- Premium Arabic-only RTL UI · mobile responsive
- Unique chalet slug + public URL + downloadable QR code + social share buttons (FB / WhatsApp / Instagram / TikTok)
- 5-star reviews with comments, admin moderation, owners cannot edit
- In-app notifications for all events (booking submitted/accepted/rejected/cancelled, new chalet/owner registration, reported reviews, new bookings, new reviews)
- Filters: price range, rooms, capacity, location, rating, date availability
- Featured chalets pinned at top of search & homepage
- Booking conflict detection (overlapping dates blocked)
- Role-based access control (RBAC) enforced on every protected endpoint

## What's Been Implemented (2026-02 — Initial MVP)
- ✅ Auth flows (customer phone-only auto-register, owner email/password, admin dedicated login)
- ✅ Pre-seeded admin (`meanarfa2012@gmail.com`)
- ✅ Chalets CRUD with Arabic-friendly slugs, image upload via Emergent Object Storage
- ✅ Filter/sort search (price, rooms, capacity, location, rating, availability dates)
- ✅ Homepage aggregator endpoint (featured/new/top_rated/latest_reviews)
- ✅ Booking workflow with accept/reject/cancel + conflict detection
- ✅ Reviews gated by accepted booking; avg_rating + reviews_count auto-recompute; report + admin delete
- ✅ Notifications system (in-app) for customer/owner/admin with read tracking
- ✅ Admin dashboard (stats, all chalets, users, bookings, reviews, feature toggle, status)
- ✅ Owner dashboard (chalets management, booking inbox)
- ✅ Customer "my bookings" page
- ✅ Chalet detail page with image gallery, QR code dialog (downloadable PNG), social share buttons
- ✅ Premium RTL design — El Messiri / Tajawal fonts, forest+gold palette, glassmorphism header, bento grid

## Iteration 2 (2026-02 — Major Update)
- ✅ **FIXED**: Booking now fires 3 notifications (customer + owner + ADMIN). Previous version missed admin.
- ✅ **New booking system**: time-slot based instead of check-in/check-out. Owners define `{date, start_time, end_time, price}` slots; customers pick from available slots.
- ✅ **OwnerSlotsPage** at `/owner/chalets/:id/slots` to manage slots (add/delete/toggle availability).
- ✅ **Removed** city/region/address fields. Replaced with single `google_maps_url`. Customer can click "فتح الموقع" to open Google Maps.
- ✅ **Free-form features** input (no fixed amenity list). Owner adds custom tags like "غرفة بلايستيشن".
- ✅ **Video upload** alongside images via `MediaUpload` component. 100 MB video limit.
- ✅ **Chalet approval workflow**: new chalets default to `pending`. Admin must approve before public visibility.
- ✅ **Admin powers**: approve / reject / suspend / unsuspend / feature / delete chalets. Owner is notified on each status change.
- ✅ **Homepage simplified**: removed decorative bento and testimonials sections. Now only Hero+Search, Featured, Top Rated, Latest, Owner CTA, Footer.
- ✅ **Admin dashboard**: Google Maps link replaces city/region column. Pending count badge. Quick-approve from overview tab.
- ✅ **Race-safe slot booking**: atomic update_one prevents double-booking; returns 409 if slot taken concurrently.

## Backlog (Future Phases)

### P1
- Replace native HTML5 date inputs with shadcn Calendar / RTL date picker for visual consistency
- Email notifications via Resend (currently in-app only)
- SMS OTP for customer login (currently no verification)
- Chalet availability calendar visual on detail page

### P2
- Stripe payment integration (currently cash on arrival)
- Map view for chalet locations
- Multi-language support (en/fr additions)
- Owner analytics dashboard (revenue trends, occupancy)
- Wishlist / favorites for customers
- Booking reminders (cron job 1 day before)

### P3
- Mobile native apps
- AI-powered chalet description generator for owners
- Loyalty/rewards program

## Test Credentials
See `/app/memory/test_credentials.md`.

## Status
- Backend: 42/42 pytest passing (100%)
- Frontend: Critical flows pass; homepage, login, owner dashboard, admin dashboard, chalet detail all verified
