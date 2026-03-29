from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import sqlite3
import pandas as pd
import os
from typing import List, Optional
from pydantic import BaseModel

app = FastAPI(title="Mini Financial Data Platform")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "backend/financial_data.db"

def get_db_connection():
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database not found. Please run data_service.py first.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Mount static files (Frontend)
app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")

@app.get("/")
async def read_index():
    return FileResponse("frontend/dist/index.html")


@app.get("/api/companies")
def get_companies():
    """Returns a list of all available companies"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT Symbol FROM stock_data")
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        return {"companies": []}

    return {"companies": [row["Symbol"] for row in rows]}

@app.get("/api/data/{symbol}")
def get_stock_data(symbol: str, days: int = Query(30, description="Number of days to fetch")):
    """Returns last N days of stock data for a given symbol"""
    conn = get_db_connection()

    # Using parameterized query for safety
    query = f"""
    SELECT Date, Open, High, Low, Close, Volume, `Daily Return`, `7-day MA`, `Volatility Score`
    FROM stock_data
    WHERE Symbol = ?
    ORDER BY Date DESC
    LIMIT ?
    """

    df = pd.read_sql_query(query, conn, params=(symbol.upper(), days))
    conn.close()

    if df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")

    # Sort by date ascending for charts
    df = df.sort_values('Date')

    # Convert to dictionary format
    return df.to_dict(orient="records")

@app.get("/api/summary/{symbol}")
def get_stock_summary(symbol: str):
    """Returns 52-week high, low, average close, and latest volatility"""
    conn = get_db_connection()

    query = """
    SELECT `52-week High`, `52-week Low`, Close, `Volatility Score`
    FROM stock_data
    WHERE Symbol = ?
    ORDER BY Date DESC
    LIMIT 1
    """

    # Also get average close over all available data (approx 1 year)
    avg_query = "SELECT AVG(Close) as avg_close FROM stock_data WHERE Symbol = ?"

    cursor = conn.cursor()
    cursor.execute(query, (symbol.upper(),))
    latest = cursor.fetchone()

    cursor.execute(avg_query, (symbol.upper(),))
    avg_result = cursor.fetchone()

    conn.close()

    if not latest:
        raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")

    return {
        "symbol": symbol.upper(),
        "52_week_high": round(latest["52-week High"], 2),
        "52_week_low": round(latest["52-week Low"], 2),
        "average_close": round(avg_result["avg_close"], 2),
        "latest_close": round(latest["Close"], 2),
        "volatility_score": round(latest["Volatility Score"], 4)
    }


from sklearn.linear_model import LinearRegression
import numpy as np

@app.get("/api/compare")
def compare_stocks(symbol1: str = Query(...), symbol2: str = Query(...), days: int = Query(30)):
    """Compare two stocks' performance over the last N days"""
    conn = get_db_connection()

    query = """
    SELECT Symbol, Date, Close, `Daily Return`
    FROM stock_data
    WHERE Symbol IN (?, ?)
    ORDER BY Date DESC
    """

    df = pd.read_sql_query(query, conn, params=(symbol1.upper(), symbol2.upper()))
    conn.close()

    if df.empty:
        raise HTTPException(status_code=404, detail="No data found for the given symbols")

    df = df.sort_values('Date').groupby('Symbol').tail(days)

    result = {}
    for sym in [symbol1.upper(), symbol2.upper()]:
        sym_data = df[df['Symbol'] == sym]
        if not sym_data.empty:
            result[sym] = sym_data.to_dict(orient="records")

    return result

@app.get("/api/insights")
def get_insights():
    """Top gainers/losers based on the latest daily return"""
    conn = get_db_connection()
    query = """
    SELECT Symbol, Date, Close, `Daily Return`
    FROM stock_data
    WHERE Date = (SELECT MAX(Date) FROM stock_data)
    ORDER BY `Daily Return` DESC
    """

    df = pd.read_sql_query(query, conn)
    conn.close()

    if df.empty:
        return {"top_gainers": [], "top_losers": []}

    gainers = df.head(3).to_dict(orient="records")
    losers = df.tail(3).sort_values('Daily Return').to_dict(orient="records")

    return {
        "date": df.iloc[0]['Date'],
        "top_gainers": gainers,
        "top_losers": losers
    }

@app.get("/api/predict/{symbol}")
def predict_stock(symbol: str, days: int = Query(7)):
    """Simple linear regression prediction for the next N days based on last 60 days"""
    conn = get_db_connection()
    query = """
    SELECT Date, Close
    FROM stock_data
    WHERE Symbol = ?
    ORDER BY Date DESC
    LIMIT 60
    """

    df = pd.read_sql_query(query, conn, params=(symbol.upper(),))
    conn.close()

    if df.empty or len(df) < 10:
        raise HTTPException(status_code=400, detail=f"Not enough data to predict for {symbol}")

    df = df.sort_values('Date').reset_index(drop=True)
    df['DayIndex'] = np.arange(len(df))

    # Simple Linear Regression model
    X = df[['DayIndex']].values
    y = df['Close'].values

    model = LinearRegression()
    model.fit(X, y)

    # Predict future values
    future_indices = np.arange(len(df), len(df) + days).reshape(-1, 1)
    predictions = model.predict(future_indices)

    # Generate future dates (assuming weekday trading days, this is an approximation)
    last_date = pd.to_datetime(df['Date'].iloc[-1])
    future_dates = [last_date + pd.Timedelta(days=i) for i in range(1, days + 1)]

    result = [
        {"Date": date.strftime('%Y-%m-%d'), "Predicted_Close": round(pred, 2)}
        for date, pred in zip(future_dates, predictions)
    ]

    return {"symbol": symbol.upper(), "predictions": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
