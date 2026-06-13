import { clsx } from "clsx";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-semibold text-[#3D5159]">{label}</label>
        )}
        <input
          ref={ref}
          className={clsx(
            "w-full rounded-xl border border-[#E5E9EB] bg-white px-3 py-2 text-sm text-[#1A2B32] placeholder:text-[#A8BDC3] outline-none transition-colors",
            "focus:border-[#2A9D8F] focus:ring-2 focus:ring-[#E0F0F0]",
            error && "border-red-400 focus:border-red-500 focus:ring-red-100",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
