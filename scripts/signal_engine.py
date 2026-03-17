#!/usr/bin/env python3
"""
Enhanced Signal Engine for Moroccan BVC (CSEMA)
Calculates technical signals, conviction levels, and fundamental quality scores.
"""

import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime
from tvscreener import StockScreener, Market

# tvscreener v0.2.0 uses string-based fields or default sets
# We will use the standard fields and then filter/calculate
# (Optional data cleaning/mapping here)


def fetch_data():
    """Step 1: Fetch all required columns via tvscreener"""
    print("Fetching data from TradingView (MOROCCO)...")
    ss = StockScreener()
    ss.set_markets(Market.MOROCCO)

    # Fetch data - it gets a broad set of columns by default
    df = ss.get()

    # In v0.2.0, column names are exactly what TradingView returns
    # Let's normalize them to something Python-friendly
    print(f"Columns found: {df.columns.tolist()[:5]}...")

    # Helper to find a column by partial name
    def find_col(partial):
        for c in df.columns:
            if partial.lower() in c.lower():
                return c
        return None

    mapping = {
        "Symbol": "ticker",
        "Name": "name",
        "Price": "close",
        "Change %": "price_change_pct",
        "Chg %": "price_change_pct",
        "Relative Strength Index (14)": "rsi",
        "Simple Moving Average (50)": "sma_50",
        "Simple Moving Average (200)": "sma_200",
        "Exponential Moving Average (20)": "ema_20",
        "MACD Level (12, 26)": "macd_macd",
        "MACD Signal (12, 26)": "macd_signal",
        "Stochastic %K (14, 3, 3)": "stoch_k",
        "Stochastic %D (14, 3, 3)": "stoch_d",
        "Bollinger Upper Band (20)": "bb_upper",
        "Bollinger Lower Band (20)": "bb_lower",
        "Average True Range (14)": "atr",
        "Average Directional Index (14)": "adx",
        "Directional Indicator (+DI) (14)": "adx_plus_di",
        "Directional Indicator (-DI) (14)": "adx_minus_di",
        "Technical Rating": "technical_rating",
        "Volume": "volume",
        "Average Volume (30 day)": "average_volume_30d",
        "Sector": "sector",
        "Return on Equity (TTM)": "return_on_equity",
        "Gross Margin (TTM)": "gross_margin",
        "Net Margin (TTM)": "net_margin",
        "Return on Assets (TTM)": "return_on_assets",
        "Total Debt to Equity (MRQ)": "debt_to_equity",
        "Dividend Yield % (Recent)": "dividends_yield",
    }

    # Perform exact mapping first
    actual_mapping = {}
    used_targets = set()

    # Priority 1: Exact matches
    for tv_col in df.columns:
        if tv_col in mapping:
            actual_mapping[tv_col] = mapping[tv_col]
            used_targets.add(mapping[tv_col])

    # Priority 2: Partial matches for remaining targets
    for key, val in mapping.items():
        if val in used_targets:
            continue
        for tv_col in df.columns:
            if tv_col not in actual_mapping and key.lower() in tv_col.lower():
                actual_mapping[tv_col] = val
                used_targets.add(val)
                break

    df = df.rename(columns=actual_mapping)
    print(f"Mapped columns: {list(actual_mapping.values())}")

    if "ticker" in df.columns:
        df["ticker"] = df["ticker"].str.replace("CSEMA:", "", regex=False)

    # Filter out non-numeric values for calculation columns
    calc_cols = [
        "close",
        "rsi",
        "sma_50",
        "sma_200",
        "ema_20",
        "macd_macd",
        "macd_signal",
        "stoch_k",
        "stoch_d",
        "bb_upper",
        "bb_lower",
        "atr",
        "adx",
        "volume",
        "average_volume_30d",
        "return_on_equity",
        "gross_margin",
        "net_margin",
        "return_on_assets",
        "debt_to_equity",
        "dividends_yield",
    ]

    for col in calc_cols:
        if col in df.columns:
            try:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            except Exception as e:
                print(f"Error converting {col} to numeric: {e}")
                df[col] = np.nan

    return df


def calculate_indicators(df):
    """Step 2: Derived Indicators"""
    print("Calculating derived indicators...")

    # Ensure we have a DataFrame to work with
    if df.empty:
        return df

    # --- RVOL ---
    if "volume" in df.columns and "average_volume_30d" in df.columns:
        df["rvol"] = df["volume"] / df["average_volume_30d"].replace(0, np.nan)
        df["is_liquid"] = df["average_volume_30d"] > 5000
    else:
        df["rvol"] = np.nan
        df["is_liquid"] = (
            True  # Default to true if we can't tell, or false? Let's say true to not suppress.
        )

    # --- BB Width & Position ---
    if all(c in df.columns for c in ["bb_upper", "bb_lower", "close"]):
        df["bb_width"] = (df["bb_upper"] - df["bb_lower"]) / df["close"]
        df["bb_position"] = (df["close"] - df["bb_lower"]) / (
            df["bb_upper"] - df["bb_lower"]
        ).replace(0, np.nan)
    else:
        df["bb_width"] = np.nan
        df["bb_position"] = np.nan

    # --- Sector-Relative RSI ---
    if "sector" in df.columns and "rsi" in df.columns:
        sector_avg_rsi = df.groupby("sector")["rsi"].transform("mean")
        df["relative_rsi"] = df["rsi"] - sector_avg_rsi
    else:
        df["relative_rsi"] = 0

    # --- Candle color proxy ---
    if "close" in df.columns and "ema_20" in df.columns:
        df["is_green"] = df["close"] > df["ema_20"]
        df["is_red"] = df["close"] < df["ema_20"]
    else:
        df["is_green"] = False
        df["is_red"] = False

    # --- Squeeze logic ---
    if "bb_width" in df.columns and not df["bb_width"].isnull().all():
        squeeze_threshold = df["bb_width"].quantile(0.15)
        df["is_squeeze"] = df["bb_width"] < squeeze_threshold
    else:
        df["is_squeeze"] = False

    return df


def compute_signal_score(row):
    """Step 3: Signal Scoring Logic"""
    bull = 0
    bear = 0
    flags = []

    if not row.get("is_liquid", False):
        return 0, 0, ["ILLIQUID - signals suppressed"]

    # --- RSI ---
    rsi = row.get("rsi", 50)
    if rsi < 35:
        bull += 2
        flags.append("RSI Oversold")
    elif rsi > 65:
        bear += 2
        flags.append("RSI Overbought")

    # --- Sector-Relative RSI ---
    rel_rsi = row.get("relative_rsi", 0)
    if rel_rsi > 10 and rsi < 55:
        bull += 2
        flags.append("Sector RSI Strong")
    elif rel_rsi < -10 and rsi > 45:
        bear += 2
        flags.append("Sector RSI Weak")

    # --- SMA Cross + ADX ---
    adx = row.get("adx", 0)
    sma50 = row.get("sma_50")
    sma200 = row.get("sma_200")
    if adx > 20 and sma50 and sma200:
        if sma50 > sma200:
            bull += 3
            flags.append("ADX Golden Cross")
        elif sma50 < sma200:
            bear += 3
            flags.append("ADX Death Cross")

    # --- MACD ---
    macd = row.get("macd_macd")
    sig = row.get("macd_signal")
    if macd is not None and sig is not None:
        if macd > sig:
            bull += 2
            flags.append("MACD Bullish")
        else:
            bear += 2
            flags.append("MACD Bearish")

    # --- BB Position ---
    bbp = row.get("bb_position")
    if pd.notna(bbp):
        if bbp < 0.2:
            bull += 1
            flags.append("BB Lower Zone")
        elif bbp > 0.8:
            bear += 1
            flags.append("BB Upper Zone")

    # --- RVOL ---
    rvol = row.get("rvol", 0)
    if pd.notna(rvol) and rvol > 1.5:
        if row.get("is_green"):
            bull += 2
            flags.append("RVOL Spike + Green")
        elif row.get("is_red"):
            bear += 2
            flags.append("RVOL Spike + Red")

    # --- Squeeze Breakout ---
    if row.get("is_squeeze", False):
        close = row.get("close")
        up = row.get("bb_upper")
        low = row.get("bb_lower")
        if close and up and close > up and rvol > 1.5:
            bull += 3
            flags.append("Squeeze Breakout UP")
        elif close and low and close < low and rvol > 1.5:
            bear += 3
            flags.append("Squeeze Breakout DOWN")

    # --- Stochastic ---
    sk = row.get("stoch_k")
    sd = row.get("stoch_d")
    if sk is not None and sd is not None:
        if sk < 20 and sd < 20:
            bull += 1
            flags.append("Stoch Oversold")
        elif sk > 80 and sd > 80:
            bear += 1
            flags.append("Stoch Overbought")

    # --- TV Rating ---
    tr = row.get("technical_rating", 0) or 0
    if tr >= 0.5:
        bull += 3
        flags.append("TV Strong Buy")
    elif tr >= 0.1:
        bull += 1
        flags.append("TV Buy")
    elif tr <= -0.5:
        bear += 3
        flags.append("TV Strong Sell")
    elif tr <= -0.1:
        bear += 1
        flags.append("TV Sell")

    return bull, bear, flags


def classify_conviction(row):
    """Step 4: Conviction Classification"""
    if not row.get("is_liquid", False):
        return "ILLIQUID"

    bull = row.get("bull_score", 0)
    bear = row.get("bear_score", 0)
    net = bull - bear

    if bull >= 7:
        return "🔥 HIGH CONVICTION BUY"
    if bear >= 7:
        return "🔥 HIGH CONVICTION SELL"
    if net >= 4:
        return "👀 WATCH - Bullish"
    if net <= -4:
        return "👀 WATCH - Bearish"
    return "NEUTRAL"


def detect_perfect_entry(row):
    """Step 5: Perfect Entry Patterns"""
    if not row.get("is_liquid", False):
        return None

    close = row.get("close")
    sma50 = row.get("sma_50")
    sma200 = row.get("sma_200")
    rsi = row.get("rsi", 50)
    bbp = row.get("bb_position", 0.5)
    rvol = row.get("rvol", 1.0)

    if not all([close, sma50, sma200]):
        return None

    # Golden Pullback
    if (
        sma50 > sma200
        and close > sma200
        and close < sma50
        and rsi < 45
        and bbp < 0.25
        and rvol < 0.8
    ):
        return "🔥 Golden Pullback"

    # Exhaustion Peak
    if sma50 < sma200 and close < sma200 and close > sma50 and rsi > 55 and bbp > 0.75:
        return "🧊 Exhaustion Peak"

    # Squeeze Breakout
    if row.get("is_squeeze", False):
        up = row.get("bb_upper")
        low = row.get("bb_lower")
        if up and close > up and rvol > 1.5:
            return "💥 Squeeze Breakout UP"
        if low and close < low and rvol > 1.5:
            return "💥 Squeeze Breakout DOWN"

    return None


def compute_quality_score(row):
    """Step 7: Quality Score (Fundamentals)"""
    score = 0

    # ROE (20%)
    roe = row.get("return_on_equity", 0) or 0
    score += min(roe / 15, 1.0) * 20

    # Gross Margin (20%)
    gm = row.get("gross_margin", 0) or 0
    score += min(gm / 30, 1.0) * 20

    # Net Margin (20%)
    nm = row.get("net_margin", 0) or 0
    score += min(nm / 10, 1.0) * 20

    # ROA (15%)
    roa = row.get("return_on_assets", 0) or 0
    score += min(roa / 5, 1.0) * 15

    # Dividend Yield (15%)
    dy = row.get("dividends_yield", 0) or 0
    score += min(dy / 3.5, 1.0) * 15

    # Debt/Equity (10%)
    de = row.get("debt_to_equity", 0) or 0
    debt_score = max(
        0, 1 - (de / 150)
    )  # tvscreener returns percentage, e.g. 150.0 for 1.5
    score += debt_score * 10

    grade = "F"
    if score >= 80:
        grade = "A"
    elif score >= 65:
        grade = "B"
    elif score >= 50:
        grade = "C"
    elif score >= 35:
        grade = "D"

    return round(score, 1), grade


def get_masi_regime():
    """Step 6: Market Regime Gate (MASI)"""
    print("Detecting MASI Market Regime...")
    try:
        ss = StockScreener()
        ss.set_markets(Market.MOROCCO)
        ss.set_columns([Column.CLOSE, Column.SMA_50, Column.SMA_200])
        # Find MASI by name/symbol
        df = ss.get()
        # Moroccan index symbol might be MOROCCO or MASI or similar
        masi_row = df[df["Symbol"].str.contains("MASI", na=False, case=False)].iloc[0]

        close = masi_row["Price"]
        sma50 = masi_row["Simple Moving Average (50)"]
        sma200 = masi_row["Simple Moving Average (200)"]

        if close > sma50 > sma200:
            return "bull"
        if close < sma50 < sma200:
            return "bear"
        return "mixed"
    except Exception as e:
        print(f"Warning: Could not fetch MASI regime: {e}")
        return "mixed"


def main():
    try:
        df = fetch_data()
        if df.empty:
            print("No data fetched.")
            return

        df = calculate_indicators(df)

        # Scoring
        df[["bull_score", "bear_score", "signal_flags"]] = df.apply(
            lambda r: pd.Series(compute_signal_score(r)), axis=1
        )

        # Conviction
        df["conviction"] = df.apply(classify_conviction, axis=1)

        # Perfect Entry
        df["perfect_entry"] = df.apply(detect_perfect_entry, axis=1)

        # Quality
        df[["quality_score", "quality_grade"]] = df.apply(
            lambda r: pd.Series(compute_quality_score(r)), axis=1
        )

        # Regime Gate
        regime = get_masi_regime()
        print(f"Market Regime: {regime.upper()}")

        def apply_gate(row):
            conv = row["conviction"]
            if regime == "bear" and ("BUY" in conv or "Bullish" in conv):
                return "SUPPRESSED (Bear Market)"
            if regime == "mixed" and row["bull_score"] < 7 and row["bear_score"] < 7:
                # Keep high conviction, suppress others
                if "WATCH" in conv:
                    return "SUPPRESSED (Mixed Market)"
            return conv

        df["conviction"] = df.apply(apply_gate, axis=1)

        # Prep for JSON output
        output_cols = [
            "ticker",
            "name",
            "close",
            "price_change_pct",
            "bull_score",
            "bear_score",
            "conviction",
            "perfect_entry",
            "signal_flags",
            "quality_score",
            "quality_grade",
            "is_liquid",
            "rvol",
            "bb_position",
            "relative_rsi",
            "is_squeeze",
            "rsi",
            "sma_50",
            "sma_200",
        ]

        # Handle missing columns gracefully
        available_cols = [c for c in output_cols if c in df.columns]
        result_df = df[available_cols].copy()

        # Fill NaN for JSON compatibility
        result_df = result_df.replace({np.nan: None, np.inf: None, -np.inf: None})

        output_path = os.path.join(os.path.dirname(__file__), "../market_signals.json")
        results = result_df.to_dict("records")

        final_data = {
            "regime": regime,
            "last_updated": datetime.now().isoformat(),
            "stocks": results,
        }

        with open(output_path, "w") as f:
            json.dump(final_data, f, indent=2)

        print(f"Success! Generated signals for {len(results)} stocks.")
        print(f"Output saved to: {output_path}")

    except Exception as e:
        print(f"Error in Signal Engine: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
