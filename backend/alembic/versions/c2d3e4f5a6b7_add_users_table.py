"""add users table and default user

Revision ID: c2d3e4f5a6b7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-15 20:00:00.000000

"""
from typing import Sequence, Union

import bcrypt
from alembic import op
import sqlalchemy as sa

revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Use bcrypt directly so we don't load passlib (incompatible with bcrypt 5.x at migration load time)
DEFAULT_PASSWORD_HASH = bcrypt.hashpw(b"default", bcrypt.gensalt()).decode()


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    # Insert default user (username=default, password=default)
    conn = op.get_bind()
    conn.execute(
        sa.text("INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)"),
        {"username": "default", "password_hash": DEFAULT_PASSWORD_HASH},
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
