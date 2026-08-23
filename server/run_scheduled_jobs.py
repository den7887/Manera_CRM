"""Scheduled maintenance jobs for the CRM.

The API itself has no scheduler, so payment reminders and overdue statuses only
moved when someone opened the admin screen. This runner is invoked by the
manera-crm-jobs systemd timer and performs the same work outside a request.

Run manually with:  .venv/bin/python run_scheduled_jobs.py
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone

import main


def run_payment_reminders() -> int:
    """Send due payment reminders. Returns how many payments were processed."""
    store = main._read_store()
    processed, changed = main.run_due_payment_reminders(
        store,
        actor_user_id="system-scheduler",
        actor_role="system",
    )
    if changed:
        main._write_store(store)
    return len(processed)


# Safety cap so one run can never turn into hundreds of outbound Selfwork calls;
# a payment that's been stuck this long has bigger problems than one more hour
# of delay, and it stays a candidate on every future run either way.
MAX_PROVIDER_RECONCILIATIONS_PER_RUN = 50


def run_provider_payment_reconciliation() -> int:
    """Poll the payment provider for outstanding online invoices it may have
    already confirmed.

    Both paths that are supposed to close this loop -- Selfwork's
    server-to-server webhook, and the browser being redirected back to
    success_url after checkout -- can silently fail (wrong URL in the
    provider's merchant dashboard, the customer closing the tab before the
    redirect fires, etc). Confirmed in production: a real card payment
    succeeded on Selfwork's side and neither callback ever arrived, leaving
    the invoice "pending" and the parent's portal locked indefinitely. This
    polls Selfwork's own status API for every outstanding online invoice that
    already has a provider payment id, so a payment that actually succeeded
    gets picked up within an hour even if both callbacks fail.
    """
    if str(main._selfwork_provider_name()).strip().lower() != "selfwork":
        return 0

    store = main._read_store()
    candidates = [
        payment
        for payment in store.get("paymentRecords", [])
        if str(payment.get("paymentMethod")) == "online"
        and main._is_outstanding_status(str(payment.get("status") or "pending"))
        and str(payment.get("providerPaymentId") or "").strip()
    ][:MAX_PROVIDER_RECONCILIATIONS_PER_RUN]

    synced = 0
    for payment in candidates:
        payment_id = str(payment.get("id") or "")
        try:
            # _sync_selfwork_payment_status_internal writes the store itself
            # when it finds a real status change; a still-pending result is a
            # no-op read, so there's nothing to persist for those.
            result = main._sync_selfwork_payment_status_internal(store, payment_id)
        except Exception as error:
            print(f"provider reconciliation FAILED for {payment_id}: {error!r}", file=sys.stderr)
            continue
        if result.get("synced"):
            synced += 1
            store = main._read_store()  # pick up the write the sync just made

    return synced


def main_entry() -> int:
    started = datetime.now(timezone.utc)
    try:
        processed = run_payment_reminders()
        synced = run_provider_payment_reconciliation()
    except Exception as error:  # keep the timer alive and make the cause visible in the journal
        print(f"scheduled jobs FAILED: {error!r}", file=sys.stderr)
        return 1

    elapsed_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000
    print(
        f"payment reminders: {processed} processed, "
        f"provider reconciliation: {synced} payments synced, "
        f"in {elapsed_ms:.0f} ms"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main_entry())
