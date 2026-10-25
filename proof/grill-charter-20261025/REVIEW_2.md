# Exact-Source Review 2 (`git:ae26ea22ac348b1a36dacd04257cd9ad7cd09bf0`)

- **Reviewed Base SHA:** `268e7767abfadde897e85067f3f00c85e7881805`
- **Reviewed Head SHA:** `ae26ea22ac348b1a36dacd04257cd9ad7cd09bf0`
- **Review Scope:** Comprehensive (`P3`)
- **Result:** `findings` (`1` actionable `P2` finding; adjudicated `required_fix`)

## Adjudicated Finding

1. **`[P2] docs/research/05-gusto-payroll-1099.md:18` — Preserve medical-payment and statutory box exceptions to the corporate exemption (`required_fix` on `d5-payroll-and-1099-boundary`)**
   - **Finding:** Treating C-Corps and S-Corps as exempt across all categories with only attorneys excepted omits other mandatory corporate `1099` reporting categories under IRS `i1099mec` instructions (most notably `1099-MISC` Box 6 medical and health care payments under `Treas. Reg. § 1.6041-3(p)(1)`, plus Box 8 substitute payments under `IRC § 6045(d)`, Box 11 cash purchases of fish for resale under `IRC § 6050R`, and federal executive agency service payments under `IRC § 6041A(d)(3)`).
   - **Resolution:** Updated [`docs/research/05-gusto-payroll-1099.md`](../../docs/research/05-gusto-payroll-1099.md) and [`docs/CHARTER.md`](../../docs/CHARTER.md) (`d5-payroll-and-1099-boundary`) so corporate exemption is evaluated per payment category/box rather than vendor-wide, preserving medical/health care, legal/attorney gross proceeds, substitute payment, and statutory fish-purchase reporting.
