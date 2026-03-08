import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border-[1.5px] border-slate-200 bg-white px-3 py-2 text-sm text-slate-900",
          
          // placeholder
          "placeholder:text-slate-400",

          // interaction
          "transition-colors duration-200",

          // hover
          "hover:border-slate-300",

          // focus (clean — no pulse)
          "focus:outline-none focus:border-primary focus:border-[1.5px]",

          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50",

          // file input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",

          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"

export { Input }