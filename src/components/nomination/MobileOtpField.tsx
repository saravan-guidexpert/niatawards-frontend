import { REGEXP_ONLY_DIGITS } from "input-otp";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Props = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  onEnter?: () => void;
};

const slotClass =
  "h-12 w-9 sm:h-14 sm:w-11 rounded-xl border border-white/25 bg-white/10 text-lg sm:text-xl font-bold text-white shadow-none first:rounded-xl last:rounded-xl first:border-l ring-offset-0 data-[active=true]:ring-1 data-[active=true]:ring-secondary/70";

const MobileOtpField = ({ value, onChange, disabled, autoFocus = true, onEnter }: Props) => (
  <div>
    <label htmlFor="otp-input" className="block text-[12px] font-semibold text-white/80 mb-2 uppercase tracking-wider">
      Enter 6-Digit OTP
    </label>
    <InputOTP
      id="otp-input"
      maxLength={6}
      value={value}
      onChange={(next) => onChange(next.replace(/\D/g, "").slice(0, 6))}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode="numeric"
      pattern={REGEXP_ONLY_DIGITS}
      // SMS text is often pasted whole ("Your OTP is 482913"), so keep only the digits.
      pasteTransformer={(pasted) => pasted.replace(/\D/g, "").slice(0, 6)}
      containerClassName="justify-between gap-1.5 sm:gap-2"
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.length === 6) onEnter?.();
      }}
    >
      <InputOTPGroup className="flex w-full justify-between gap-1.5 sm:gap-2">
        {Array.from({ length: 6 }, (_, index) => (
          <InputOTPSlot key={index} index={index} className={slotClass} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  </div>
);

export default MobileOtpField;
