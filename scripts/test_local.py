#!/usr/bin/env python3
"""
Local test - fetch data and save to JSON file (no Supabase needed)
"""

from tvscreener import StockScreener, Market
import json
import os
from datetime import datetime


def calculate_quality_score(row):
    score = 0.0

    # ROE score
    try:
        roe = row.get("Return on Equity (TTM)")
        if roe and roe > 15:
            score += 25
        elif roe and roe > 10:
            score += 15
        elif roe and roe > 5:
            score += 5
    except:
        pass

    # Gross Margin score
    try:
        gross_margin = row.get("Gross Margin (TTM)")
        if gross_margin and gross_margin > 30:
            score += 25
        elif gross_margin and gross_margin > 20:
            score += 15
        elif gross_margin and gross_margin > 10:
            score += 5
    except:
        pass

    # Net Margin score
    try:
        net_margin = row.get("Net Margin (TTM)")
        if net_margin and net_margin > 10:
            score += 25
        elif net_margin and net_margin > 5:
            score += 15
        elif net_margin and net_margin > 0:
            score += 5
    except:
        pass

    # ROA score
    try:
        roa = row.get("Return on Assets (TTM)")
        if roa and roa > 5:
            score += 25
        elif roa and roa > 3:
            score += 15
        elif roa and roa > 1:
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
    print("Fetching Moroccan stocks from TradingView...")

    ss = StockScreener()
    ss.set_markets(Market.MOROCCO)
    df = ss.get()

    print(f"Fetched {len(df)} stocks\n")

    # Transform to our schema
    records = []
    for _, row in df.iterrows():
        ticker = row.get("Symbol", "")
        if ticker and ticker.startswith("CSEMA:"):
            ticker = ticker.replace("CSEMA:", "")

        quality_score, quality_grade = calculate_quality_score(row)

        record = {
            "ticker": ticker,
            "name": row.get("Name"),
            "sector": row.get("Sector"),
            "price": row.get("Price"),
            "change_percent": row.get("Change %"),
            "volume": row.get("Volume"),
            "market_cap": row.get("Market Capitalization"),
            "pe_ratio": row.get("Price to Earnings Ratio (TTM)"),
            "pb_ratio": row.get("Price to Book (FY)"),
            "dividend_yield": row.get("Dividend Yield %"),
            "roe": row.get("Return on Equity (TTM)"),
            "roa": row.get("Return on Assets (TTM)"),
            "gross_margin": row.get("Gross Margin (TTM)"),
            "net_margin": row.get("Net Margin (TTM)"),
            "perf_1m": row.get("1-Month Performance"),
            "perf_3m": row.get("3-Month Performance"),
            "perf_6m": row.get("6-Month Performance"),
            "perf_1y": row.get("1-Year Performance"),
            "rsi_14": row.get("Relative Strength Index (14)"),
            "sma_50": row.get("Simple Moving Average (50)"),
            "sma_200": row.get("Simple Moving Average (200)"),
            "tech_rating": row.get("Technical Rating"),
            "quality_score": quality_score,
            "quality_grade": quality_grade,
            "last_updated": datetime.utcnow().isoformat(),
        }
        records.append(record)

    # Save to JSON
    output_file = "market_data_local.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(records)} records to {output_file}")
    print("\nGrade distribution:")
    grades = {}
    for r in records:
        g = r["quality_grade"]
        grades[g] = grades.get(g, 0) + 1
    for g in ["A", "B", "C", "D", "F"]:
        print(f"  {g}: {grades.get(g, 0)}")

    print(f"\nFile size: {os.path.getsize(output_file) / 1024:.1f} KB")


if __name__ == "__main__":
    main()
