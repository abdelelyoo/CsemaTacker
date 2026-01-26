# Advanced Analytics Features - Implementation Guide

## Overview

This document describes the advanced analytics features that have been added to the trading analysis application. These features provide sophisticated risk analysis, correlation studies, and predictive modeling capabilities.

## New Features Implemented

### 1. Performance Utilities (`utils.ts`)

#### `calculateVaR(returns, confidenceLevel = 0.95)`
- **Purpose**: Calculate Value at Risk for a portfolio
- **Parameters**:
  - `returns`: Array of return percentages
  - `confidenceLevel`: Confidence level (default: 0.95 for 95%)
- **Returns**: VaR value at specified confidence level
- **Usage**:
  ```javascript
  const var95 = calculateVaR(portfolioReturns); // 95% VaR
  const riskAmount = var95 * portfolioValue;
  ```

#### `monteCarloSimulation(initialValue, expectedReturn, volatility, days, simulations)`
- **Purpose**: Run probabilistic portfolio projections
- **Parameters**:
  - `initialValue`: Starting portfolio value
  - `expectedReturn`: Daily expected return (e.g., 0.0005 for 0.05%)
  - `volatility`: Daily volatility (e.g., 0.015 for 1.5%)
  - `days`: Simulation period in days
  - `simulations`: Number of simulations to run
- **Returns**: Object with mean, median, min, max, stdDev, and data array
- **Usage**:
  ```javascript
  const results = monteCarloSimulation(10000, 0.0005, 0.015, 30, 1000);
  console.log(`Expected range: ${results.min} - ${results.max}`);
  ```

#### `detectAnomalies(trades, threshold = 3)`
- **Purpose**: Identify unusual trading patterns using Z-score analysis
- **Parameters**:
  - `trades`: Array of trade objects
  - `threshold`: Z-score threshold for anomaly detection
- **Returns**: Array of anomalous trades with anomaly scores
- **Usage**:
  ```javascript
  const anomalies = detectAnomalies(trades, 2.5);
  anomalies.forEach(trade => {
    console.log(`${trade.ticker}: Anomaly score ${trade.anomalyScore}`);
  });
  ```

#### `calculateCorrelationMatrix(priceSeries)`
- **Purpose**: Calculate correlation coefficients between assets
- **Parameters**:
  - `priceSeries`: Object with ticker keys and price arrays
- **Returns**: Correlation matrix (object of objects)
- **Usage**:
  ```javascript
  const matrix = calculateCorrelationMatrix({
    AAPL: [150, 152, 151, 153],
    MSFT: [300, 305, 303, 308]
  });
  console.log(matrix.AAPL.MSFT); // Correlation between AAPL and MSFT
  ```

#### `calculateRiskContribution(positions, correlationMatrix)`
- **Purpose**: Calculate each position's contribution to overall portfolio risk
- **Parameters**:
  - `positions`: Array of position objects
  - `correlationMatrix`: Pre-calculated correlation matrix
- **Returns**: Positions with added riskContribution and riskPercentage
- **Usage**:
  ```javascript
  const positionsWithRisk = calculateRiskContribution(positions, correlationMatrix);
  positionsWithRisk.forEach(pos => {
    console.log(`${pos.ticker}: ${pos.riskPercentage.toFixed(2)}% of total risk`);
  });
  ```

### 2. Advanced Visualization Components (`AdvancedCharts.tsx`)

#### `PortfolioPerformanceChart`
- **Purpose**: Interactive line chart comparing portfolio vs benchmark performance
- **Features**:
  - Dual-axis comparison
  - Tooltips with outperformance calculations
  - Responsive design
  - Zoom and pan capabilities

#### `RiskAnalysisChart`
- **Purpose**: Bar chart showing risk contribution by position
- **Features**:
  - Color-coded by risk level
  - Interactive tooltips
  - Percentage breakdowns

#### `CorrelationHeatmap`
- **Purpose**: Visual representation of asset correlations
- **Features**:
  - Color gradient (-1 to +1)
  - Interactive tooltips showing exact values
  - Matrix layout for easy comparison

#### `MonteCarloSimulationChart`
- **Purpose**: Visualization of Monte Carlo simulation results
- **Features**:
  - Percentile markers (10th, 25th, 50th, 75th, 90th)
  - Comparison with initial value
  - Confidence interval visualization

#### `TradingActivityHeatmap`
- **Purpose**: Heatmap of trading activity by time
- **Features**:
  - Day of week vs hour of day
  - Intensity-based coloring
  - Pattern detection

### 3. Advanced Analytics Dashboard (`Lab.tsx` - ADVANCED_ANALYTICS view)

#### Risk Analysis Section
- **Value at Risk (VaR)**: 95% confidence level calculation
- **Maximum Drawdown**: Worst performing position
- **Sharpe Ratio**: Risk-adjusted return metric
- **Risk Contribution Chart**: Visual breakdown by position

#### Correlation Analysis Section
- **Correlation Matrix**: Heatmap visualization
- **Diversification Insights**: Interpretation guide
- **Concentration Warnings**: When portfolio is too concentrated

#### Monte Carlo Simulation Section
- **AI-Powered Analysis**: Detailed simulation interpretation
- **Visual Results**: Percentile-based chart
- **Key Statistics**: Expected value, confidence range, worst case
- **Stress Test Scenarios**: Market condition simulations

#### Trading Activity Patterns
- **Time-Based Analysis**: Day of week and hour patterns
- **Behavioral Insights**: Trading habit detection
- **Optimization Suggestions**: Align with productive times

## Integration Guide

### 1. Import Required Components

```javascript
// In your main component
import { 
  PortfolioPerformanceChart, 
  RiskAnalysisChart, 
  CorrelationHeatmap, 
  MonteCarloSimulationChart, 
  TradingActivityHeatmap 
} from './AdvancedCharts';

import { 
  calculateVaR, 
  monteCarloSimulation, 
  detectAnomalies, 
  calculateCorrelationMatrix, 
  calculateRiskContribution 
} from './utils';
```

### 2. Add Navigation

```javascript
// Add to your view modes
type AnalysisMode = 'TRANSACTIONS' | 'AGGREGATE' | 'RISK_TECHNICALS' | 'BIAS_ANALYSIS' | 'AI_RECOMMENDATIONS' | 'ADVANCED_ANALYTICS';

// Add navigation button
<button 
  onClick={() => setView('ADVANCED_ANALYTICS')}
  className={`px-4 py-2 rounded-md text-sm font-medium ${view === 'ADVANCED_ANALYTICS' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
>
  <Activity className="w-4 h-4 inline mr-2" />
  Advanced Analytics
</button>
```

### 3. Implement Risk Analysis

```javascript
// Calculate risk metrics
const portfolioReturns = positions.map(p => 
  (currentPrices[p.ticker] || p.marketPrice) - p.avgCost / p.avgCost
);

const var95 = calculateVaR(portfolioReturns);
const riskAmount = var95 * summary.totalMarketValue;

// Risk contribution analysis
const positionsWithRisk = positions.map(pos => ({
  ...pos,
  riskContribution: Math.abs(pos.unrealizedPnL),
  riskPercentage: (Math.abs(pos.unrealizedPnL) / positions.reduce((sum, p) => sum + Math.abs(p.unrealizedPnL), 0)) * 100
}));

// Display in UI
<RiskAnalysisChart positions={positionsWithRisk} />
```

### 4. Implement Correlation Analysis

```javascript
// Prepare price series data
const priceSeries = positions.reduce((acc, pos) => {
  acc[pos.ticker] = [pos.avgCost, currentPrices[pos.ticker] || pos.avgCost];
  return acc;
}, {});

// Calculate correlation matrix
const correlationMatrix = calculateCorrelationMatrix(priceSeries);

// Display heatmap
<CorrelationHeatmap correlationMatrix={correlationMatrix} />
```

### 5. Implement Monte Carlo Simulation

```javascript
// Run simulation
const mcResults = monteCarloSimulation(
  summary.totalMarketValue, 
  portfolioRoi / 100 / 252, // Convert annual to daily return
  0.015, // Daily volatility
  30, // 30 days
  1000 // 1000 simulations
);

// Display results
<MonteCarloSimulationChart 
  simulationResults={mcResults}
  initialValue={summary.totalMarketValue}
/>

// Show key statistics
<div className="grid grid-cols-3 gap-4">
  <div>
    <p className="text-xs text-slate-500">Expected Value</p>
    <p className="text-xl font-bold">{formatCurrency(mcResults.mean)}</p>
  </div>
  <div>
    <p className="text-xs text-slate-500">90% Confidence Range</p>
    <p className="text-xl font-bold">
      {formatCurrency(mcResults.data[Math.floor(mcResults.data.length * 0.05)])} - 
      {formatCurrency(mcResults.data[Math.floor(mcResults.data.length * 0.95)])}
    </p>
  </div>
  <div>
    <p className="text-xs text-slate-500">Worst Case (5th Percentile)</p>
    <p className="text-xl font-bold text-rose-600">
      {formatCurrency(mcResults.data[Math.floor(mcResults.data.length * 0.05)])}
    </p>
  </div>
</div>
```

### 6. Implement Trading Activity Analysis

```javascript
// Display heatmap
<div className="h-80">
  <TradingActivityHeatmap trades={trades} />
</div>

// Add insights
<div className="mt-4 bg-slate-50 p-4 rounded-lg">
  <h4 className="font-bold mb-2">Activity Insights</h4>
  <ul className="space-y-1 text-sm">
    <li>📊 Identify your peak trading hours</li>
    <li>🕒 Detect consistent trading habits</li>
    <li>📅 See which days you're most active</li>
    <li>🎯 Optimize trading schedule</li>
  </ul>
</div>
```

## AI Integration

### Enhanced AI Prompts

The advanced analytics section includes enhanced AI prompts for:

1. **Risk Analysis Interpretation**: Detailed breakdown of VaR, drawdown, Sharpe ratio
2. **Monte Carlo Simulation**: Probabilistic outcome interpretation
3. **Diversification Assessment**: Correlation and concentration analysis
4. **Stress Testing**: Scenario-based performance projections

### Example AI Prompt

```javascript
const prompt = `
  Perform advanced quantitative analysis on this portfolio:
  
  Portfolio Composition:
  ${positions.map(p => 
    `- ${p.ticker}: ${p.qty} shares, P&L: ${p.unrealizedPnL.toFixed(2)} (${(p.unrealizedPnL/p.totalCost*100).toFixed(2)}%)`
  ).join('\n')}
  
  Risk Metrics:
  - Value at Risk (95%): ${var95.toFixed(4)}
  - Maximum Drawdown: ${maxDrawdown.toFixed(4)}
  - Sharpe Ratio: ${sharpeRatio.toFixed(2)}
  
  Task: Provide sophisticated risk analysis and strategic recommendations.
`;
```

## Best Practices

### 1. Performance Optimization
- Use virtualized lists for large datasets
- Memoize expensive calculations
- Implement debouncing for user inputs
- Use web workers for heavy computations

### 2. Data Quality
- Ensure clean, consistent data formats
- Handle missing data gracefully
- Validate inputs before calculations
- Provide meaningful error messages

### 3. User Experience
- Add loading states for computations
- Provide tooltips and explanations
- Offer multiple visualization options
- Include export capabilities

### 4. Risk Management
- Clearly explain risk metrics
- Provide context for results
- Offer actionable recommendations
- Include disclaimers and limitations

## Troubleshooting

### Common Issues

1. **Chart not rendering**:
   - Check that data is in correct format
   - Verify all required fields are present
   - Ensure no NaN or infinite values

2. **Performance issues**:
   - Reduce number of data points
   - Implement data sampling
   - Use simpler chart types for large datasets

3. **Calculation errors**:
   - Verify input data quality
   - Check for division by zero
   - Validate mathematical assumptions

### Debugging Tips

```javascript
// Add console logging for debugging
console.log('Input data:', { positions, trades, currentPrices });

// Validate calculations
const testVaR = calculateVaR([0.01, -0.02, 0.03, -0.01, 0.02]);
console.log('Test VaR:', testVaR); // Should be negative

// Check chart data
console.log('Chart data:', {
  labels: portfolioData.map(d => d.date),
  values: portfolioData.map(d => d.value)
});
```

## Future Enhancements

### Planned Features

1. **Historical Data Integration**: Connect to market data APIs
2. **Real-time Updates**: Streaming data and calculations
3. **Advanced Backtesting**: Strategy testing framework
4. **Machine Learning**: Predictive models and pattern recognition
5. **Custom Indicators**: User-defined metrics and calculations

### Technical Improvements

1. **Web Workers**: Offload computations to background threads
2. **Server-side Processing**: For complex calculations
3. **Caching Strategies**: Store and reuse computation results
4. **Progressive Loading**: Load data and charts incrementally

## Support

For issues or questions:
- Check the console for error messages
- Review the implementation examples
- Consult the TypeScript definitions
- Examine the test cases for usage patterns

## License

This implementation guide and associated code are provided for educational and developmental purposes. The actual implementation may require adjustments based on specific requirements and data availability.