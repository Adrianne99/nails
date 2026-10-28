# Immediate orders — October 22, 2026

Supersedes the estimate and quote flow for new orders. Existing orders keep their agreed workflow and prices.

- Catalog designs use their stored price. All 100 library photos now display a fixed price based on their named details and category (₱100-₱250); matching values are stored in the database.
- Custom uploads, links and saved try-ons cost ₱250 for plain colors/French or ₱300 with artwork, chrome, gems or 3D details. Customers identify included details. There is no automatic image-complexity analysis or paid AI service.
- New orders are Confirmed immediately, with accepted_at and a locked unit price. The server calculates the total, checks the submitted displayed price, locks daily capacity and rejects price tampering/repricing. Duplicate submissions are idempotent.
- Handover is free. Delivery is customer-booked and paid separately to the courier, disclosed before checkout; it is not included in the nail total.
- Physical fit remains a production prerequisite, not a price-approval step. Admins can add a sizing profile to a confirmed order without invalidating its price. Confirming fit updates the order snapshot; unchecked fit blocks production.
- Apply migration 004 once after 001–003. All four migrations have been applied to the existing project. Do not rerun them there.

Validation: tests cover instant confirmation, both custom prices, library pricing, stale/tampered prices, duplicate orders, full dates, reprice prevention and fit-to-production transitions.
