const fetch = require('node-fetch');

// API URL (adjust if your API is running on a different host/port)
const API_URL = 'http://localhost:8000/api';

// Helper to format dates correctly for the API
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

// Get current date and some date in the future
const today = new Date();
const futureDate1 = new Date(today);
futureDate1.setFullYear(today.getFullYear() + 5); // 5 years from now
const futureDate2 = new Date(today);
futureDate2.setFullYear(today.getFullYear() + 3); // 3 years from now
const pastDate = new Date(today);
pastDate.setFullYear(today.getFullYear() - 1); // 1 year ago

// Sample bond portfolio
const samplePortfolio = {
  portfolio_id: "test-portfolio-js",
  strategy: "duration_target",
  target_duration: 5.0,
  bonds: [
    {
      bond_id: 1,
      symbol: "TBOND-1",
      name: "Treasury Bond 2028",
      current_weight: 0.6,
      quantity: 10,
      face_value: 1000.0,
      coupon_rate: 0.05,  // 5%
      coupon_frequency: 2,
      current_price: 980.0,
      maturity_date: formatDate(futureDate1),
      issue_date: formatDate(pastDate),
      yield_to_maturity: 0.055
    },
    {
      bond_id: 2,
      symbol: "TBOND-2",
      name: "Corporate Bond 2026",
      current_weight: 0.4,
      quantity: 5,
      face_value: 1000.0,
      coupon_rate: 0.07,  // 7%
      coupon_frequency: 2,
      current_price: 950.0,
      maturity_date: formatDate(futureDate2),
      issue_date: formatDate(pastDate),
      yield_to_maturity: 0.075
    }
  ]
};

// Function to test getting available strategies
async function testGetStrategies() {
  try {
    console.log("Testing GET /api/strategies...");
    const response = await fetch(`${API_URL}/strategies`);
    
    if (!response.ok) {
      throw new Error(`API returned status: ${response.status}`);
    }
    
    const strategies = await response.json();
    console.log("Available strategies:", strategies);
    return strategies;
  } catch (error) {
    console.error("Error fetching strategies:", error.message);
  }
}

// Function to test the rebalancing endpoint
async function testRebalance(portfolio) {
  try {
    console.log(`\nTesting POST /api/bond-rebalance with ${portfolio.strategy} strategy...`);
    console.log("Request payload:", JSON.stringify(portfolio, null, 2));
    
    const response = await fetch(`${API_URL}/bond-rebalance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(portfolio)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned status: ${response.status}, message: ${errorText}`);
    }
    
    const result = await response.json();
    
    // Print the result summary
    console.log("\nRebalance Result Summary:");
    console.log(`Strategy: ${result.strategy_used}`);
    console.log(`Portfolio Value: $${result.total_value.toFixed(2)}`);
    console.log(`Current Portfolio Duration: ${result.current_portfolio_duration.toFixed(2)} years`);
    console.log(`Expected Portfolio Duration: ${result.expected_portfolio_duration.toFixed(2)} years`);
    console.log(`Current Portfolio Yield: ${(result.current_portfolio_yield * 100).toFixed(2)}%`);
    console.log(`Expected Portfolio Yield: ${(result.expected_portfolio_yield * 100).toFixed(2)}%`);
    console.log(`Total Trades: ${result.total_trades}`);
    
    // Print recommended trades
    console.log("\nRecommended Trades:");
    result.rebalancing_actions.forEach(trade => {
      console.log(`${trade.action.toUpperCase()} ${trade.quantity} of ${trade.symbol} (${trade.name})`);
      console.log(`  Amount: $${trade.amount.toFixed(2)}`);
      console.log(`  Weight Change: ${(trade.current_weight * 100).toFixed(2)}% → ${(trade.target_weight * 100).toFixed(2)}%`);
      console.log(`  Duration: ${trade.expected_duration.toFixed(2)} years`);
      console.log(`  Yield: ${(trade.expected_yield * 100).toFixed(2)}%`);
      console.log('');
    });
    
    return result;
  } catch (error) {
    console.error("Error rebalancing portfolio:", error.message);
  }
}

// Test different strategies
async function testAllStrategies() {
  // First get available strategies
  await testGetStrategies();
  
  // Test duration target strategy (already set in sample portfolio)
  await testRebalance(samplePortfolio);
  
  // Test yield optimization strategy
  const yieldOptimization = {
    ...samplePortfolio,
    strategy: "yield_optimization"
  };
  await testRebalance(yieldOptimization);
  
  // Test equal weight strategy
  const equalWeight = {
    ...samplePortfolio,
    strategy: "equal_weight"
  };
  await testRebalance(equalWeight);
  
  // Test laddered strategy
  const laddered = {
    ...samplePortfolio,
    strategy: "laddered"
  };
  await testRebalance(laddered);
}

// Run all tests
testAllStrategies().catch(console.error);