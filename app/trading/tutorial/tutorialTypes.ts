export type TutorialStep =
    | "welcome"
    | "intent"
    | "instant-price"
    | "limit-market"
    | "queue-preview"
    | "queue-result"
    | "limit-price"
    | "budget"
    | "amount-method"
    | "percent"
    | "value"
    | "liquidity-check"
    | "review"
    | "submit"
    | "execution-result"
    | "orders"
    | "cancel-order"
    | "finished";

export type AmountMethod = "percent" | "value";
export type PurchaseIntent = "instant" | "limit";

export type OrderMatchLevel = {
    price: number;
    amount: number;
    availableBefore: number;
};

export type SpotlightRect = {
    top: number;
    left: number;
    width: number;
    height: number;
    pointerLeft: number;
    pointerTop: number;
};
