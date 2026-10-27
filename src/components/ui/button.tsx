import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-[background-color,color,transform,box-shadow] duration-200 ease-out select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Un seul par écran : l'action principale. */
        cta: "bg-accent text-accent-foreground shadow-card hover:bg-accent-hover",
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "border border-border bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline",
        destructive: "bg-destructive text-white hover:opacity-90",
      },
      size: {
        sm: "min-h-10 px-3 text-sm",
        md: "min-h-12 px-5 text-base",
        lg: "min-h-14 px-7 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
