import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "liquid-btn inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[#d4fc79] via-[#7ef29d] to-[#4be89b] text-slate-950 shadow-[0_8px_28px_-6px_rgba(86,240,159,0.45),inset_0_1px_0_rgba(255,255,255,0.65)] hover:brightness-105 hover:-translate-y-0.5 active:translate-y-0",
        outline:
          "border border-emerald-300/25 bg-white/[0.04] backdrop-blur-md text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-emerald-300/10 hover:border-emerald-300/45 hover:-translate-y-0.5 active:translate-y-0",
        ghost:
          "text-zinc-300 hover:text-white hover:bg-white/[0.06] backdrop-blur-sm",
      },
      size: { default: "h-11 px-5", sm: "h-9 px-3.5", icon: "size-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
export { Button, buttonVariants };
