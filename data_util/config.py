import datetime
import pandas as pd
import numpy as np
from pydantic import BaseModel, Field
from typing import List, Callable
from datetime import date, timedelta


class BondDataConfig(BaseModel):
    issuers: List[str] = Field(default=["Issuer A", "Issuer B", "Issuer C", "Issuer D"])
    regions: List[str] = Field(default=["North America", "Europe", "Asia", "Australia"])
    sectors: List[str] = Field(
        default=["Technology", "Healthcare", "Finance", "Energy"]
    )
    industries: List[str] = Field(
        default=["Software", "Pharmaceuticals", "Banking", "Oil & Gas"]
    )
    status_: List[str] = Field(default=["Active", "Matured"])
    stablecoins: List[str] = Field(
        default=[
            "USDC",
            "USDT",
            "BUSD",
            "DAI",  # USD-pegged
            "EURS",
            "EURT",  # EUR-pegged
            "JPYC",  # JPY-pegged
            "XSGD",  # SGD-pegged
        ]
    )
    included_in_index_options: List[str] = Field(default=["Yes", "No"])
    ratings: List[str] = Field(
        default=["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "NR"]
    )
    classification: List[str] = Field(default=["Investment Grade", "High Yield"])
    face_value: List[float] = Field(default=[1000, 5000, 10000])
    yield_: List[float] = Field(default_factory=lambda: np.random.uniform(0, 0.2, 5))
    maturity_date: List[date] = Field(
        default_factory=lambda: [
            date.today() + timedelta(days=np.random.randint(365, 3650))
            for _ in range(5)
        ]
    )
    coupon_: List[float] = Field(
        default_factory=lambda: np.random.uniform(0.01, 0.1, 5)
    )
    couple_frequency: List[float] = Field(
        default_factory=lambda: np.random.uniform(0.5, 2, 5)
    )
