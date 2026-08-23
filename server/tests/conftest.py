"""Shared test fixtures.

RATE_LIMIT_BUCKETS is module-level global state in main.py, keyed by
"<endpoint>:<client ip>:<phone>" -- every test file's TestClient reports the
same IP, and most auth-heavy tests log in as the same OWNER_PHONE, so the
bucket accumulates across the whole pytest session unless something clears
it between tests. Each test file already resets ACTIVE_TOKENS/OTP_CODES in
its own `client` fixture, but none of them touch this one, so a test file
with enough login calls (or just running the full suite together) can push
an unrelated, later-running file over LOGIN_RATE_LIMIT_MAX_REQUESTS and fail
it with a 429 that has nothing to do with what that test is actually
checking.
"""
from __future__ import annotations

import pytest

import main


@pytest.fixture(autouse=True)
def _reset_rate_limit_buckets():
    main.RATE_LIMIT_BUCKETS.clear()
    yield
    main.RATE_LIMIT_BUCKETS.clear()
