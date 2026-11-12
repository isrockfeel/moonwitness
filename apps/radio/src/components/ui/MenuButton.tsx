import { forwardRef, type ButtonHTMLAttributes } from "react";

export const MenuButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className = "", children, ...props }, ref) => {
    return (
      <button ref={ref} className={`btn-icon ${className}`} {...props}>
        {children}
      </button>
    );
  },
);

MenuButton.displayName = "MenuButton";
