import React from "react"
import type { ButtonHTMLAttributes, ReactNode } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "ghost" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
  children: ReactNode
}

export function Button({ 
  className = "", 
  variant = "default", 
  size = "default", 
  children,
  ...props 
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none"

  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "hover:bg-slate-100 hover:text-slate-900",
    outline: "border border-slate-200 hover:bg-slate-100 hover:text-slate-900",
  }

  const sizes = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 text-sm",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  }

  const variantStyle = variants[variant]
  const sizeStyle = sizes[size]

  return <button className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`} {...props}>{children}</button>
}

