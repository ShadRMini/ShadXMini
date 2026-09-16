import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { getPublicJson } from "./public-api";

export interface CurrencySettings {
  baseCurrency: string;
  base_currency: string;
  currencySymbol: string;
  currency_symbol: string;
  usdToSyp: number;
  usd_to_syp: number;
  usdToTry: number;
  usd_to_try: number;
  usdToEur: number;
  usd_to_eur: number;
  usdToSar: number;
  usd_to_sar: number;
  showBothCurrencies: boolean;
  show_both_currencies: boolean;
  decimals: number;
  currencyDecimals: number;
  currency_decimals: number;
  thousandsSeparator: string;
  thousands_separator: string;
  decimalSeparator: string;
  decimal_separator: string;
  exchangeRate: number;
  exchange_rate: number;
}

export const defaultCurrencySettings: CurrencySettings = {
  baseCurrency: "USD",
  base_currency: "USD",
  currencySymbol: "$",
  currency_symbol: "$",
  usdToSyp: 15000,
  usd_to_syp: 15000,
  usdToTry: 34.5,
  usd_to_try: 34.5,
  usdToEur: 0.92,
  usd_to_eur: 0.92,
  usdToSar: 3.75,
  usd_to_sar: 3.75,
  showBothCurrencies: true,
  show_both_currencies: true,
  decimals: 2,
  currencyDecimals: 2,
  currency_decimals: 2,
  thousandsSeparator: ",",
  thousands_separator: ",",
  decimalSeparator: ".",
  decimal_separator: ".",
  exchangeRate: 15000,
  exchange_rate: 15000,
};

interface CurrencyContextType {
  currencySettings: CurrencySettings;
  baseCurrency: string;
  currencySymbol: string;
  exchangeRate: number;
  showBothCurrencies: boolean;
  formatPrice: (amountInUsd: number | string | undefined | null, customDecimals?: number) => string;
  formatPriceWithSyp: (amountInUsd: number | string | undefined | null, customDecimals?: number) => { primary: string; secondary?: string };
  convertUsdToLocal: (amountInUsd: number) => number;
  convertUsdToSyp: (amountInUsd: number) => number;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currencySettings: defaultCurrencySettings,
  baseCurrency: "USD",
  currencySymbol: "$",
  exchangeRate: 15000,
  showBothCurrencies: true,
  formatPrice: (amount) => `$${Number(amount || 0).toFixed(2)}`,
  formatPriceWithSyp: (amount) => ({ primary: `$${Number(amount || 0).toFixed(2)}` }),
  convertUsdToLocal: (amount) => Number(amount || 0),
  convertUsdToSyp: (amount) => Number(amount || 0) * 15000,
  refreshCurrency: async () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(() => {
    try {
      const cached = localStorage.getItem("xpay_currency_settings");
      if (cached) {
        return { ...defaultCurrencySettings, ...JSON.parse(cached) };
      }
    } catch {}
    return defaultCurrencySettings;
  });

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getPublicJson<CurrencySettings>("/public/currency-settings");
      if (data && typeof data === "object") {
        const merged: CurrencySettings = {
          baseCurrency: String(data.baseCurrency || data.base_currency || "USD"),
          base_currency: String(data.baseCurrency || data.base_currency || "USD"),
          currencySymbol: String(data.currencySymbol || data.currency_symbol || (data.baseCurrency === "SYP" ? "ل.س" : "$")),
          currency_symbol: String(data.currencySymbol || data.currency_symbol || (data.baseCurrency === "SYP" ? "ل.س" : "$")),
          usdToSyp: Number(data.usdToSyp || data.usd_to_syp || data.exchangeRate || data.exchange_rate || 15000),
          usd_to_syp: Number(data.usdToSyp || data.usd_to_syp || data.exchangeRate || data.exchange_rate || 15000),
          usdToTry: Number(data.usdToTry || data.usd_to_try || 34.5),
          usd_to_try: Number(data.usdToTry || data.usd_to_try || 34.5),
          usdToEur: Number(data.usdToEur || data.usd_to_eur || 0.92),
          usd_to_eur: Number(data.usdToEur || data.usd_to_eur || 0.92),
          usdToSar: Number(data.usdToSar || data.usd_to_sar || 3.75),
          usd_to_sar: Number(data.usdToSar || data.usd_to_sar || 3.75),
          showBothCurrencies: data.showBothCurrencies !== undefined
            ? Boolean(data.showBothCurrencies)
            : data.show_both_currencies !== undefined
            ? Boolean(data.show_both_currencies)
            : true,
          show_both_currencies: data.showBothCurrencies !== undefined
            ? Boolean(data.showBothCurrencies)
            : data.show_both_currencies !== undefined
            ? Boolean(data.show_both_currencies)
            : true,
          decimals: Number(data.decimals ?? data.currencyDecimals ?? data.currency_decimals ?? 2),
          currencyDecimals: Number(data.decimals ?? data.currencyDecimals ?? data.currency_decimals ?? 2),
          currency_decimals: Number(data.decimals ?? data.currencyDecimals ?? data.currency_decimals ?? 2),
          thousandsSeparator: String(data.thousandsSeparator || data.thousands_separator || ","),
          thousands_separator: String(data.thousandsSeparator || data.thousands_separator || ","),
          decimalSeparator: String(data.decimalSeparator || data.decimal_separator || "."),
          decimal_separator: String(data.decimalSeparator || data.decimal_separator || "."),
          exchangeRate: Number(data.exchangeRate || data.exchange_rate || data.usdToSyp || data.usd_to_syp || 15000),
          exchange_rate: Number(data.exchangeRate || data.exchange_rate || data.usdToSyp || data.usd_to_syp || 15000),
        };

        setCurrencySettings(merged);
        try {
          localStorage.setItem("xpay_currency_settings", JSON.stringify(merged));
        } catch {}
      }
    } catch (err) {
      console.warn("[CurrencyProvider] Failed to fetch currency settings:", err);
    }
  }, []);

  useEffect(() => {
    fetchSettings();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "xpay_currency_settings" || e.key === "xpay_settings_updated") {
        fetchSettings();
      }
    };

    const handleCustom = () => {
      fetchSettings();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("xpay_currency_change", handleCustom);
    window.addEventListener("focus", handleCustom);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("xpay_currency_change", handleCustom);
      window.removeEventListener("focus", handleCustom);
    };
  }, [fetchSettings]);

  const baseCurrency = currencySettings.baseCurrency;
  const currencySymbol = currencySettings.currencySymbol;
  const exchangeRate = currencySettings.exchangeRate || currencySettings.usdToSyp || 15000;
  const showBothCurrencies = currencySettings.showBothCurrencies;

  const convertUsdToLocal = useCallback((amountInUsd: number) => {
    const num = Number(amountInUsd) || 0;
    if (baseCurrency === "USD") return num;
    if (baseCurrency === "SYP") return num * (currencySettings.usdToSyp || exchangeRate || 15000);
    if (baseCurrency === "TRY") return num * (currencySettings.usdToTry || 34.5);
    if (baseCurrency === "EUR") return num * (currencySettings.usdToEur || 0.92);
    if (baseCurrency === "SAR") return num * (currencySettings.usdToSar || 3.75);
    return num * exchangeRate;
  }, [baseCurrency, currencySettings, exchangeRate]);

  const convertUsdToSyp = useCallback((amountInUsd: number) => {
    const num = Number(amountInUsd) || 0;
    const rate = currencySettings.usdToSyp || exchangeRate || 15000;
    return num * rate;
  }, [currencySettings.usdToSyp, exchangeRate]);

  const formatNumberWithSeparators = useCallback((val: number, dec: number) => {
    const fixed = val.toFixed(dec);
    const parts = fixed.split(".");
    const thousands = currencySettings.thousandsSeparator || ",";
    const decimal = currencySettings.decimalSeparator || ".";
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    return dec > 0 && parts.length > 1 ? parts.join(decimal) : parts[0];
  }, [currencySettings.thousandsSeparator, currencySettings.decimalSeparator]);

  const formatPrice = useCallback((amountInUsd: number | string | undefined | null, customDecimals?: number): string => {
    const rawVal = Number(amountInUsd || 0);
    if (!Number.isFinite(rawVal)) return `0 ${currencySymbol}`;
    
    const localVal = convertUsdToLocal(rawVal);
    const effectiveDecimals = customDecimals !== undefined 
      ? customDecimals 
      : baseCurrency === "SYP" ? 0 : currencySettings.decimals;

    const formattedNum = formatNumberWithSeparators(localVal, effectiveDecimals);

    if (currencySymbol === "$" || currencySymbol === "€" || currencySymbol === "£" || currencySymbol === "₺") {
      return `${currencySymbol}${formattedNum}`;
    }
    return `${formattedNum} ${currencySymbol}`;
  }, [convertUsdToLocal, baseCurrency, currencySettings.decimals, currencySymbol, formatNumberWithSeparators]);

  const formatPriceWithSyp = useCallback((amountInUsd: number | string | undefined | null, customDecimals?: number) => {
    const primary = formatPrice(amountInUsd, customDecimals);
    const rawVal = Number(amountInUsd || 0);

    if (showBothCurrencies && baseCurrency !== "SYP" && Number.isFinite(rawVal) && rawVal > 0) {
      const sypVal = convertUsdToSyp(rawVal);
      const formattedSyp = Math.round(sypVal).toLocaleString("en-US");
      return {
        primary,
        secondary: `(≈ ${formattedSyp} ل.س)`,
      };
    }

    return { primary };
  }, [formatPrice, showBothCurrencies, baseCurrency, convertUsdToSyp]);

  const value = useMemo(() => ({
    currencySettings,
    baseCurrency,
    currencySymbol,
    exchangeRate,
    showBothCurrencies,
    formatPrice,
    formatPriceWithSyp,
    convertUsdToLocal,
    convertUsdToSyp,
    refreshCurrency: fetchSettings,
  }), [
    currencySettings,
    baseCurrency,
    currencySymbol,
    exchangeRate,
    showBothCurrencies,
    formatPrice,
    formatPriceWithSyp,
    convertUsdToLocal,
    convertUsdToSyp,
    fetchSettings,
  ]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
