#!/usr/bin/env python3
"""
Test script to fetch Moroccan stocks from TradingView
Run without Supabase - just prints the data
"""

from tvscreener import StockScreener, Market
import pandas as pd


def fetch_morocco_stocks():
    """Fetch all Moroccan stocks from TradingView screener."""
    print("Fetching Moroccan stocks from TradingView...")
    print("=" * 50)

    ss = StockScreener()
    ss.set_markets(Market.MOROCCO)

    # Get all data (default columns)
    df = ss.get()
    print(f"\nFetched {len(df)} stocks!\n")

    return df


def calculate_quality_score(row):
    """Calculate composite quality score (0-100)."""
    score = 0.0

    # ROE score
    try:
        roe = row.get("Return on Equity (TTM)")
        if pd.notna(roe) and roe > 15:
            score += 25
        elif pd.notna(roe) and roe > 10:
            score += 15
        elif pd.notna(roe) and roe > 5:
            score += 5
    except:
        pass

    # Gross Margin score
    try:
        gross_margin = row.get("Gross Margin (TTM)")
        if pd.notna(gross_margin) and gross_margin > 30:
            score += 25
        elif pd.notna(gross_margin) and gross_margin > 20:
            score += 15
        elif pd.notna(gross_margin) and gross_margin > 10:
            score += 5
    except:
        pass

    # Net Margin score
    try:
        net_margin = row.get("Net Margin (TTM)")
        if pd.notna(net_margin) and net_margin > 10:
            score += 25
        elif pd.notna(net_margin) and net_margin > 5:
            score += 15
        elif pd.notna(net_margin) and net_margin > 0:
            score += 5
    except:
        pass

    # ROA score
    try:
        roa = row.get("Return on Assets (TTM)")
        if pd.notna(roa) and roa > 5:
            score += 25
        elif pd.notna(roa) and roa > 3:
            score += 15
        elif pd.notna(roa) and roa > 1:
            score += 5
    except:
        pass

    # Determine grade
    if score >= 90:
        grade = "A"
    elif score >= 80:
        grade = "B"
    elif score >= 70:
        grade = "C"
    elif score >= 60:
        grade = "D"
    else:
        grade = "F"

    return round(score, 2), grade


def main():
    df = fetch_morocco_stocks()

    if df is None or len(df) == 0:
        print("No data fetched!")
        return

    # Print key columns
    key_columns = [
        "Symbol",
        "Name",
        "Price",
        "Change %",
        "Market Capitalization",
        "Price to Earnings Ratio (TTM)",
        "Price to Book (FY)",
        "Dividend Yield %",
        "Return on Equity (TTM)",
        "Return on Assets (TTM)",
        "Gross Margin (TTM)",
        "Net Margin (TTM)",
        "1-Month Performance",
    ]

    print("Key columns available:")
    for col in key_columns:
        if col in df.columns:
            print(f"  [OK] {col}")
        else:
            print(f"  [MISSING] {col}")

    print("\n" + "=" * 50)

    # Create simplified view
    print("\nSimplified data:")
    simplified = []
    for _, row in df.iterrows():
        score, grade = calculate_quality_score(row)
        simplified.append(
            {
                "Symbol": row.get("Symbol", "N/A"),
                "Name": row.get("Name", "N/A"),
                "Price": row.get("Price", "N/A"),
                "Change %": row.get("Change %", "N/A"),
                "P/E": row.get("Price to Earnings Ratio (TTM)", "N/A"),
                "P/B": row.get("Price to Book (FY)", "N/A"),
                "Yield %": row.get("Dividend Yield %", "N/A"),
                "ROE %": row.get("Return on Equity (TTM)", "N/A"),
                "Net Margin %": row.get("Net Margin (TTM)", "N/A"),
                "Quality": score,
                "Grade": grade,
            }
        )

    simple_df = pd.DataFrame(simplified)
    simple_df = simple_df.sort_values("Quality", ascending=False)

    print("\nAll Moroccan Stocks (sorted by Quality Score):")
    print(simple_df.to_string(index=False))

    print("\n" + "=" * 50)
    print(f"\nTotal stocks: {len(df)}")
    print(f"Average quality score: {simple_df['Quality'].mean():.1f}")
    print(f"\nGrade distribution:")
    print(simple_df["Grade"].value_counts().sort_index())


if __name__ == "__main__":
    main()
