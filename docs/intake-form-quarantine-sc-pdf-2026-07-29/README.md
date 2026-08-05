# Quarantined intake - Success Center PDF alignment (do not use)

**Status: CONTAINED - not wired into the live app.**

## Why

The creator of the Success Center Client Information Intake process has **revoked consent** to use that process.  
This folder preserves the PDF-aligned electronic intake work (based on `Client_Intake_Form_fillable.pdf`) for internal reference only.

**Do not** copy these files back into `src/` or enable them in production without explicit legal/product clearance.

## Live app

The active intake remains the pre-PDF RFTS electronic LGD form (sections A–F) restored from  
`docs/intake-form-backup-2026-07-29/` into `src/lib/lgd-intake.ts` and `src/components/LgdIntakeForm.tsx`.

## Contents (snapshot 2026-07-29)

| File | Notes |
|------|--------|
| `lgd-intake.ts` | v4 model: full challenges checklist, `clientInfo` clinical fields |
| `lgd-intake.test.ts` | Tests for v4 normalize / legacy challenge mapping |
| `LgdIntakeForm.tsx` | UI with sections A, P, B–F |
| `LgdIntakeClientInfoFields.tsx` | Personal & clinical fields UI |
| `LGD_ELECTRONIC_INTAKE.md` | Design notes for the PDF-aligned flow |

Paper source (still in repo for record): `docs/Client_Intake_Form_fillable.pdf` - **not** for active product use under revoked consent.
