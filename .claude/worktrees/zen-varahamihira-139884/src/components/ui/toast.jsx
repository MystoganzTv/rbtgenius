import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastContext = React.createContext({ onOpenChange: undefined });

const ToastProvider = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));

ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ ...props }, ref) => (
  <div
    ref={ref}
    className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
    {...props}
  />
));

ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-slate-200 bg-white text-slate-900",
        destructive: "destructive border-red-200 bg-red-500 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Toast = React.forwardRef(
  ({ className, variant, open = true, onOpenChange, ...props }, ref) => {
    return (
      <ToastContext.Provider value={{ onOpenChange }}>
        <div
          ref={ref}
          data-state={open ? "open" : "closed"}
          className={cn(toastVariants({ variant }), className)}
          {...props}
        />
      </ToastContext.Provider>
    );
  },
);

Toast.displayName = "Toast";

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-red-300/40 group-[.destructive]:hover:border-red-300/50 group-[.destructive]:hover:bg-red-600 group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-red-300",
      className,
    )}
    {...props}
  />
));

ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(ToastContext);

  return (
    <button
      ref={ref}
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-slate-500/70 opacity-0 transition-opacity hover:text-slate-900 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-300 group-hover:opacity-100 group-[.destructive]:text-red-100/80 group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-red-300",
        className,
      )}
      toast-close=""
      onClick={(event) => {
        onClick?.(event);
        onOpenChange?.(false);
      }}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  );
});

ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));

ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));

ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
