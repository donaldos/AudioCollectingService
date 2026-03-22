"""initial tables

Revision ID: 001
Revises:
Create Date: 2026-03-23

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users ─────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",             sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column("username",       sa.String(20),    nullable=False),
        sa.Column("password_hash",  sa.String(255),   nullable=False),
        sa.Column("name",           sa.String(50),    nullable=False),
        sa.Column("email",          sa.String(100),   nullable=False),
        sa.Column("gender",         sa.Enum("male", "female", "other", name="genderenum"), nullable=False),
        sa.Column("age_group",      sa.Enum("10s", "20s", "30s", "40s", "50s", "60s_above", name="agegroupenum"), nullable=False),
        sa.Column("region",         sa.String(50),    nullable=False),
        sa.Column("dialect",        sa.Enum("standard", "gyeonggi", "chungcheong", "jeolla",
                                            "gyeongsang", "gangwon", "jeju", "other",
                                            name="dialectenum"),  nullable=False),
        sa.Column("points",         sa.Integer(),     nullable=False, server_default="0"),
        sa.Column("is_admin",       sa.Boolean(),     nullable=False, server_default="0"),
        sa.Column("privacy_agreed", sa.Boolean(),     nullable=False, server_default="0"),
        sa.Column("is_active",      sa.Boolean(),     nullable=False, server_default="1"),
        sa.Column("created_at",     sa.DateTime(),    nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",     sa.DateTime(),    nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_username", "users", ["username"], unique=True)
    op.create_index("idx_email",    "users", ["email"],    unique=True)

    # ── sentences ─────────────────────────────────────────────
    op.create_table(
        "sentences",
        sa.Column("id",         sa.Integer(),  primary_key=True, autoincrement=True),
        sa.Column("text",       sa.Text(),     nullable=False),
        sa.Column("category",   sa.String(50), nullable=True),
        sa.Column("language",   sa.String(10), nullable=False, server_default="ko"),
        sa.Column("is_active",  sa.Boolean(),  nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_sentences_is_active", "sentences", ["is_active"])
    op.create_index("idx_sentences_category",  "sentences", ["category"])

    # ── recordings ────────────────────────────────────────────
    op.create_table(
        "recordings",
        sa.Column("id",          sa.Integer(),  primary_key=True, autoincrement=True),
        sa.Column("user_id",     sa.Integer(),  sa.ForeignKey("users.id",     ondelete="CASCADE"),    nullable=False),
        sa.Column("sentence_id", sa.Integer(),  sa.ForeignKey("sentences.id", ondelete="RESTRICT"),   nullable=False),
        sa.Column("file_path",   sa.String(500), nullable=False),
        sa.Column("file_size",   sa.Integer(),  nullable=True),
        sa.Column("snr",         sa.Float(),    nullable=True),
        sa.Column("energy",      sa.Float(),    nullable=True),
        sa.Column("duration",    sa.Float(),    nullable=True),
        sa.Column("status",      sa.Enum("pending", "analyzed", "accepted", "rejected",
                                         name="recordingstatus"),
                                 nullable=False, server_default="pending"),
        sa.Column("review_note", sa.Text(),     nullable=True),
        sa.Column("reviewed_by", sa.Integer(),  sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at",  sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at",  sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("user_id", "sentence_id", name="uq_user_sentence"),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_recordings_user_id",    "recordings", ["user_id"])
    op.create_index("idx_recordings_sentence_id","recordings", ["sentence_id"])
    op.create_index("idx_recordings_status",     "recordings", ["status"])
    op.create_index("idx_recordings_created_at", "recordings", ["created_at"])

    # ── recording_sessions ────────────────────────────────────
    op.create_table(
        "recording_sessions",
        sa.Column("id",              sa.Integer(),  primary_key=True, autoincrement=True),
        sa.Column("user_id",         sa.Integer(),  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sentence_ids",    sa.JSON(),     nullable=False),
        sa.Column("completed_count", sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("points_awarded",  sa.Integer(),  nullable=False, server_default="0"),
        sa.Column("is_completed",    sa.Boolean(),  nullable=False, server_default="0"),
        sa.Column("started_at",      sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("completed_at",    sa.DateTime(), nullable=True),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_sessions_user_id", "recording_sessions", ["user_id"])

    # ── system_config ─────────────────────────────────────────
    op.create_table(
        "system_config",
        sa.Column("key",         sa.String(100), primary_key=True),
        sa.Column("value",       sa.Text(),      nullable=False),
        sa.Column("description", sa.String(255), nullable=True),
        sa.Column("updated_at",  sa.DateTime(),  nullable=False, server_default=sa.text("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )

    # 기본 포인트 정책 (`key`는 MySQL 예약어이므로 백틱 사용)
    op.execute(
        "INSERT INTO system_config (`key`, value, description) VALUES "
        "('points_per_session', '100', '세션(10문장) 완료 시 지급 포인트')"
    )


def downgrade() -> None:
    op.drop_table("system_config")
    op.drop_table("recording_sessions")
    op.drop_index("idx_recordings_created_at", "recordings")
    op.drop_index("idx_recordings_status",      "recordings")
    op.drop_index("idx_recordings_sentence_id", "recordings")
    op.drop_index("idx_recordings_user_id",     "recordings")
    op.drop_table("recordings")
    op.drop_index("idx_sentences_category",  "sentences")
    op.drop_index("idx_sentences_is_active", "sentences")
    op.drop_table("sentences")
    op.drop_index("idx_email",    "users")
    op.drop_index("idx_username", "users")
    op.drop_table("users")
