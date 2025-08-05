import numpy as np
import pandas as pd
import pymc as pm

def run_analysis(df):
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values('Date').reset_index(drop=True)
    df['Log_Price'] = np.log(df['Price'])
    df['Log_Return'] = df['Log_Price'].diff()
    df = df.dropna()

    log_returns = df['Log_Return'].values
    dates = df['Date'].values
    n_obs = len(log_returns)

    with pm.Model() as model:
        tau = pm.DiscreteUniform('tau', lower=1, upper=n_obs - 1)
        mu1 = pm.Normal('mu1', mu=0, sigma=0.1)
        mu2 = pm.Normal('mu2', mu=0, sigma=0.1)
        sigma1 = pm.HalfNormal('sigma1', sigma=0.1)
        sigma2 = pm.HalfNormal('sigma2', sigma=0.1)

        mu = pm.math.switch(tau > np.arange(n_obs), mu1, mu2)
        sigma = pm.math.switch(tau > np.arange(n_obs), sigma1, sigma2)
        returns = pm.Normal('returns', mu=mu, sigma=sigma, observed=log_returns)

        trace = pm.sample(1000, tune=500, chains=2, target_accept=0.9, return_inferencedata=True)

    tau_samples = trace.posterior['tau'].values.flatten()
    most_probable_tau = int(np.median(tau_samples))
    change_point_date = str(dates[most_probable_tau])

    mu1_post = trace.posterior['mu1'].values.flatten()
    mu2_post = trace.posterior['mu2'].values.flatten()
    sigma1_post = trace.posterior['sigma1'].values.flatten()
    sigma2_post = trace.posterior['sigma2'].values.flatten()

    avg_price_before = np.exp(np.log(df['Price'].iloc[:most_probable_tau].mean()) + np.mean(mu1_post))
    avg_price_after = np.exp(np.log(df['Price'].iloc[most_probable_tau:].mean()) + np.mean(mu2_post))
    price_change_pct = (avg_price_after - avg_price_before) / avg_price_before * 100

    volatility_before = np.mean(sigma1_post)
    volatility_after = np.mean(sigma2_post)
    volatility_change_pct = (volatility_after - volatility_before) / volatility_before * 100

    return {
        'change_point_date': change_point_date,
        'volatility_before': volatility_before,
        'volatility_after': volatility_after,
        'volatility_change_pct': volatility_change_pct,
        'avg_price_before': avg_price_before,
        'avg_price_after': avg_price_after,
        'price_change_pct': price_change_pct
    }
