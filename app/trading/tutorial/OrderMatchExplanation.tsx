import type { OrderMatchLevel } from "./tutorialTypes";
import styles from "./OrderMatchExplanation.module.css";

type Props = {
    tradeSide?: "buy" | "sell";
    requestedAmount: number;
    remainingAmount: number;
    selectedPrice: number;
    matchedLevels: OrderMatchLevel[];
    buyQueuePosition: number;
    matchIndex: number;
    executed?: boolean;
};
const price = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });
const grams = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 6 });

export default function OrderMatchExplanation({ requestedAmount, matchedLevels, matchIndex, tradeSide = "buy", executed = false }: Props) {
    const selling = tradeSide === "sell";
    const level = matchedLevels[matchIndex];
    if (!level) return <p className={styles.intro}>{selling ? "در این قیمت خریداری برای فروش فوری وجود ندارد؛ باقی‌مانده در صف فروش منتظر می‌ماند." : "در این قیمت فروشنده‌ای برای خرید فوری وجود ندارد؛ باقی‌مانده در صف خرید منتظر می‌ماند."}</p>;

    const alreadyFilled = matchedLevels.slice(0, matchIndex).reduce((sum, row) => sum + row.amount, 0);
    const neededHere = Math.max(0, requestedAmount - alreadyFilled);
    const after = Math.max(0, level.availableBefore - level.amount);
    const left = Math.max(0, neededHere - level.amount);
    const cost = level.amount * level.price;
    const next = matchIndex + 1 < matchedLevels.length;

    return <div className={styles.wrapper}>
        <p className={styles.intro}>
            {selling ? "خریدار در ردیف روشن، به قیمت هر گرم" : "در ردیف روشن صف فروش، به قیمت هر گرم"}
            <strong> {price.format(level.price)} تومان </strong>
            {selling ? "برای خرید" : "مقدار"}
            <strong> {grams.format(level.availableBefore)} گرم </strong>
            {selling ? "سفارش ثبت کرده است." : "نقره برای فروش ثبت شده است."}
            {executed ? " مقدار این ردیف قبل از معامله تو همین عدد بود." : " این مقدارِ موجود در همین ردیف است، نه کل مقدار سفارش تو."}
        </p>
        <p className={styles.intro}>
            مقدار کل سفارش تو <strong>{grams.format(requestedAmount)} گرم</strong> است.
            {alreadyFilled > 1e-7 && <> از این مقدار، {grams.format(alreadyFilled)} گرم در ردیف‌های قبلی {executed ? "انجام شده" : "پوشش داده می‌شود"} و {grams.format(neededHere)} گرم به این ردیف رسیده است.</>}
        </p>
        <div className={styles.detail}>
            <span className={styles.attentionIcon} aria-hidden="true"><img src="/images/trading/warning.png" alt="" width={30} height={30}/></span>
            <span>
                {selling ? "از نقره تو فقط" : "از فروشنده‌های این ردیف فقط"} <strong>{grams.format(level.amount)} گرم</strong> {executed ? selling ? "فروخته شد" : "خریداری شد" : selling ? "فروخته می‌شود" : "خریداری می‌شود"}.
                {left > 1e-7 ? <> بنابراین از {grams.format(neededHere)} گرم موردنیاز، این مقدار کم {executed ? "شد" : "می‌شود"} و <strong>{grams.format(left)} گرم</strong> هنوز باقی {executed ? "مانده است" : "می‌ماند"}.</> : " این ردیف تمام مقدار موردنیاز باقی‌مانده را پوشش می‌دهد."}
            </span>
        </div>
        <div className={styles.change}>
            <span>موجودی ردیف قبل از معامله</span><strong>{grams.format(level.availableBefore)} گرم</strong><i>←</i>
            <span>{executed ? "موجودی ردیف حالا" : "موجودی ردیف پس از ثبت"}</span><strong>{grams.format(after)} گرم</strong>
        </div>
        <p className={styles.intro}>
            ارزش همین بخش از معامله، یعنی {grams.format(level.amount)} گرم × {price.format(level.price)} تومان، حدود <strong>{price.format(cost)} تومان</strong> است؛ این مبلغ {executed ? selling ? "دریافتی ناخالص فروش توست" : "برای خرید این بخش پرداخت شده است" : selling ? "دریافتی فروش این بخش قبل از کارمزد خواهد بود" : "هزینه خرید همین بخش خواهد بود"}.
        </p>
        {left > 1e-7 && <p className={styles.intro}>{next ? `در قدم بعد، ${grams.format(left)} گرم باقی‌مانده را با ردیف بعدی ${selling ? "خرید" : "فروش"} بررسی می‌کنیم.` : `در قیمت انتخابی تو، ردیف دیگری برای انجام فوری باقی‌مانده وجود ندارد. در قدم بعد نشان می‌دهیم ${grams.format(left)} گرم کجا در صف ${selling ? "فروش" : "خرید"} منتظر می‌ماند.`}</p>}
        {!executed && <small className={styles.caption}>این محاسبه پیش‌نمایش است؛ تا دکمه {selling ? "فروش" : "خرید"} را نزنی، معامله‌ای ثبت نمی‌شود.</small>}
    </div>;
}
