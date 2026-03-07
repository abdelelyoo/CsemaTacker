#!/usr/bin/env python3
"""
Market Data Sync Script for Atlas Portfolio Manager
Fetches Moroccan (CSEMA) stock data from TradingView via tvscreener
and stores in Supabase.

Schedule: Daily at 9:00 AM (Morocco time) via GitHub Actions
"""

from tvscreener import StockScreener, Market
from supabase import create_client
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

# Load .env from scripts folder
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY")


def fetch_morocco_stocks():
    """
    Fetch all Moroccan stocks from TradingView screener.
    """
    logger.info("Fetching Moroccan stocks from TradingView...")

    ss = StockScreener()
    ss.set_markets(Market.MOROCCO)

    # Get default columns (no specific fields needed)
    df = ss.get()
    logger.info(f"Fetched {len(df)} stocks from TradingView")

    return df


def calculate_quality_score(row):
    """
    Calculate composite quality score (0-100) and grade.

    Factors:
    - ROE (25%): >15% = full points
    - Gross Margin (25%): >30% = full points
    - Net Margin (25%): >10% = full points
    - ROA (25%): >5% = full points
    """
    import pandas as pd

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


def transform_record(record):
    """
    Transform TradingView field names to our schema.
    """
    import pandas as pd
    import math

    def clean_value(val):
        """Clean NaN/inf values for JSON"""
        if val is None or val == "":
            return None
        if isinstance(val, float):
            if math.isnan(val) or math.isinf(val):
                return None
        return val

    quality_score, quality_grade = calculate_quality_score(record)

    # Extract ticker (remove CSEMA: prefix)
    ticker = record.get("Symbol", "")
    if ticker and ticker.startswith("CSEMA:"):
        ticker = ticker.replace("CSEMA:", "")

    # Map TradingView column names to our schema
    return {
        "ticker": clean_value(ticker),
        "name": clean_value(record.get("Name")),
        "sector": clean_value(record.get("Sector")),
        "price": clean_value(record.get("Price")),
        "change_percent": clean_value(record.get("Change %")),
        "volume": clean_value(record.get("Volume")),
        "market_cap": clean_value(record.get("Market Capitalization")),
        "pe_ratio": clean_value(record.get("Price to Earnings Ratio (TTM)")),
        "pb_ratio": clean_value(record.get("Price to Book (FY)")),
        "dividend_yield": clean_value(record.get("Dividend Yield %")),
        "roe": clean_value(record.get("Return on Equity (TTM)")),
        "roa": clean_value(record.get("Return on Assets (TTM)")),
        "gross_margin": clean_value(record.get("Gross Margin (TTM)")),
        "net_margin": clean_value(record.get("Net Margin (TTM)")),
        "perf_1m": clean_value(record.get("1-Month Performance")),
        "perf_3m": clean_value(record.get("3-Month Performance")),
        "perf_6m": clean_value(record.get("6-Month Performance")),
        "perf_1y": clean_value(record.get("1-Year Performance")),
        "rsi_14": clean_value(record.get("Relative Strength Index (14)")),
        "sma_50": clean_value(record.get("Simple Moving Average (50)")),
        "sma_200": clean_value(record.get("Simple Moving Average (200)")),
        "tech_rating": clean_value(record.get("Technical Rating")),
        "quality_score": clean_value(quality_score),
        "quality_grade": clean_value(quality_grade),
        "last_updated": datetime.utcnow().isoformat(),
    }


def upsert_to_supabase(records, supabase_client):
    """
    Upsert records to Supabase market_data table.
    Returns number of records upserted.
    """
    import pandas as pd

    logger.info(f"Upserting {len(records)} records to Supabase...")

    # Transform records
    transformed = [transform_record(r) for r in records]

    # Filter out None tickers
    transformed = [r for r in transformed if r.get("ticker")]

    try:
        response = (
            supabase_client.table("market_data")
            .upsert(transformed, on_conflict="ticker")
            .execute()
        )

        logger.info(f"Successfully upserted {len(transformed)} records")
        return len(transformed)

    except Exception as e:
        logger.error(f"Error upserting to Supabase: {e}")
        raise


def main():
    """
    Main sync function.
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        raise ValueError("Missing Supabase configuration")

    logger.info("Starting market data sync...")

    # Initialize Supabase client with service role key
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Fetch data from TradingView
    df = fetch_morocco_stocks()
    stocks = df.to_dict("records")

    if stocks is None or len(stocks) == 0:
        logger.warning("No stocks fetched from TradingView")
        return

    # Upsert to Supabase
    count = upsert_to_supabase(stocks, supabase)

    logger.info(f"Market data sync complete. {count} records updated.")


if __name__ == "__main__":
    main()
