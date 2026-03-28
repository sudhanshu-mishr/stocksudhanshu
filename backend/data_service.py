import yfinance as yf
import pandas as pd
import sqlite3
import os
import numpy as np

# Define a list of default symbols
SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]

# Database file path
DB_PATH = "backend/financial_data.db"

def fetch_data(symbol, period="1y"):
    """Fetches historical stock data from Yahoo Finance."""
    print(f"Fetching data for {symbol}...")
    ticker = yf.Ticker(symbol)
    df = ticker.history(period=period)

    if df.empty:
        print(f"Warning: No data found for {symbol}.")
        return None

    # Reset index to make Date a column
    df = df.reset_index()

    # Ensure Date is datetime without timezone for sqlite compatibility
    df['Date'] = pd.to_datetime(df['Date']).dt.tz_localize(None)

    # Keep only relevant columns
    if 'Dividends' in df.columns:
        df = df.drop(columns=['Dividends', 'Stock Splits'])

    df['Symbol'] = symbol
    return df

def clean_and_transform(df):
    """Cleans data and adds calculated metrics."""
    if df is None or df.empty:
        return None

    # Handle missing values (forward fill)
    df.ffill(inplace=True)

    # Calculate Daily Return
    df['Daily Return'] = (df['Close'] - df['Open']) / df['Open']

    # Calculate 7-day Moving Average (using rolling window of 7)
    df['7-day MA'] = df['Close'].rolling(window=7).mean()

    # Calculate 52-week High and Low
    # Assumes we fetched 1 year (252 trading days) of data
    df['52-week High'] = df['Close'].rolling(window=252, min_periods=1).max()
    df['52-week Low'] = df['Close'].rolling(window=252, min_periods=1).min()

    # Custom metric: Volatility score (standard deviation of daily returns over the last 30 days)
    df['Volatility Score'] = df['Daily Return'].rolling(window=30).std()

    # Fill remaining NaNs introduced by rolling calculations with 0 or backward fill
    df.bfill(inplace=True)

    return df

def save_to_db(df, table_name="stock_data"):
    """Saves a Pandas DataFrame to SQLite database."""
    if df is None or df.empty:
        return

    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)

    # Store data
    df.to_sql(table_name, conn, if_exists='append', index=False)

    conn.close()

def main():
    """Main function to run the data pipeline."""
    # Ensure DB is clean
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    for symbol in SYMBOLS:
        df = fetch_data(symbol, period="1y")
        if df is not None:
            processed_df = clean_and_transform(df)
            save_to_db(processed_df)
            print(f"Successfully processed and stored data for {symbol}.")

if __name__ == "__main__":
    main()
