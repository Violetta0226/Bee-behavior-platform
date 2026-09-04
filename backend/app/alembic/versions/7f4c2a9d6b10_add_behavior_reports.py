"""Add behavior analysis reports.

Revision ID: 7f4c2a9d6b10
Revises: fe56fa70289e
"""

import sqlalchemy as sa
from alembic import op

revision = "7f4c2a9d6b10"
down_revision = "fe56fa70289e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "behavior_report",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("sequence_id", sa.String(length=255), nullable=False),
        sa.Column("schema_version", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=1024), nullable=True),
        sa.Column("source_sha256", sa.String(length=64), nullable=False),
        sa.Column("modality", sa.String(length=16), nullable=False),
        sa.Column("model_version", sa.String(length=255), nullable=True),
        sa.Column("ground_truth_version", sa.String(length=255), nullable=True),
        sa.Column("metric_status", sa.String(length=128), nullable=False),
        sa.Column("duration_seconds", sa.Float(), nullable=False),
        sa.Column("detection_count", sa.Integer(), nullable=False),
        sa.Column("track_count", sa.Integer(), nullable=False),
        sa.Column("entry_count", sa.Integer(), nullable=True),
        sa.Column("exit_count", sa.Integer(), nullable=True),
        sa.Column("anomaly_window_count", sa.Integer(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_behavior_report_sequence_id"),
        "behavior_report",
        ["sequence_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_behavior_report_source_sha256"),
        "behavior_report",
        ["source_sha256"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_behavior_report_source_sha256"), table_name="behavior_report")
    op.drop_index(op.f("ix_behavior_report_sequence_id"), table_name="behavior_report")
    op.drop_table("behavior_report")
