import streamlit as st
import pandas as pd
import altair as alt
import requests
from io import StringIO

st.set_page_config(page_title="Jay Ambe Analytics", layout="centered")

st.title("Jay ambe — Analytics Explorer")
st.markdown("Quick visualizations for receivables, collections and payables. This app fetches the backend CSV at `/api/analytics/customers.csv` and visualizes it.")

BACKEND_BASE = st.text_input("Backend base URL", value="http://localhost:4000")

@st.cache_data
def fetch_customers_csv(base_url):
    url = f"{base_url.rstrip('/')}/api/analytics/customers.csv?sep=comma"
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    return resp.text

try:
    csv_text = fetch_customers_csv(BACKEND_BASE)
    df = pd.read_csv(StringIO(csv_text))
except Exception as e:
    st.error(f"Failed to fetch analytics CSV: {e}")
    st.stop()

# Normalize columns if needed
expected_cols = [c.lower() for c in df.columns]
# Ensure numeric columns
for col in df.columns:
    if 'total' in col.lower() or 'paid' in col.lower() or 'outstanding' in col.lower() or 'amount' in col.lower():
        df[col] = pd.to_numeric(df[col].astype(str).str.replace('[^0-9.-]', '', regex=True), errors='coerce').fillna(0)

st.subheader('Summary Table')
st.dataframe(df)

st.subheader('Top Receivables')
if 'outstanding' in expected_cols or any('outstanding' in c for c in expected_cols):
    # try to pick outstanding-like column
    out_col = [c for c in df.columns if 'outstanding' in c.lower()]
else:
    out_col = [c for c in df.columns if 'total' in c.lower()]

if out_col:
    out = out_col[0]
    top = df.sort_values(by=out, ascending=False).head(10)
    chart = alt.Chart(top).mark_bar(color='#10B981').encode(
        x=alt.X(out, title='Outstanding (INR)'),
        y=alt.Y('Customer:N', sort='-x')
    )
    st.altair_chart(chart, use_container_width=True)
else:
    st.write('No numeric receivable column found')

st.subheader('Collections Over Time')
# If payments not available here, try to fetch payments endpoint
try:
    resp = requests.get(f"{BACKEND_BASE.rstrip('/')}/api/payments", timeout=10)
    if resp.ok:
        payments = pd.DataFrame(resp.json())
        if not payments.empty:
            payments['date'] = pd.to_datetime(payments.get('createdAt') or payments.get('created_at') or payments.get('date'))
            series = payments.groupby(payments['date'].dt.date)['amount'].sum().reset_index()
            series.columns = ['date','amount']
            line = alt.Chart(series).mark_line(point=True).encode(x='date:T', y='amount:Q')
            st.altair_chart(line, use_container_width=True)
except Exception:
    st.info('Could not fetch /api/payments for collections chart')

st.caption('Run this Streamlit app with:')
st.code('pip install -r requirements.txt\nstreamlit run app.py', language='bash')
