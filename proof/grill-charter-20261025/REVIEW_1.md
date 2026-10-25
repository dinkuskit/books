# Exact-Source Review 1 (`git:e7377ee8805d02f9182b8b5681f28fc7777138ba`)

- **Reviewed Base SHA:** `268e7767abfadde897e85067f3f00c85e7881805`
- **Reviewed Head SHA:** `e7377ee8805d02f9182b8b5681f28fc7777138ba`
- **Review Scope:** Comprehensive (`P3`)
- **Result:** `findings` (`2` actionable `P2` findings; both adjudicated `required_fix`)

## Adjudicated Findings

1. **`[P2] docs/CHARTER.md:52` — Treat U.S. Census Geocoder coordinates as address-range interpolated, not rooftop-exact (`required_fix` on `d4-continuous-tax-engine`)**
   - **Finding:** U.S. Census Bureau Geocoder / TIGER/Line address ranges return interpolated street-segment coordinates rather than parcel/rooftop-exact points. Treating them as authoritative rooftop points against special-district polygons can misassign boundary-adjacent addresses.
   - **Resolution:** Updated [`docs/CHARTER.md`](../../docs/CHARTER.md) (`d4-continuous-tax-engine`) to specify that Census TIGER returns address-range interpolated coordinates (used as a county/place baseline), distinguish statutory `ZIP+4`/street-range SST databases in SST states, and require authoritative State DOR address/GIS or parcel/rooftop geocoding—marking boundary-adjacent interpolated matches `unverified` for authoritative resolution or human/CPA exception review before verified schedule inclusion.

2. **`[P2] docs/research/05-gusto-payroll-1099.md:19` & `docs/CHARTER.md:63` — Preserve form- and box-specific federal `1099` thresholds (`required_fix` on `d5-payroll-and-1099-boundary`)**
   - **Finding:** While OBBBA (`IRC §§ 6041, 6041A`) raised the general federal `1099-NEC` Box 1 and `1099-MISC` rents/other-income threshold to `$2,000` starting `TY2026`, lower statutory thresholds remain in force—including `$10` for `1099-MISC` Box 2 royalties (`IRC § 6050N`) and Box 8 substitute payments (`IRC § 6045(d)`), `$600` for `1099-MISC` Box 10 gross proceeds paid to an attorney (`IRC § 6045(f)`), and `$0.01+` whenever federal income tax is backup-withheld in Box 4 (`IRC § 3406`).
   - **Resolution:** Updated [`docs/CHARTER.md`](../../docs/CHARTER.md) (`d5-payroll-and-1099-boundary`), [`docs/research/05-gusto-payroll-1099.md`](../../docs/research/05-gusto-payroll-1099.md), [`docs/research/01-xero.md`](../../docs/research/01-xero.md), [`docs/research/02-quickbooks-online.md`](../../docs/research/02-quickbooks-online.md), and [`docs/research/README.md`](../../docs/research/README.md) to enforce thresholds by form, box, and tax year (and added the official IRS `i1099mec` instructions citation).
