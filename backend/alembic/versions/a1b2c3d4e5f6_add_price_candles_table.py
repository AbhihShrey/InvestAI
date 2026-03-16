"""add price_candles table

Revision ID: a1b2c3d4e5f6
Revises: 84b9b66be34d
Create Date: 2026-03-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "84b9b66be34d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "price_candles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("symbol_id", sa.Integer(), nullable=False),
        sa.Column("trade_date", sa.Date(), nullable=False),
        sa.Column("timeframe", sa.String(length=8), nullable=False),
        sa.Column("open", sa.Float(), nullable=False),
        sa.Column("high", sa.Float(), nullable=False),
        sa.Column("low", sa.Float(), nullable=False),
        sa.Column("close", sa.Float(), nullable=False),
        sa.Column("volume", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["symbol_id"], ["symbols.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("symbol_id", "trade_date", "timeframe", name="uq_price_candles_symbol_date_tf"),
    )
    op.create_index(op.f("ix_price_candles_symbol_id"), "price_candles", ["symbol_id"], unique=False)
    op.create_index(op.f("ix_price_candles_trade_date"), "price_candles", ["trade_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_price_candles_trade_date"), table_name="price_candles")
    op.drop_index(op.f("ix_price_candles_symbol_id"), table_name="price_candles")
    op.drop_table("price_candles")
