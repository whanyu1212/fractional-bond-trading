import numpy as np
import pandas as pd
from pathlib import Path
from config import BondDataConfig
from typing import Dict, Any, Union, Optional


class SyntheticDataGenerator:
    """Generator for synthetic bond market data."""

    def __init__(
        self, n_samples: int, config: Optional[BondDataConfig] = None, seed: int = 42
    ):
        """Initialize the generator with configuration.

        Args:
            n_samples: Number of bond records to generate
            config: Bond data configuration, uses default if None
            seed: Random seed for reproducibility
        """
        self.n_samples = n_samples
        self.config = config if config else BondDataConfig()
        self.seed = seed
        np.random.seed(self.seed)

    def _generate_categorical_data(self) -> Dict[str, np.ndarray]:
        """Generate categorical features for bonds.

        Returns:
            Dict[str, np.ndarray]: Dictionary of categorical features
        """
        return {
            "issuer": np.random.choice(self.config.issuers, size=self.n_samples),
            "region": np.random.choice(self.config.regions, size=self.n_samples),
            "sector": np.random.choice(self.config.sectors, size=self.n_samples),
            "industry": np.random.choice(self.config.industries, size=self.n_samples),
            "status": np.random.choice(self.config.status_, size=self.n_samples),
            "stablecoin": np.random.choice(
                self.config.stablecoins, size=self.n_samples
            ),
            "included_in_index": np.random.choice(
                self.config.included_in_index_options, size=self.n_samples
            ),
            "rating": np.random.choice(self.config.ratings, size=self.n_samples),
            "classification": np.random.choice(
                self.config.classification, size=self.n_samples
            ),
        }

    def _generate_numerical_data(self) -> Dict[str, np.ndarray]:
        """Generate numerical features for bonds.

        Returns:
            Dict[str, np.ndarray]: Dictionary of numerical features
        """
        return {
            "yield": np.random.choice(self.config.yield_, size=self.n_samples),
            "coupon_rate": np.random.choice(self.config.coupon_, size=self.n_samples),
            "face_value": np.random.choice(self.config.face_value, size=self.n_samples),
        }

    def _generate_temporal_data(self) -> Dict[str, np.ndarray]:
        """Generate temporal features for bonds.

        Returns:
            Dict[str, np.ndarray]: Dictionary of temporal features
        """
        maturity_dates = np.random.choice(
            self.config.maturity_date, size=self.n_samples
        )

        issue_dates = pd.Series(maturity_dates).apply(
            lambda x: x - pd.Timedelta(days=np.random.randint(365, 3650))
        )

        return {"maturity_date": maturity_dates, "issue_date": issue_dates}

    def _add_identifiers(self, df: pd.DataFrame) -> None:
        """Add unique bond identifiers to the DataFrame.

        Args:
            df (pd.DataFrame): input DataFrame
        """
        df["bond_id"] = [f"BOND_{i+1:04d}" for i in range(self.n_samples)]

    def generate_data(self) -> pd.DataFrame:
        """Chains all the private methods together
        to generate synthetic bond data.

        Returns:
            pd.DataFrame: DataFrame containing synthetic bond data
        """
        # Combine all features
        data = {
            **self._generate_categorical_data(),
            **self._generate_numerical_data(),
        }

        # Create initial DataFrame
        df = pd.DataFrame(data)

        # Add temporal data
        temporal_data = self._generate_temporal_data()
        for key, value in temporal_data.items():
            df[key] = value

        # Add identifiers
        self._add_identifiers(df)

        return df

    def save_data(
        self, path: Union[str, Path], format: str = "csv", **kwargs: Any
    ) -> None:
        """save data to a file in the specified format.

        Args:
            path (Union[str, Path]): Path to save the data
            format (str, optional):  Defaults to "csv".

        Raises:
            ValueError: If the format is not supported
        """
        df = self.generate_data()
        path = Path(path)

        if format.lower() == "csv":
            df.to_csv(path, index=False, **kwargs)
        elif format.lower() == "parquet":
            df.to_parquet(path, index=False, **kwargs)
        elif format.lower() == "json":
            df.to_json(path, orient="records", **kwargs)
        else:
            raise ValueError(f"Unsupported format: {format}")


if __name__ == "__main__":
    pd.set_option("display.max_columns", None)

    # Generate and display sample data
    generator = SyntheticDataGenerator(n_samples=100)
    data = generator.generate_data()
    print("\nSample Generated Data:")
    print(data.head())

    # generator.save_data("synthetic_bonds.json", format="json")
