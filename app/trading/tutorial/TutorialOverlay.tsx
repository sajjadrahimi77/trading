import { CSSProperties, useLayoutEffect, useRef, useState } from "react";
import TutorialStepContent, { stepMeta, sellStepMeta } from "./TutorialStepContent";
import { AmountMethod, OrderMatchLevel, PurchaseIntent, SpotlightRect, TutorialStep } from "./tutorialTypes";
import styles from "./TutorialOverlay.module.css";

type Props = {
    tradeSide: "buy" | "sell";
    availableSilver: number;
    onTradeSideChange: (side: "buy" | "sell") => void;
    step: Exclude<TutorialStep, "finished">;
    rect: SpotlightRect;
    stepNumber: number;
    totalSteps: number;
    hasOpenOrder: boolean;
    matchIndex: number;
    bestAsk: number;
    wrongAttempt: boolean;
    plannedBudget: string;
    expectedPercent: number;
    selectedIntent: PurchaseIntent | null;
    budgetValid: boolean;
    budgetError?: string;
    amountReady: boolean;
    priceReady: boolean;
    requestedAmount: number;
    executableAmount: number;
    remainingAmount: number;
    selectedPrice: number;
    completionPrice: number | null;
    feeInGrams: number;
    minimumLimitPrice: number;
    maximumLimitPrice: number;
    limitPriceError?: string;
    matchedLevels: OrderMatchLevel[];
    buyQueuePosition: number;
    onWrongAttempt: () => void;
    onNext: (step: TutorialStep) => void;
    onBudgetChange: (value: string) => void;
    onChooseIntent: (intent: PurchaseIntent) => void;
    onChooseMethod: (method: AmountMethod) => void;
    onBack: () => void;
};

export default function TutorialOverlay(props: Props) {
    const modalRef = useRef<HTMLElement>(null);
    const [hasMoreText, setHasMoreText] = useState(false);
    const [placement, setPlacement] = useState<CSSProperties>({});
    useLayoutEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        const place = () => {
            const gap = 16, edge = 12;
            const viewport = window.visualViewport;
            const viewportHeight = viewport?.height ?? window.innerHeight;
            const viewportTop = viewport?.offsetTop ?? 0;
            if (window.innerWidth <= 760) {
                const maxHeight = Math.min(480, viewportHeight * 0.62, Math.max(120, viewportHeight - 110));
                const height = Math.min(modal.scrollHeight + 2, maxHeight);
                setPlacement({top: viewportTop + viewportHeight - height - edge, left: edge, right: "auto", bottom: "auto", width: window.innerWidth - edge * 2, maxHeight});
                return;
            }
            const width = Math.min(350, window.innerWidth - edge * 2);
            const right = props.rect.left + props.rect.width + gap;
            const left = props.rect.left - width - gap;
            const hasSide = right + width <= window.innerWidth - edge || left >= edge;
            const below = window.innerHeight - (props.rect.top + props.rect.height) - gap - edge;
            const above = props.rect.top - gap - edge;
            const height = Math.min(modal.scrollHeight + 2, window.innerHeight - edge * 2);
            let x = Math.max(edge, window.innerWidth - width - edge);
            let y = edge, maxHeight = window.innerHeight - edge * 2;
            if (hasSide) {
                x = right + width <= window.innerWidth - edge ? right : left;
                y = Math.max(edge, Math.min(props.rect.top, window.innerHeight - height - edge));
            } else if (Math.max(above, below) >= 180) {
                maxHeight = Math.max(above, below);
                y = below >= above ? props.rect.top + props.rect.height + gap : Math.max(edge, props.rect.top - gap - Math.min(height, maxHeight));
            }
            setPlacement({top: y, left: x, right: "auto", bottom: "auto", width, maxHeight});
        };
        place();
        window.visualViewport?.addEventListener("resize", place);
        window.visualViewport?.addEventListener("scroll", place);
        window.addEventListener("resize", place);
        return () => {
            window.visualViewport?.removeEventListener("resize", place);
            window.visualViewport?.removeEventListener("scroll", place);
            window.removeEventListener("resize", place);
        };
    }, [props.rect, props.step, props.matchIndex]);
    useLayoutEffect(() => {
        const modal = modalRef.current;
        if (!modal) return;
        const update = () => setHasMoreText(modal.scrollHeight - modal.clientHeight - modal.scrollTop > 10);
        update();
        const observer = new ResizeObserver(update);
        observer.observe(modal);
        modal.addEventListener("scroll", update);
        return () => {observer.disconnect(); modal.removeEventListener("scroll", update);};
    }, [props.step, props.matchIndex, props.tradeSide, props.wrongAttempt, props.budgetError, props.limitPriceError]);
    const style = { "--target-top": `${props.rect.top}px`, "--target-left": `${props.rect.left}px`, "--target-width": `${props.rect.width}px`, "--target-height": `${props.rect.height}px`, "--pointer-left": `${props.rect.pointerLeft}%`, "--pointer-top": `${props.rect.pointerTop}%` } as CSSProperties;
    const meta = (props.tradeSide === "sell" ? sellStepMeta : stepMeta)[props.step];
    const titles: Record<Exclude<TutorialStep, "finished">, string> = {
        welcome: "آشنایی با معاملات", intent: "انتخاب روش معامله",
        "instant-price": "انتخاب بهترین قیمت بازار", "limit-market": "بررسی قیمت‌های بازار",
        "limit-price": "تعیین قیمت پیشنهادی", budget: props.tradeSide === "sell" ? "تعیین مقدار فروش" : "تعیین بودجه خرید",
        "amount-method": "انتخاب روش تعیین مقدار", percent: "تعیین درصد سفارش",
        value: props.tradeSide === "sell" ? "تعیین مقدار فروش" : "تعیین ارزش سفارش",
        "liquidity-check": "بررسی تطبیق سفارش", review: "بررسی نهایی سفارش",
        submit: "ثبت سفارش", "execution-result": "نتیجه اجرای سفارش",
        "queue-preview": "پیش‌نمایش صف سفارش", "queue-result": "وضعیت سفارش در صف",
        orders: "مشاهده وضعیت سفارش", "cancel-order": "لغو سفارش و تغییر قیمت",
    };
    const blocker = (position: string) => <button type="button" aria-label="خارج از بخش آموزش" className={`${styles.blocker} ${position}`} onClick={props.onWrongAttempt}/>;
    return <div className={styles.layer} style={style}>
        {blocker(styles.top)}{blocker(styles.right)}{blocker(styles.bottom)}{blocker(styles.left)}
        <div className={styles.spotlight} aria-hidden="true"><span className={`${styles.pointer} ${props.step === "limit-price" ? styles.pricePointer : ""}`}/></div>
        <section ref={modalRef} style={placement} className={styles.modal} role="dialog" aria-modal="true" aria-live="polite">
            <header className={styles.header}><h2 className={styles.guideLabel} style={{ margin: 0, fontSize: "12px", fontWeight: 650, lineHeight: 1.6 }}><span className={styles.guideDot} />{titles[props.step]}</h2><strong>مرحله {props.stepNumber.toLocaleString("fa-IR")} از {props.totalSteps.toLocaleString("fa-IR")}</strong></header>
            <div className={styles.stepProgress} role="progressbar" aria-label="پیشرفت آموزش" aria-valuemin={0} aria-valuemax={props.totalSteps} aria-valuenow={props.stepNumber}>
                {Array.from({length: props.totalSteps}, (_, index) => <span key={index} className={index + 1 < props.stepNumber ? styles.doneSegment : index + 1 === props.stepNumber ? styles.currentSegment : styles.pendingSegment} />)}
            </div>
            {props.step === "welcome" && <div className={styles.sidePicker} aria-label="انتخاب آموزش"><button type="button" aria-pressed={props.tradeSide === "buy"} onClick={() => props.onTradeSideChange("buy")}>آموزش خرید</button><button type="button" aria-pressed={props.tradeSide === "sell"} onClick={() => props.onTradeSideChange("sell")}>آموزش فروش</button></div>}
            <div className={styles.explanation}>
                <TutorialStepContent availableSilver={props.availableSilver} tradeSide={props.tradeSide} step={props.step} matchIndex={props.matchIndex} bestAsk={props.bestAsk} plannedBudget={props.plannedBudget} expectedPercent={props.expectedPercent} selectedIntent={props.selectedIntent} budgetError={props.budgetError} requestedAmount={props.requestedAmount} executableAmount={props.executableAmount} remainingAmount={props.remainingAmount} selectedPrice={props.selectedPrice} completionPrice={props.completionPrice} minimumLimitPrice={props.minimumLimitPrice} maximumLimitPrice={props.maximumLimitPrice} limitPriceError={props.limitPriceError} matchedLevels={props.matchedLevels} buyQueuePosition={props.buyQueuePosition} onBudgetChange={props.onBudgetChange} onChooseIntent={props.onChooseIntent} onChooseMethod={props.onChooseMethod}/></div>
            {props.wrongAttempt && <div className={styles.hint}><span className={styles.attentionIcon} aria-hidden="true"><img src="/images/trading/warning.png" alt="" width={30} height={30}/></span><span>{meta.hint}</span></div>}
            <div className={styles.actions}>
                {hasMoreText && <p className={styles.scrollCue}>ادامه توضیحات پایین‌تر است <span aria-hidden="true">↓</span></p>}
                {props.step !== "welcome" && props.step !== "orders" && props.step !== "execution-result" && props.step !== "queue-result" && props.step !== "cancel-order" && <button className={styles.secondary} type="button" onClick={props.onBack}><svg className={styles.backIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m14 7 5 5-5 5M19 12H5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg><span>مرحله قبل</span></button>}
                {props.step === "welcome" && <button className={styles.primary} type="button" onClick={() => props.onNext("intent")}>متوجه شدم؛ ادامه بده</button>}
                {props.step === "intent" && <button className={styles.primary} disabled={!props.selectedIntent} type="button" onClick={() => props.onNext(props.selectedIntent === "instant" ? "instant-price" : "limit-market")}>قدم بعدی</button>}
                {props.step === "limit-market" && <button className={styles.primary} type="button" onClick={() => props.onNext("limit-price")}>قیمت پیشنهادم را وارد می‌کنم</button>}
                {props.step === "queue-result" && <button className={styles.primary} type="button" onClick={() => props.onNext("orders")}>کارت سفارش را ببینیم</button>}
                {props.step === "queue-preview" && <button className={styles.primary} type="button" onClick={() => props.onNext("review")}>ادامه</button>}
                {props.step === "limit-price" && <button className={styles.primary} disabled={!props.priceReady} type="button" onClick={() => props.onNext("budget")}>قدم بعدی</button>}
                {props.step === "budget" && <button className={styles.primary} disabled={!props.budgetValid} type="button" onClick={() => props.onNext("amount-method")}>قدم بعدی</button>}
                {props.step === "value" && <button className={styles.primary} disabled={!props.amountReady} type="button" onClick={() => props.onNext(props.selectedIntent === "instant" && props.matchedLevels.length > 0 ? "liquidity-check" : "queue-preview")}>قدم بعدی</button>}
                {props.step === "liquidity-check" && <button className={styles.primary} type="button" onClick={() => props.onNext(props.matchIndex + 1 < props.matchedLevels.length ? "liquidity-check" : props.remainingAmount > 0.0000001 ? "queue-preview" : "review")}>{props.matchIndex + 1 < props.matchedLevels.length ? "فروشنده بعدی را ببینیم" : props.remainingAmount > 0.0000001 ? "باقی‌مانده کجا می‌رود؟" : "بررسی نهایی"}</button>}
                {props.step === "review" && <button className={styles.primary} type="button" onClick={() => props.onNext("submit")}>قدم بعدی</button>}
                {props.step === "execution-result" && <button className={styles.primary} type="button" onClick={() => props.onNext(props.matchIndex + 1 < props.matchedLevels.length ? "execution-result" : props.remainingAmount > 0.0000001 ? "queue-result" : "orders")}>{props.matchIndex + 1 < props.matchedLevels.length ? "تغییر ردیف بعدی" : "سفارشم را نشان بده"}</button>}
                {props.step === "orders" && <button className={styles.primary} type="button" onClick={() => props.onNext(props.hasOpenOrder ? "cancel-order" : "finished")}>{props.hasOpenOrder ? "اگر خواستم قیمت را عوض کنم؟" : "اتمام آموزش"}</button>}
                {props.step === "cancel-order" && <button className={styles.primary} type="button" onClick={() => props.onNext("finished")}>متوجه شدم؛ پایان آموزش</button>}
            </div>
        </section>
    </div>;
}
