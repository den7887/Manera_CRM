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


def main_entry() -> int:
    started = datetime.now(timezone.utc)
    try:
        processed = run_payment_reminders()
    except Exception as error:  # keep the timer alive and make the cause visible in the journal
        print(f"scheduled jobs FAILED: {error!r}", file=sys.stderr)
        return 1

    elapsed_ms = (datetime.now(timezone.utc) - started).total_seconds() * 1000
    print(f"payment reminders: {processed} processed in {elapsed_ms:.0f} ms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main_entry())
