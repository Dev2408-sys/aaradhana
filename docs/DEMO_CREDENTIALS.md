# Kesariya Navratri 4.0 — Demo credentials

All demo accounts use password: **`Kesariya@123`**

Seed is idempotent (`npm run seed` / `npm run prisma:seed`).  
Transactional demo sales skip on re-run unless `DEMO_FORCE=1`.

Mobile numbers below are synthetic test numbers only.

---

## Super Admin

| Field | Value |
|-------|-------|
| Name | Kesariya Super Admin |
| Mobile | `9999999999` |
| Password | `Kesariya@123` |
| Role | `SUPER_ADMIN` |

## Admin

| Field | Value |
|-------|-------|
| Name | Kesariya Event Admin |
| Mobile | `8888888888` |
| Password | `Kesariya@123` |
| Role | `ADMIN` |

## Master sellers

Referral / join code = seller code.

| Name | Mobile | Seller code | Password |
|------|--------|-------------|----------|
| Rahul Patel | `7777777777` | `KSR001` (MASTER001) | `Kesariya@123` |
| Jay Shah Master | `9111000002` | `MASTER002` | `Kesariya@123` |
| Dhruv Desai | `9111000003` | `MASTER003` | `Kesariya@123` |
| Meet Joshi | `9111000004` | `MASTER004` | `Kesariya@123` |
| Yash Thakkar | `9111000005` | `MASTER005` | `Kesariya@123` |

## Sellers (S01–S20)

| Code | Name | Mobile | Master | Password |
|------|------|--------|--------|----------|
| S01 | Aarav Patel | `9122000001` | MASTER001 / KSR001 | `Kesariya@123` |
| S02 | Krish Shah | `9122000002` | MASTER001 / KSR001 | `Kesariya@123` |
| S03 | Dev Mehta | `9122000003` | MASTER001 / KSR001 | `Kesariya@123` |
| S04 | Rudra Desai | `9122000004` | MASTER001 / KSR001 | `Kesariya@123` |
| S05 | Harsh Joshi | `9122000005` | MASTER002 | `Kesariya@123` |
| S06 | Yash Modi | `9122000006` | MASTER002 | `Kesariya@123` |
| S07 | Meet Patel | `9122000007` | MASTER002 | `Kesariya@123` |
| S08 | Dhruv Shah | `9122000008` | MASTER002 | `Kesariya@123` |
| S09 | Parth Desai | `9122000009` | MASTER003 | `Kesariya@123` |
| S10 | Kunal Mehta | `9122000010` | MASTER003 | `Kesariya@123` |
| S11 | Vivaan Patel | `9122000011` | MASTER003 | `Kesariya@123` |
| S12 | Ayan Shah | `9122000012` | MASTER003 | `Kesariya@123` |
| S13 | Darsh Joshi | `9122000013` | MASTER004 | `Kesariya@123` |
| S14 | Mihir Desai | `9122000014` | MASTER004 | `Kesariya@123` |
| S15 | Rishi Patel | `9122000015` | MASTER004 | `Kesariya@123` |
| S16 | Manav Shah | `9122000016` | MASTER004 | `Kesariya@123` |
| S17 | Jay Mehta | `9122000017` | MASTER005 | `Kesariya@123` |
| S18 | Aryan Desai | `9122000018` | MASTER005 | `Kesariya@123` |
| S19 | Om Patel | `9122000019` | MASTER005 | `Kesariya@123` |
| S20 | Krish Joshi | `9122000020` | MASTER005 | `Kesariya@123` |

## Legacy regression sellers (Phase 4–7 tests)

| Code | Name | Mobile | Master | Password |
|------|------|--------|--------|----------|
| KSR002 | Amit Patel | `6666666666` | KSR001 | `Kesariya@123` |
| KSR003 | Jay Shah | `5555555555` | KSR001 | `Kesariya@123` |
| KSR004 | Karan Mehta | `4444444444` | KSR001 | `Kesariya@123` |
| KSR005 | Rahul Desai | `3333333333` | KSR001 | `Kesariya@123` |

---

## Event

- **Name:** Kesariya Navratri 4.0  
- **Days:** Day 1–10 = 11 Oct 2026 → 20 Oct 2026 (`Asia/Kolkata`)  
- **Venue:** Kesariya AC Dome, Opposite Bhagwan Mahavir College, VIP Road, Vesu, Surat  
- **Zones:** GOLD (`KSR-G-######`), VIP (`KSR-V-######`) @ ₹400 base (default; override per day in Admin → Pricing)  

## Pricing & payment (admin)

| Screen | Path | Purpose |
|--------|------|---------|
| Day-wise pricing | `/admin/pricing` | Per day Admin base / Min sell / Suggest for GOLD & VIP |
| UPI setup | `/admin/payment-settings` | Admin UPI ID, payee name, require UTR |

**Money split:** Admin base = seller → admin settlement. Customer price = seller chooses (≥ day min). Margin = customer − base.

**Default UPI:** `kesariya@upi` · Payee: Kesariya Navratri 4.0 · UTR required on UPI.

## Notes

- Demo sales/payments are tagged `dataSource = DEMO`.  
- Customers use mobiles `9133xxxxxx` and emails `demo.customer.*@kesariya.demo`.  
- Do not treat this dataset as production.  
