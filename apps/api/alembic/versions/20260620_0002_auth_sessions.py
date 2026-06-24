from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "20260620_0002"
down_revision = "20260619_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("password_hash", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("is_seed", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.execute(
        sa.text(
            """
            UPDATE users
            SET is_seed = TRUE
            WHERE id = :seed_user_id
            """
        ).bindparams(seed_user_id="00000000-0000-0000-0000-000000000001")
    )

    op.create_table(
        "user_sessions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("refresh_token_hash", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_user_sessions_user_id", "user_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_sessions_user_id", table_name="user_sessions")
    op.drop_table("user_sessions")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "is_seed")
    op.drop_column("users", "password_hash")
    op.drop_column("users", "email")
