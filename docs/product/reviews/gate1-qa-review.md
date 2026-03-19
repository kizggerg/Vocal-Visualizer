# Gate 1 QA Review: MVP Requirements -- Pitch Contour Visualization

**Reviewer:** QA Engineer
**Date:** 2026-03-19
**Document Under Review:** `docs/product/mvp-requirements.md` v1.0
**Verdict:** APPROVED WITH COMMENTS

---

## Summary

The MVP requirements are well-structured and largely testable. The acceptance criteria use clear Given/When/Then format, the NFR targets include specific numeric thresholds, and the MoSCoW prioritization is sensible for a prototype with fewer than 10 users. The issues identified below are mostly clarifications and minor gaps -- none block the requirements from advancing to design and architecture.

---

## Findings

### Critical

No critical findings. The requirements are testable and unambiguous for the core happy paths.

### Warning

**W-1: Maximum recording length not enforced in acceptance criteria**
The file constraints table (Section 3.2) defines a maximum recording length of 10 minutes, but no acceptance criterion covers what happens when a user uploads a recording longer than 10 minutes. AC-1.2 and AC-1.3 cover format and size validation respectively, but recording duration validation is missing.

- **Recommendation:** Add an acceptance criterion under US-1 or US-4 specifying that recordings exceeding the maximum length are rejected with a clear message. Note: this may need to be validated server-side after upload since duration cannot always be determined from file metadata alone on the client.

**W-2: AC-2.3 performance target only covers recordings up to 5 minutes**
The "Should Have" section lists support for recordings up to 10 minutes, but AC-2.3 only guarantees analysis completion within 30 seconds for recordings of 5 minutes or less. There is no stated performance target for recordings between 5 and 10 minutes.

- **Recommendation:** Add a performance target for 10-minute recordings (even a rough one, such as "< 60 seconds") so that if 10-minute support is implemented, QA has a benchmark to test against.

**W-3: "Server acceptance time" in NFR 3.1 is ambiguous**
The upload time target says "< 10 seconds" for a 10 MB file and notes it "measures server acceptance time." It is unclear whether this means time from the first byte received to the server's HTTP 200 response, or round-trip time from the client sending the request to receiving a response. This distinction matters because the user's network is outside our control.

- **Recommendation:** Clarify that this is measured as server-side processing time (time between receiving the complete request and returning the response), excluding network transfer. Alternatively, state the assumption (e.g., "on a 50 Mbps connection").

**W-4: AC-4.2 conflates two distinct failure modes**
"Corrupted audio" and "no detectable pitch" are different problems with different user guidance. A corrupted file means the audio could not be decoded at all. No detectable pitch means the audio decoded fine but contained no pitched content (e.g., a recording of applause). The suggested error message references background music, which only applies to the second case.

- **Recommendation:** Consider splitting into two messages at the implementation level, or at minimum note in the AC that the error message should vary based on the failure type. This is not a blocker for requirements approval -- it can be resolved during design.

### Info

**I-1: AC-3.2 "standard laptop screen" could be more precise**
The criterion says "minimum 800px wide rendering area." This is actually specific enough to test against. No change needed, but QA will use 800px as the minimum viewport width for the chart container during validation.

**I-2: Drag-and-drop (AC-1.5) says "behaving identically to file selection"**
This is good -- it means all validation (format, size) applies equally to drag-and-drop. QA will test drag-and-drop with invalid files to confirm rejection behavior matches file picker behavior.

**I-3: AC-3.3 silence handling is testable but needs a test fixture**
Verifying that silence and unvoiced regions render as gaps requires a test audio file with known silent sections. This is a test planning concern, not a requirements concern. QA will create or source an appropriate test fixture during test planning.

**I-4: Accessibility requirements (NFR 3.4) are testable**
The four accessibility items are specific and measurable:
- Keyboard navigation: can be verified with manual tab-through testing.
- WCAG AA contrast: can be verified with tooling (e.g., axe, Lighthouse).
- Chart text alternative: can be verified by checking for an `aria-label` or equivalent summary element.
- ARIA live regions for errors: can be verified with screen reader testing or DOM inspection.

No change needed. These are well-specified for an MVP.

**I-5: Cost NFR (3.5) is verifiable but requires architecture input**
Testing that idle cost approaches $0 and active cost stays under $100/month depends on the architecture chosen. QA can validate this by reviewing AWS billing after deployment, but the thresholds are meaningful only once the architecture is finalized. This is noted for test planning -- QA will define cost validation methods after the architecture review.

**I-6: No acceptance criterion for concurrent uploads**
The requirements do not address what happens if the same user (or different users) trigger multiple uploads simultaneously. For an MVP with fewer than 10 users this is low risk, but it is worth noting. No action required now.

---

## Missing Test Scenarios (for QA test planning, not requirements changes)

The following are edge cases QA will cover during test planning. They do not require changes to the requirements document but are noted here for completeness:

1. **Zero-byte file upload** -- A valid extension (e.g., `.wav`) but empty file. Should be caught by duration validation (< 1 second) or as a corrupted file.
2. **Renamed file extension** -- A `.txt` file renamed to `.wav`. Should be caught by server-side content-type validation (NFR 3.6).
3. **Very large pitch range** -- A recording spanning a wide pitch range (e.g., bass to soprano). The chart Y-axis should scale appropriately.
4. **Monotone recording** -- A recording with very little pitch variation. The chart should still render meaningfully.
5. **Browser back/forward behavior** -- What happens if the user presses back during analysis or after viewing results? Since the system is stateless, this should gracefully return to the upload page.
6. **Double-click upload button** -- Ensure duplicate submissions are prevented or handled gracefully.

---

## NFR Testability Assessment

| NFR | Testable? | Method |
|-----|-----------|--------|
| Upload time < 10s (10 MB file) | Yes, with caveat | Server-side timing; needs clarification per W-3 |
| Analysis time < 30s (5-min recording) | Yes | Wall-clock timing of analysis endpoint |
| Visualization render < 2s | Yes | Performance API / Lighthouse timing from data receipt to paint |
| TTI < 3s | Yes | Lighthouse on broadband connection |
| File size limit 50 MB | Yes | Upload a file > 50 MB, confirm rejection |
| Format validation | Yes | Upload files of each supported and unsupported type |
| Min recording length 1s | Yes | Upload a sub-1-second file, confirm rejection |
| WCAG AA contrast | Yes | Automated tooling (axe-core, Lighthouse) |
| Keyboard navigability | Yes | Manual testing, tab-order verification |
| Cost < $100/month | Yes, post-deploy | AWS billing review after load testing |
| Scale-to-zero | Yes, post-deploy | Verify no running compute after idle period |
| HTTPS everywhere | Yes | Verify TLS on all endpoints, check for mixed content |

---

## Conclusion

The requirements are well-written, testable, and appropriately scoped for an MVP. The warnings above are minor clarifications that would improve testability and reduce ambiguity during implementation. None of them block advancement to the design and architecture phase.

QA is ready to begin test planning once the architecture is finalized (particularly the pitch detection approach and client-vs-server analysis decision from the open questions in Section 6).
