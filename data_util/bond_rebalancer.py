import uvicorn
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field, validator, root_validator
from typing import List, Dict, Literal, Optional
from datetime import date, datetime
import numpy as np
from enum import Enum

app = FastAPI(
    title="Bond Portfolio Rebalancer API",
    description="Smart rebalancing for tokenized bond portfolios with yield optimization and duration matching",
    version="1.0.0",
)


class RebalanceStrategy(str, Enum):
    EQUAL_WEIGHT = "equal_weight"
    DURATION_TARGET = "duration_target"
    YIELD_OPTIMIZATION = "yield_optimization"
    LADDERED = "laddered"


class BondAsset(BaseModel):
    bond_id: int = Field(..., example=1)
    symbol: str = Field(..., example="tbond")
    name: str = Field(..., example="Tokenized Bond")
    current_weight: float = Field(..., ge=0, le=1, example=0.3)  # within 0 and 1
    target_weight: float = Field(None, ge=0, le=1, example=0.35)  # within 0 and 1
    quantity: int = Field(..., ge=0, example=10)
    face_value: float = Field(..., gt=0, example=1000.0)
    coupon_rate: float = Field(..., ge=0, lt=1, example=0.05)  # e.g., 5% coupon
    coupon_frequency: int = Field(..., ge=1, le=12, example=2)  # Payments per year
    current_price: float = Field(..., gt=0, example=980.0)  # Current market price
    maturity_date: date = Field(..., example="2030-12-31")
    issue_date: date = Field(..., example="2020-01-01")
    yield_to_maturity: float = Field(..., ge=0, lt=1, example=0.055)

    @property
    def duration(self) -> float:
        """Macaulay duration of the bond, measures the weighted
        average time until all the bond's cash flows are received,
        expressed in years.

        Returns:
            float: Macaulay duration in floating point years
        """
        if self.current_price <= 0:
            return 0

        today = datetime.now().date()
        years_to_maturity = (self.maturity_date - today).days / 365
        if years_to_maturity <= 0:
            return 0

        ytm = self.yield_to_maturity
        if ytm <= 0:
            ytm = 0.01  # Prevent division by zero

        # Calculate present value of all cash flows
        coupon_payment = (self.face_value * self.coupon_rate) / self.coupon_frequency
        periods = int(years_to_maturity * self.coupon_frequency)
        discount_rate = ytm / self.coupon_frequency

        # Calculate PV of each cash flow * time period
        weighted_pv_sum = 0
        pv_sum = 0

        for t in range(1, periods + 1):
            time_period = t / self.coupon_frequency
            pv = coupon_payment / ((1 + discount_rate) ** t)
            weighted_pv_sum += pv * time_period
            pv_sum += pv

        # Add PV of principal repayment at maturity
        pv_principal = self.face_value / ((1 + discount_rate) ** periods)
        weighted_pv_sum += pv_principal * years_to_maturity
        pv_sum += pv_principal

        return weighted_pv_sum / self.current_price

    @property
    def current_value(self) -> float:
        """Current market value of the bond

        Returns:
            float: current value in float
        """
        return self.quantity * self.current_price

    @property
    def income_yield(self) -> float:
        """Current income yield of the bond

        Returns:
            float: income yield in float
        """
        if self.current_price <= 0:
            return 0
        return self.coupon_rate * self.face_value / self.current_price


class RebalanceBondPayload(BaseModel):
    portfolio_id: str = Field(..., example="user123")
    total_value: float = Field(None)
    strategy: RebalanceStrategy = Field(default=RebalanceStrategy.DURATION_TARGET)
    target_duration: Optional[float] = Field(None, ge=0, example=5.0)
    target_yield: Optional[float] = Field(None, ge=0, lt=1, example=0.04)
    bonds: List[BondAsset]

    @root_validator(pre=True)
    def set_total_value(cls, values):
        if "bonds" in values and values.get("total_value") is None:
            bonds = values["bonds"]
            total = sum(
                bond.get("quantity", 0) * bond.get("current_price", 0) for bond in bonds
            )
            values["total_value"] = total
        return values

    @validator("bonds")
    def check_weights(cls, bonds):
        current_total = sum(bond.current_weight for bond in bonds)
        # Allow a small margin for floating point arithmetic
        if not (0.99 < current_total < 1.01):
            raise ValueError(
                f"Sum of current weights must be approximately 1 (got {current_total})"
            )
        return bonds


class TradeAction(BaseModel):
    bond_id: int
    symbol: str
    name: str
    action: Literal["buy", "sell", "hold"]
    quantity: int
    amount: float
    current_weight: float
    target_weight: float
    expected_yield: float
    expected_duration: float


class RebalanceResult(BaseModel):
    portfolio_id: str
    total_value: float
    strategy_used: RebalanceStrategy
    total_trades: int
    target_duration: Optional[float] = None
    target_yield: Optional[float] = None
    current_portfolio_duration: float
    expected_portfolio_duration: float
    current_portfolio_yield: float
    expected_portfolio_yield: float
    rebalancing_actions: List[TradeAction]


def calculate_target_weights_duration(
    bonds: List[BondAsset], target_duration: float
) -> Dict[int, float]:
    """Calculate target weights to achieve the desired portfolio duration"""
    # Simple approach: weight inversely proportional to distance from target duration
    total_weight = 0
    weights = {}

    for bond in bonds:
        # Duration distance with a penalty for being too far away
        distance = abs(bond.duration - target_duration)
        # Inverse weighting - bonds closer to target duration get higher weight
        weight = 1 / (1 + distance**2)
        weights[bond.bond_id] = weight
        total_weight += weight

    # Normalize weights to sum to 1
    for bond_id in weights:
        weights[bond_id] /= total_weight

    return weights


def calculate_target_weights_yield(bonds: List[BondAsset]) -> Dict[int, float]:
    """Calculate target weights to maximize yield while considering risk"""
    # Simple yield optimization - weight bonds by yield adjusted for maturity risk
    total_weight = 0
    weights = {}

    for bond in bonds:
        # Higher yield and lower duration (less risk) get higher weight
        # This is a simplification - sophisticated portfolios would use mean-variance optimization
        today = datetime.now().date()
        years_to_maturity = (bond.maturity_date - today).days / 365
        risk_factor = years_to_maturity / 10  # Simple risk proxy

        # Adjust yield by risk - prefer higher yield with lower risk
        adjusted_yield = bond.yield_to_maturity / (1 + risk_factor)
        weights[bond.bond_id] = adjusted_yield
        total_weight += adjusted_yield

    # Normalize weights
    for bond_id in weights:
        weights[bond_id] /= total_weight

    return weights


def calculate_target_weights_laddered(bonds: List[BondAsset]) -> Dict[int, float]:
    """Create a laddered portfolio with equal allocation across maturity buckets"""
    # Group bonds by maturity year
    maturity_buckets = {}
    for bond in bonds:
        maturity_year = bond.maturity_date.year
        if maturity_year not in maturity_buckets:
            maturity_buckets[maturity_year] = []
        maturity_buckets[maturity_year].append(bond)

    # Equal weight for each maturity bucket, then equal weight within bucket
    weights = {}
    bucket_weight = 1.0 / len(maturity_buckets) if maturity_buckets else 0

    for year, bucket_bonds in maturity_buckets.items():
        bond_weight = bucket_weight / len(bucket_bonds)
        for bond in bucket_bonds:
            weights[bond.bond_id] = bond_weight

    return weights


def calculate_trades(payload: RebalanceBondPayload) -> List[TradeAction]:
    """Calculate optimal trades based on the selected strategy"""
    bonds = payload.bonds
    total_value = payload.total_value

    # Step 1: Calculate target weights based on strategy
    if payload.strategy == RebalanceStrategy.EQUAL_WEIGHT:
        target_weights = {bond.bond_id: 1.0 / len(bonds) for bond in bonds}

    elif payload.strategy == RebalanceStrategy.DURATION_TARGET:
        if payload.target_duration is None:
            raise ValueError(
                "Target duration is required for duration matching strategy"
            )
        target_weights = calculate_target_weights_duration(
            bonds, payload.target_duration
        )

    elif payload.strategy == RebalanceStrategy.YIELD_OPTIMIZATION:
        target_weights = calculate_target_weights_yield(bonds)

    elif payload.strategy == RebalanceStrategy.LADDERED:
        target_weights = calculate_target_weights_laddered(bonds)

    # Step 2: Update target weights in the bond objects
    for bond in bonds:
        bond.target_weight = target_weights.get(bond.bond_id, 0)

    # Step 3: Calculate trades needed
    trades = []

    for bond in bonds:
        current_amount = bond.current_weight * total_value
        target_amount = bond.target_weight * total_value
        delta = target_amount - current_amount

        # Calculate quantity to trade
        quantity_to_trade = int(abs(delta) / bond.current_price)

        if delta > 0:
            action = "buy"
        elif delta < 0:
            action = "sell"

        trades.append(
            TradeAction(
                bond_id=bond.bond_id,
                symbol=bond.symbol,
                name=bond.name,
                action=action,
                quantity=quantity_to_trade,
                amount=abs(delta),
                current_weight=bond.current_weight,
                target_weight=bond.target_weight,
                expected_yield=bond.yield_to_maturity,
                expected_duration=bond.duration,
            )
        )

    # Calculate portfolio metrics
    current_duration = sum(bond.current_weight * bond.duration for bond in bonds)
    expected_duration = sum(bond.target_weight * bond.duration for bond in bonds)
    current_yield = sum(bond.current_weight * bond.yield_to_maturity for bond in bonds)
    expected_yield = sum(bond.target_weight * bond.yield_to_maturity for bond in bonds)

    # Filter to only actual trades
    active_trades = [t for t in trades if t.action != "hold"]

    return RebalanceResult(
        portfolio_id=payload.portfolio_id,
        total_value=total_value,
        strategy_used=payload.strategy,
        total_trades=len(active_trades),
        target_duration=payload.target_duration,
        target_yield=payload.target_yield,
        current_portfolio_duration=current_duration,
        expected_portfolio_duration=expected_duration,
        current_portfolio_yield=current_yield,
        expected_portfolio_yield=expected_yield,
        rebalancing_actions=trades,
    )


@app.post("/api/bond-rebalance", response_model=RebalanceResult)
async def rebalance_bonds(payload: RebalanceBondPayload):
    """
    Rebalance a bond portfolio using the specified strategy

    - **Duration Target**: Rebalances to achieve a specific portfolio duration
    - **Yield Optimization**: Maximizes expected yield while managing duration risk
    - **Tax Efficient**: Optimizes after-tax returns
    - **Laddered**: Creates a maturity ladder with equal allocation per maturity year
    """
    try:
        result = calculate_trades(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/strategies")
async def get_strategies():
    """Get available rebalancing strategies"""
    return [{"id": s.value, "name": s.name} for s in RebalanceStrategy]


if __name__ == "__main__":
    uvicorn.run("bond_rebalancer:app", host="0.0.0.0", port=8000, reload=True)
