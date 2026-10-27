"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import TutorialOverlay from "./TutorialOverlay";
import { useTutorialTracking } from "./useTutorialTracking";
import { AmountMethod, OrderMatchLevel, PurchaseIntent, SpotlightRect, TutorialStep } from "./tutorialTypes";
import {
    normalizeSilverOrderBook,
    SILVER_ORDER_BOOK_FALLBACK,
    type NormalizedOrderBook,
    type SilverOrderBookResponse,
} from "./silverOrderBook";
import styles from "./TradingTutorial.module.css";
type OrdersTab =
    | "open"
    | "order-history"
    | "trade-history";

type RegisteredOrder = {
    id: string;
    side: TradeSide;
    price: number;
    amount: number;
    total: number;
    requestedAmount: number;
    executedAmount: number;
    status: "open";
    createdAt: string;
};
type OrderHistoryItem = {
    id: string;
    side: TradeSide;
    requestedAmount: number;
    executedAmount: number;
    remainingAmount: number;
    orderPrice: number;
    averagePrice: number;
    cost: number;
    feeGrams: number;
    feeToman: number;
    netAmount: number;
    status: "completed" | "partial" | "cancelled";
    createdAt: string;
};
type TradeHistoryItem = {
    id: string;
    side: TradeSide;
    amount: number;
    netAmount: number;
    total: number;
    averagePrice: number;
    feeGrams: number;
    feeToman: number;
    createdAt: string;
};
type TradeSide = "buy" | "sell";

const INITIAL_BALANCE = 10_000_000;
const EDUCATIONAL_FEE_RATE = 0.005;
const numberFormatter = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 2,
});
const gramFormatter = new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 6,
});
const initialOrderBook = normalizeSilverOrderBook(SILVER_ORDER_BOOK_FALLBACK);

function calculateInstantFill(amount: number, limitPrice: number, orderBook: NormalizedOrderBook, side: TradeSide = "buy") {
    let remaining = amount;
    let executedAmount = 0;
    let executedCost = 0;
    const fills: OrderMatchLevel[] = [];

    const eligibleSells = [...(side === "buy" ? orderBook.sells : orderBook.buys)]
        .filter((order) => order.amount > 0 && (side === "buy" ? order.price <= limitPrice : order.price >= limitPrice))
        .sort((a, b) => side === "buy" ? a.price - b.price : b.price - a.price);

    for (const sellOrder of eligibleSells) {
        if (remaining <= 0) break;

        const fillAmount = Math.min(remaining, sellOrder.amount);
        executedAmount += fillAmount;
        executedCost += fillAmount * sellOrder.price;
        remaining -= fillAmount;
        fills.push({ price: sellOrder.price, amount: fillAmount, availableBefore: sellOrder.amount });
    }

    return {
        executedAmount,
        remainingAmount: Math.max(0, remaining),
        executedCost,
        averagePrice: executedAmount > 0 ? executedCost / executedAmount : 0,
        fills,
    };
}

function findCompletionPrice(amount: number, orderBook: NormalizedOrderBook) {
    let availableAmount = 0;
    const sells = [...orderBook.sells].sort((first, second) => first.price - second.price);

    for (const sellOrder of sells) {
        availableAmount += sellOrder.amount;
        if (availableAmount >= amount) return sellOrder.price;
    }

    return null;
}
type OrdersEmptyStateProps = {
    title?: string;
    description?: string;
};

function OrdersEmptyState({
                              title = "موردی برای نمایش وجود ندارد",
                              description,
                          }: OrdersEmptyStateProps) {
    return (
        <div className={styles.ordersEmptyState}>
            <img
                src="/images/trading/empty.gif"
                alt=""
                className={styles.emptyImage}
                draggable={false}
            />

            <strong>
                {title}
            </strong>

            {description && (
                <p>
                    {description}
                </p>
            )}
        </div>
    );
}

function normalizeDigits(value: string) {
    return value
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[٬,]/g, "")
        .replace(/٫/g, ".");
}

function parseNumber(value: string) {
    const normalizedValue = normalizeDigits(value)
        .replace(/[^\d.]/g, "");

    return Number(normalizedValue) || 0;
}

function WalletIcon() {
    return (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
            <path d="M7 15V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20.833 9h-2.602C16.446 9 15 10.343 15 12s1.447 3 3.23 3h2.603c.084 0 .125 0 .16-.002.54-.033.97-.432 1.005-.933.002-.032.002-.071.002-.148v-3.834c0-.077 0-.116-.002-.148-.036-.501-.465-.9-1.005-.933C20.959 9 20.918 9 20.834 9Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M20.965 9c-.078-1.872-.328-3.02-1.137-3.828C18.657 4 16.771 4 13 4h-3C6.229 4 4.343 4 3.172 5.172 2 6.343 2 8.229 2 12c0 3.771 0 5.657 1.172 6.828C4.343 20 6.229 20 10 20h3c3.771 0 5.657 0 6.828-1.172.809-.808 1.06-1.956 1.137-3.828" stroke="currentColor" strokeWidth="1.5" />
            <path d="M17.991 12h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PriceValueIcon() {
    return (
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
            <path d="M19 14v6m0 0 2-2m-2 2-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M22 12c0-3.771 0-5.657-1.172-6.828C19.657 4 17.771 4 14 4h-4C6.229 4 4.343 4 3.172 5.172 2 6.343 2 8.229 2 12c0 3.771 0 5.657 1.172 6.828C4.343 20 6.229 20 10 20h4M10 16H6M13 16h-.5M2 10h20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    );
}

function AmountIcon() {
    return (
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none" aria-hidden="true">
            <path d="M17 7h-3m3 0v3m0-3-3.5 3.5M7 17h3m-3 0v-3m0 3 3.5-3.5M7 7h3M7 7v3m0-3 3.5 3.5M17 17h-3m3 0v-3m0 3-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12c0-4.714 0-7.071 1.464-8.536C4.93 2 7.286 2 12 2c4.714 0 7.071 0 8.535 1.464C22 4.93 22 7.286 22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    );
}

export default function TradingTutorialPage() {
    const tradePanelRef = useRef<HTMLElement>(null);
    const orderFormRef = useRef<HTMLElement>(null);
    const priceRef = useRef<HTMLLabelElement>(null);
    const bestBuyRef = useRef<HTMLButtonElement>(null);
    const lastSellRef = useRef<HTMLButtonElement>(null);
    const balanceRef = useRef<HTMLDivElement>(null);
    const buyTabRef = useRef<HTMLButtonElement>(null);
    const orderBookRef = useRef<HTMLElement>(null);
    const amountRef = useRef<HTMLLabelElement>(null);
    const percentRef = useRef<HTMLDivElement>(null);
    const valueRef = useRef<HTMLDivElement>(null);
    const submitRef = useRef<HTMLButtonElement>(null);
    const cancelRef = useRef<HTMLButtonElement>(null);
    const [orderNotice, setOrderNotice] = useState("");
    const ordersRef = useRef<HTMLElement>(null);

    const [matchIndex, setMatchIndex] = useState(0);
    const matchRowRef = useRef<HTMLButtonElement>(null);
    const queueRowRef = useRef<HTMLButtonElement>(null);
    const percentButtonRef = useRef<HTMLButtonElement>(null);
    const [tutorialStep, setTutorialStep] = useState<TutorialStep>("welcome");
    const [spotlightRect, setSpotlightRect] = useState<SpotlightRect | null>(null);
    const [wrongAttempt, setWrongAttempt] = useState(false);
    const [plannedBudget, setPlannedBudget] = useState("5000000");
    const [purchaseIntent, setPurchaseIntent] = useState<PurchaseIntent | null>(null);
    const [selectedAmountMethod, setSelectedAmountMethod] = useState<AmountMethod | null>(null);
    const [tradeSide, setTradeSide] =
        useState<TradeSide>("buy");
    const [activeOrdersTab, setActiveOrdersTab] =
        useState<OrdersTab>("open");

    const [registeredOrders, setRegisteredOrders] =
        useState<RegisteredOrder[]>([]);
    const [orderHistory, setOrderHistory] =
        useState<OrderHistoryItem[]>([]);
    const [tradeHistory, setTradeHistory] =
        useState<TradeHistoryItem[]>([]);
    const [balance, setBalance] =
        useState(INITIAL_BALANCE);

    const [silverBalance, setSilverBalance] =
        useState(100);

    const [price, setPrice] = useState("");
    const [amount, setAmount] = useState("");
    const [orderValueInput, setOrderValueInput] = useState("");
    const [orderBook, setOrderBook] = useState<NormalizedOrderBook>(initialOrderBook);
    const [resultOrderBook, setResultOrderBook] = useState<NormalizedOrderBook | null>(null);
    const [executedLevels, setExecutedLevels] = useState<OrderMatchLevel[]>([]);
    const [orderBookLoading, setOrderBookLoading] = useState(false);

    const [selectedPercent, setSelectedPercent] =
        useState(0);

    const [completed, setCompleted] =
        useState(false);

    const numericPrice = parseNumber(price);
    const numericAmount = parseNumber(amount);

    const orderValue =
        numericPrice * numericAmount;

    const instantFill = useMemo(
        () => purchaseIntent === "instant" || tutorialStep === "finished"
            ? calculateInstantFill(numericAmount, numericPrice, tutorialStep === "finished" ? resultOrderBook ?? orderBook : orderBook, tradeSide)
            : {
                executedAmount: 0,
                remainingAmount: numericAmount,
                executedCost: 0,
                averagePrice: 0,
                fills: [] as OrderMatchLevel[],
            },
        [numericAmount, numericPrice, orderBook, resultOrderBook, purchaseIntent, tutorialStep, tradeSide],
    );
    const completionPrice = useMemo(
        () => purchaseIntent === "instant" && numericAmount > 0
            ? findCompletionPrice(numericAmount, orderBook)
            : null,
        [numericAmount, orderBook, purchaseIntent],
    );
    const feeInGrams = tradeSide === "buy" ? instantFill.executedAmount * EDUCATIONAL_FEE_RATE : 0;
    const feeInToman = tradeSide === "sell" ? instantFill.executedCost * EDUCATIONAL_FEE_RATE : 0;
    const availableForPlan = tradeSide === "buy" ? balance : silverBalance;
    const payableValue = orderValue;

    const maximumAmount =
        numericPrice > 0
            ? (tradeSide === "buy" ? balance / numericPrice : silverBalance)
            : 0;

    const remainingBalance =
        balance - payableValue;

    const canSubmit =
        numericPrice > 0 &&
        numericAmount > 0 &&
        (tradeSide === "buy" ? payableValue <= balance : numericAmount <= silverBalance + 1e-8);

    const numericPlannedBudget = parseNumber(plannedBudget);
    const budgetValid = numericPlannedBudget > 0 && numericPlannedBudget <= availableForPlan;
    const budgetError = numericPlannedBudget > availableForPlan
        ? `مبلغی که وارد کردی از موجودی ${numberFormatter.format(availableForPlan)} ${tradeSide === "buy" ? "تومانی" : "گرمی"} بیشتر است؛ یک عدد کمتر انتخاب کن.`
        : numericPlannedBudget <= 0
            ? (tradeSide === "buy" ? "مبلغ خرید باید بیشتر از صفر باشد." : "مقدار فروش باید بیشتر از صفر باشد.")
            : undefined;
    const bestAsk = Math.min(...orderBook.sells.filter(row => row.amount > 1e-7).map((row) => row.price));
    const bestBid = Math.max(...orderBook.buys.filter(row => row.amount > 1e-7).map((row) => row.price));
    const bestPrice = tradeSide === "buy" ? bestAsk : bestBid;
    const referencePrice = Number.isFinite(bestPrice) ? bestPrice : orderBook.lastTradePrice;
    const minimumLimitPrice = tradeSide === "buy" ? Math.floor(referencePrice * 0.9) : Math.floor(referencePrice) + 1;
    const maximumLimitPrice = tradeSide === "buy" ? Math.max(minimumLimitPrice, Math.ceil(referencePrice) - 1) : Math.ceil(referencePrice * 1.1);
    const limitPriceValid = numericPrice >= minimumLimitPrice && numericPrice <= maximumLimitPrice;
    const limitPriceError = purchaseIntent === "limit" && numericPrice > 0 && !limitPriceValid
        ? `این قیمت از محدوده فعلی بازار دور است. عددی بین ${numberFormatter.format(minimumLimitPrice)} تا ${numberFormatter.format(maximumLimitPrice)} تومان وارد کن.`
        : purchaseIntent === "limit" && numericPrice <= 0
            ? "قیمت پیشنهادی‌ات را وارد کن."
            : undefined;
    const expectedPercent = [25, 50, 75, 100].reduce((closest, percent) =>
        Math.abs(percent - (numericPlannedBudget / Math.max(availableForPlan, 1e-8)) * 100) <
        Math.abs(closest - (numericPlannedBudget / Math.max(availableForPlan, 1e-8)) * 100)
            ? percent
            : closest,
    );

    const loadOrderBook = async () => {
        setOrderBookLoading(true);

        try {
            const response = await fetch("/api/trading/order-book/silver", {
                cache: "no-store",
            });

            if (!response.ok) throw new Error("Order book is unavailable");

            const data = await response.json() as SilverOrderBookResponse;
            setOrderBook(normalizeSilverOrderBook(data));
        } catch {
            setOrderBook(initialOrderBook);
        } finally {
            setOrderBookLoading(false);
        }
    };

    useEffect(() => {
        void loadOrderBook();

    }, []);

    const displayedOrders = resultOrderBook ?? orderBook;
    const tutorialOrderPreviewActive = ["liquidity-check", "queue-preview", "review"].includes(tutorialStep);
    const buyQueuePosition = orderBook.buys.filter((order) => order.price > numericPrice).length + 1;
    const walkthroughLevels = completed ? executedLevels : instantFill.fills;
    const focusedLevel = walkthroughLevels[matchIndex];
    const route: TutorialStep[] = ["welcome", "intent", ...(purchaseIntent === "limit" ? ["limit-market", "limit-price"] as TutorialStep[] : ["instant-price"] as TutorialStep[]), "budget", "amount-method", selectedAmountMethod === "value" ? "value" : "percent", ...Array.from({length: instantFill.fills.length}, () => "liquidity-check" as TutorialStep), ...(instantFill.remainingAmount > 0.0000001 ? ["queue-preview"] as TutorialStep[] : []), "review", "submit", ...Array.from({length: instantFill.fills.length}, () => "execution-result" as TutorialStep), ...(instantFill.remainingAmount > 0.0000001 ? ["queue-result"] as TutorialStep[] : []), "orders", ...(registeredOrders.some(order => order.side === tradeSide) ? ["cancel-order"] as TutorialStep[] : [])];
    const stepNumber = Math.max(0, route.indexOf(tutorialStep)) + 1 + (["liquidity-check", "execution-result"].includes(tutorialStep) ? matchIndex : 0);
    const tracking = useTutorialTracking({
        side: tradeSide, step: tutorialStep, stepNumber,
        totalSteps: route.length, matchIndex,
        intent: purchaseIntent, amountMethod: selectedAmountMethod,
    });
    const displayedBuyRows = [
        ...displayedOrders.buys.map((order) => ({ ...order, isTutorialOrder: false })),
        ...registeredOrders.filter((order) => order.side === "buy").map((order) => ({price: order.price, amount: order.amount, depth: 100, orderIds: [order.id], isTutorialOrder: true})),
        ...(tradeSide === "buy" && tutorialOrderPreviewActive && !completed && instantFill.remainingAmount > 0.0000001
            ? [{price: numericPrice, amount: instantFill.remainingAmount, depth: 100, orderIds: ["tutorial-order-preview"], isTutorialOrder: true}]
            : []),
    ].sort((first, second) => second.price - first.price);

    const displayedSellRows = [
        ...displayedOrders.sells.map((order) => ({...order, isTutorialOrder: false})),
        ...registeredOrders.filter((order) => order.side === "sell").map((order) => ({price: order.price, amount: order.amount, depth: 100, orderIds: [order.id], isTutorialOrder: true})),
        ...(tradeSide === "sell" && tutorialOrderPreviewActive && !completed && instantFill.remainingAmount > 1e-7 ? [{price: numericPrice, amount: instantFill.remainingAmount, depth: 100, orderIds: ["tutorial-order-preview"], isTutorialOrder: true}] : []),
    ].sort((a,b) => b.price - a.price);

    const activeTarget = useMemo(() => {
        switch (tutorialStep) {
            case "welcome": return { ref: balanceRef, padding: 16, pointerX: 92, pointerY: 18 };
            case "intent": return { ref: orderBookRef, padding: 14, pointerX: 84, pointerY: 18 };
            case "instant-price": return { ref: Number.isFinite(bestPrice) ? (tradeSide === "buy" ? lastSellRef : bestBuyRef) : orderBookRef, padding: 12, pointerX: 28, pointerY: 50 };
            case "limit-market": return { ref: Number.isFinite(bestPrice) ? (tradeSide === "buy" ? lastSellRef : bestBuyRef) : orderBookRef, padding: 8, pointerX: 50, pointerY: 50 };
            case "queue-result":
            case "queue-preview": return { ref: queueRowRef, padding: 8, pointerX: 50, pointerY: 50 };
            case "limit-price": return { ref: priceRef, padding: 12, pointerX: 76, pointerY: 50 };
            case "budget": return { ref: balanceRef, padding: 14, pointerX: 88, pointerY: 22 };
            case "amount-method": return { ref: amountRef, padding: 10, pointerX: 50, pointerY: 50 };
            case "percent": return { ref: percentButtonRef, padding: 6, pointerX: 50, pointerY: 50 };
            case "value": return { ref: tradeSide === "sell" ? amountRef : valueRef, padding: 12, pointerX: 50, pointerY: 50 };
            case "liquidity-check": return { ref: matchRowRef, padding: 8, pointerX: 50, pointerY: 50 };
            case "review": return { ref: orderBookRef, padding: 14, pointerX: 86, pointerY: 42 };
            case "submit": return { ref: submitRef, padding: 12, pointerX: 88, pointerY: 50 };
            case "execution-result": return { ref: matchRowRef, padding: 8, pointerX: 50, pointerY: 50 };
            case "cancel-order": return { ref: cancelRef, padding: 8, pointerX: 18, pointerY: 50 };
            case "orders": return { ref: ordersRef, padding: 14, pointerX: 90, pointerY: 16 };
            default: return null;
        }
    }, [tutorialStep, matchIndex, expectedPercent, tradeSide, bestPrice]);

    useEffect(() => {
        if (tutorialStep === "finished" || !activeTarget?.ref.current) {
            setSpotlightRect(null);
            return;
        }

        const initialRect = activeTarget.ref.current.getBoundingClientRect();

        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const mobile = window.innerWidth <= 760;
        const guideHeight = mobile ? Math.min(480, viewportHeight * 0.62, Math.max(120, viewportHeight - 110)) : 0;
        if (mobile && (initialRect.top < 16 || initialRect.bottom > viewportHeight - guideHeight - 28)) {
            // Leave the lower part of the screen for the guide and the keyboard.
            window.scrollBy({top: initialRect.top - 24, behavior: "smooth"});
        } else if (!mobile && (initialRect.top < 12 || initialRect.bottom > viewportHeight - 12)) {
            activeTarget.ref.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }

        const updateSpotlight = () => {
            const rect = activeTarget.ref.current?.getBoundingClientRect();
            if (!rect) return;

            const padding = activeTarget.padding;

            const viewport = window.visualViewport;
            const viewportTop = viewport?.offsetTop ?? 0;
            const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
            const viewportWidth = viewport?.width ?? window.innerWidth;
            const top = Math.max(viewportTop + 8, rect.top - padding);
            const left = Math.max(8, rect.left - padding);
            const width = Math.max(0, Math.min(viewportWidth - 8, rect.right + padding) - left);
            const height = Math.max(0, Math.min(viewportBottom - 8, rect.bottom + padding) - top);
            const pointerX = rect.left + rect.width * activeTarget.pointerX / 100;
            const pointerY = rect.top + rect.height * activeTarget.pointerY / 100;
            setSpotlightRect({top, left, width, height,
                pointerLeft: width > 0 ? Math.max(0, Math.min(100, (pointerX - left) / width * 100)) : 50,
                pointerTop: height > 0 ? Math.max(0, Math.min(100, (pointerY - top) / height * 100)) : 50,
            });
        };

        updateSpotlight();
        const observer = new ResizeObserver(updateSpotlight);
        observer.observe(activeTarget.ref.current);
        window.visualViewport?.addEventListener("resize", updateSpotlight);
        window.visualViewport?.addEventListener("scroll", updateSpotlight);
        window.addEventListener("resize", updateSpotlight);
        window.addEventListener("scroll", updateSpotlight, true);

        return () => {
            observer.disconnect();
            window.visualViewport?.removeEventListener("resize", updateSpotlight);
            window.visualViewport?.removeEventListener("scroll", updateSpotlight);
            window.removeEventListener("resize", updateSpotlight);
            window.removeEventListener("scroll", updateSpotlight, true);
        };
    }, [activeTarget, tutorialStep, focusedLevel?.price]);

    function goToTutorialStep(step: TutorialStep) {
        if (step === "finished") tracking.finish();
        setWrongAttempt(false);
        if (step === tutorialStep && ["liquidity-check", "execution-result"].includes(step)) {
            setMatchIndex((index) => index + 1);
        } else setMatchIndex(0);
        setTutorialStep(step);
    }

    function selectOrderPrice(
        selectedPrice: number,
        isLastSellOrder = false,
    ) {
        if (tutorialStep !== "instant-price" && tutorialStep !== "finished") return;
        if (tutorialStep === "instant-price" && !isLastSellOrder) { setWrongAttempt(true); return; }
        setPrice(String(selectedPrice));
        setCompleted(false);

        if (tutorialStep === "instant-price") {
            if (isLastSellOrder) goToTutorialStep("budget");
            else setWrongAttempt(true);
        }
    }

    function choosePurchaseIntent(intent: PurchaseIntent) {
        setPurchaseIntent(intent);
        setPrice("");
        setResultOrderBook(null);
        setExecutedLevels([]);
        setWrongAttempt(false);
    }

    function goToPreviousTutorialStep() {
        if (matchIndex > 0 && ["liquidity-check", "execution-result"].includes(tutorialStep)) {
            setMatchIndex((index) => index - 1); return;
        }
        const previous = route[stepNumber - 2];
        if (previous) {
            goToTutorialStep(previous);
            if (previous === "liquidity-check") setMatchIndex(Math.max(0, instantFill.fills.length - 1));
        }
    }

    function handlePriceChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const value = normalizeDigits(event.target.value).replace(
            /[^\d]/g,
            "",
        );

        setPrice(value);
        setCompleted(false);
    }

    function handleAmountChange(
        event: React.ChangeEvent<HTMLInputElement>,
    ) {
        const value = normalizeDigits(event.target.value).replace(
            /[^\d.]/g,
            "",
        );

        setAmount(value);
        setOrderValueInput("");
        setSelectedPercent(0);
        setCompleted(false);
    }

    function handlePercentChange(
        percent: number,
    ) {
        setSelectedPercent(percent);
        setCompleted(false);

        if (numericPrice <= 0) {
            setAmount("");
            return;
        }

        const amountByPercent =
            (maximumAmount * percent) / 100;

        setAmount(
            (Math.floor(amountByPercent * 1e8) / 1e8).toFixed(8),
        );
        setOrderValueInput(String(Math.floor(amountByPercent * numericPrice)));

        if (tutorialStep === "percent") {
            if (percent === expectedPercent) goToTutorialStep(
                purchaseIntent === "instant" && calculateInstantFill(amountByPercent, numericPrice, orderBook, tradeSide).fills.length > 0 ? "liquidity-check" : "queue-preview",
            );
            else setWrongAttempt(true);
        }
    }

    function handleOrderValueChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = normalizeDigits(event.target.value).replace(/[^\d]/g, "");
        if (numericPrice <= 0) return;

        const requestedValue = Number(value) || 0;
        setOrderValueInput(value);
        setAmount(
            requestedValue > 0
                ? (Math.floor(requestedValue / numericPrice * 1e8) / 1e8).toFixed(8)
                : "",
        );
        setSelectedPercent(0);
        setCompleted(false);
    }

    function chooseAmountMethod(method: AmountMethod) {
        const budget = parseNumber(plannedBudget);

        if (budget <= 0 || budget > availableForPlan) {
            setWrongAttempt(true);
            return;
        }

        setWrongAttempt(false);
        setSelectedAmountMethod(method);

        if (method === "value" && numericPrice > 0) {
            setAmount("");
            setOrderValueInput("");
            setTutorialStep("value");
            return;
        }

        setSelectedPercent(0);
        setAmount("");
        setOrderValueInput("");

        setTutorialStep(method === "percent" ? "percent" : "value");
    }

    function submitOrder() {
        if (!canSubmit) {
            return;
        }

        const executionBook = resultOrderBook ?? orderBook;
        const fill = purchaseIntent === "instant" || tutorialStep === "finished"
            ? calculateInstantFill(numericAmount, numericPrice, executionBook, tradeSide)
            : {
                executedAmount: 0,
                remainingAmount: numericAmount,
                executedCost: 0,
                averagePrice: 0,
                fills: [] as OrderMatchLevel[],
            };
        const feeGrams = tradeSide === "buy" ? fill.executedAmount * EDUCATIONAL_FEE_RATE : 0;
        const feeToman = tradeSide === "sell" ? fill.executedCost * EDUCATIONAL_FEE_RATE : 0;
        const netAmount = Math.max(0, fill.executedAmount - feeGrams);
        const reservedValue = fill.remainingAmount * numericPrice;
        const committedValue = fill.executedCost + reservedValue;
        const createdAt = new Date().toLocaleString("fa-IR");

        tracking.action("order_registered");
        const orderId = crypto.randomUUID();
        setOrderNotice("");
        setExecutedLevels(fill.fills);
        if (fill.fills.length > 0) {
            const matchedByPrice = new Map(fill.fills.map((level) => [level.price, level.amount]));
            setResultOrderBook({
                ...executionBook,
                [tradeSide === "buy" ? "sells" : "buys"]: (tradeSide === "buy" ? executionBook.sells : executionBook.buys).map((sellOrder) => ({
                    ...sellOrder,
                    amount: Math.max(0, sellOrder.amount - (matchedByPrice.get(sellOrder.price) ?? 0)),
                })),
            });
        }

        if (fill.remainingAmount > 0.0000001) {
            const newOpenOrder: RegisteredOrder = {
                id: orderId,
                requestedAmount: numericAmount,
                executedAmount: fill.executedAmount,
                side: tradeSide,
                price: numericPrice,
                amount: fill.remainingAmount,
                total: reservedValue,
                status: "open",
                createdAt,
            };

            setRegisteredOrders((currentOrders) => [newOpenOrder, ...currentOrders]);
        }

        if (fill.executedAmount > 0) {
            const historyId = orderId;
            setOrderHistory((currentHistory) => [{
                id: historyId,
                side: tradeSide,
                requestedAmount: numericAmount,
                executedAmount: fill.executedAmount,
                remainingAmount: fill.remainingAmount,
                orderPrice: numericPrice,
                averagePrice: fill.averagePrice,
                cost: fill.executedCost,
                feeGrams,
                feeToman,
                netAmount,
                status: fill.remainingAmount > 0.0000001 ? "partial" : "completed",
                createdAt,
            }, ...currentHistory]);
            setTradeHistory((currentHistory) => [{
                id: historyId,
                side: tradeSide,
                amount: fill.executedAmount,
                netAmount,
                total: fill.executedCost,
                averagePrice: fill.averagePrice,
                feeGrams,
                feeToman,
                createdAt,
            }, ...currentHistory]);
        }

        if (tradeSide === "buy") {
            setBalance((available) => available - committedValue);
            setSilverBalance((available) => available + netAmount);
        } else {
            setSilverBalance((available) => Math.max(0, available - numericAmount));
            setBalance((available) => available + fill.executedCost - feeToman);
        }

        setCompleted(true);
        setSelectedPercent(0);
        setActiveOrdersTab(fill.remainingAmount > 0.0000001 ? "open" : "order-history");

        if (tutorialStep === "submit") {
            goToTutorialStep(
                fill.executedAmount > 0 ? "execution-result" : "queue-result",
            );
        }
    }


    function changeTradeSide(side: TradeSide) {
        if (side === tradeSide) return;
        if (resultOrderBook) setOrderBook(resultOrderBook);
        setResultOrderBook(null);
        setTradeSide(side);
        setCompleted(false);
        setExecutedLevels([]);
        setPrice(""); setAmount(""); setOrderValueInput(""); setSelectedPercent(0);
        setPlannedBudget(side === "buy" ? String(Math.min(5_000_000, balance)) : String(Math.min(10, silverBalance)));
        setPurchaseIntent(null); setSelectedAmountMethod(null); setOrderNotice("");
        goToTutorialStep("welcome");
    }

    function cancelOrder(orderId: string) {
        const order = registeredOrders.find((item) => item.id === orderId);
        if (!order) return;
        tracking.action("order_cancelled");
        tracking.finish();
        setRegisteredOrders((items) => items.filter((item) => item.id !== orderId));
        if (order.side === "buy") setBalance((available) => available + order.total);
        else setSilverBalance((available) => available + order.amount);
        setOrderHistory((items) => items.some((item) => item.id === orderId)
            ? items.map((item) => item.id === orderId ? {...item, status: "cancelled"} : item)
            : [{id: order.id, side: order.side, requestedAmount: order.requestedAmount, executedAmount: 0, remainingAmount: order.amount, orderPrice: order.price, averagePrice: 0, cost: 0, feeGrams: 0, feeToman: 0, netAmount: 0, status: "cancelled", createdAt: order.createdAt}, ...items]);
        // Only the unfilled reserve is released; completed trades and their fees stay intact.
        if (resultOrderBook) setOrderBook(resultOrderBook);
        setResultOrderBook(null);
        setCompleted(false);
        setExecutedLevels([]);
        setPrice("");
        setAmount("");
        setOrderValueInput("");
        setSelectedPercent(0);
        setOrderNotice(`سفارش لغو شد و ${numberFormatter.format(order.side === "buy" ? order.total : order.amount)} ${order.side === "buy" ? "تومان" : "گرم نقره"} به موجودی قابل استفاده برگشت. می‌توانی در فرم بالا قیمت و مبلغ جدیدی وارد کنی و دوباره سفارش بدهی.`);
        goToTutorialStep("finished");
    }


    return (
        <main
            className={styles.page}
            dir="rtl"
        >
            <section ref={tradePanelRef} className={styles.tradePanel}>
                <div className={styles.tradeColumns}>
                    <section ref={orderFormRef} className={styles.orderForm}>
                        <div className={styles.tradeTabs}>
                            <button
                                ref={buyTabRef}
                                type="button"
                                className={
                                    tradeSide === "buy"
                                        ? styles.activeBuyTab
                                        : undefined
                                }
                                onClick={() => {
                                    changeTradeSide("buy");
                                }}
                            >
                                خرید
                            </button>

                            <button
                                type="button"
                                className={
                                    tradeSide === "sell"
                                        ? styles.activeSellTab
                                        : undefined
                                }
                                onClick={() =>
                                    changeTradeSide("sell")
                                }
                            >
                                فروش
                            </button>
                        </div>

                        <div ref={balanceRef} className={styles.balanceCard}>
                            <div className={styles.walletIcon}>
                                <WalletIcon />
                            </div>

                            <div>
                                <span>
                                    موجودی آموزشی
                                </span>

                                <strong>
                                    {numberFormatter.format(
                                        tradeSide === "buy" ? balance : silverBalance,
                                    )}

                                    <small>
                                        {tradeSide === "buy" ? "تومان" : "گرم نقره"}
                                    </small>
                                </strong>
                            </div>
                        </div>

                        <label ref={priceRef} className={styles.inputGroup}>
                            <span className={styles.floatingLabel}>
                                قیمت
                            </span>

                            <div className={styles.inputContent}>
                                <PriceValueIcon />

                                <span className={styles.separator} />

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={
                                        price
                                            ? numberFormatter.format(
                                                numericPrice,
                                            )
                                            : ""
                                    }
                                    onChange={handlePriceChange}
                                    placeholder="قیمت"
                                />

                                <span className={styles.unit}>
                                    تومان
                                </span>
                            </div>
                        </label>

                        <label ref={amountRef} className={styles.inputGroup}>
                            <span className={styles.floatingLabel}>
                                مقدار
                            </span>

                            <div className={styles.inputContent}>
                                <AmountIcon />

                                <span className={styles.separator} />

                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={amount}
                                    onChange={handleAmountChange}
                                    placeholder="مقدار"
                                />

                                <span className={styles.unit}>
                                    گرم
                                </span>
                            </div>
                        </label>

                        <div ref={percentRef} className={styles.percentageSlider}>
                            <div className={styles.sliderLine}>
        <span
            className={styles.sliderProgress}
            style={{
                width: `${selectedPercent}%`,
            }}
        />
                            </div>

                            <div className={styles.sliderSteps}>
                                {[0, 25, 50, 75, 100].map((percent) => {
                                    const isActive =
                                        percent <= selectedPercent;

                                    return (
                                        <button
                                            key={percent}
                                            ref={percent === expectedPercent ? percentButtonRef : undefined}
                                            type="button"
                                            aria-label={`${percent} درصد`}
                                            aria-pressed={
                                                selectedPercent === percent
                                            }
                                            className={
                                                isActive
                                                    ? styles.activeStep
                                                    : undefined
                                            }
                                            onClick={() =>
                                                handlePercentChange(percent)
                                            }
                                        >
                                            <span />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div ref={valueRef} className={styles.valueField}>
                            <div className={styles.inputContent}>
                                <PriceValueIcon />

                                <span className={styles.separator} />

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    value={orderValueInput ? numberFormatter.format(parseNumber(orderValueInput)) : ""}
                                    onChange={handleOrderValueChange}
                                    placeholder="ارزش سفارش"
                                />

                                <span className={styles.unit}>
                                    تومان
                                </span>
                            </div>
                        </div>

                        <div className={styles.buyLimit}>
                            <span>
                                {tradeSide === "buy" ? "سقف خرید" : "سقف فروش"}
                            </span>

                            <strong>
                                {numericPrice > 0
                                    ? numberFormatter.format(
                                        maximumAmount,
                                    )
                                    : "--"}

                                {numericPrice > 0 && (
                                    <small>
                                        گرم
                                    </small>
                                )}
                            </strong>
                        </div>

                        {orderValue > 0 && (
                            <div className={styles.feeSummary}>
                                <span>کارمزد معامله (۰٫۵٪)</span>
                                <strong>{tradeSide === "buy" ? `${gramFormatter.format(feeInGrams)} گرم` : `${numberFormatter.format(feeInToman)} تومان`}</strong>
                                <span>{tradeSide === "buy" ? "نقره خالص دریافتی" : "دریافتی خالص"}</span>
                                <strong>{tradeSide === "buy" ? `${gramFormatter.format(Math.max(0, instantFill.executedAmount - feeInGrams))} گرم` : `${numberFormatter.format(instantFill.executedCost - feeInToman)} تومان`}</strong>
                            </div>
                        )}

                        {(tradeSide === "buy" ? payableValue > balance : numericAmount > silverBalance) && (
                            <div className={styles.errorMessage}>
                                موجودی کافی نیست.
                            </div>
                        )}

                        <button
                            ref={submitRef}
                            type="button"
                            className={`${styles.submitButton} ${tradeSide === "sell" ? styles.submitSell : ""}`}
                            disabled={!canSubmit || (tutorialStep !== "submit" && tutorialStep !== "finished")}
                            onClick={submitOrder}
                        >
                            {tradeSide === "buy"
                                ? "خرید"
                                : "فروش"}
                        </button>



                    </section>

                    <aside ref={orderBookRef} className={styles.orderBook}>
                        <header className={styles.orderBookHeader}>
                            <button
                                type="button"
                                aria-label="به‌روزرسانی دفتر سفارش"
                                aria-busy={orderBookLoading}
                                disabled={orderBookLoading}
                                onClick={() => void loadOrderBook()}
                            >
                                {orderBookLoading ? "…" : "↻"}
                            </button>

                            <div>
                                <span>
                                    قیمت
                                </span>

                                <span>
                                    مقدار
                                </span>
                            </div>
                        </header>

                        <div className={styles.orderRows}>
                            {displayedSellRows.map(
                                (order, index) => {
                                    const executedLevel = tradeSide === "buy" ? executedLevels.find((level) => level.price === order.price) : undefined;
                                    const previewLevel = tradeSide === "buy" && tutorialOrderPreviewActive
                                        ? tutorialStep === "liquidity-check" && focusedLevel?.price === order.price ? focusedLevel : undefined
                                        : undefined;

                                    return (
                                        <button
                                            ref={(element) => { if (!order.isTutorialOrder && order.price === bestAsk) lastSellRef.current = element; if (tradeSide === "buy" && !order.isTutorialOrder && order.price === focusedLevel?.price) matchRowRef.current = element; if (tradeSide === "sell" && order.isTutorialOrder) queueRowRef.current = element; }}
                                            type="button"
                                            key={order.isTutorialOrder ? `user-sell-${order.orderIds[0]}` : `sell-${order.price}`}
                                            disabled={order.isTutorialOrder}
                                            className={`${styles.sellOrder} ${executedLevel ? styles.executedSellOrder : ""} ${previewLevel ? styles.previewSellOrder : ""} ${order.isTutorialOrder ? styles.userQueuePreview : ""}`}
                                            onClick={() =>
                                                selectOrderPrice(
                                                    order.price,
                                                    tradeSide === "buy" && order.price === bestAsk,
                                                )
                                            }
                                        >
                                        <span
                                            className={
                                                styles.orderDepth
                                            }
                                            style={{
                                                width: `${order.depth}%`,
                                            }}
                                        />

                                            <strong>
                                                {numberFormatter.format(
                                                    order.price,
                                                )}
                                            </strong>

                                            <span>
                                            {numberFormatter.format(
                                                order.amount,
                                            )}
                                        </span>
                                            {order.isTutorialOrder && <em className={styles.queueBadge}>{order.orderIds[0] === "tutorial-order-preview" ? "پیش‌نمایش فروش تو" : "سفارش فروش تو"}</em>}
                                        </button>
                                    );
                                },
                            )}

                            <div className={styles.marketPrice}>
                                <span>
                                    قیمت بازار
                                </span>

                                <strong>
                                    {numberFormatter.format(orderBook.lastTradePrice)}
                                </strong>
                            </div>

                            {displayedBuyRows.map(
                                (order) => (
                                    <button
                                        ref={(element) => {if (order.isTutorialOrder && tradeSide === "buy") queueRowRef.current = element; if (!order.isTutorialOrder && order.price === bestBid) bestBuyRef.current = element; if (tradeSide === "sell" && !order.isTutorialOrder && order.price === focusedLevel?.price) matchRowRef.current = element;}}
                                        type="button"
                                        key={order.isTutorialOrder ? `user-${order.orderIds[0]}` : `buy-${order.price}`}
                                        className={`${styles.buyOrder} ${order.isTutorialOrder ? styles.userQueuePreview : ""} ${tradeSide === "sell" && order.price === focusedLevel?.price && ["liquidity-check", "execution-result"].includes(tutorialStep) ? styles.previewSellOrder : ""}`}
                                        disabled={order.isTutorialOrder}
                                        onClick={() =>
                                            !order.isTutorialOrder && selectOrderPrice(order.price, tradeSide === "sell" && order.price === bestBid)
                                        }
                                    >
                                        <span
                                            className={
                                                styles.orderDepth
                                            }
                                            style={{
                                                width: `${order.depth}%`,
                                            }}
                                        />

                                        <strong>
                                            {numberFormatter.format(
                                                order.price,
                                            )}
                                        </strong>

                                        <span>
                                            {numberFormatter.format(
                                                order.amount,
                                            )}
                                        </span>

                                        {order.isTutorialOrder && (
                                            <em className={styles.queueBadge}>
                                                {order.orderIds[0] === "tutorial-order-preview" ? "پیش‌نمایش سفارش تو" : "سفارش ثبت‌شده تو"}
                                            </em>
                                        )}
                                    </button>
                                ),
                            )}
                        </div>

                        <div className={styles.orderRatio}>
                            <span className={styles.buyRatio}>
                                خ
                            </span>

                            <strong>
                                ۷۹٪
                            </strong>

                            <span className={styles.sellRatio}>
                                ف
                            </span>
                        </div>
                    </aside>
                </div>
                <section ref={ordersRef} className={styles.ordersSection}>
                    <div className={styles.ordersTabs}>
                        <button
                            type="button"
                            className={
                                activeOrdersTab === "open"
                                    ? styles.activeOrdersTab
                                    : undefined
                            }
                            onClick={() =>
                                setActiveOrdersTab("open")
                            }
                        >
                            سفارشات
                            <span>
                ({registeredOrders.length})
            </span>
                        </button>

                        <button
                            type="button"
                            className={
                                activeOrdersTab === "order-history"
                                    ? styles.activeOrdersTab
                                    : undefined
                            }
                            onClick={() =>
                                setActiveOrdersTab(
                                    "order-history",
                                )
                            }
                        >
                            تاریخچه سفارشات
                        </button>

                        <button
                            type="button"
                            className={
                                activeOrdersTab === "trade-history"
                                    ? styles.activeOrdersTab
                                    : undefined
                            }
                            onClick={() =>
                                setActiveOrdersTab(
                                    "trade-history",
                                )
                            }
                        >
                            تاریخچه معاملات
                        </button>
                    </div>

                    {orderNotice && <p className={styles.orderNotice} role="status">{orderNotice}</p>}
                    <div className={styles.ordersContent}>
                        {activeOrdersTab === "open" && (
                            <>
                                {registeredOrders.length === 0 ? (
                                    <OrdersEmptyState title="سفارشی وجود ندارد" />
                                ) : (
                                    <div className={styles.ordersList}>
                                        {registeredOrders.map((order) => (
                                            <article key={order.id} className={styles.orderCard}>
                                                <div className={styles.orderCardHeader}>
                                                    <div className={styles.orderAsset}><span className={styles.assetMark} aria-hidden="true">Ag</span><strong>نقره / تومان</strong><span className={order.side === "buy" ? styles.buyBadge : styles.sellBadge}>{order.side === "buy" ? "خرید" : "فروش"}</span></div>
                                                    <div className={styles.orderCompletion}>
                                                        <span>{numberFormatter.format(order.executedAmount / order.requestedAmount * 100)}٪</span>
                                                        <progress value={order.executedAmount} max={order.requestedAmount} aria-label="درصد انجام سفارش" />
                                                    </div>
                                                </div>
                                                <div className={styles.orderMeta}><time>{order.createdAt}</time><span dir="ltr">#{order.id.slice(0, 8)}</span></div>
                                                <div className={styles.orderInformation}>
                                                    <div><span>قیمت هر گرم</span><strong>{numberFormatter.format(order.price)} <small>تومان</small></strong></div>
                                                    <div><span>مقدار انجام‌شده / کل</span><strong className={styles.executionAmount} dir="ltr">{gramFormatter.format(order.executedAmount)} / {gramFormatter.format(order.requestedAmount)} <small>گرم</small></strong></div>
                                                </div>
                                                <div className={styles.waitingOrderNote}><span className={styles.waitingDot} />{order.side === "buy" ? "در انتظار فروشنده" : "در انتظار خریدار"}<span>{gramFormatter.format(order.amount)} گرم باقی‌مانده</span></div>
                                                <button ref={order.side === tradeSide ? cancelRef : undefined} className={styles.cancelOrderButton} type="button" onClick={() => cancelOrder(order.id)}>لغو</button>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {activeOrdersTab === "order-history" && (
                            orderHistory.length === 0
                                ? <OrdersEmptyState title="تاریخچه سفارشی وجود ندارد" />
                                : <div className={styles.historyList}>
                                    {orderHistory.map((order) => (
                                        <article key={order.id} className={styles.historyCard}>
                                            <header className={styles.historyHeader}>
                                                <div><strong>نقره / تومان</strong><span className={order.side === "buy" ? styles.buyBadge : styles.sellBadge}>{order.side === "buy" ? "خرید" : "فروش"}</span></div>
                                                <time>{order.createdAt}</time>
                                            </header>
                                            <div className={styles.historyDivider} />
                                            <dl className={styles.historyDetails}>
                                                <div><dt>وضعیت</dt><dd className={order.status === "completed" ? styles.completedStatus : styles.partialStatus}>{order.status === "cancelled" ? "لغو باقی‌مانده" : order.status === "completed" ? "انجام شده" : "انجام جزئی"}</dd></div>
                                                <div><dt>مقدار سفارش</dt><dd>{gramFormatter.format(order.requestedAmount)} گرم نقره</dd></div>
                                                <div><dt>قیمت سفارش</dt><dd>۱ گرم نقره = {numberFormatter.format(order.orderPrice)} تومان</dd></div>
                                                <div><dt>{order.side === "buy" ? "هزینه انجام‌شده" : "مبلغ ناخالص فروش"}</dt><dd>{numberFormatter.format(order.cost)} تومان</dd></div>
                                                <div><dt>میانگین قیمت معامله</dt><dd>{numberFormatter.format(order.averagePrice)} تومان</dd></div>
                                                <div><dt>مقدار انجام‌شده</dt><dd>{gramFormatter.format(order.executedAmount)} گرم نقره</dd></div>
                                                <div><dt>کارمزد</dt><dd>{order.side === "buy" ? `${gramFormatter.format(order.feeGrams)} گرم نقره` : `${numberFormatter.format(order.feeToman)} تومان`} (۰٫۵٪)</dd></div>
                                                <div><dt>خالص دریافتی</dt><dd>{order.side === "buy" ? `${gramFormatter.format(order.netAmount)} گرم نقره` : `${numberFormatter.format(order.cost - order.feeToman)} تومان`}</dd></div>
                                                {order.remainingAmount > 0.0000001 && <div><dt>{order.status === "cancelled" ? "مقدار لغوشده" : "باقی‌مانده در صف"}</dt><dd>{gramFormatter.format(order.remainingAmount)} گرم نقره</dd></div>}
                                            </dl>
                                        </article>
                                    ))}
                                </div>
                        )}

                        {activeOrdersTab === "trade-history" && (
                            tradeHistory.length === 0
                                ? <OrdersEmptyState title="تاریخچه معامله‌ای وجود ندارد" />
                                : <div className={styles.historyList}>
                                    {tradeHistory.map((trade) => (
                                        <article key={trade.id} className={styles.historyCard}>
                                            <header className={styles.historyHeader}>
                                                <div><strong>نقره / تومان</strong><span className={styles.completedStatus}>آنی</span><span className={trade.side === "buy" ? styles.buyBadge : styles.sellBadge}>{trade.side === "buy" ? "خرید" : "فروش"}</span></div>
                                                <time>{trade.createdAt}</time>
                                            </header>
                                            <div className={styles.historyDivider} />
                                            <dl className={styles.historyDetails}>
                                                <div><dt>مقدار</dt><dd>{gramFormatter.format(trade.amount)} گرم نقره</dd></div>
                                                <div><dt>مقدار تومان</dt><dd>{numberFormatter.format(trade.total)} تومان</dd></div>
                                                <div><dt>کارمزد</dt><dd>{trade.side === "buy" ? `${gramFormatter.format(trade.feeGrams)} گرم نقره` : `${numberFormatter.format(trade.feeToman)} تومان`} (۰٫۵٪)</dd></div>
                                                <div><dt>خالص دریافتی</dt><dd>{trade.side === "buy" ? `${gramFormatter.format(trade.netAmount)} گرم نقره` : `${numberFormatter.format(trade.total - trade.feeToman)} تومان`}</dd></div>
                                                <div><dt>میانگین قیمت نهایی</dt><dd>{numberFormatter.format(trade.averagePrice)} تومان</dd></div>
                                            </dl>
                                        </article>
                                    ))}
                                </div>
                        )}
                    </div>                </section>
            </section>

            {tutorialStep !== "finished" && spotlightRect && (
                <TutorialOverlay
                    step={tutorialStep}
                    tradeSide={tradeSide}
                    availableSilver={silverBalance}
                    onTradeSideChange={changeTradeSide}
                    stepNumber={stepNumber}
                    totalSteps={route.length}
                    hasOpenOrder={registeredOrders.some(order => order.side === tradeSide)}
                    matchIndex={matchIndex}
                    bestAsk={referencePrice}
                    rect={spotlightRect}
                    wrongAttempt={wrongAttempt}
                    plannedBudget={plannedBudget}
                    expectedPercent={expectedPercent}
                    selectedIntent={purchaseIntent}
                    budgetValid={budgetValid}
                    budgetError={budgetError}
                    amountReady={canSubmit}
                    priceReady={numericPrice > 0 && (purchaseIntent !== "limit" || limitPriceValid)}
                    requestedAmount={numericAmount}
                    executableAmount={instantFill.executedAmount}
                    remainingAmount={instantFill.remainingAmount}
                    selectedPrice={numericPrice}
                    completionPrice={completionPrice}
                    feeInGrams={feeInGrams}
                    minimumLimitPrice={minimumLimitPrice}
                    maximumLimitPrice={maximumLimitPrice}
                    limitPriceError={limitPriceError}
                    matchedLevels={instantFill.fills}
                    buyQueuePosition={buyQueuePosition}
                    onWrongAttempt={() => setWrongAttempt(true)}
                    onNext={goToTutorialStep}
                    onBudgetChange={setPlannedBudget}
                    onChooseIntent={choosePurchaseIntent}
                    onChooseMethod={chooseAmountMethod}
                    onBack={goToPreviousTutorialStep}
                />
            )}
        </main>
    );
}
