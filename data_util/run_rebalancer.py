import requests
import json
from datetime import date, datetime, timedelta
import random
from data_util.bond_rebalancer import calculate_trades, RebalanceBondPayload
from pydantic import parse_obj_as

# If running the API locally
API_URL = "http://localhost:8000/api/bond-rebalance"


def generate_sample_portfolio(num_bonds=5):
    """Generate sample bond portfolio data for testing"""
    today = date.today()

    # Create bonds with varying maturities, yields, and durations
    bonds = []
    total_weight = 0

    for i in range(1, num_bonds + 1):
        # Randomize maturity between 1-10 years
        years_to_maturity = random.randint(1, 10)
        maturity_date = today + timedelta(days=365 * years_to_maturity)

        # Randomize coupon rate between 2-7%
        coupon_rate = random.uniform(0.02, 0.07)

        # Randomize price between 95-105% of face value
        price_pct = random.uniform(0.95, 1.05)
        face_value = 1000.0
        price = face_value * price_pct

        # Calculate approximate YTM (simplified)
        ytm = coupon_rate / price_pct

        # Random quantity between 1-20 bonds
        quantity = random.randint(1, 20)

        # Random weight (will normalize later)
        weight = random.uniform(0.1, 1.0)
        total_weight += weight

        bonds.append(
            {
                "bond_id": i,
                "symbol": f"BOND-{i}",
                "name": f"Test Bond {i} - {maturity_date.year}",
                "current_weight": weight,  # Will normalize these later
                "quantity": quantity,
                "face_value": face_value,
                "coupon_rate": coupon_rate,
                "coupon_frequency": 2,  # Semi-annual
                "current_price": price,
                "maturity_date": maturity_date.isoformat(),
                "issue_date": (today - timedelta(days=365)).isoformat(),
                "yield_to_maturity": ytm,
            }
        )

    # Normalize weights to sum to 1.0
    for bond in bonds:
        bond["current_weight"] = bond["current_weight"] / total_weight

    return bonds


def test_rebalance_api():
    """Test the bond rebalance API with different strategies"""
    sample_bonds = generate_sample_portfolio(5)

    # Calculate total portfolio value
    total_value = sum(bond["quantity"] * bond["current_price"] for bond in sample_bonds)

    # Test duration target strategy
    duration_payload = {
        "portfolio_id": "test-portfolio-1",
        "total_value": total_value,
        "strategy": "yield_optimization",
        # "target_duration": 5.0,  # Target 5-year duration
        "total_yield": 0.05,
        "bonds": sample_bonds,
    }

    # Show the portfolio we're testing with
    print("Sample Portfolio:")
    for bond in sample_bonds:
        print(
            f"{bond['name']}: {bond['quantity']} bonds, weight: {bond['current_weight']:.2f}, "
            + f"YTM: {bond['yield_to_maturity']:.2%}, maturity: {bond['maturity_date']}"
        )
    print(f"Total value: ${total_value:.2f}")

    # Make API call to local server (if running)
    try:
        # If testing with a local server:
        response = requests.post(API_URL, json=duration_payload)
        result = response.json()

        # Print results
        print("\nRebalance Results:")
        print(f"Strategy: {result['strategy_used']}")
        print(
            f"Current portfolio duration: {result['current_portfolio_duration']:.2f} years"
        )
        print(
            f"Expected portfolio duration after rebalance: {result['expected_portfolio_duration']:.2f} years"
        )
        print(f"Current portfolio yield: {result['current_portfolio_yield']:.2%}")
        print(
            f"Expected portfolio yield after rebalance: {result['expected_portfolio_yield']:.2%}"
        )
        print(f"Total trades: {result['total_trades']}")

        print("\nRecommended Trades:")
        for trade in result["rebalancing_actions"]:
            if trade["action"] != "hold":
                print(
                    f"{trade['action'].upper()} {trade['quantity']} of {trade['name']} "
                    + f"(${trade['amount']:.2f}) - "
                    + f"Weight: {trade['current_weight']:.2%} → {trade['target_weight']:.2%}"
                )

    except requests.RequestException as e:
        print(f"API call failed: {e}")

        # As a fallback, test the local function directly
        print("\nTesting function directly (bypassing API):")

        # Convert our dict to a Pydantic model
        payload = parse_obj_as(RebalanceBondPayload, duration_payload)
        result = calculate_trades(payload)

        # Print key information
        print(f"Strategy: {result.strategy_used}")
        print(
            f"Current portfolio duration: {result.current_portfolio_duration:.2f} years"
        )
        print(
            f"Expected portfolio duration: {result.expected_portfolio_duration:.2f} years"
        )
        print(f"Total trades: {result.total_trades}")

        print("\nTrades:")
        for trade in result.rebalancing_actions:
            if trade.action != "hold":
                print(
                    f"{trade.action.upper()} {trade.quantity} of {trade.symbol}: "
                    + f"${trade.amount:.2f}"
                )


if __name__ == "__main__":
    test_rebalance_api()
