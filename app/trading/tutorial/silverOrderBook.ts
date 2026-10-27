export type ApiOrder = {
    price: string;
    quantity: string;
    order_ids?: string | string[];
};

export type SilverOrderBookResponse = {
    asset_type: "SILVER" | string;
    quote_currency: "IRT" | string;
    last_trade_price: string;
    buy_orders: ApiOrder[];
    sell_orders: ApiOrder[];
};

export type OrderBookItem = {
    price: number;
    amount: number;
    depth: number;
    orderIds: string[];
};

export type NormalizedOrderBook = {
    assetType: string;
    quoteCurrency: string;
    lastTradePrice: number;
    buys: OrderBookItem[];
    sells: OrderBookItem[];
};

export const SILVER_ORDER_BOOK_FALLBACK: SilverOrderBookResponse = {
    asset_type: "SILVER",
    quote_currency: "IRT",
    last_trade_price: "383000.00",
    sell_orders: [
        { price: "475897.00", quantity: "63.450000", order_ids: "demo-sell-1" },
        { price: "475896.00", quantity: "90.720000", order_ids: "demo-sell-2" },
        { price: "474000.00", quantity: "40.740000", order_ids: "demo-sell-3" },
        { price: "470000.00", quantity: "71.520000", order_ids: "demo-sell-4" },
        { price: "469000.00", quantity: "12.580000", order_ids: "demo-sell-5" },
    ],
    buy_orders: [
        { price: "466100.00", quantity: "40.000000", order_ids: "demo-buy-1" },
        { price: "466000.00", quantity: "26.940000", order_ids: "demo-buy-2" },
        { price: "465000.00", quantity: "34.340000", order_ids: "demo-buy-3" },
        { price: "463085.00", quantity: "2.420000", order_ids: "demo-buy-4" },
        { price: "462503.00", quantity: "20.000000", order_ids: "demo-buy-5" },
    ],
};

function normalizeSide(orders: ApiOrder[], side: "buy" | "sell"): OrderBookItem[] {
    const normalizedOrders = orders
        .map((order) => ({
            price: Number(order.price),
            amount: Number(order.quantity),
            orderIds: Array.isArray(order.order_ids)
                ? order.order_ids
                : order.order_ids
                    ? [order.order_ids]
                    : [],
        }))
        .filter((order) =>
            Number.isFinite(order.price) &&
            order.price > 0 &&
            Number.isFinite(order.amount) &&
            order.amount > 0
        );

    const validOrders = side === "sell"
        ? normalizedOrders
            .sort((first, second) => first.price - second.price)
            .slice(0, 5)
            .sort((first, second) => second.price - first.price)
        : normalizedOrders
            .sort((first, second) => second.price - first.price)
            .slice(0, 5);

    const maximumAmount = Math.max(...validOrders.map((order) => order.amount), 1);

    return validOrders.map((order) => ({
        ...order,
        depth: Math.max(12, Math.round((order.amount / maximumAmount) * 100)),
    }));
}

export function normalizeSilverOrderBook(response: SilverOrderBookResponse): NormalizedOrderBook {
    return {
        assetType: response.asset_type,
        quoteCurrency: response.quote_currency,
        lastTradePrice: Number(response.last_trade_price) || 0,
        sells: normalizeSide(response.sell_orders ?? [], "sell"),
        buys: normalizeSide(response.buy_orders ?? [], "buy"),
    };
}
