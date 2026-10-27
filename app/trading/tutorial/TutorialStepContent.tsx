import type { ReactNode } from "react";
import OrderMatchExplanation from "./OrderMatchExplanation";
import { AmountMethod, OrderMatchLevel, PurchaseIntent, TutorialStep } from "./tutorialTypes";
import styles from "./TutorialStepContent.module.css";

type ActiveStep = Exclude<TutorialStep, "finished">;
type Props = {
    step: ActiveStep;
    tradeSide?: "buy" | "sell";
    availableSilver?: number;
    matchIndex: number;
    bestAsk: number;
    plannedBudget: string;
    expectedPercent: number;
    selectedIntent: PurchaseIntent | null;
    budgetError?: string;
    requestedAmount: number;
    executableAmount: number;
    remainingAmount: number;
    selectedPrice: number;
    completionPrice: number | null;
    minimumLimitPrice: number;
    maximumLimitPrice: number;
    limitPriceError?: string;
    matchedLevels: OrderMatchLevel[];
    buyQueuePosition: number;
    onBudgetChange: (value: string) => void;
    onChooseIntent: (intent: PurchaseIntent) => void;
    onChooseMethod: (method: AmountMethod) => void;
};

const tomanFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const gramFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 6 });

function InstantIcon() {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 5 13h6l-.8 9L19 10h-6.2l.4-8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}

function LimitIcon() {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M12 7.5V12l3.2 2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 2h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function normalizeBudget(value: string) {
    return value
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[^\d]/g, "");
}

export const stepMeta: Record<ActiveStep, { eyebrow: string; title: string; hint: string }> = {
    welcome: { eyebrow: "شروع کنیم", title: "قبل از اولین خرید، یک نکته کوتاه", hint: "اگر آماده‌ای، بزن بریم." },
    intent: { eyebrow: "انتخاب با توست", title: "دوست داری همین حالا بخری یا برای قیمت بهتر صبر کنی؟", hint: "یکی از دو مسیر را انتخاب کن تا با هم ادامه بدهیم." },
    "instant-price": { eyebrow: "خرید همین حالا", title: "ارزان‌ترین فروشنده را پیدا کنیم", hint: "آخرین ردیف قرمز را بزن؛ این ردیف فعلاً پایین‌ترین قیمت فروش را دارد." },
    "limit-market": { eyebrow: "قبل از انتخاب قیمت", title: "فروشنده‌ها الان چه قیمتی می‌خواهند؟", hint: "ردیف روشن، ارزان‌ترین فروشنده فعلی است." },
    "queue-result": { eyebrow: "سفارش ثبت شد", title: "حالا سفارشت در صف خرید است", hint: "ردیف روشن، مقدار منتظرمانده سفارش توست." },
    "queue-preview": { eyebrow: "جای سفارش در صف خرید", title: "این مقدار منتظر فروشنده می‌ماند", hint: "ردیف سبز روشن را در صف خرید ببین." },
    "limit-price": { eyebrow: "قیمت پیشنهادی", title: "چه قیمتی برای خرید در نظر داری؟", hint: "قیمت باید نزدیک قیمت فعلی بازار و داخل بازه نشان‌داده‌شده باشد." },
    budget: { eyebrow: "انتخاب بودجه", title: "برای این خرید چقدر کنار گذاشتی؟", hint: "یک مبلغ بیشتر از صفر و کمتر از موجودی تمرینی وارد کن." },
    "amount-method": { eyebrow: "مقدار خرید", title: "مبلغ خریدت را چطور مشخص می‌کنی؟", hint: "هرکدام برایت راحت‌تر است انتخاب کن." },
    percent: { eyebrow: "انتخاب درصد", title: "نقطه‌ای را بزن که به بودجه‌ات نزدیک‌تر است", hint: "نقطه‌ای را انتخاب کن که در متن پیشنهاد داده‌ام." },
    value: { eyebrow: "مبلغ دلخواه", title: "ارزش سفارشت را به تومان بنویس", hint: "مبلغ را داخل فیلد روشنِ ارزش سفارش وارد کن؛ مثلاً ۳٬۰۰۰٬۰۰۰ تومان." },
    "liquidity-check": { eyebrow: "نگاه به صف فروش", title: "سفارشت دقیقاً چطور جلو می‌رود؟", hint: "مقدار آماده فروش و باقی‌مانده سفارشت را کنار هم ببین." },
    review: { eyebrow: "یک نگاه آخر", title: "قبل از ثبت، ببین قرار است چه اتفاقی بیفتد", hint: "قیمت و مقدار سفارشت را یک بار دیگر بررسی کن." },
    submit: { eyebrow: "لحظه ثبت سفارش", title: "آماده‌ای؟ دکمه خرید را بزن", hint: "برای ادامه باید روی دکمه سبز خرید بزنی." },
    "execution-result": { eyebrow: "معامله انجام شد", title: "دیدی چه اتفاقی افتاد؟", hint: "ردیف مشخص‌شده را نگاه کن." },
    "cancel-order": { eyebrow: "اختیار سفارش با توست", title: "برای تغییر قیمت، اول سفارش را لغو کن", hint: "دکمه لغو در پایین کارت سفارش روشن شده است؛ لغوکردن برای پایان آموزش اجباری نیست." },
    orders: { eyebrow: "نتیجه سفارش", title: "این هم جای سفارش تو", hint: "نتیجه را ببین و آموزش را تمام کن." },
};

function ImportantNote({ children }: { children: ReactNode }) {
    return <div className={styles.note}><span className={styles.noteIcon} aria-hidden="true"><img src="/images/trading/warning.png" alt="" width={30} height={30}/></span><span>{children}</span></div>;
}

export default function TutorialStepContent(props: Props) {
    const { step, matchIndex, bestAsk, plannedBudget, expectedPercent, selectedIntent, budgetError, requestedAmount, executableAmount, remainingAmount, selectedPrice, minimumLimitPrice, maximumLimitPrice, limitPriceError, matchedLevels, buyQueuePosition, onBudgetChange, onChooseIntent, onChooseMethod } = props;
    if (props.tradeSide === "sell") return <SellStepContent {...props}/>;
    if (step === "cancel-order") return <div className={styles.cancelGuide}><p className={styles.lead}>تا وقتی سفارش در انتظار است، هر زمان خواستی می‌توانی دکمه <strong>لغو</strong> را بزنی. مبلغ بخش انجام‌نشده به موجودی قابل استفاده‌ات برمی‌گردد.</p><ImportantNote>فقط باقی‌مانده سفارش لغو می‌شود؛ خریدی که قبلاً انجام شده و کارمزدش برنمی‌گردد.</ImportantNote><p className={styles.lead}>بعد از لغو، در فرم خرید <strong>قیمت و مبلغ جدید</strong> را وارد کن و دوباره سفارش بده.</p><small className={styles.optionalHint}>لغو برای پایان آموزش اجباری نیست؛ می‌توانی سفارش را نگه داری.</small></div>;
    if (step === "limit-market") return <><p className={styles.lead}>ردیف روشن، پایین‌ترین قیمت فروش فعلی است: <strong>{tomanFormatter.format(bestAsk)} تومان</strong> برای هر گرم. اگر عجله نداری، می‌توانی کمی پایین‌تر از این قیمت پیشنهاد بدهی. در قدم بعد قیمت دلخواهت را وارد می‌کنی.</p><ImportantNote>سفارش با قیمت پایین‌تر منتظر فروشنده می‌ماند؛ انجام‌شدن آن قطعی نیست.</ImportantNote></>;
    if (step === "queue-result") return <><p className={styles.lead}>این بار ردیف روشن، سفارش ثبت‌شده توست: <strong>{gramFormatter.format(remainingAmount)} گرم</strong> با قیمت هر گرم <strong>{tomanFormatter.format(selectedPrice)} تومان</strong>. در قدم بعد کارت سفارش را می‌بینی.</p><ImportantNote>مبلغ این بخش برای سفارش کنار گذاشته شده؛ تا انجام یا لغو سفارش نمی‌توانی آن را دوباره خرج کنی.</ImportantNote></>;
    if (step === "queue-preview") return <><p className={styles.lead}>این ردیف سبز، پیش‌نمایش سفارش توست؛ هنوز چیزی ثبت نشده. <strong>{gramFormatter.format(remainingAmount)} گرم</strong> با قیمت هر گرم <strong>{tomanFormatter.format(selectedPrice)} تومان</strong> در صف خرید منتظر می‌ماند.</p><ImportantNote>هرچه خریدار قیمت بالاتری پیشنهاد بدهد، پیشنهادش برای فروشنده جذاب‌تر است؛ چون فروشنده می‌تواند نقره‌اش را گران‌تر بفروشد. برای همین، سفارش‌های خرید با قیمت بالاتر در ابتدای صف قرار می‌گیرند.</ImportantNote><p className={styles.optionalHint}>بین سفارش‌های هم‌قیمت، سفارش قدیمی‌تر اولویت دارد؛ جای دقیق تو در آن نوبت از این نمای تجمیعی مشخص نیست.</p></>;
    if (step === "execution-result") return <OrderMatchExplanation requestedAmount={requestedAmount} remainingAmount={remainingAmount} selectedPrice={selectedPrice} matchedLevels={matchedLevels} buyQueuePosition={buyQueuePosition} matchIndex={matchIndex} executed/>;
    if (step === "welcome") return <><p className={styles.lead}>اینجا قیمت را یک نفر از پشت صحنه تعیین نمی‌کند. خریدار می‌گوید با چه قیمتی می‌خرد، فروشنده هم قیمت خودش را می‌گذارد؛ بازار از کنار هم قرارگرفتن همین پیشنهادها ساخته می‌شود.</p><div className={styles.note}><span className={styles.noteIcon} aria-hidden="true"><img src="/images/trading/warning.png" alt="" width={30} height={30}/></span><span>هر وقت قیمت خریدار و فروشنده به هم برسد، معامله انجام می‌شود؛ گاهی همان لحظه و گاهی هم بعد از کمی انتظار.</span></div></>;
    if (step === "intent") return <><p className={styles.lead}>اول مشخص کنیم چه چیزی برایت مهم‌تر است: سرعت یا قیمت؟ اگر می‌خواهی همین حالا نقره بخری، سراغ ارزان‌ترین فروشنده موجود می‌رویم. اگر عجله نداری، قیمت پیشنهادی خودت را ثبت می‌کنیم.</p><div className={styles.methods}><button className={`${styles.method} ${selectedIntent === "instant" ? styles.selectedMethod : ""}`} type="button" onClick={() => onChooseIntent("instant")}><span><InstantIcon/></span><div><strong>همین حالا می‌خرم</strong><small>با پایین‌ترین قیمت فعلی صف فروش معامله می‌کنم.</small></div></button><button className={`${styles.method} ${selectedIntent === "limit" ? styles.selectedMethod : ""}`} type="button" onClick={() => onChooseIntent("limit")}><span><LimitIcon/></span><div><strong>برای قیمت دلخواهم صبر می‌کنم</strong><small>پیشنهادم را ثبت می‌کنم تا فروشنده‌ای به آن برسد.</small></div></button></div></>;
    if (step === "instant-price") return <><p className={styles.lead}>ردیف‌های قرمز، فروشنده‌های بازارند. هرچه پایین‌تر می‌آیی، قیمت فروش کمتر می‌شود.</p><ImportantNote>آخرین ردیف قرمز را بزن؛ این ردیف فعلاً پایین‌ترین قیمت فروش را دارد.</ImportantNote></>;
    if (step === "limit-price") return <div className={styles.budgetSection}><p className={styles.lead}>قیمت پیشنهادی خودت را در فیلد روشن وارد کن. برای این تمرین، قیمت را نزدیک پیشنهادهای فعلی بازار نگه می‌داریم.</p><ImportantNote>قیمت را بین <strong>{tomanFormatter.format(minimumLimitPrice)}</strong> تا <strong>{tomanFormatter.format(maximumLimitPrice)}</strong> تومان انتخاب کن.</ImportantNote>{limitPriceError && <div className={styles.inlineError}>{limitPriceError}</div>}</div>;
    if (step === "budget") return <div className={styles.budgetSection}><p className={styles.lead}>ده میلیون تومان موجودی تمرینی داری، ولی قرار نیست همه‌اش را یک‌جا خرج کنی. بگو برای این خرید چه مبلغی کنار گذاشتی.</p><label className={`${styles.budgetField} ${budgetError ? styles.invalidField : ""}`}><input inputMode="numeric" value={plannedBudget ? tomanFormatter.format(Number(plannedBudget)) : ""} onChange={(e) => onBudgetChange(normalizeBudget(e.target.value))} placeholder="مثلاً ۵٬۰۰۰٬۰۰۰"/><span>تومان</span></label>{budgetError && <div className={styles.inlineError}>{budgetError}</div>}</div>;
    if (step === "amount-method") return <><p className={styles.lead}>حالا باید مشخص کنی با بودجه {Number(plannedBudget || 0).toLocaleString("fa-IR")} تومانی‌ات چه مقدار نقره می‌خواهی بخری. {selectedIntent === "limit" && <>بهترین فروشنده فعلاً {tomanFormatter.format(bestAsk)} تومان پیشنهاد داده؛ سفارش تو با قیمت {tomanFormatter.format(selectedPrice)} تومان منتظر فروشنده می‌ماند. </>} از هرکدام از این دو راه که راحت‌تری استفاده کن:</p><div className={styles.methods}><button className={styles.method} type="button" onClick={() => onChooseMethod("percent")}><span>٪</span><div><strong>مقدار را با نوار درصدی مشخص می‌کنم</strong><small>درصدی از موجودی را انتخاب می‌کنم تا مقدار گرم حساب شود.</small></div></button><button className={styles.method} type="button" onClick={() => onChooseMethod("value")}><span>گ</span><div><strong>مبلغ را در ارزش سفارش می‌نویسم</strong><small>مثلاً ۳ میلیون تومان؛ مقدار نقره خودکار حساب می‌شود.</small></div></button></div></>;
    if (step === "liquidity-check") {
        return <OrderMatchExplanation requestedAmount={requestedAmount} remainingAmount={remainingAmount} selectedPrice={selectedPrice} matchedLevels={matchedLevels} buyQueuePosition={buyQueuePosition} matchIndex={matchIndex}/>;
    }
    const text: Partial<Record<ActiveStep, string>> = {
        percent: `با مبلغی که گفتی، نقطه ${expectedPercent.toLocaleString("fa-IR")} درصد از همه نزدیک‌تر است. آن را بزن تا مقدار نقره خودش حساب شود.`,
        value: "در فیلد روشنِ ارزش سفارش، مبلغ دلخواهت را به تومان وارد کن؛ مثلاً ۳٬۰۰۰٬۰۰۰. مقدار گرم نقره با توجه به قیمت انتخابی خودکار حساب می‌شود. مبلغ باید بیشتر از صفر و حداکثر به اندازه موجودی باشد.",
        review: selectedIntent === "limit"
            ? `چون قیمت پیشنهادی خودت را انتخاب کردی، سفارش ${gramFormatter.format(requestedAmount)} گرمی تو اول وارد صف خرید می‌شود و منتظر فروشنده‌ای می‌ماند که با قیمتت موافق باشد.`
            : remainingAmount > 0.0000001
                ? `با ثبت خرید، ${gramFormatter.format(executableAmount)} گرم همان لحظه از صف فروش برداشته می‌شود و ${gramFormatter.format(remainingAmount)} گرم باقی‌مانده وارد صف خرید تو می‌شود.`
                : `با ثبت خرید، تمام ${gramFormatter.format(requestedAmount)} گرم همان لحظه از سفارش فروشنده کم می‌شود. بعدش دقیقاً نشان می‌دهیم کدام ردیف تغییر کرده است.`,
        submit: "حالا خودت ثبتش کن. دکمه سبز خرید را بزن تا نتیجه سفارشت را همان‌جا روی بازار ببینی.",
        "execution-result": `ردیف مشخص‌شده قبل از خرید تو مقدار بیشتری داشت. حالا ${gramFormatter.format(executableAmount)} گرم از آن کم شده؛ یعنی خریدت همان لحظه انجام شده است.`,
        orders: remainingAmount > 0.0000001 ? "این بخشِ انجام‌نشده سفارش توست. از حالا در صف خرید قرار دارد و منتظر فروشنده‌ای می‌ماند که با قیمت تو معامله کند." : "خریدت کامل انجام شد و چیزی در صف باز نماند. گزارش آن را هم در تاریخچه سفارشات می‌بینی.",
    };
    if (step === "value") return <><p className={styles.lead}>در فیلد روشنِ ارزش سفارش، مبلغ دلخواهت را به تومان وارد کن؛ مثلاً ۳٬۰۰۰٬۰۰۰. مقدار گرم نقره با قیمت انتخابی خودکار حساب می‌شود.</p><ImportantNote>مبلغ باید بیشتر از صفر و حداکثر به اندازه موجودی قابل استفاده‌ات باشد.</ImportantNote></>;
    if (step === "review") return <><p className={styles.lead}>{text[step]}</p><ImportantNote>هنوز سفارشی ثبت نشده؛ قبل از زدن دکمه خرید، قیمت و مقدار را یک بار دیگر بررسی کن.</ImportantNote></>;
    return <p className={styles.lead}>{text[step]}</p>;
}

export const sellStepMeta: Record<ActiveStep, {eyebrow: string; title: string; hint: string}> = {
    ...stepMeta,
    welcome: {eyebrow: "آموزش فروش", title: "این بار نقره‌ات را بفروش", hint: "با هم مسیر فروش را مرور می‌کنیم."},
    intent: {eyebrow: "روش فروش", title: "همین حالا می‌فروشی یا برای قیمت بهتر صبر می‌کنی؟", hint: "روش فروشت را انتخاب کن."},
    "instant-price": {eyebrow: "فروش همین حالا", title: "بالاترین پیشنهاد خرید را پیدا کنیم", hint: "اولین ردیف سبز، بهترین خریدار فعلی است؛ روی آن بزن."},
    "limit-market": {eyebrow: "نگاه به صف خرید", title: "خریدارها الان چه قیمتی می‌خواهند؟", hint: "اولین ردیف سبز را ببین."},
    "limit-price": {eyebrow: "قیمت پیشنهادی فروش", title: "با چه قیمتی می‌خواهی بفروشی؟", hint: "قیمت فروش را داخل بازه مشخص‌شده وارد کن."},
    budget: {eyebrow: "مقدار موردنظر", title: "چند گرم برای فروش در نظر داری؟", hint: "بیشتر از صفر و حداکثر به اندازه موجودی نقره وارد کن."},
    "amount-method": {eyebrow: "مقدار فروش", title: "مقدار فروش را چطور مشخص می‌کنی؟", hint: "درصد موجودی یا ورود مستقیم مقدار گرم را انتخاب کن."},
    value: {eyebrow: "مقدار دلخواه فروش", title: "چند گرم نقره می‌خواهی بفروشی؟", hint: "مقدار را مستقیم در فیلد روشن و به گرم وارد کن؛ حداکثر به اندازه موجودی نقره‌ات."},
    "liquidity-check": {eyebrow: "تطبیق با خریدار", title: "فروشت دقیقاً چطور جلو می‌رود؟", hint: "ردیف روشن در صف خرید را ببین."},
    "queue-preview": {eyebrow: "پیش‌نمایش صف فروش", title: "این مقدار منتظر خریدار می‌ماند", hint: "ردیف روشن، پیش‌نمایش سفارش فروش توست."},
    review: {eyebrow: "بررسی نهایی", title: "قیمت و مقدار فروش را بررسی کن", hint: "قبل از ثبت، نتیجه فروش را مرور کن."},
    submit: {eyebrow: "ثبت فروش", title: "آماده‌ای؟ دکمه قرمز فروش را بزن", hint: "برای ادامه دکمه قرمز فروش را بزن."},
    "execution-result": {eyebrow: "نتیجه فروش", title: "مقدار خریدار چه تغییری کرد؟", hint: "مقدار کم‌شده از ردیف خرید روشن را ببین."},
    "queue-result": {eyebrow: "سفارش فروش ثبت شد", title: "باقی‌مانده در صف فروش قرار گرفت", hint: "ردیف روشن در صف فروش را ببین."},
    orders: {eyebrow: "گزارش فروش", title: "این هم نتیجه سفارش فروش تو", hint: "سفارش باز یا تاریخچه فروش را ببین."},
    "cancel-order": {eyebrow: "تغییر قیمت فروش", title: "برای تغییر قیمت، باقی‌مانده را لغو کن", hint: "لغو فقط بخش انجام‌نشده را آزاد می‌کند."},
};

function SellStepContent(p: Props) {
    const lead = (text: ReactNode) => <p className={styles.lead}>{text}</p>;
    const amount = gramFormatter.format(p.requestedAmount);
    const remaining = gramFormatter.format(p.remainingAmount);
    const selected = tomanFormatter.format(p.selectedPrice);
    if (p.step === "welcome") return <>{lead("در فروش، نقره از موجودی تو کم می‌شود و مبلغ معامله را دریافت می‌کنی. موجودی این صفحه تمرینی است؛ برای شروع ۱۰۰ گرم نقره در اختیار داری و خریدوفروش واقعی انجام نمی‌شود.")}<ImportantNote>فروش وقتی انجام می‌شود که خریداری با قیمت پیشنهادی تو یا بالاتر وجود داشته باشد.</ImportantNote></>;
    if (p.step === "intent") return <>{lead("برای فروش فوری سراغ بالاترین پیشنهاد خرید می‌رویم؛ برای قیمت بالاتر، سفارشت در صف فروش منتظر می‌ماند.")}<div className={styles.methods}><button type="button" className={`${styles.method} ${p.selectedIntent === "instant" ? styles.selectedMethod : ""}`} onClick={() => p.onChooseIntent("instant")}><span><InstantIcon/></span><div><strong>همین حالا می‌فروشم</strong><small>با بهترین خریدار فعلی معامله می‌کنم.</small></div></button><button type="button" className={`${styles.method} ${p.selectedIntent === "limit" ? styles.selectedMethod : ""}`} onClick={() => p.onChooseIntent("limit")}><span><LimitIcon/></span><div><strong>برای قیمت دلخواهم صبر می‌کنم</strong><small>منتظر خریدار با قیمت پیشنهادی‌ام می‌مانم.</small></div></button></div></>;
    if (p.step === "instant-price") return <>{lead("ردیف‌های سبز، پیشنهادهای خریداران‌اند؛ اولین ردیف سبز بالاترین قیمت خرید را دارد.")}<ImportantNote>اولین ردیف سبز را بزن تا بهترین قیمت فعلی خرید در فرم فروش قرار بگیرد.</ImportantNote></>;
    if (p.step === "limit-market") return <>{lead(<>بالاترین پیشنهاد خرید فعلی <strong>{tomanFormatter.format(p.bestAsk)} تومان</strong> برای هر گرم است. اگر می‌خواهی بالاتر بفروشی، در قدم بعد قیمت پیشنهادی خودت را وارد کن.</>)}<ImportantNote>با قیمت بالاتر از بهترین خریدار، سفارش منتظر می‌ماند و انجام‌شدن آن قطعی نیست.</ImportantNote></>;
    if (p.step === "limit-price") return <>{lead("قیمت فروش دلخواهت را در فیلد روشن وارد کن.")}<ImportantNote>برای این تمرین عددی بین {tomanFormatter.format(p.minimumLimitPrice)} تا {tomanFormatter.format(p.maximumLimitPrice)} تومان بنویس.</ImportantNote>{p.limitPriceError && <p className={styles.inlineError}>{p.limitPriceError}</p>}</>;
    if (p.step === "budget") return <>{lead("چه مقدار از موجودی نقره‌ات را برای فروش کنار گذاشتی؟ مقدار را به گرم بنویس.")}<label className={styles.budgetField}><input inputMode="decimal" value={p.plannedBudget} onChange={e=>p.onBudgetChange(e.target.value.replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[^\d.]/g,""))}/><span>گرم نقره</span></label>{p.budgetError && <p className={styles.inlineError}>{p.budgetError}</p>}</>;
    if (p.step === "amount-method") return <>{lead(`برای فروش حدود ${p.plannedBudget} گرم، یکی از دو روش را انتخاب کن.`)}<div className={styles.methods}><button className={styles.method} type="button" onClick={()=>p.onChooseMethod("percent")}><span>٪</span><div><strong>درصدی از موجودی نقره را می‌فروشم</strong><small>مقدار گرم خودکار حساب می‌شود.</small></div></button><button className={styles.method} type="button" onClick={()=>p.onChooseMethod("value")}><span>گ</span><div><strong>مقدار گرم را خودم می‌نویسم</strong><small>عدد دلخواهم را تا سقف موجودی نقره وارد می‌کنم.</small></div></button></div></>;
    if (p.step === "percent") return lead(`نقطه ${p.expectedPercent.toLocaleString("fa-IR")} درصد را بزن؛ این درصد از موجودی قابل فروش به مقدار مدنظرت نزدیک‌تر است.`);
    if (p.step === "value") return <>{lead("مقدار نقره‌ای را که می‌خواهی بفروشی، مستقیم در فیلد روشنِ مقدار به گرم بنویس. ارزش سفارش بر اساس قیمت انتخابی محاسبه می‌شود.")}<ImportantNote>موجودی قابل فروش تو <strong>{gramFormatter.format(p.availableSilver ?? 0)} گرم</strong> است. مقدار را بیشتر از صفر و حداکثر به همین اندازه وارد کن.</ImportantNote>{p.requestedAmount > (p.availableSilver ?? 0) && <p className={styles.inlineError}>مقدار واردشده از موجودی نقره‌ات بیشتر است؛ عدد کوچک‌تری بنویس.</p>}</>;
    if (p.step === "liquidity-check" || p.step === "execution-result") return <OrderMatchExplanation {...p} tradeSide="sell" executed={p.step === "execution-result"}/>;
    if (p.step === "queue-preview" || p.step === "queue-result") return <>{lead(`${p.step === "queue-preview" ? "پیش‌نمایش" : "سفارش ثبت‌شده"} فروش تو: ${remaining} گرم با قیمت هر گرم ${selected} تومان؛ این مقدار در صف فروش منتظر خریدار می‌ماند.`)}<ImportantNote>{p.step === "queue-preview" ? "فروشنده‌های ارزان‌تر زودتر بررسی می‌شوند؛ در قیمت برابر، سفارش قدیمی‌تر اولویت دارد." : "نقره این بخش برای سفارش کنار گذاشته شده؛ با لغو باقی‌مانده دوباره قابل فروش می‌شود."}</ImportantNote></>;
    if (p.step === "review") return <>{lead(`${gramFormatter.format(p.executableAmount)} گرم همین حالا قابل فروش است و ${remaining} گرم منتظر می‌ماند. مقدار کل سفارش ${amount} گرم و حداقل قیمت هر گرم ${selected} تومان است.`)}<ImportantNote>قبل از ثبت، قیمت و مقدار را بررسی کن؛ کارمزد فقط از مبلغ فروش انجام‌شده کم می‌شود.</ImportantNote></>;
    if (p.step === "submit") return lead("دکمه قرمز فروش را بزن تا کاهش مقدار خریدار و نتیجه سفارشت را ببینی.");
    if (p.step === "orders") return lead(p.remainingAmount > 1e-7 ? "بخش انجام‌نشده فروش در سفارش‌های باز است؛ بخش انجام‌شده را در تاریخچه معاملات می‌بینی." : "فروش کامل انجام شد؛ مبلغ پس از کسر کارمزد به موجودی تومانی اضافه شده و گزارش در تاریخچه است.");
    if (p.step === "cancel-order") return <>{lead("برای تغییر قیمت می‌توانی باقی‌مانده فروش را لغو کنی و سپس قیمت و مقدار جدید وارد کنی.")}<ImportantNote>فقط نقره بخش انجام‌نشده آزاد می‌شود؛ فروش انجام‌شده و کارمزد آن برنمی‌گردد.</ImportantNote></>;
    return null;
}
