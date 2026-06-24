from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260619_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "vocabulary_items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("word", sa.String(length=120), nullable=False),
        sa.Column("normalized_word", sa.String(length=120), nullable=False),
        sa.Column("pinyin", sa.String(length=120), nullable=False),
        sa.Column("meaning_vi", sa.Text(), nullable=False),
        sa.Column("meaning_in_context_vi", sa.Text(), nullable=False),
        sa.Column("part_of_speech", sa.String(length=60), nullable=False),
        sa.Column("usage_note_vi", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False),
        sa.Column("review_stage", sa.Integer(), nullable=False),
        sa.Column("review_count", sa.Integer(), nullable=False),
        sa.Column("successful_review_count", sa.Integer(), nullable=False),
        sa.Column("memory_strength", sa.Integer(), nullable=False),
        sa.Column("last_reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_review_at", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("user_id", "normalized_word", "pinyin", name="uq_vocab_user_word_pinyin"),
    )
    op.create_index("ix_vocabulary_items_user_id", "vocabulary_items", ["user_id"])
    op.create_index("ix_vocabulary_items_next_review_at", "vocabulary_items", ["next_review_at"])

    op.create_table(
        "vocabulary_examples",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("vocab_id", sa.String(length=36), sa.ForeignKey("vocabulary_items.id"), nullable=False),
        sa.Column("source_sentence_zh", sa.Text(), nullable=True),
        sa.Column("source_sentence_vi", sa.Text(), nullable=True),
        sa.Column("example_zh", sa.Text(), nullable=False),
        sa.Column("example_pinyin", sa.Text(), nullable=True),
        sa.Column("example_vi", sa.Text(), nullable=False),
        sa.Column("is_user_source", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "review_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vocab_id", sa.String(length=36), sa.ForeignKey("vocabulary_items.id"), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("result", sa.String(length=20), nullable=False),
        sa.Column("previous_stage", sa.Integer(), nullable=False),
        sa.Column("next_stage", sa.Integer(), nullable=False),
        sa.Column("next_review_at", sa.Date(), nullable=False),
    )

    op.create_table(
        "notification_settings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("daily_reminder_time", sa.String(length=5), nullable=False),
        sa.Column("app_push_enabled", sa.Boolean(), nullable=False),
        sa.Column("telegram_enabled", sa.Boolean(), nullable=False),
        sa.Column("telegram_chat_id", sa.String(length=120), nullable=True),
        sa.Column("mobile_push_token", sa.Text(), nullable=True),
        sa.Column("privacy_no_source_sentence", sa.Boolean(), nullable=False),
        sa.Column("privacy_anonymize_before_save", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("channel", sa.String(length=20), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("due_vocab_count", sa.Integer(), nullable=False),
        sa.Column("message_preview", sa.Text(), nullable=False),
        sa.Column("failure_reason", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("notification_logs")
    op.drop_table("notification_settings")
    op.drop_table("review_logs")
    op.drop_table("vocabulary_examples")
    op.drop_index("ix_vocabulary_items_next_review_at", table_name="vocabulary_items")
    op.drop_index("ix_vocabulary_items_user_id", table_name="vocabulary_items")
    op.drop_table("vocabulary_items")
    op.drop_table("users")
