"""payments mvp tables

Revision ID: 20260425_0001
Revises:
Create Date: 2026-04-25
"""

from alembic import op
import sqlalchemy as sa


revision = "20260425_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subscription_plans",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("code", sa.String(length=40), nullable=False, unique=True, index=True),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("price", sa.Numeric(12, 2), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "payments",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("parent_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("child_id", sa.String(length=64), nullable=True, index=True),
        sa.Column("subscription_plan_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False, index=True),
        sa.Column("method", sa.String(length=40), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("payment_reference", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("payment_comment", sa.String(length=255), nullable=False),
        sa.Column("payment_url", sa.Text(), nullable=True),
        sa.Column("qr_payload", sa.Text(), nullable=True),
        sa.Column("user_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("provider_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("parent_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("child_id", sa.String(length=64), nullable=True, index=True),
        sa.Column("subscription_plan_id", sa.String(length=64), nullable=False, index=True),
        sa.Column("payment_id", sa.String(length=64), nullable=False, unique=True, index=True),
        sa.Column("status", sa.String(length=40), nullable=False, index=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("total_lessons", sa.Integer(), nullable=True),
        sa.Column("used_lessons", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("subscriptions")
    op.drop_table("payments")
    op.drop_table("subscription_plans")
