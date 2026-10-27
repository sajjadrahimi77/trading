import { NextResponse } from "next/server";
import { SILVER_ORDER_BOOK_FALLBACK } from "@/app/trading/tutorial/silverOrderBook";

export const dynamic = "force-dynamic";

const ORDER_BOOK_URL =
    "https://api.ecocoach.net/api/trading/internal/order-book/SILVER/?quote_currency=IRT";

export async function GET() {
    const apiKey = process.env.ECOCOACH_TRADING_API_KEY;

    // تا قبل از دریافت کلید معتبر، رابط کاربری دقیقاً با قرارداد واقعی API کار می‌کند.
    if (!apiKey) {
        return NextResponse.json({
            ...SILVER_ORDER_BOOK_FALLBACK,
            data_source: "mock",
        });
    }

    try {
        const response = await fetch(ORDER_BOOK_URL, {
            headers: {
                "X-API-Key": apiKey,
                Accept: "application/json",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`Order book request failed: ${response.status}`);
        }

        const orderBook = await response.json();

        return NextResponse.json({
            ...orderBook,
            data_source: "live",
        });
    } catch (error) {
        console.error("Silver order book error", error);

        return NextResponse.json({
            ...SILVER_ORDER_BOOK_FALLBACK,
            data_source: "mock",
        });
    }
}
