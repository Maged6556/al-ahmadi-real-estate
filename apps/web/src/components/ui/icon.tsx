"use client";

import { FontAwesomeIcon as FAIcon } from "@fortawesome/react-fontawesome";
import type { CSSProperties } from "react";

// Derive the icon prop type from FontAwesomeIcon itself
type IconProp = React.ComponentProps<typeof FAIcon>["icon"];

export interface IconProps {
  /** Font Awesome icon (name string or icon object) */
  icon: IconProp;
  /** Additional CSS classes */
  className?: string;
  /** Icon size (FA size alias) */
  size?: "xs" | "sm" | "lg" | "1x" | "2x" | "3x" | "4x" | "5x" | "6x" | "7x" | "8x" | "9x" | "10x";
  /** Flip the icon horizontally/vertically */
  flip?: "horizontal" | "vertical" | "both";
  /** Rotate the icon (degrees) */
  rotate?: 0 | 90 | 180 | 270;
  /** Pull icon left or right */
  pull?: "left" | "right";
  /** Add a border around the icon */
  border?: boolean;
  /** Invert the icon color */
  inverse?: boolean;
  /** Use as a mask/symbol */
  symbol?: boolean;
  /** Accessible title */
  title?: string;
  /** Mask icon */
  mask?: IconProp;
  /** Swap opacity for masking */
  swapOpacity?: boolean;
  /** Hide icon from screen readers (decorative icons) */
  ariaHidden?: boolean;
  /** Accessible label for icon-only controls */
  ariaLabel?: string;
  /** Inline styles */
  style?: CSSProperties;
}

export function Icon({
  icon,
  className,
  size = "1x",
  flip,
  rotate,
  pull,
  border,
  inverse,
  symbol,
  title,
  mask,
  swapOpacity,
  ariaHidden = true,
  ariaLabel,
  style,
  ...props
}: IconProps) {
  return (
    <FAIcon
      icon={icon}
      className={className}
      size={size}
      flip={flip}
      rotate={rotate}
      pull={pull}
      border={border}
      inverse={inverse}
      symbol={symbol}
      title={title}
      mask={mask}
      swapOpacity={swapOpacity}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
      style={style as React.ComponentProps<typeof FAIcon>["style"]}
      {...props}
    />
  );
}
