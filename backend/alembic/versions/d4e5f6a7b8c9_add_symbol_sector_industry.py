"""add sector and industry to symbols

Revision ID: d4e5f6a7b8c9
Revises: c2d3e4f5a6b7
Create Date: 2026-03-15 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("symbols", sa.Column("sector", sa.String(length=128), nullable=True))
    op.add_column("symbols", sa.Column("industry", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("symbols", "industry")
    op.drop_column("symbols", "sector")
